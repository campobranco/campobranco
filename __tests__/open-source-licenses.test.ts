import fs from 'fs';
import path from 'path';
import {
    PROJECT_REPO_URL,
    PROJECT_LICENSE_URL,
    PROJECT_COPYRIGHT,
    LICENSE_TEXTS,
    DEPENDENCIES,
    getLicenseDefinition,
    type LicenseId,
} from '@/lib/open-source-licenses';

describe('Open Source Licenses & Attribution Compliance', () => {
    const rootDir = process.cwd();

    it('usa a URL oficial do repositório campobranco/campobranco', () => {
        expect(PROJECT_REPO_URL).toBe('https://github.com/campobranco/campobranco');
        expect(PROJECT_LICENSE_URL).toBe('https://github.com/campobranco/campobranco/blob/main/LICENSE');
    });

    it('mantém o copyright alinhado com o arquivo LICENSE na raiz', () => {
        const licenseFile = fs.readFileSync(path.join(rootDir, 'LICENSE'), 'utf8');
        expect(licenseFile).toContain(PROJECT_COPYRIGHT);
    });

    it('lista todas as dependências de produção do package.json com licença válida', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
        const requiredNames = [
            ...Object.keys(pkg.dependencies || {}),
            'next',
            'tailwindcss',
        ];
        const listedNames = new Set(DEPENDENCIES.map((d) => d.name));

        for (const depName of requiredNames) {
            expect(listedNames.has(depName)).toBe(true);
        }

        for (const dep of DEPENDENCIES) {
            expect(LICENSE_TEXTS[dep.licenseId]).toBeDefined();
            expect(LICENSE_TEXTS[dep.licenseId].english.length).toBeGreaterThan(50);
            expect(LICENSE_TEXTS[dep.licenseId].officialUrl).toMatch(/^https:\/\//);
        }
    });

    it('não faz fallback silencioso para MIT quando recebe licença desconhecida', () => {
        expect(() => getLicenseDefinition('GPL-3.0' as LicenseId)).toThrow();
    });

    it('não possui URLs antigas quebradas do GitHub em app/', () => {
        const appDir = path.join(rootDir, 'app');
        const files: string[] = [];

        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
            }
        };
        walk(appDir);

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            expect(content).not.toContain('paulojacomelli/campo-branco');
            expect(content).not.toContain('campobranco/codigo-fonte');
        }
    });
});
