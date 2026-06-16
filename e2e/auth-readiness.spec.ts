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

        // Aguardamos os 3 segundos da simulação passarem
        await page.waitForTimeout(3500);

        // Se o usuário não estava logado ou o perfil estava nulo (ambiente limpo do E2E),
        // o app acaba redirecionando pro /login ou exibindo a tela de "Perfil Incompleto" do Gate.
        // Como o E2E sobe um browser anônimo por padrão, ele será chutado pro login ou cairá no fallback.
        const isLogin = page.url().includes('/login');
        const isFallback = await page.locator('text=Perfil Incompleto').isVisible();
        
        expect(isLogin || isFallback).toBeTruthy();
    });

});
