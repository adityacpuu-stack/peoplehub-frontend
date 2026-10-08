import { test, expect, type Page } from '@playwright/test';

async function mockAdmin(page: Page, options: { roles?: string[]; companies?: boolean; preferencesFail?: boolean; health?: 'healthy' | 'unhealthy' } = {}) {
  const localOrigin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const calls: string[] = [];
  const unexpected: string[] = [];
  const errors: string[] = [];
  const roles = options.roles ?? ['Super Admin'];
  const user = { id: 91, email: 'admin@example.test', roles, permissions: [], employee: null,
    is_active: true, force_password_change: false, accessibleCompanyIds: [2] };
  const company = { id: 2, name: 'Test Company', code: 'TEST', company_type: 'subsidiary', status: 'active' };
  await page.addInitScript(() => localStorage.setItem('token', 'isolated-admin-test'));
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === localOrigin && request.resourceType() === 'document' && !url.pathname.startsWith('/api/')) {
      return route.continue();
    }
    const path = url.pathname.replace(/^\/api\/v1/, '');
    if (url.origin === 'https://ui-avatars.com') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (url.origin === localOrigin && path === '/audit-logs/events' && request.method() === 'POST') return route.fulfill({ status: 204 });
    let data: unknown;
    if (path === '/auth/me') data = { user };
    else if (path === '/companies') data = options.companies ? [company] : [];
    else if (path === '/companies/2') data = { ...company, address: 'Saved Address', website: 'https://example.test', tax_id: 'TEST-TAX', email_domain: 'example.test' };
    else if (path === '/companies/2/settings') data = { name: 'Test Company', timezone: 'Asia/Jakarta', currency: 'IDR' };
    else if (path === '/users/me/preferences') {
      if (options.preferencesFail) return route.fulfill({ status: 500, json: { success: false, error: { message: 'Preferences unavailable' } } });
      data = { email_leave_request: true, email_leave_approval: true };
    } else if (path === '/dashboard/super-admin-stats') data = { total_users: 17, total_companies: 2, total_employees: 14, audit_entries_today: 3 };
    else if (path === '/audit-logs/statistics') data = { total: 0, by_action: [], top_users: [], daily_activity: [] };
    else if (path === '/health') {
      calls.push(path);
      return route.fulfill({ json: { services: Object.fromEntries(['api','database','storage','cache'].map(name => [name, { status: options.health ?? 'healthy' }])) } });
    } else if (path === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/audit-logs/recent', '/presence'].includes(path)) data = [];
    else {
      if (url.origin === localOrigin && !['xhr', 'fetch'].includes(request.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
      unexpected.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    calls.push(`${request.method()} ${path}`);
    return route.fulfill({ json: { success: true, data, meta: { total: Array.isArray(data) ? data.length : 1, page: 1, totalPages: 1 } } });
  });
  return { calls, unexpected, errors };
}

test('Settings follows sidebar URLs without a reload or unrelated payroll initialization', async ({ page }) => {
  const mock = await mockAdmin(page, { companies: true });
  await page.goto('/settings/integrations');
  // The fixture user has no account language, so the UI renders Indonesian ("System Settings" group).
  await page.locator('aside').getByRole('button', { name: 'Pengaturan Sistem', exact: true }).click();
  await page.locator('aside a[href="/settings/general"]').click();
  await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pengaturan Umum', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click();
  await page.locator('aside a[href="/settings/notifications"]').click();
  await expect(page.getByRole('heading', { name: 'Pengaturan Notifikasi', exact: true })).toBeVisible();
  expect(mock.calls).not.toContain('GET /payroll-settings/company/2/init');
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

test('a direct settings link can be refreshed and closes to dashboard', async ({ page }) => {
  const mock = await mockAdmin(page);
  await page.goto('/settings/notifications');
  await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

test('notifications can be loaded and saved without a company', async ({ page }) => {
  const mock = await mockAdmin(page);
  await page.goto('/settings/notifications');
  await expect(page.getByRole('heading', { name: 'Pengaturan Notifikasi', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /Pengajuan cuti/ }).uncheck();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect.poll(() => mock.calls.includes('PUT /users/me/preferences')).toBe(true);
  expect(mock.unexpected).toEqual([]);
});

test('failed preferences do not silently turn into editable default values', async ({ page }) => {
  await mockAdmin(page, { preferencesFail: true });
  await page.goto('/settings/notifications');
  await expect(page.getByText('Gagal memuat pengaturan. Data belum dapat disimpan.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toHaveCount(0);
});

test('account security is available without a company or unrelated settings requests', async ({ page }) => {
  const mock = await mockAdmin(page);
  await page.goto('/security/sessions');
  // The breadcrumb/navigation also say "Keamanan Akun"; assert the settings panel's own heading.
  await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true }).getByRole('heading', { name: 'Keamanan Akun', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toHaveCount(0);
  expect(mock.calls).not.toContain('GET /users/me/preferences');
  expect(mock.unexpected).toEqual([]);
});

for (const health of ['healthy', 'unhealthy'] as const) {
  test(`Super Admin + Tax fetches admin statistics and displays ${health} health honestly`, async ({ page }) => {
    const mock = await mockAdmin(page, { roles: ['Super Admin', 'Tax Staff'], health });
    await page.goto('/dashboard');
    // Indonesian UI (no account language): "All Systems Operational" / "Some Services Unavailable".
    await expect(page.getByText(health === 'healthy' ? 'Semua Sistem Beroperasi' : 'Beberapa Layanan Tidak Tersedia', { exact: true })).toBeVisible();
    expect(mock.calls).toContain('GET /dashboard/super-admin-stats');
    expect(mock.unexpected).toEqual([]);
    expect(mock.errors).toEqual([]);
  });
}

test('company edit loads saved detail fields instead of empty list fields', async ({ page }) => {
  const mock = await mockAdmin(page, { companies: true });
  await page.goto('/companies');
  await page.getByRole('button', { name: 'Edit Test Company', exact: true }).click();
  await expect(page.locator('input[name="npwp"]')).toHaveValue('TEST-TAX');
  await expect(page.locator('input[name="email_domain"]')).toHaveValue('example.test');
  await expect(page.locator('textarea[name="address"]')).toHaveValue('Saved Address');
  expect(mock.calls).toContain('GET /companies/2');
  expect(mock.unexpected).toEqual([]);
});

test('Super Admin with an additional CEO role retains its administration dashboard', async ({ page }) => {
  const mock = await mockAdmin(page, { roles: ['Super Admin', 'CEO'] });
  await page.goto('/dashboard');
  await expect(page.getByText('Semua Sistem Beroperasi', { exact: true })).toBeVisible();
  expect(mock.calls).toContain('GET /dashboard/super-admin-stats');
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});
