import { test, expect } from '@playwright/test';
import { login, creds } from './helpers/auth';

/**
 * Regression test for W1.6 — leave reject/approve payload bug.
 * Previously: FE sent `{reason}` but backend expected `rejection_reason` →
 * every reject returned 400. After fix, payload uses `rejection_reason`.
 *
 * This test ensures the fix stays correct.
 */
test.describe('Leave workflow (W1.6 regression)', () => {
  test('HR Manager rejecting a leave does not 400', async ({ page }) => {
    await login(page, creds.hrManager);
    await page.goto('/leave-approval');

    // Wait for the table to render
    await page.waitForLoadState('networkidle');

    // Find first row with "Pending" status (skip if no pending leaves in test data)
    const pendingRow = page.locator('tr', { hasText: /pending/i }).first();
    const exists = await pendingRow.count();
    test.skip(exists === 0, 'No pending leaves in test data — skipping');

    // Track network response for the reject call
    const rejectResponsePromise = page.waitForResponse(
      (res) => /\/api\/v1\/leaves\/\d+\/reject/.test(res.url())
    );

    await pendingRow.getByRole('button', { name: /reject/i }).click();

    // Modal/prompt for reason — handle either native prompt or modal
    page.on('dialog', async (dialog) => {
      await dialog.accept('Smoke test rejection reason');
    });
    // If using modal:
    const reasonInput = page.locator('textarea[name="rejection_reason"], textarea[name="reason"]');
    if (await reasonInput.count() > 0) {
      await reasonInput.fill('Smoke test rejection reason');
      await page.getByRole('button', { name: /confirm|reject/i }).last().click();
    }

    const response = await rejectResponsePromise;
    expect(response.status()).toBe(200);
    const body = await response.json();
    // Verify the reason is persisted
    expect(body.data?.rejection_reason).toBeTruthy();
  });
});
