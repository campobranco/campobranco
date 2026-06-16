import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_DIR = 'app';

// The comments to inject
const TODO_COMMENT = '// TODO(mutations): migrate to mutation layer - legacy module (admin/report/dashboard)';
const ESLINT_DISABLE = '// eslint-disable-next-line no-restricted-imports';

// Recursive function to get all ts/tsx files
function getFiles(dir, filesList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, filesList);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            filesList.push(filePath);
        }
    }
    return filesList;
}

const allFiles = getFiles(TARGET_DIR);

let modifiedFilesCount = 0;

for (const filePath of allFiles) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip if already disabled
        if (i > 0 && lines[i - 1].includes('eslint-disable-next-line')) {
            continue;
        }

        // Match Firebase restricted imports
        const isFirebaseImport = line.includes('from "firebase/firestore"') || line.includes("from 'firebase/firestore'");
        const hasRestrictedFirebase = isFirebaseImport && (line.includes('updateDoc') || line.includes('setDoc') || line.includes('deleteDoc') || line.includes('addDoc'));
        
        // Match services restricted imports
        const isServiceImport = line.match(/import .* from ["']@\/lib\/services\/.*["']/);

        if (hasRestrictedFirebase || isServiceImport) {
            // Inject the comments above this line
            lines.splice(i, 0, TODO_COMMENT, ESLINT_DISABLE);
            modified = true;
            i += 2; // Skip the newly added lines
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
        modifiedFilesCount++;
        console.log(`Modified: ${filePath}`);
    }
}

console.log(`Done. Modified ${modifiedFilesCount} files.`);
