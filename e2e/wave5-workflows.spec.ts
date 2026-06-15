import { test, expect } from '@playwright/test';
import { login, creds } from './helpers/auth';

/**
 * Wave 5 workflow e2e specs — scoped tight: 2 tests only.
 *
 * 1. Work Locations create flow (Super Admin) — guards the envelope-unwrap fix.
 * 2. Employee create step-1 gate (Super Admin) — guards the multi-step toast.
 *
 * Run with E2E_* env vars set (see playwright.config.ts header):
 *   npx playwright test e2e/wave5-workflows.spec.ts --reporter=list
 */

// ─── 1. Work Locations create (Super Admin) ───────────────────────────────────

test.describe('Wave 5 — Work Locations create (Super Admin)', () => {
  test('Super Admin can open list and create a work location', async ({ page }) => {
    const uniqueName = `E2E Loc ${Date.now()}`;

    await login(page, creds.superAdmin);
    await page.goto('/work-locations');
    await page.waitForLoadState('networkidle');

    // Page renders without crashing (envelope unwrap regression guard).
    await expect(page.getByRole('heading', { name: /Work Locations/i })).toBeVisible();

    // Open create modal.
    await page.getByRole('button', { name: /Tambah Lokasi/i }).click();
    await expect(page.getByRole('heading', { name: /Tambah Work Location/i })).toBeVisible();

    // Fill required fields.
    await page.getByPlaceholder('Head Office Jakarta').fill(uniqueName);

    // Company select — pick first non-empty option.
    const companySelect = page.locator('select').filter({ hasText: 'Pilih company...' });
    const companyOptions = await companySelect.locator('option').all();
    let pickedCompanyId = '';
    for (const opt of companyOptions) {
      const val = await opt.getAttribute('value');
      if (val && val !== '') { pickedCompanyId = val; break; }
    }
    expect(pickedCompanyId, 'At least one company must exist in dev DB').not.toBe('');
    await companySelect.selectOption(pickedCompanyId);

    await page.getByPlaceholder('Jl. Contoh No. 123...').fill('Jl. E2E Test No. 1');
    await page.getByPlaceholder('-6.2088').fill('-6.2');
    await page.getByPlaceholder('106.8456').fill('106.8');

    await page.getByRole('button', { name: /^Simpan$/ }).click();

    // Success toast appears.
    await expect(page.getByText(/Work location dibuat/i)).toBeVisible({ timeout: 5_000 });

    // New row visible in the list.
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(uniqueName, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  });
});

// ─── 2. Employee create — step-1 gate ─────────────────────────────────────────

test.describe('Wave 5 — Employee create step gate (Super Admin)', () => {
  test('Next Step without required fields shows validation toast', async ({ page }) => {
    await login(page, creds.superAdmin);
    await page.goto('/employees/create');
    await page.waitForLoadState('networkidle');

    // Step 1 visible.
    await expect(page.getByText(/Personal Info/i).first()).toBeVisible();

    // Click Next without filling — should trigger toast naming required fields.
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Toast text should mention "Please fix" prefix. Scope to react-hot-toast
    // wrapper (data-testid not exposed — use role=status which the lib emits)
    // to avoid matching unrelated "Perusahaan" labels in the form itself.
    await expect(
      page.locator('[role="status"]').filter({ hasText: /Please fix/i }).first()
    ).toBeVisible({ timeout: 4_000 });

    // Confirm we're still on step 1 — "Step 1 of 5" is rendered split across spans
    // (raw textContent of the wrapper still concatenates to "Step 1 of 5").
    await expect(page.getByText(/Step\s*1\s*of\s*5/i).first()).toBeVisible();
  });
});
