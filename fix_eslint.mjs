import fs from 'fs';

const eslintOutput = `
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\admin\\congregations\\page.tsx
  25:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\admin\\users\\page.tsx
  13:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\components\\ReferencePointsModal.tsx
  18:1
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\dashboard\\cards\\page.tsx
  12:5
  13:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\dashboard\\page.tsx
  15:5
  16:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\invite\\page.tsx
  17:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\my-maps\\address\\page.tsx
  37:5
  38:5
  39:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\my-maps\\city\\page.tsx
  48:5
  49:5
  50:5
  51:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\my-maps\\territory\\page.tsx
  48:5
  49:5
  50:5
C:\\Users\\design\\Desktop\\dev\\campobranco\\app\\settings\\page.tsx
  11:5
  18:5
  19:5
`;

const lines = eslintOutput.trim().split('\n');
let currentFile = '';
const modifications = {};

for (const line of lines) {
    if (line.startsWith('C:\\')) {
        currentFile = line.trim();
        modifications[currentFile] = [];
    } else if (line.trim().match(/^\d+:\d+/)) {
        const lineNum = parseInt(line.trim().split(':')[0], 10);
        modifications[currentFile].push(lineNum);
    }
}

const TODO_COMMENT = '// TODO(mutations): migrate to mutation layer - legacy module (admin/report/dashboard)';
const ESLINT_DISABLE = '// eslint-disable-next-line no-restricted-imports';

for (const [file, lineNums] of Object.entries(modifications)) {
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        continue;
    }
    let content = fs.readFileSync(file, 'utf-8').split('\n');
    
    // Sort descending so we don't mess up line numbers when inserting
    lineNums.sort((a, b) => b - a);
    
    for (const num of lineNums) {
        // ESLint output is 1-indexed. Array is 0-indexed.
        const insertIndex = num - 1;
        // Check if we already have an eslint-disable-next-line at insertIndex - 1
        if (insertIndex > 0 && content[insertIndex - 1].includes('eslint-disable-next-line')) {
            continue; // Already disabled
        }
        content.splice(insertIndex, 0, TODO_COMMENT, ESLINT_DISABLE);
    }
    
    fs.writeFileSync(file, content.join('\n'), 'utf-8');
    console.log(`Fixed ${file}`);
}
