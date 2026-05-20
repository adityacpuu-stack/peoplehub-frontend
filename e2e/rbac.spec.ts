import { test, expect } from '@playwright/test';
import { login, creds } from './helpers/auth';

/**
 * Regression tests for W3.1 — App.tsx role-based route gating.
 * These verify that role-gated routes redirect non-privileged users to /403.
 */
test.describe('RBAC route gating (W3.1)', () => {
  test('Employee navigating to /users is redirected to /403', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/users');
    await expect(page).toHaveURL('/403');
    await expect(page.getByText(/Akses ditolak|access denied/i)).toBeVisible();
  });

  test('Employee navigating to /audit-logs is redirected to /403', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/audit-logs');
    await expect(page).toHaveURL('/403');
  });

  test('Employee navigating to /system-config is redirected to /403', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/system-config');
    await expect(page).toHaveURL('/403');
  });

  test('Employee navigating to /ceo/approvals is redirected to /403', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/ceo/approvals');
    await expect(page).toHaveURL('/403');
  });

  test('Employee navigating to /tax/pph21 is redirected to /403', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/tax/pph21');
    await expect(page).toHaveURL('/403');
  });

  test('HR Manager can access /users', async ({ page }) => {
    await login(page, creds.hrManager);
    await page.goto('/users');
    await expect(page).toHaveURL('/users');
  });

  test('Group CEO can access /ceo/approvals', async ({ page }) => {
    await login(page, creds.groupCEO);
    await page.goto('/ceo/approvals');
    await expect(page).toHaveURL('/ceo/approvals');
  });

  test('Super Admin can access /system-config (bypass)', async ({ page }) => {
    await login(page, creds.superAdmin);
    await page.goto('/system-config');
    await expect(page).toHaveURL('/system-config');
  });

  test('/403 page renders for direct visit', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/403');
    await expect(page.getByText(/Akses ditolak/i)).toBeVisible();
    // "Kembali ke Dashboard" button should be present
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });
});
