import { test, expect } from '@playwright/test';
import { loginAsAdmin, assignTerritory, returnTerritory } from './actions/test-actions';

test.describe('Core Mutations (Territórios)', () => {

    test('Flow 1: Assign Territory (Idempotência e Estado)', async ({ page }) => {
        // Ignorando este teste se não houver um emulador rodando 
        // ou precisarmos preencher DB com dados
        /**
         * BLOQUEADO: Autenticação E2E incompatível com fluxo real
         *
         * Este teste pressupõe login via e-mail/senha (helper `loginAsAdmin` tenta preencher input[type="email"]).
         * Porém, a tela de login real só expõe OAuth (Google).
         *
         * Para desbloquear, seria necessário:
         * 1. Implementar formulário de e-mail/senha no frontend, OU
         * 2. Refatorar E2E para usar storageState pré-autenticada via Firebase Admin API
         *
         * TODO: Reavaliação quando estratégia de E2E auth for revisitada.
         */
        test.skip(); 
        
        await loginAsAdmin(page);
        
        // Simula designação do território "T-01" para "João"
        await assignTerritory(page, 'T-01', 'João');
        
        // Assert: A interface deve refletir que o território não pode ser designado novamente imediatamente
        await page.goto('/share-setup');
        
        // Neste sistema o T-01 deve sumir da lista de disponíveis ou estar bloqueado
        await expect(page.locator('text=T-01')).not.toBeVisible();
    });

    test('Flow 2: Return Territory', async ({ page }) => {
        /**
         * BLOQUEADO: Autenticação E2E incompatível com fluxo real
         *
         * Este teste pressupõe login via e-mail/senha (helper `loginAsAdmin` tenta preencher input[type="email"]).
         * Porém, a tela de login real só expõe OAuth (Google).
         *
         * Para desbloquear, seria necessário:
         * 1. Implementar formulário de e-mail/senha no frontend, OU
         * 2. Refatorar E2E para usar storageState pré-autenticada via Firebase Admin API
         *
         * TODO: Reavaliação quando estratégia de E2E auth for revisitada.
         */
        test.skip();
        await loginAsAdmin(page);
        
        // Assumindo que criamos uma share list "SHARE-123" no setup global
        await returnTerritory(page, 'SHARE-123', 'T-01');
        
        // Após devolver, o território deve voltar a estar livre no setup
        await page.goto('/share-setup');
        await expect(page.locator('text=T-01')).toBeVisible();
    });

    // Os testes de Concorrência e Falha de Transação (Flow 3 e 4) foram migrados 
    // para Testes de Integração (Jest + Emulator) a fim de evitar flakeyness no E2E UI.
});
