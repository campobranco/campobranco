import { execSync } from 'child_process';

function run(cmd: string, env: any = {}) {
    console.log(`\n▶ Executando: ${cmd}`);
    execSync(cmd, { 
        stdio: 'inherit',
        env: { ...process.env, ...env }
    });
}

function checkJava() {
    console.log('🔍 Validando JDK 21+...');
    try {
        // Tenta capturar a saída do java -version.
        // O comando joga informações no stderr, capturamos ambos.
        const output = execSync('java -version 2>&1').toString();
        
        // Verifica se há indicações de versão superior ou igual a 21
        const versionMatch = output.match(/version "(\d+)/) || output.match(/openjdk version "(\d+)/);
        
        if (versionMatch) {
            const majorVersion = parseInt(versionMatch[1], 10);
            if (majorVersion >= 21) {
                console.log(`✅ JDK compatível encontrado: versão ${versionMatch[1]}`);
                return;
            }
        }
        
        throw new Error(`Java 21 ou superior é obrigatório. Versão encontrada no Path padrão: ${output.trim()}`);
    } catch (err: any) {
        // Fallback: Tentamos procurar pelo JDK instalado via winget/Microsoft se o default do Path for Java antigo
        console.warn('⚠️ JDK 21 não é o padrão no PATH. Procurando instalações alternativas...');
        try {
            const msJdkPath = 'C:\\Users\\design\\AppData\\Local\\Programs\\Microsoft\\jdk-21.0.11.10-hotspot';
            const testPathCmd = `"${msJdkPath}\\bin\\java.exe" -version 2>&1`;
            const msOutput = execSync(testPathCmd).toString();
            if (msOutput.includes('21.0.')) {
                console.log(`✅ JDK 21 encontrado no caminho alternativo: ${msJdkPath}`);
                // Injeta as variáveis de ambiente necessárias para o processo rodar com este JDK
                process.env.JAVA_HOME = msJdkPath;
                process.env.Path = `${msJdkPath}\\bin;` + process.env.Path;
                return;
            }
        } catch {}

        console.error('❌ Falha: Java JDK 21+ não está instalado ou não pôde ser localizado.');
        console.error('Requisito: Instale-o via "winget install Microsoft.OpenJDK.21" ou ajuste o PATH.');
        process.exit(1);
    }
}

async function main() {
    console.log('🚀 Iniciando onboarding automatizado do projeto (Setup)...');

    // 1. Validar pré-requisito Java
    checkJava();

    // 2. Instalar dependências locais
    run('npm install');

    // 3. Executar testes unitários
    console.log('\n🧪 Executando testes unitários...');
    run('npm run test:unit');

    console.log('\n✅ Setup completo! O ambiente de desenvolvimento está pronto.');
    console.log('Para subir o servidor de desenvolvimento: npm run dev');
}

main().catch((err) => {
    console.error('❌ Ocorreu um erro durante o setup:', err);
    process.exit(1);
});
