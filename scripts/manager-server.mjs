import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4000;
const ROOT_DIR = join(__dirname, '..');

let currentProcess = null;

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

        if (currentProcess) {
            sendLog('error', 'Já existe um processo em execução.');
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
                
                currentProcess = proc;
                sendLog('status', `Iniciando: ${cmd} ${args.join(' ')}...`);

                proc.stdout.on('data', (data) => sendLog('stdout', data));
                proc.stderr.on('data', (data) => sendLog('stderr', data));

                proc.on('error', (err) => {
                    sendLog('error', `Falha ao iniciar processo: ${err.message}`);
                    currentProcess = null;
                    if (!res.writableEnded) res.end();
                    clearInterval(heartbeat);
                });

                proc.on('close', (code) => {
                    if (code !== 0) {
                        sendLog('error', `Processo ${cmd} finalizado com erro (código ${code})`);
                        currentProcess = null;
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
                currentProcess = null;
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
                tasks = [{ cmd: 'npm', args: ['run', 'dev'] }]; break;
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
                let content = '# Campo Branco - Configuracao Gerada\n';
                content += `NEXT_PUBLIC_ENVIRONMENT="${type === 'prod' ? 'production' : 'development'}"\n\n`;
                
                Object.entries(config).forEach(([key, value]) => {
                    content += `${key}="${value}"\n`;
                });

                await writeFile(join(ROOT_DIR, fileName), content);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `${fileName} salvo com sucesso!` }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
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
