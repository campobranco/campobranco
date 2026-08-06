import { test, expect } from '@playwright/test';

test.describe('E2E: Auth Readiness / Hydration State', () => {

    test('AuthReadyGate blocks interaction while profile is resolving', async ({ page }) => {
        // Interceptamos as requisições de rede para o Firestore (WebChannel ou REST)
        // Isso simula o atraso (latência) do carregamento assíncrono do perfil (congregationId)
        await page.route('**/google.firestore.v1.Firestore/**', async route => {
            // Segura a resposta por 3 segundos criando uma "janela de vulnerabilidade" artificial
            await new Promise(resolve => setTimeout(resolve, 3000));
            route.continue();
        });

        // O usuário tenta acessar uma rota protegida que requer congregação
        await page.goto('/share-setup');

        // Durante a janela de vulnerabilidade (antes dos dados chegarem), a UI original
        // não pode vazar a renderização. A tela não deve mostrar os botões de ação!
        // Validamos que o "AuthReadyGate" está segurando a tela de gerar link
        const shareButton = page.locator('button', { hasText: 'Gerar Link' });
        
        // Ele não deve estar visível no DOM enquanto os dados não chegam
        await expect(shareButton).toBeHidden();

        // Aguarda até que o redirecionamento ocorra ou que a tela estabilize
        await page.waitForURL('**/login', { timeout: 8000 }).catch(() => {});

        const isLogin = page.url().includes('/login');
        const isFallback = await page.locator('text=Perfil Incompleto').isVisible();
        const isLoading = await page.locator('.animate-spin').isVisible();
        const isButtonHidden = await page.locator('button', { hasText: 'Gerar Link' }).isHidden();

        expect(isLogin || isFallback || isLoading || isButtonHidden).toBeTruthy();
    });

});
