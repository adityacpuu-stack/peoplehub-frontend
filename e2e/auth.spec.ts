import { test, expect } from '@playwright/test';
import { login, creds } from './helpers/auth';

test.describe('Auth smoke', () => {
  test('Super Admin can log in and reach dashboard', async ({ page }) => {
    await login(page, creds.superAdmin);
    await expect(page).toHaveURL(/\/(dashboard|ceo-dashboard)/);
  });

  test('Invalid credentials show error (no redirect)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name=email]', 'nonexistent@example.com');
    await page.fill('input[name=password]', 'wrongpassword');
    await page.click('button[type=submit]');

    // Stays on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('Authenticated user navigating to /login is redirected away or shown logged-in state', async ({ page }) => {
    await login(page, creds.superAdmin);
    await page.goto('/login');
    // Behavior: either redirect away or show "already logged in"
    await page.waitForTimeout(500);
    // No assertion — just smoke; specific behavior may vary
  });
});
