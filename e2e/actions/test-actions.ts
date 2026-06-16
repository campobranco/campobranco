import { Page, expect } from '@playwright/test';

/**
 * Helpers encapsulam ações da UI para que os testes não fiquem
 * frágeis caso botões ou textos mudem no futuro.
 */

export async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    // Preenche credenciais de teste (configurado no Firebase Emulator)
    await page.fill('input[type="email"]', 'admin@campobranco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/dashboard/);
}

export async function assignTerritory(page: Page, territoryName: string, publisherName: string) {
    await page.goto('/share-setup');
    // Simula o clique e preenchimento na interface para designar território
    // Nota: Como o app usa modais e seletores assíncronos, esperamos visibilidade
    await page.waitForSelector(`text=${territoryName}`, { state: 'visible' });
    await page.click(`text=${territoryName}`);
    
    // Supondo que tem um seletor de publicador
    await page.click('text=Selecionar Publicador');
    await page.click(`text=${publisherName}`);
    
    // Clica no botão "Gerar Compartilhamento"
    await page.click('button:has-text("Gerar Compartilhamento")');
    
    // Aguarda o sucesso (Toast ou redirecionamento)
    await expect(page.locator('text=Compartilhamento criado')).toBeVisible();
}

export async function returnTerritory(page: Page, shareId: string, territoryName: string) {
    await page.goto(`/share/${shareId}`);
    
    await page.waitForSelector(`text=${territoryName}`, { state: 'visible' });
    // Clica em um botão "Mais" ou dropdown, depois em Devolver
    // Isso depende da implementação exata da UI, mas focamos na intenção
    await page.click(`button:has-text("Devolver Mapa")`); // ou "Devolver Território"
    
    // Confirma no Modal
    await page.click('button:has-text("Confirmar")');
    
    // Aguarda o toast de sucesso
    await expect(page.locator('text=devolvido com sucesso')).toBeVisible();
}
