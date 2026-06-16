
import { test, expect } from '@playwright/test';

test.describe('E2E: Authentication Gates', () => {

    test('Protected Route: /dashboard should redirect to /login', async ({ page }) => {
        // Attempt to visit a protected page
        await page.goto('/dashboard');

        // Expect URL to change to login
        await expect(page).toHaveURL(/.*\/login/);

        // Expect visual confirmation of login page
        // Expect visual confirmation of login page
        await expect(page.getByRole('button', { name: /Entrar com Google/i })).toBeVisible();
    });

    test('Protected Route: /settings should redirect to /login', async ({ page }) => {
        await page.goto('/settings');
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Public Route: /legal-consent should be accessible (or redirect logic)', async ({ page }) => {
        // /legal-consent might require auth state check, but let's see if it renders
        // or if it redirects to login as well (since it requires a user object generally)
        await page.goto('/legal-consent');
        // If it redirects to login, that's fine, we just verify behavior.
        // If it stays, we verify content.

        // In this app, legal-consent is usually for logged-in users who haven't accepted terms.
        // So unauthenticated access should likely redirect to login.
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Login Page: Elements should be visible', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Campo Branco' })).toBeVisible();
        // Terms link is not present in LoginClient, likely in LegalConsent page instead
    });

});
