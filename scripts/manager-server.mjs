import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4000;
const ROOT_DIR = join(__dirname, '..');

let currentProcess = null;
let devProcess = null;

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Servir o UI
    if (url.pathname === '/' || url.pathname === '/index.html') {
        try {
            const content = await readFile(join(__dirname, 'manager-ui.html'), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        } catch (err) {
            res.writeHead(500);
            res.end('Erro ao carregar interface: ' + err.message);
        }
        return;
    }

    // Endpoint de Logs (SSE)
    if (url.pathname === '/logs') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const sendLog = (type, data) => {
            if (res.writableEnded) return;
            try {
                const msg = `data: ${JSON.stringify({ type, data: data.toString().trim() })}\n\n`;
                res.write(msg);
                // Log também no terminal do servidor (para o dev acompanhar)
                console.log(`[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${data.toString().trim().substring(0, 100)}...`);
            } catch (e) {
                console.error(`Erro ao escrever no socket: ${e.message}`);
            }
        };

        // Heartbeat para manter a conexão viva (especialmente no build longo)
        const heartbeat = setInterval(() => {
            if (!res.writableEnded) {
                res.write(': heartbeat\n\n');
            } else {
                clearInterval(heartbeat);
            }
        }, 15000);

        const loadEnv = async (type) => {
            const fileName = type === 'prod' ? '.env.production' : '.env.development';
            try {
                const content = await readFile(join(ROOT_DIR, fileName), 'utf-8');
                const env = {};
                content.split('\n').forEach(line => {
                    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                    if (match) {
                        let value = (match[2] || '').split('#')[0].trim();
                        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                        env[match[1]] = value.trim();
                    }
                });
                return env;
            } catch (e) {
                console.error(`Erro ao carregar ${fileName}: ${e.message}`);
                return {};
            }
        };

        const command = url.searchParams.get('cmd');
        if (!command) {
            sendLog('error', 'Comando não enviado');
            res.end();
            clearInterval(heartbeat);
            return;
        }

        if (currentProcess && command !== 'dev') {
            sendLog('error', 'Já existe uma tarefa (não-dev) em execução.');
            res.end();
            clearInterval(heartbeat);
            return;
        }

        // Se tentar rodar 'dev' e já estiver rodando, avisar
        if (command === 'dev' && devProcess) {
            sendLog('error', 'O servidor de testes já está em execução.');
            res.end();
            clearInterval(heartbeat);
            return;
        }

        const executeProcess = (cmd, args, callback) => {
            try {
                const isWin = process.platform === 'win32';
                // Com shell:true no Windows, passamos o comando puro
                const proc = spawn(cmd, args, { 
                    cwd: ROOT_DIR, 
                    shell: isWin 
                });
                
                if (command === 'dev') {
                    devProcess = proc;
                } else {
                    currentProcess = proc;
                }
                sendLog('status', `Iniciando: ${cmd} ${args.join(' ')}...`);

                proc.stdout.on('data', (data) => {
                    const output = data.toString();
                    sendLog('stdout', output);
                    
                    // Detectar URL e abrir navegador automaticamente
                    if (output.includes('http://localhost:')) {
                        const match = output.match(/http:\/\/localhost:\d+/);
                        if (match) {
                            const url = match[0];
                            // Abrir apenas uma vez por execução
                            if (!proc.openedBrowser) {
                                proc.openedBrowser = true;
                                sendLog('status', `Servidor Online: Abrindo ${url}...`);
                                spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
                            }
                        }
                    }
                });
                proc.stderr.on('data', (data) => sendLog('stderr', data.toString()));

                proc.on('error', (err) => {
                    sendLog('error', `Falha ao iniciar processo: ${err.message}`);
                    if (command === 'dev') devProcess = null;
                    else currentProcess = null;
                    if (!res.writableEnded) res.end();
                    clearInterval(heartbeat);
                });

                proc.on('close', (code) => {
                    if (code !== 0) {
                        sendLog('error', `Processo ${cmd} finalizado com erro (código ${code})`);
                        if (command === 'dev') devProcess = null;
                        else currentProcess = null;
                        if (!res.writableEnded) res.end();
                        clearInterval(heartbeat);
                        return;
                    }
                    callback();
                });
            } catch (err) {
                sendLog('error', `Erro interno: ${err.message}`);
                if (!res.writableEnded) res.end();
                clearInterval(heartbeat);
            }
        };

        const runSequence = (tasks) => {
            if (tasks.length === 0) {
                sendLog('status', `Todos os processos finalizados com sucesso.`);
                sendLog('done', `Comando concluído`);
                if (command === 'dev') devProcess = null;
                else currentProcess = null;
                clearInterval(heartbeat);
                setTimeout(() => { if (!res.writableEnded) res.end(); }, 1000);
                return;
            }

            const currentTask = tasks.shift();
            executeProcess(currentTask.cmd, currentTask.args, () => runSequence(tasks));
        };

        let tasks = [];
        const envProd = await loadEnv('prod');
        const envDev = await loadEnv('dev');

        const projProd = envProd.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const projDev = envDev.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        // Validação de segurança
        if ((command.includes('prod') || command === 'build') && !projProd) {
            sendLog('error', 'ERRO: NEXT_PUBLIC_FIREBASE_PROJECT_ID não definido em .env.production');
            res.end(); clearInterval(heartbeat); return;
        }
        if (command.includes('dev') && !projDev) {
            sendLog('error', 'ERRO: NEXT_PUBLIC_FIREBASE_PROJECT_ID não definido em .env.development');
            res.end(); clearInterval(heartbeat); return;
        }

        switch (command) {
            case 'install': 
                tasks = [{ cmd: 'npm', args: ['install'] }]; break;
            case 'build': 
                tasks = [{ cmd: 'npm', args: ['run', 'build'] }]; break;
            case 'dev': 
                tasks = [
                    { cmd: 'npm', args: ['install'] },
                    { cmd: 'npm', args: ['run', 'dev'] }
                ]; break;
            case 'deploy-prod': 
                tasks = [
                    { cmd: 'npm', args: ['run', 'build'] },
                    { cmd: 'npx', args: ['firebase', 'deploy', '--project', projProd] }
                ]; break;
            case 'deploy-dev': 
                tasks = [
                    { cmd: 'npm', args: ['run', 'build'] },
                    { cmd: 'npx', args: ['firebase', 'deploy', '--project', projDev, '--except', 'storage'] }
                ]; break;
            case 'sync-rules-prod': 
                tasks = [{ cmd: 'npx', args: ['firebase', 'deploy', '--project', projProd, '--only', 'firestore:rules,storage:rules'] }]; break;
            case 'sync-rules-dev': 
                tasks = [{ cmd: 'npx', args: ['firebase', 'deploy', '--project', projDev, '--only', 'firestore:rules'] }]; break;
            default:
                sendLog('error', 'Comando desconhecido');
                res.end();
                clearInterval(heartbeat);
                return;
        }

        runSequence(tasks);
        
        req.on('close', () => {
            clearInterval(heartbeat);
        });

        return;
    }

    // Endpoint para Salvar .env
    if (url.pathname === '/save-env' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { type, config } = JSON.parse(body);
                if (!['prod', 'dev'].includes(type)) throw new Error('Tipo inválido');

                const fileName = type === 'prod' ? '.env.production' : '.env.development';
                const envPath = join(ROOT_DIR, fileName);
                
                let pkgVersion = "0.8.52-beta";
                try {
                    const pkg = JSON.parse(await readFile(join(ROOT_DIR, 'package.json'), 'utf-8'));
                    pkgVersion = pkg.version;
                } catch(e){}

                const envContent = `
# =====================
# Configurações do App
# =====================
NEXT_PUBLIC_APP_NAME="Campo Branco"
NEXT_PUBLIC_APP_DESCRIPTION="Gestão de Territórios para Testemunhas de Jeová"
NEXT_PUBLIC_APP_VERSION="${pkgVersion}"
NEXT_PUBLIC_APP_URL="${config.NEXT_PUBLIC_APP_URL || ''}"
NEXT_PUBLIC_SUPPORT_EMAIL="${config.NEXT_PUBLIC_MASTER_EMAIL || ''}"
NEXT_PUBLIC_MASTER_EMAIL="${config.NEXT_PUBLIC_MASTER_EMAIL || ''}"
NEXT_PUBLIC_LEGACY_HOST=""

# =====================
# Firebase Client SDK (Público) - ${type === 'prod' ? 'Produção' : 'Desenvolvimento'}
# =====================
NEXT_PUBLIC_FIREBASE_PROJECT_ID="${config.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}"
NEXT_PUBLIC_FIREBASE_API_KEY="${config.NEXT_PUBLIC_FIREBASE_API_KEY || ''}"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}"
NEXT_PUBLIC_FIREBASE_APP_ID="${config.NEXT_PUBLIC_FIREBASE_APP_ID || ''}"
NEXT_PUBLIC_FIREBASE_DATABASE_ID="default"

# =====================
# Firebase Admin SDK (Privado)
# =====================
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""
`.trim();

                await writeFile(envPath, envContent);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `${fileName} salvo com sucesso!` }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Endpoint para Ler .env existente
    if (url.pathname === '/get-config' && req.method === 'GET') {
        const type = url.searchParams.get('type');
        const fileName = type === 'prod' ? '.env.production' : '.env.development';
        try {
            const content = await readFile(join(ROOT_DIR, fileName), 'utf-8');
            const config = {};
            content.split('\n').forEach(line => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    let value = (match[2] || '').split('#')[0].trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    config[match[1]] = value.trim();
                }
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, config }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Arquivo não existe' }));
        }
        return;
    }

    // Endpoint para Interromper Comando (especificamente o dev)
    if (url.pathname === '/stop-command' && req.method === 'POST') {
        const procToKill = devProcess || currentProcess;
        if (procToKill) {
            sendLog('status', 'Interrompendo processo...');
            const pid = procToKill.pid;
            const isWin = process.platform === 'win32';
            
            if (isWin) {
                spawn('taskkill', ['/F', '/T', '/PID', pid]);
            } else {
                procToKill.kill('SIGTERM');
            }
            
            if (procToKill === devProcess) devProcess = null;
            else currentProcess = null;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Nenhum processo ativo' }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Não encontrado');
});

// Configurações de timeout agressivas para builds longos
server.timeout = 0; 
server.keepAliveTimeout = 0;

server.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`   GERENCIADOR CAMPO BRANCO ATIVO EM:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`================================================`);
});
