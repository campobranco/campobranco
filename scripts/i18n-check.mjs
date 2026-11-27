import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.resolve(__dirname, '..', 'locales');
const sourceLocaleFile = 'pt-BR.json';

function flattenKeys(obj, prefix = '', result = {}) {
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            flattenKeys(value, fullKey, result);
        } else {
            result[fullKey] = String(value);
        }
    }
    return result;
}

function extractPlaceholders(text) {
    const matches = text.match(/\{(\w+)\}/g) || [];
    return [...new Set(matches)].sort();
}

function main() {
    if (!fs.existsSync(localesDir)) {
        console.error(`[i18n:check] Diretório não encontrado: ${localesDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json')).sort();
    if (!files.includes(sourceLocaleFile)) {
        console.error(`[i18n:check] Idioma-fonte obrigatório não encontrado: ${sourceLocaleFile}`);
        process.exit(1);
    }

    const parsed = {};
    let hasError = false;

    for (const file of files) {
        const filePath = path.join(localesDir, file);
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            parsed[file] = flattenKeys(JSON.parse(raw));
        } catch (err) {
            console.error(`[i18n:check] JSON inválido em ${file}:`, err.message);
            hasError = true;
        }
    }

    if (hasError) {
        process.exit(1);
    }

    const sourceKeys = parsed[sourceLocaleFile];
    const sourceKeyList = Object.keys(sourceKeys);

    console.log(`[i18n:check] Fonte (${sourceLocaleFile}): ${sourceKeyList.length} chaves.`);

    for (const file of files) {
        if (file === sourceLocaleFile) continue;

        const targetKeys = parsed[file];
        const targetKeyList = Object.keys(targetKeys);

        const orphanKeys = targetKeyList.filter((k) => !Object.prototype.hasOwnProperty.call(sourceKeys, k));
        if (orphanKeys.length > 0) {
            console.error(`[i18n:check] ${file} possui chaves órfãs (ausentes em ${sourceLocaleFile}): ${orphanKeys.join(', ')}`);
            hasError = true;
        }

        let translatedCount = 0;
        for (const key of sourceKeyList) {
            if (!Object.prototype.hasOwnProperty.call(targetKeys, key)) continue;
            translatedCount++;

            const expectedPlaceholders = extractPlaceholders(sourceKeys[key]);
            const actualPlaceholders = extractPlaceholders(targetKeys[key]);

            if (JSON.stringify(expectedPlaceholders) !== JSON.stringify(actualPlaceholders)) {
                console.error(
                    `[i18n:check] Placeholders divergentes em ${file} (${key}): esperado [${expectedPlaceholders.join(', ')}], encontrado [${actualPlaceholders.join(', ')}]`
                );
                hasError = true;
            }
        }

        const pct = sourceKeyList.length === 0 ? 100 : Math.round((translatedCount / sourceKeyList.length) * 100);
        console.log(`[i18n:check] ${file}: ${translatedCount}/${sourceKeyList.length} chaves (${pct}%).`);
    }

    if (hasError) {
        process.exit(1);
    }

    console.log('[i18n:check] OK — Todos os arquivos de idioma estão válidos e consistentes.');
}

main();
