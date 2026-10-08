import { test, expect, type Page } from '@playwright/test';
import type { LeaveAllocationRequest, LeaveAllocationResult } from '../src/services/leave.service';

const employee = { id: 901, employee_id: 'TEST-901', name: 'Synthetic Staff', company_id: 2,
  company: { id: 2, name: 'Synthetic Company' }, department: { id: 10, name: 'Synthetic Department' },
  profile_completed: true, national_id: '0000000000000901', email: 'staff@example.test',
  employment_status: 'active', join_date: '2025-12-15', probation_end_date: '2026-03-15' };
const types = [{ id: 71, name: 'Annual Leave', code: 'AL', default_days: 12 },
  { id: 72, name: 'Maternity', code: 'MATERNITY', default_days: 90 }];

async function session(page: Page) {
  const state = {
    requests: [] as LeaveAllocationRequest[], employeeQueries: [] as string[], unexpected: [] as string[], errors: [] as string[],
    failPreview: false, failApply: false, existing: false, holdAnnual: false,
    releaseAnnual: undefined as (() => void) | undefined, concurrentInsert: false,
  };
  // Assertions below are English; the app defaults to Indonesian without an account language.
  const user = { id: 91, email: 'staff@example.test', roles: ['HR Staff'], permissions: [], language: 'en',
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee,
    companyFeatures: { leave_enabled: true, attendance_enabled: true, payroll_enabled: true, performance_enabled: true } };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('token', 'isolated-allocation-test'); });
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && !['xhr', 'fetch'].includes(req.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    const pagination = { page: 1, limit: 10, total: 1, totalPages: 1 };
    const paginated = (data: unknown[], key = 'meta') => route.fulfill({ json: { success: true, data, [key]: pagination } });
    const fail = () => route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic unavailable' } } });
    let data: unknown;
    // Client audit beacon (telemetry), not an application request under test.
    if (endpoint === '/audit-logs/events' && req.method() === 'POST') return route.fulfill({ status: 204 });
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/employees/me') data = employee;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (endpoint === '/presence') data = {};
    else if (endpoint === '/users/me/preferences') data = {};
    else if (endpoint === '/companies') return paginated([employee.company], 'pagination');
    else if (endpoint === '/departments') return paginated([employee.department]);
    else if (endpoint === '/employees') { state.employeeQueries.push(url.search); return paginated([employee]); }
    else if (endpoint === '/leaves/types') data = types;
    else if (endpoint === '/leaves/balances/list') data = [{ id: 51, employee_id: 901, leave_type_id: 71, year: 2026,
      allocated_days: '12', remaining_days: '9', used_days: '3', pending_days: '2', leaveType: types[0] }];
    else if (endpoint === '/leaves/balances/allocate-defaults' && req.method() === 'POST') {
      const body = req.postDataJSON() as LeaveAllocationRequest;
      state.requests.push(body);
      if (body.dry_run && state.failPreview || !body.dry_run && state.failApply) return fail();
      const selected = body.leave_type_ids ? types.filter(type => body.leave_type_ids!.includes(type.id)) : types;
      const skipped = state.existing || !body.dry_run && state.concurrentInsert;
      // Synthetic server responses. The browser must display these, with no local formula.
      const result: LeaveAllocationResult = {
        year: 2026, dryRun: body.dry_run, employeesConsidered: 1, created: skipped ? 0 : selected.length,
        skippedBalanceExists: skipped ? selected.length : 0, skippedHasLeaveHistory: 0, skippedNotEntitledThisYear: 0,
        totalDaysGranted: skipped ? 0 : selected.reduce((sum, type) => sum + (type.id === 71 ? 9 : 90), 0),
        leaveTypes: selected, lines: selected.map(type => ({ employee_id: 901, leave_type_id: type.id, leave_type: type.name,
          probation_end_date: '2026-03-15', days: skipped ? 0 : type.id === 71 ? 9 : 90,
          outcome: skipped ? 'skipped_balance_exists' : 'created' })),
      };
      if (state.holdAnnual && body.dry_run && body.leave_type_ids?.[0] === 71) {
        await new Promise<void>(resolve => { state.releaseAnnual = resolve; });
      }
      data = result;
    } else { state.unexpected.push(`${req.method()} ${endpoint}`); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/leave/entitlements');
  await expect(page.getByTitle('Allocate Leave', { exact: true })).toBeVisible();
  return state;
}

test('individual allocation uses server preview and submits identifiers only', async ({ page }) => {
  const state = await session(page);
  await page.getByTitle('Allocate Leave', { exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Allocate Leave', exact: true });
  await expect(modal.locator('dt').filter({ hasText: 'Days to allocate' }).locator(' + dd')).toHaveText('9');
  await expect(modal.getByRole('spinbutton')).toHaveCount(0);
  await modal.getByRole('button', { name: 'Allocate', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(state.requests.filter(body => !body.dry_run)).toEqual([
    { employee_id: 901, leave_type_ids: [71], year: 2026, dry_run: false },
  ]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('bulk allocation passes the selected scope to one server operation', async ({ page }) => {
  const state = await session(page);
  await page.getByLabel('Company filter').selectOption('2');
  await page.getByLabel('Department filter').selectOption('10');
  await page.getByPlaceholder('Search by employee name, ID...').fill('Synthetic');
  await expect.poll(() => state.employeeQueries.some(query => query.includes('search=Synthetic'))).toBe(true);
  await page.getByRole('button', { name: 'Bulk Allocate', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Bulk Allocate Leave' });
  await expect(modal.locator('dt').filter({ hasText: 'Days to allocate' }).locator(' + dd')).toHaveText('99');
  await modal.getByRole('button', { name: 'Confirm Allocate' }).click();
  await expect(modal).not.toBeVisible();
  expect(state.requests.filter(body => !body.dry_run)).toEqual([
    { company_id: 2, department_id: 10, search: 'Synthetic', year: 2026, dry_run: false },
  ]);
  expect(state.employeeQueries.every(query => !query.includes('limit=1000'))).toBe(true);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('preview failure prevents submission and supports retry', async ({ page }) => {
  const state = await session(page); state.failPreview = true;
  await page.getByTitle('Allocate Leave', { exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Allocate Leave', exact: true });
  await expect(modal.getByRole('alert')).toContainText('Could not load');
  await expect(modal.getByRole('button', { name: 'Allocate', exact: true })).toBeDisabled();
  expect(state.requests.every(body => body.dry_run)).toBe(true);
  state.failPreview = false;
  await modal.getByRole('button', { name: 'Try Again' }).click();
  await expect(modal.getByRole('button', { name: 'Allocate', exact: true })).toBeEnabled();
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('changing type ignores a late annual preview and preserves full maternity quota', async ({ page }) => {
  const state = await session(page); state.holdAnnual = true;
  await page.getByTitle('Allocate Leave', { exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Allocate Leave', exact: true });
  await expect.poll(() => Boolean(state.releaseAnnual)).toBe(true);
  await expect(modal.getByRole('button', { name: 'Allocate', exact: true })).toBeDisabled();
  await page.getByLabel('Allocation leave type').selectOption('72');
  const days = modal.locator('dt').filter({ hasText: 'Days to allocate' }).locator(' + dd');
  await expect(days).toHaveText('90');
  const response = page.waitForResponse(res => res.request().postDataJSON()?.leave_type_ids?.[0] === 71 && res.url().includes('allocate-defaults'));
  state.releaseAnnual!(); await response;
  await expect(days).toHaveText('90');
  await modal.getByRole('button', { name: 'Allocate', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(state.requests.filter(body => !body.dry_run)[0].leave_type_ids).toEqual([72]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('existing balances cannot be reapplied from the allocation modal', async ({ page }) => {
  const state = await session(page); state.existing = true;
  await page.getByTitle('Allocate Leave', { exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Allocate Leave', exact: true });
  await expect(modal.getByText('No new balances to allocate for this selection.')).toBeVisible();
  await expect(modal.locator('dt').filter({ hasText: 'Existing balances skipped' }).locator(' + dd')).toHaveText('1');
  await expect(modal.getByRole('button', { name: 'Allocate', exact: true })).toBeDisabled();
  expect(state.requests.every(body => body.dry_run)).toBe(true);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('apply reports actual skipped results when balances changed after preview', async ({ page }) => {
  const state = await session(page); state.concurrentInsert = true;
  await page.getByRole('button', { name: 'Bulk Allocate', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Bulk Allocate Leave' });
  await modal.getByRole('button', { name: 'Confirm Allocate' }).click();
  await expect(page.getByText('Allocated 0 balances. Skipped 2.')).toBeVisible();
  await expect(modal).not.toBeVisible();
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('failed apply refreshes preview before retrying', async ({ page }) => {
  const state = await session(page); state.failApply = true;
  await page.getByRole('button', { name: 'Bulk Allocate', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Bulk Allocate Leave' });
  await modal.getByRole('button', { name: 'Confirm Allocate' }).click();
  await expect.poll(() => state.requests.filter(body => body.dry_run).length).toBeGreaterThan(1);
  await expect(modal.getByRole('button', { name: 'Confirm Allocate' })).toBeEnabled();
  state.failApply = false;
  await modal.getByRole('button', { name: 'Confirm Allocate' }).click();
  await expect(modal).not.toBeVisible();
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});
