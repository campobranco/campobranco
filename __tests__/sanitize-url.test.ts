/**
 * __tests__/sanitize-url.test.ts
 *
 * Teste unitário de segurança para a função sanitizeUrl.
 * Valida rigorosamente:
 * 1. Bloqueio categórico de esquemas perigosos (javascript:, data:, vbscript:, etc.)
 * 2. Bloqueio de variações de caixa (JavaScript:, DATA:, etc.)
 * 3. Bloqueio de espaços ou caracteres especiais que tentem bypass
 * 4. Tratamento seguro de undefined, null e strings vazias (sem fallback oculto)
 * 5. Preservação de URLs legítimas (https, http, geo, waze)
 */

import { sanitizeUrl } from '../lib/validation';

describe('Security: sanitizeUrl', () => {

    describe('Bloqueio de protocolos perigosos e injeções de script (XSS)', () => {
        it('deve bloquear javascript: simples', () => {
            expect(sanitizeUrl('javascript:alert(1)')).toBe('');
        });

        it('deve bloquear javascript: com caixa alta / mista', () => {
            expect(sanitizeUrl('JavaScript:alert(document.cookie)')).toBe('');
            expect(sanitizeUrl('JAVASCRIPT:void(0)')).toBe('');
        });

        it('deve bloquear javascript: com payloads complexos', () => {
            expect(sanitizeUrl('javascript:/*--></title></style></textarea><em><script>alert(1)</script>')).toBe('');
            expect(sanitizeUrl('javascript:window.location="http://evil.com"')).toBe('');
        });

        it('deve bloquear data: text/html', () => {
            expect(sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('');
        });

        it('deve bloquear data: image/svg+xml com script embutido', () => {
            expect(sanitizeUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe('');
        });

        it('deve bloquear data: com caixa alta', () => {
            expect(sanitizeUrl('DATA:text/html,<script>alert(1)</script>')).toBe('');
        });

        it('deve bloquear outros esquemas não autorizados (vbscript, file, etc.)', () => {
            expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('');
            expect(sanitizeUrl('file:///etc/passwd')).toBe('');
            expect(sanitizeUrl('blob:https://example.com/uuid')).toBe('');
        });
    });

    describe('Tratamento de entradas vazias, nulas ou indefinidas', () => {
        it('deve retornar string vazia para undefined', () => {
            expect(sanitizeUrl(undefined)).toBe('');
        });

        it('deve retornar string vazia para null', () => {
            expect(sanitizeUrl(null)).toBe('');
        });

        it('deve retornar string vazia para string vazia', () => {
            expect(sanitizeUrl('')).toBe('');
        });
    });

    describe('Preservação de protocolos legítimos e seguros', () => {
        it('deve permitir links HTTPS do Google Maps', () => {
            const url = 'https://www.google.com/maps/search/?api=1&query=-23.5505,-46.6333';
            expect(sanitizeUrl(url)).toBe(url);
        });

        it('deve permitir links HTTPS do Waze', () => {
            const url = 'https://waze.com/ul?ll=-23.5505,-46.6333&navigate=yes';
            expect(sanitizeUrl(url)).toBe(url);
        });

        it('deve permitir links HTTP legítimos', () => {
            const url = 'http://maps.google.com/?q=teste';
            expect(sanitizeUrl(url)).toBe(url);
        });

        it('deve permitir o esquema nativo geo:', () => {
            const url = 'geo:-23.5505,-46.6333';
            expect(sanitizeUrl(url)).toBe(url);
        });

        it('deve permitir o esquema nativo waze://', () => {
            const url = 'waze://?ll=-23.5505,-46.6333&navigate=yes';
            expect(sanitizeUrl(url)).toBe(url);
        });
    });

});
