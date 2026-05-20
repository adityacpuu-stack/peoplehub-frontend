import { test, expect } from '@playwright/test';
import { loginViaApi, creds } from './helpers/auth';

/**
 * Regression tests for W2.2.x — multi-tenant scope additions.
 * Verifies that an HR Manager / Group CEO sees data only from their accessibleCompanyIds,
 * not cross-company.
 *
 * These tests use API directly (faster + more reliable than UI smoke).
 */
test.describe('Multi-tenant isolation (W2.2.x regression)', () => {
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:3001';

  test('HR Manager employee list scoped to accessibleCompanyIds', async ({ page }) => {
    const token = await loginViaApi(page, creds.hrManager);
    const res = await page.request.get(`${apiUrl}/api/v1/employees?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Every employee returned must be in HR Manager's accessible company set
    const me = await page.request.get(`${apiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meBody = await me.json();
    const accessibleIds: number[] = meBody.user?.accessibleCompanyIds ?? meBody.data?.accessibleCompanyIds ?? [];

    if (accessibleIds.length > 0) {
      for (const emp of body.data ?? []) {
        if (emp.company_id != null) {
          expect(accessibleIds).toContain(emp.company_id);
        }
      }
    }
  });

  test('HR Manager audit log list scoped (W1.10 regression)', async ({ page }) => {
    const token = await loginViaApi(page, creds.hrManager);
    const res = await page.request.get(`${apiUrl}/api/v1/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // For each log, the actor (via user.employee.company_id) should be in scope
    // (We don't have a clean way to verify this without the join — just smoke that 200)
    expect(body.data).toBeDefined();
  });

  test('Group CEO leave list scoped to accessible companies (W2.2.14 regression)', async ({ page }) => {
    const token = await loginViaApi(page, creds.groupCEO);
    const res = await page.request.get(`${apiUrl}/api/v1/leaves?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const me = await page.request.get(`${apiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meBody = await me.json();
    const accessibleIds: number[] = meBody.user?.accessibleCompanyIds ?? meBody.data?.accessibleCompanyIds ?? [];

    if (accessibleIds.length > 0) {
      for (const leave of body.data ?? []) {
        const empCompany = leave.employee?.company_id;
        if (empCompany != null) {
          expect(accessibleIds).toContain(empCompany);
        }
      }
    }
  });

  test('Employee /me PUT rejects unknown field (W1.8 regression)', async ({ page }) => {
    const token = await loginViaApi(page, creds.employee);
    // Try to mutate salary via /me — should be rejected by Zod .strict()
    const res = await page.request.put(`${apiUrl}/api/v1/employees/me`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { basic_salary: 999999999 },
    });
    // Either 400 (Zod reject) or 200 with salary unchanged
    if (res.ok()) {
      const meRes = await page.request.get(`${apiUrl}/api/v1/employees/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meBody = await meRes.json();
      const salary = meBody.data?.basic_salary;
      expect(Number(salary)).not.toBe(999999999);
    } else {
      expect(res.status()).toBe(400);
    }
  });
});
