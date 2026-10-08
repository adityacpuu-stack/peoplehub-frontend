import { test, expect, type Page } from '@playwright/test';

// Isolated UI regression: every API call is mocked with synthetic data (no backend, accounts or writes).
const employee = { id: 901, employee_id: 'TEST-901', name: 'Synthetic Staff', company_id: 2,
  company: { id: 2, name: 'Synthetic Company' }, department: { id: 10, name: 'Synthetic Department' },
  profile_completed: true, national_id: '0000000000000901', email: 'staff@example.test',
  employment_status: 'active', join_date: '2025-12-15', probation_end_date: '2026-03-15' };
const types = [{ id: 71, name: 'Annual Leave', code: 'AL', default_days: 12 }, { id: 72, name: 'Maternity', code: 'MATERNITY', default_days: 90 }];
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const YEAR = new Date().getFullYear();

async function session(page: Page, options: { language?: 'en' | 'id'; employees?: unknown[] } = {}) {
  const state = {
    exports: [] as Array<Record<string, string>>, balanceQueries: [] as string[], unexpected: [] as string[], errors: [] as string[],
    allocationCalls: 0, failExport: false, holdExport: false, releaseExport: undefined as (() => void) | undefined,
  };
  const user = { id: 91, email: 'staff@example.test', roles: ['HR Staff'], permissions: [], language: options.language ?? 'en',
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee,
    companyFeatures: { leave_enabled: true, attendance_enabled: true, payroll_enabled: true, performance_enabled: true } };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('token', 'isolated-export-test'); });
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && !['xhr', 'fetch'].includes(req.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    const list = options.employees ?? [employee];
    const pagination = { page: 1, limit: 10, total: list.length, totalPages: 1 };
    const paginated = (data: unknown[], key = 'meta') => route.fulfill({ json: { success: true, data, [key]: { ...pagination, total: data.length } } });
    let data: unknown;
    if (endpoint === '/audit-logs/events' && req.method() === 'POST') return route.fulfill({ status: 204 });
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/employees/me') data = employee;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (endpoint === '/presence') data = {};
    else if (endpoint === '/users/me/preferences') data = {};
    else if (endpoint === '/companies') return paginated([employee.company], 'pagination');
    else if (endpoint === '/departments') return paginated([employee.department]);
    else if (endpoint === '/employees') return paginated(list);
    else if (endpoint === '/leaves/types') data = types;
    else if (endpoint === '/leaves/balances/list') {
      state.balanceQueries.push(url.search);
      data = [{ id: 51, employee_id: 901, leave_type_id: 71, year: YEAR, allocated_days: '12', remaining_days: '9', used_days: '3', pending_days: '2', leaveType: types[0] }];
    } else if (endpoint === '/leaves/balances/export' && req.method() === 'GET') {
      state.exports.push(Object.fromEntries(url.searchParams.entries()));
      if (state.holdExport) await new Promise<void>(resolve => { state.releaseExport = resolve; });
      if (state.failExport) return route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic unavailable' } } });
      return route.fulfill({ status: 200, contentType: XLSX, headers: { 'Cache-Control': 'private, no-store' }, body: Buffer.from('PK synthetic workbook bytes') });
    } else if (endpoint.startsWith('/leaves/balances/allocate')) { state.allocationCalls++; return route.abort(); }
    else { state.unexpected.push(`${req.method()} ${endpoint}`); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/leave/entitlements');
  return state;
}

const exportButton = (page: Page, name = 'Export Excel') => page.getByRole('button', { name, exact: true });
const dialog = (page: Page, name = 'Export leave entitlements') => page.getByRole('dialog', { name });

test('exports all matching employees with the snapshotted filters, default year and all statuses', async ({ page }) => {
  const state = await session(page);
  await expect(page.locator('[data-leave-balance]')).toHaveCount(1);
  await page.getByLabel('Company filter').selectOption('2');
  await page.getByLabel('Department filter').selectOption('10');
  await page.getByPlaceholder('Search by employee name, ID...').fill('Synthetic');
  await exportButton(page).click();
  const modal = dialog(page);
  await expect(modal).toContainText('Every page and every leave type is included');
  await expect(modal.locator('dt').filter({ hasText: 'Company' }).locator(' + dd')).toHaveText('Synthetic Company');
  await expect(modal.locator('dt').filter({ hasText: 'Department' }).locator(' + dd')).toHaveText('Synthetic Department');
  await expect(modal.locator('dt').filter({ hasText: 'Search text' }).locator(' + dd')).toHaveText('Synthetic');
  await expect(modal.getByLabel('Export year')).toHaveValue(String(YEAR));
  await expect(modal.getByLabel('Employees to include')).toHaveValue('all');
  await expect(modal).toContainText('lists active employees only');
  const download = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Download Excel' }).click();
  expect((await download).suggestedFilename()).toBe(`leave-entitlements-${YEAR}-all.xlsx`);
  await expect(modal).not.toBeVisible();
  await expect(page.getByText('Leave entitlements Excel downloaded.')).toBeVisible();
  expect(state.exports).toEqual([{ year: String(YEAR), employment_status: 'all', locale: 'en', company_id: '2', department_id: '10', search: 'Synthetic' }]);
  // No page or limit: the server selects every matching employee. Nothing is allocated, and the table keeps its year.
  expect(Object.keys(state.exports[0])).not.toContain('page');
  expect(Object.keys(state.exports[0])).not.toContain('limit');
  expect(state.allocationCalls).toBe(0);
  expect(state.balanceQueries.every(query => query.includes(`year=${YEAR}`))).toBe(true);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('sends the chosen export year and active-only status without changing the table', async ({ page }) => {
  const state = await session(page);
  await expect(page.locator('[data-leave-balance]')).toHaveCount(1);
  const balanceRequests = state.balanceQueries.length;
  await exportButton(page).click();
  const modal = dialog(page);
  await expect(modal.locator('dt').filter({ hasText: 'Company' }).locator(' + dd')).toHaveText('All assigned companies');
  await expect(modal.locator('dt').filter({ hasText: 'Search text' }).locator(' + dd')).toHaveText('No search');
  await modal.getByLabel('Export year').selectOption(String(YEAR - 1));
  await modal.getByLabel('Employees to include').selectOption('active');
  const download = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Download Excel' }).click();
  expect((await download).suggestedFilename()).toBe(`leave-entitlements-${YEAR - 1}-active.xlsx`);
  expect(state.exports).toEqual([{ year: String(YEAR - 1), employment_status: 'active', locale: 'en' }]);
  expect(state.balanceQueries.length).toBe(balanceRequests); // the table was not reloaded for another year
  await expect(page.getByRole('heading', { name: 'Leave Entitlements' })).toBeVisible();
  expect(state.allocationCalls).toBe(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('shows loading, blocks duplicate clicks, reports an error and retries', async ({ page }) => {
  const state = await session(page);
  await exportButton(page).click();
  const modal = dialog(page);
  state.failExport = true; state.holdExport = true;
  await modal.getByRole('button', { name: 'Download Excel' }).click();
  const busy = modal.getByRole('button', { name: 'Preparing export…' });
  await expect(busy).toBeDisabled();
  await busy.click({ force: true });
  await expect.poll(() => Boolean(state.releaseExport)).toBe(true);
  state.holdExport = false; state.releaseExport!();
  await expect(modal.getByRole('alert')).toContainText('The export could not be created. Nothing was changed.');
  expect(state.exports).toHaveLength(1);
  state.failExport = false;
  const download = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Try export again' }).click();
  expect((await download).suggestedFilename()).toBe(`leave-entitlements-${YEAR}-all.xlsx`);
  await expect(modal).not.toBeVisible();
  expect(state.exports).toHaveLength(2);
  expect(state.allocationCalls).toBe(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('export stays available when the current page has no employees', async ({ page }) => {
  const state = await session(page, { employees: [] });
  await expect(page.getByText('No employees found')).toBeVisible();
  await expect(exportButton(page)).toBeEnabled();
  await exportButton(page).click();
  const download = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Download Excel' }).click();
  expect((await download).suggestedFilename()).toBe(`leave-entitlements-${YEAR}-all.xlsx`);
  expect(state.exports).toHaveLength(1);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('passes the Indonesian locale and shows Indonesian copy', async ({ page }) => {
  const state = await session(page, { language: 'id' });
  await exportButton(page, 'Ekspor Excel').click();
  const modal = dialog(page, 'Ekspor hak cuti');
  await expect(modal.getByLabel('Karyawan yang disertakan')).toHaveValue('all');
  const download = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Unduh Excel' }).click();
  await download;
  expect(state.exports[0]).toMatchObject({ locale: 'id', employment_status: 'all', year: String(YEAR) });
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('cancel closes the dialog without any export request', async ({ page }) => {
  const state = await session(page);
  await exportButton(page).click();
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog(page)).not.toBeVisible();
  expect(state.exports).toEqual([]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});
