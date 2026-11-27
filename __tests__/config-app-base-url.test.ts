import { getAppBaseUrl } from '@/lib/config';

describe('getAppBaseUrl', () => {
    const originalEnv = process.env;
    const hasOriginalWindow = typeof (globalThis as { window?: unknown }).window !== 'undefined';
    const originalWindow = (globalThis as { window?: unknown }).window;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
        if (hasOriginalWindow) {
            Object.defineProperty(globalThis, 'window', {
                configurable: true,
                writable: true,
                value: originalWindow,
            });
        } else {
            delete (globalThis as { window?: unknown }).window;
        }
    });

    it('deve retornar window.location.origin sem barra final no ambiente Web mesmo com NEXT_PUBLIC_APP_URL definida', () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://campobranco.web.app/';
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            writable: true,
            value: { location: { origin: 'http://localhost:3000/' } },
        });

        expect(getAppBaseUrl(false)).toBe('http://localhost:3000');
    });

    it('deve retornar NEXT_PUBLIC_APP_URL sem barra final no ambiente nativo (Capacitor)', () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://campobranco.web.app///';

        expect(getAppBaseUrl(true)).toBe('https://campobranco.web.app');
    });

    it('deve lançar erro explícito no ambiente nativo quando NEXT_PUBLIC_APP_URL estiver ausente', () => {
        delete process.env.NEXT_PUBLIC_APP_URL;

        expect(() => getAppBaseUrl(true)).toThrow(
            'NEXT_PUBLIC_APP_URL não está configurada para o aplicativo nativo.'
        );
    });
});
