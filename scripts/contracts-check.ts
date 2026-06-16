import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MUTATIONS_DIR = path.join(__dirname, '../lib/contracts/mutations');
const SNAPSHOT_FILE = path.join(__dirname, '../contracts.snapshot.json');

function extractContracts() {
    const contracts: Record<string, { input: string[], output: string[] }> = {};
    const files = fs.readdirSync(MUTATIONS_DIR).filter(f => f.endsWith('.ts'));

    for (const file of files) {
        const content = fs.readFileSync(path.join(MUTATIONS_DIR, file), 'utf-8');
        
        // Find all export interface XxxInput { ... }
        const interfaceRegex = /export interface (\w+Input)\s*{([^}]+)}/g;
        let match;
        
        while ((match = interfaceRegex.exec(content)) !== null) {
            const interfaceName = match[1];
            const body = match[2];
            
            // Extract property names: "propertyName: type;" or "propertyName?: type;"
            const propRegex = /^\s*(\w+)\??\s*:/gm;
            const inputs: string[] = [];
            let propMatch;
            while ((propMatch = propRegex.exec(body)) !== null) {
                inputs.push(propMatch[1]);
            }
            
            contracts[interfaceName] = {
                input: inputs,
                output: ['success', 'code', 'message', 'error', 'data']
            };
        }
    }
    
    return contracts;
}

function run() {
    const runtime = extractContracts();
    
    if (!fs.existsSync(SNAPSHOT_FILE)) {
        console.log('📸 Creating initial contracts snapshot...');
        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(runtime, null, 2));
        console.log('✅ Snapshot created at contracts.snapshot.json');
        process.exit(0);
    }

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
    
    const snapshotStr = JSON.stringify(snapshot, null, 2);
    const runtimeStr = JSON.stringify(runtime, null, 2);
    
    if (snapshotStr !== runtimeStr) {
        console.error('❌ CONTRACT DRIFT DETECTED!');
        console.error('A assinatura de uma Mutation foi alterada silenciosamente.');
        console.error('Se a mudança for intencional, apague contracts.snapshot.json e rode o checker novamente para atualizar o snapshot.');
        process.exit(1);
    }
    
    console.log('✅ Contratos internos verificados com sucesso. Nenhum drift detectado.');
}

run();
