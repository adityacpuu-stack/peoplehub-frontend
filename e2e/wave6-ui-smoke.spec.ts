import { test, expect } from '@playwright/test';
import { login, creds } from './helpers/auth';

/**
 * Wave 6 UI smoke specs — scoped tight: 4 tests only.
 *
 * 1. EmployeeFormPage /options dropdown render (Super Admin)
 * 2. Resign modal open/close (Super Admin)
 * 3. Profile edit + save mobile_number (Employee)
 * 4. Leave request modal has no half-day toggle (Employee)
 */

// ─── 1. EmployeeFormPage Company dropdown options ────────────────────────────

test.describe('Wave 6 — EmployeeFormPage company options', () => {
  test('Company dropdown lists >=2 real options; selecting one enables Department', async ({ page }) => {
    await login(page, creds.superAdmin);
    await page.goto('/employees/create');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Personal Info/i).first()).toBeVisible();

    const companySelect = page.locator('select[name="company_id"]');
    await expect(companySelect).toBeVisible();
    // Wait for companies to populate.
    await expect.poll(async () => await companySelect.locator('option').count(), { timeout: 5_000 }).toBeGreaterThanOrEqual(3);

    const options = companySelect.locator('option');
    const total = await options.count();
    expect(total).toBeGreaterThanOrEqual(3); // placeholder + >=2 real

    // Pick first real company (skip placeholder at index 0).
    const firstRealValue = await options.nth(1).getAttribute('value');
    expect(firstRealValue).toBeTruthy();
    await companySelect.selectOption(firstRealValue!);

    // Department select exists in DOM (Step 2 hidden but rendered); placeholder
    // text flips from "Pilih Company dulu" to "Select Department" once
    // companyId is set — that's the interactivity signal.
    const deptSelect = page.locator('select[name="department_id"]');
    await expect(deptSelect.locator('option').first()).toHaveText(/Select Department/i, { timeout: 5_000 });
  });
});

// ─── 2. Resign modal open + close ─────────────────────────────────────────────

test.describe('Wave 6 — Resign modal lifecycle (Super Admin)', () => {
  test('Resign button opens modal with required fields; cancel closes it', async ({ page }) => {
    await login(page, creds.superAdmin);
    await page.goto('/employees/10/edit');
    await page.waitForLoadState('networkidle');

    // Resign button only renders when employment_status === 'active'.
    const resignBtn = page.getByRole('button', { name: /^Resign$/ });
    await expect(resignBtn).toBeVisible({ timeout: 10_000 });
    await resignBtn.click();

    // Modal heading visible (text matches /resign/i).
    await expect(page.getByRole('heading', { name: /Resign Karyawan/i })).toBeVisible();

    // Confirm fields visible.
    await expect(page.locator('input[type="date"][name="resign_date"]')).toBeVisible();
    await expect(page.locator('select[name="resign_type"]')).toBeVisible();
    await expect(page.locator('input[name="resign_reason"]')).toBeVisible();

    // Cancel closes modal — don't submit.
    await page.getByRole('button', { name: /^Batal$/ }).click();
    await expect(page.getByRole('heading', { name: /Resign Karyawan/i })).toBeHidden();
  });
});

// ─── 3. Profile save with mobile_number (Employee) ────────────────────────────

test.describe('Wave 6 — Profile edit + save (Employee)', () => {
  test('Edit Profile → fill mobile_number → Save → success toast + read-only', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const editBtn = page.getByRole('button', { name: /Edit Profile/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Save button visible = edit mode active.
    const saveBtn = page.getByRole('button', { name: /^Save$/ });
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });

    const mobileInput = page.locator('input[name="mobile_number"]');
    await expect(mobileInput).toBeVisible();
    await mobileInput.fill('081234567899');

    await saveBtn.click();

    await expect(page.locator('[role="status"]').filter({ hasText: /Profile updated/i }).first()).toBeVisible({ timeout: 6_000 });

    // Returns to read-only — Edit Profile button visible again.
    await expect(page.getByRole('button', { name: /Edit Profile/i })).toBeVisible({ timeout: 5_000 });
  });
});

// ─── 4. Leave request modal — no half-day toggle ──────────────────────────────

test.describe('Wave 6 — Leave request modal (Employee)', () => {
  test('New Request modal exposes required fields and has NO half-day toggle', async ({ page }) => {
    await login(page, creds.employee);
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Request/i }).click();
    await expect(page.getByRole('heading', { name: /New Leave Request/i })).toBeVisible();

    // Required fields present.
    await expect(page.locator('select[name="leave_type_id"]')).toBeVisible();
    await expect(page.locator('input[name="start_date"]')).toBeVisible();
    await expect(page.locator('input[name="end_date"]')).toBeVisible();
    await expect(page.locator('textarea[name="reason"]')).toBeVisible();

    // No half-day checkbox / label anywhere in modal (Wave 6 removed it).
    await expect(page.getByLabel(/half[- ]day/i)).toHaveCount(0);
    await expect(page.getByText(/half[- ]day/i)).toHaveCount(0);

    // Close modal — don't submit.
    await page.getByRole('button', { name: /^Cancel$/ }).click();
    await expect(page.getByRole('heading', { name: /New Leave Request/i })).toBeHidden();
  });
});
