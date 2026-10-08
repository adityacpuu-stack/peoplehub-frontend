import { test, expect, type Page } from '@playwright/test';

// Synthetic API responses only; no payroll generation or production connection.
async function openPayroll(page: Page, factor: number | string | null, days: number) {
  const employee = {
    id: 901, employee_id: 'TEST-901', name: 'Synthetic Payroll Staff', company_id: 2,
    employment_type: 'permanent', employment_status: 'active', profile_completed: true,
    national_id: '0000000000000901', email: 'staff@example.test',
    company: { id: 2, name: 'Synthetic Company', code: 'TEST' },
  };
  const user = { id: 91, email: 'finance@example.test', roles: ['Finance Manager'], permissions: [],
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
  const payroll = {
    id: 701, employee_id: 901, company_id: 2, employee, status: 'draft', period: '2026-07',
    payroll_number: 'TEST-PAY-701', pay_type: 'gross', basic_salary: days ? '4200000' : '0',
    gross_salary: days ? '4900000' : '0', position_allowance: days ? '700000' : '0',
    total_deductions: '0', net_salary: days ? '4900000' : '0', take_home_pay: days ? '4900000' : '0',
    pph21: '0', bpjs_employee_total: '264000', bpjs_company_total: '610764',
    working_days: 22, actual_working_days: days, is_prorated: true, prorate_factor: factor,
    prorate_reason: 'Synthetic joining-period proration',
  };
  const state = { unexpected: [] as string[], errors: [] as string[], payrollCalls: [] as string[] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-payroll-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && !['xhr', 'fetch'].includes(request.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && endpoint === '/audit-logs/events' && request.method() === 'POST') return route.fulfill({ status: 204 });
    let data: unknown;
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/employees/me') data = employee;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (request.method() === 'GET' && ['/companies', '/payroll'].includes(endpoint)) {
      if (endpoint === '/payroll') state.payrollCalls.push(`GET ${endpoint}`);
      data = endpoint === '/companies' ? [employee.company] : [payroll];
      return route.fulfill({ json: { success: true, data, pagination: { page: 1, limit: 500, total: 1, totalPages: 1 } } });
    } else if (request.method() === 'GET' && endpoint === '/payroll/701') {
      state.payrollCalls.push(`GET ${endpoint}`); data = payroll;
    } else {
      state.unexpected.push(`${request.method()} ${endpoint}`);
      return route.abort();
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/payroll');
  await page.getByTitle('Lihat Detail').click();
  await expect(page.getByRole('heading', { name: employee.name, exact: true })).toBeVisible();
  return state;
}

for (const factor of [0, '0', null]) {
  test(`proration detail preserves ${JSON.stringify(factor)} without displaying 100%`, async ({ page }) => {
    const state = await openPayroll(page, factor, 0);
    // Indonesian UI (fixture user has no account language): "Faktor", id-ID decimal comma.
    await expect(page.getByText('Faktor', { exact: true }).locator('..')).toHaveText(`Faktor${factor == null ? '-' : '0,00%'}`);
    await expect(page.getByText('Hari Hadir', { exact: true }).locator('..')).toContainText('0 hari');
    expect(state.payrollCalls).toContain('GET /payroll/701');
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test('proration detail displays saved decimal values without calculating salary in the browser', async ({ page }) => {
  const state = await openPayroll(page, String(14 / 22), 14);
  await expect(page.getByText('Faktor', { exact: true }).locator('..')).toHaveText('Faktor63,64%'); // 14/22 saved factor, id-ID format
  await expect(page.getByText('Hari Hadir', { exact: true }).locator('..')).toContainText('14 hari');
  await expect(page.getByText('Hari Kerja', { exact: true }).locator('..')).toContainText('22 hari');
  await expect(page.locator('span').filter({ hasText: /^Gaji Pokok$/ }).locator('..')).toContainText(/4[.]200[.]000/);
  await expect(page.getByText('Tunjangan Jabatan', { exact: true }).locator('..')).toContainText(/700[.]000/);
  expect(state.payrollCalls.every(call => call.startsWith('GET '))).toBe(true);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});
