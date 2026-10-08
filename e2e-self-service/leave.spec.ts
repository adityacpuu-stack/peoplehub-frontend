import { test, expect, type Page } from '@playwright/test';

const year = new Date().getFullYear();
const day = `${year}-10-15`;
const employee = {
  id: 901, employee_id: 'TEST-HR-901', name: 'HR Staff Test', company_id: 1,
  department_id: 10, position_id: 20, employment_status: 'active',
  profile_completed: true, national_id: '0000000000000901',
  leaveApprover: { id: 902, name: 'HR Manager Test' },
};
const leaveType = {
  id: 71, company_id: 1, name: 'Annual Leave', code: 'annual', default_days: 12,
  min_days_per_request: '0.5', max_days_per_request: 12, is_paid: true, is_active: true,
};

async function mockSession(page: Page, options: {
  roles?: string[]; noEmployee?: boolean; leaveEnabled?: boolean; rejectSubmit?: boolean;
} = {}) {
  const roles = options.roles ?? ['HR Staff'];
  const user = {
    id: 91, email: 'hr-staff@example.test', is_active: true, force_password_change: false,
    roles, permissions: [], accessibleCompanyIds: [2],
    employee: options.noEmployee ? null : employee,
    companyFeatures: {
      attendance_enabled: true, leave_enabled: options.leaveEnabled ?? true,
      payroll_enabled: true, performance_enabled: true,
    },
  };
  const records: Record<string, unknown>[] = [];
  const posts: Record<string, unknown>[] = [];
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((workRoles) => {
    localStorage.setItem('token', 'isolated-test-token');
    localStorage.setItem('sidebar-storage', JSON.stringify({
      state: { isOpen: false, isCollapsed: false }, version: 0,
    }));
    // Stale work-menu preferences must not remove personal leave.
    localStorage.setItem('sidebar_role_config', JSON.stringify(
      Object.fromEntries(workRoles.map((role) => [role, { '/my-leave': false }]))
    ));
  }, roles);

  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === 'https://ui-avatars.com' && req.resourceType() === 'image') {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" />' });
    }
    const path = url.pathname.replace(/^\/api\/v1/, '');
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && path === '/audit-logs/events' && req.method() === 'POST') {
      return route.fulfill({ status: 204 });
    }
    let data: unknown;
    if (path === '/auth/me') data = { user };
    else if (path === '/employees/me') data = employee;
    else if (path === '/leaves/me/types') data = [leaveType];
    else if (path === '/leaves/me/balances') data = [{
      id: 81, employee_id: 901, leave_type_id: 71, year, allocated_days: '12',
      used_days: '0', pending_days: String(records.length), remaining_days: '12', leaveType,
    }];
    else if (path === '/leaves/me') {
      return route.fulfill({ json: { success: true, data: records, pagination: {
        page: 1, limit: 10, total: records.length, totalPages: Math.ceil(records.length / 10),
      } } });
    } else if (path === '/leaves' && req.method() === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      posts.push(body);
      if (options.rejectSubmit) return route.fulfill({ status: 400, json: {
        success: false, error: { message: 'Leave type is no longer available' },
      } });
      const created = {
        ...body, id: 501, employee_id: 901, status: 'pending', total_days: '1',
        leaveType, created_at: `${day}T08:00:00.000Z`,
      };
      records.push(created);
      return route.fulfill({ status: 201, json: { success: true, data: created } });
    } else if (path === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/leaves/my-approvals', '/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(path)) data = [];
    else if (path === '/presence' && req.method() === 'POST') data = {};
    else {
      // Only local UI assets reach the network. Unknown API calls fail closed.
      if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && !['xhr', 'fetch'].includes(req.resourceType()) && !url.pathname.startsWith('/api/')) {
        return route.continue();
      }
      unexpected.push(`${req.method()} ${url.pathname}`);
      return route.abort();
    }
    return route.fulfill({ json: { success: true, data } });
  });
  return { posts, records, unexpected, errors };
}

// Indonesian UI (fixture user has no account language): labels follow i18n/leaveResources.ts.
async function fillRequest(page: Page) {
  await page.getByRole('button', { name: 'Ajukan Cuti', exact: true }).click();
  const form = page.locator('#leave-request-form');
  await form.locator('select').selectOption('71');
  await expect(form.getByText('Cuti hanya tersedia dalam hari penuh (full day).')).toBeVisible();
  await expect(form.getByText(/Min\. 1 · Maks\. 12/)).toBeVisible();
  await expect(form.getByText(/Min\. 0[.,]5/)).toHaveCount(0);
  await form.locator('input[type=date]').nth(0).fill(day);
  await form.locator('input[type=date]').nth(1).fill(day);
  await form.locator('textarea').fill('Own leave regression');
  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
}

test('leave balances open on demand, preserve available/used/pending values and fit mobile', async ({ page }) => {
  const mock = await mockSession(page, { roles: ['Manager'] });
  await page.route('**/api/v1/leaves/me/balances', route => route.fulfill({ json: { success: true, data:
    ['Annual Leave', 'Maternity Leave', 'Sick Leave', 'Marriage Leave', 'Study Leave', 'Unpaid Leave', 'Paternity Leave', 'Bereavement Leave'].map((name, i) => ({
      id: 81 + i, employee_id: 901, leave_type_id: 71 + i, year, allocated_days: i === 1 ? '90' : '12', used_days: i === 0 ? '2' : '0',
      pending_days: i === 0 ? '1' : '0', remaining_days: i === 1 ? '90' : i === 0 ? '10' : '12', leaveType: { ...leaveType, id: 71 + i, name, code: name.split(' ')[0].toLowerCase() },
    })) } }));
  await page.goto('/my-leave');
  await expect(page.locator('.personal-balance-grid,.personal-balance-row')).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Lihat saldo cuti' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Saldo cuti', exact: true });
  await expect(dialog.locator('.personal-balance-row')).toHaveCount(8);
  await expect(dialog.locator('.personal-balance-row').first().locator('.personal-balance-available')).toContainText('9');
  await expect(dialog.locator('.personal-balance-row').first().locator('dd')).toHaveText(['12 hari', '2 hari', '1 hari']);
  await expect(dialog.locator('.personal-balance-row').nth(1).locator('.personal-balance-available')).toContainText('90');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await dialog.locator('.personal-balance-list').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: `../.analysis/my-leave-balance-qa/balances-${width}.png`, animations: 'disabled' });
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await dialog.locator('.personal-balance-list').evaluate(node => { node.scrollTop = node.scrollHeight; });
    await expect(dialog.getByRole('heading', { name: 'Bereavement Leave' })).toBeVisible();
    const footer = await dialog.getByRole('button', { name: 'Tutup', exact: true }).boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(844);
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Ajukan Cuti', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('9 hari');
  expect(mock.posts).toHaveLength(0); expect(mock.errors).toEqual([]); expect(mock.unexpected).toEqual([]);
});

test('empty balance popup explains missing allocation without inventing a zero entitlement', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/v1/leaves/me/balances', route => route.fulfill({ json: { success: true, data: [] } }));
  await page.goto('/my-leave'); await page.getByRole('button', { name: 'Lihat saldo cuti' }).click();
  await expect(page.getByRole('dialog')).toContainText('Belum ada saldo cuti yang dialokasikan');
  await expect(page.locator('.personal-balance-row')).toHaveCount(0);
});

test('failed balance loading cannot expose stale balances and retry restores the button', async ({ page }) => {
  await mockSession(page); let failed = true;
  await page.route('**/api/v1/leaves/me/balances', route => route.fulfill(failed
    ? { status: 503, json: { success: false, error: { message: 'Synthetic unavailable' } } }
    : { json: { success: true, data: [] } }));
  await page.goto('/my-leave'); await expect(page.getByRole('heading', { name: 'Data cuti tidak dapat dimuat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lihat saldo cuti' })).toHaveCount(0);
  failed = false; await page.getByRole('button', { name: 'Coba Lagi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lihat saldo cuti' })).toBeVisible();
});

test('HR Staff submits own leave and sees it after refresh', async ({ page }) => {
  const mock = await mockSession(page);
  await page.goto('/my-leave');
  const personalLink = page.locator('aside').getByRole('link', { name: 'Cuti Saya', exact: true });
  await expect(personalLink).toBeVisible();
  await personalLink.click();
  await fillRequest(page);
  await expect(page.getByText('Own leave regression', { exact: true }).first()).toBeVisible();
  expect(mock.posts).toHaveLength(1);
  expect(mock.posts[0]).toMatchObject({ leave_type_id: 71, start_date: day, end_date: day });
  expect(mock.posts[0]).not.toHaveProperty('employee_id');
  expect(mock.posts[0]).not.toHaveProperty('start_half_day');
  expect(mock.posts[0]).not.toHaveProperty('end_half_day');
  await page.reload();
  await expect(page.getByText('Own leave regression', { exact: true }).first()).toBeVisible();
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

for (const roles of [
  ['HR Staff'], ['HR Manager'], ['HR Staff', 'Tax Staff'], ['HR Staff', 'Manager'],
  ['Manager'], ['Employee'], ['CEO'], ['Group CEO'], ['Finance Manager'], ['Super Admin'],
]) {
  test(`personal leave is additive and unique for ${roles.join(' + ')}`, async ({ page }) => {
    const mock = await mockSession(page, { roles });
    await page.goto('/my-leave');
    const link = page.locator('aside').getByRole('link', { name: 'Cuti Saya', exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajukan Cuti', exact: true })).toBeVisible();
    expect(mock.unexpected).toEqual([]);
    expect(mock.errors).toEqual([]);
  });
}

for (const options of [{ noEmployee: true }, { leaveEnabled: false }]) {
  test(`does not show personal leave when ${JSON.stringify(options)}`, async ({ page }) => {
    await mockSession(page, options);
    await page.goto('/my-leave');
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside a[href="/my-leave"]')).toHaveCount(0);
  });
}

test('submission error stays visible and keeps the form open', async ({ page }) => {
  const mock = await mockSession(page, { rejectSubmit: true });
  await page.goto('/my-leave');
  await fillRequest(page);
  // api.ts translates server messages (i18n/errors.ts): "Leave type is no longer available".
  await expect(page.getByText('Jenis cuti sudah tidak tersedia').first()).toBeVisible();
  await expect(page.locator('#leave-request-form')).toBeVisible();
  await expect(page.locator('#leave-request-form textarea')).toHaveValue('Own leave regression');
  expect(mock.records).toHaveLength(0);
  expect(mock.unexpected).toEqual([]);
});

test('HR personal leave remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mock = await mockSession(page);
  await page.goto('/my-leave');
  await expect(page.getByRole('button', { name: 'Ajukan Cuti', exact: true })).toBeVisible();
  await page.locator('header button').filter({ has: page.locator('svg.lucide-menu') }).click();
  const link = page.locator('aside').getByRole('link', { name: 'Cuti Saya', exact: true });
  await expect(link).toBeInViewport();
  await link.click();
  await expect(link).not.toBeInViewport();
  await fillRequest(page);
  await expect(page.getByText('Own leave regression', { exact: true }).first()).toBeVisible();
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});
