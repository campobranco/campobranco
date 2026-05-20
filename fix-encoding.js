// Script para corrigir encoding duplo (UTF-8 lido como Latin-1 e re-salvo como UTF-8)
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) { console.error('Uso: node fix-encoding.js <arquivo>'); process.exit(1); }

const fullPath = path.resolve(filePath);
const str = fs.readFileSync(fullPath, 'utf8');

// Converte a string UTF-8 contendo mojibake em um buffer Latin-1 (mapeia cada caractere Unicode 1:1 para byte)
const buf = Buffer.from(str, 'latin1');

// Decodifica o buffer como UTF-8 real
const fixed = buf.toString('utf8');

// Verifica se a conversão fez sentido (deve ter menos bytes que o original se havia double-encoding)
if (fixed.includes('ç') || fixed.includes('ã') || fixed.includes('é')) {
    fs.writeFileSync(fullPath, fixed, 'utf8');
    console.log(`OK: ${fullPath} corrigido (${buf.length} -> ${Buffer.byteLength(fixed, 'utf8')} bytes)`);
} else {
    console.log(`SKIP: ${fullPath} - conversão não produziu caracteres portugueses válidos`);
}
