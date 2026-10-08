import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Read current route declarations directly so tests also work from a standalone
// frontend checkout. The human audit report in the parent folder is not a fixture.
const app = ts.createSourceFile('App.tsx', readFileSync(path.resolve('src/App.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const arrays = new Map<string, string[]>();
function visit(node: ts.Node, fn: (node: ts.Node) => void) { fn(node); ts.forEachChild(node, child => visit(child, fn)); }
function literal(node?: ts.Node): string | string[] | undefined {
  if (!node) return undefined;
  if (ts.isJsxExpression(node) || ts.isAsExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isIdentifier(node)) return arrays.get(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(item => ts.isStringLiteral(item) ? [item.text] : []);
  return undefined;
}
visit(app, node => {
  if (ts.isVariableDeclaration(node)) {
    const value = literal(node.initializer);
    if (Array.isArray(value)) arrays.set(node.name.getText(app), value);
  }
});
const inventory: { routes: Array<{ path: string; allowedRoles: string[] | null }> } = { routes: [] };
visit(app, node => {
  if ((!ts.isJsxSelfClosingElement(node) && !ts.isJsxOpeningElement(node)) || node.tagName.getText(app) !== 'Route') return;
  const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
  const routePath = literal(attrs.find(attr => attr.name.getText(app) === 'path')?.initializer);
  if (typeof routePath !== 'string') return;
  let allowedRoles: string[] | null = null;
  const element = attrs.find(attr => attr.name.getText(app) === 'element');
  if (element) visit(element, child => {
    if ((!ts.isJsxSelfClosingElement(child) && !ts.isJsxOpeningElement(child)) || child.tagName.getText(app) !== 'RoleRoute') return;
    const value = literal(child.attributes.properties.filter(ts.isJsxAttribute).find(attr => attr.name.getText(app) === 'allowedRoles')?.initializer);
    if (Array.isArray(value)) allowedRoles = value;
  });
  inventory.routes.push({ path: routePath, allowedRoles });
});
const employee = {
  id: 901, employee_id: 'TEST-901', name: 'Synthetic Staff', company_id: 1,
  personal_email: 'staff@example.test', email: 'staff-office@example.test',
  department_id: 10, position_id: 20, employment_status: 'active', employment_type: 'contract',
  profile_completed: true, national_id: '0000000000000901',
  join_date: '2026-01-01', probation_start_date: '2026-01-01', probation_end_date: '2026-06-30',
  jht_registered: true, jp_registered: true, medical_insurance: true, life_insurance: true,
  salary_status: 'existing', job_title: 'Old Title', bank_name: 'Synthetic Bank', address: 'Synthetic Address',
  company: { id: 1, name: 'Synthetic Company', code: 'TEST' },
};

// Account language is explicit per scenario: the app defaults to Indonesian, and
// each test's assertions are written in one language ('id' unless stated).
async function session(page: Page, roles: string[], options: { noEmployee?: boolean; attendanceEnabled?: boolean; language?: 'en' | 'id' } = {}) {
  const user = {
    id: 91, email: 'staff-office@example.test', roles, permissions: [], accessibleCompanyIds: [2], language: options.language ?? 'id',
    is_active: true, force_password_change: false, employee: options.noEmployee ? null : employee,
    companyFeatures: { attendance_enabled: options.attendanceEnabled ?? true, leave_enabled: true, payroll_enabled: true, performance_enabled: true },
  };
  const state = { calls: [] as string[], unexpected: [] as string[], errors: [] as string[], updates: [] as Record<string, unknown>[],
    creates: [] as Record<string, unknown>[], failEmployee: false, failReferences: false, failCreate: false,
    failAttendance: false, failFinance: false };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-role-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const localOrigin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
    if (url.origin === localOrigin && !['xhr', 'fetch'].includes(req.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    state.calls.push(`${req.method()} ${endpoint}${url.search}`);
    if (endpoint === '/audit-logs/events' && req.method() === 'POST') return route.fulfill({ status: 204 });
    const paginated = (data: unknown[], total = data.length, key = 'meta') => route.fulfill({ json: { success: true, data, [key]: { page: Number(url.searchParams.get('page') || 1), limit: 10, total, totalPages: Math.ceil(total / 10) } } });
    const failure = () => route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic unavailable response' } } });
    let data: unknown;
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/employees/me') data = employee;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/leaves/my-approvals', '/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (endpoint === '/presence') data = {};
    else if (endpoint === '/attendance/me/clock') data = { business_date: '2026-09-28', server_time: '2026-09-28T02:00:00Z', attendance: null, policy: { location_enabled: false, location_required: false, photo_check_in: false, photo_check_out: false, track_break: true, work_location: null } };
    else if (endpoint === '/attendance/me/history') {
      if (state.failAttendance) return failure();
      return paginated([{ id: 1, date: '2026-09-01T00:00:00.000Z', check_in: '2026-09-01T02:00:00.000Z', check_out: '2026-09-01T10:00:00.000Z', total_hours: '8', status: 'present' }], 11, 'pagination');
    } else if (endpoint === '/dashboard/payroll') {
      if (state.failFinance) return failure();
      data = { current_period: { period: '2026-09', total_employees: 23, total_gross: 130000000, total_deductions: 10000000, total_net: 120000000 }, pending_adjustments: 3, pending_overtime: 2 };
    } else if (endpoint === '/documents/employee/me') data = [];
    else if (endpoint === '/employees/901' && ['PUT', 'PATCH'].includes(req.method())) {
      state.updates.push(req.postDataJSON()); data = employee;
    } else if (endpoint === '/employees/901') {
      if (state.failEmployee) return failure();
      data = employee;
    } else if (endpoint === '/employees' && req.method() === 'POST') {
      state.creates.push(req.postDataJSON());
      if (state.failCreate) return failure();
      data = { ...employee, id: 902 };
    }
    else if (endpoint === '/employees') return paginated([employee]);
    else if (endpoint.startsWith('/employees/next-id/')) data = { employee_id: `TEST-${endpoint.split('/').pop()}-NEW` };
    else if (endpoint === '/companies') return paginated([employee.company, { id: 2, name: 'Second Synthetic Company', code: 'TWO' }], 2, 'pagination');
    else if (endpoint === '/companies/1') data = { ...employee.company, settings: {} };
    else if (endpoint === '/departments') {
      if (state.failReferences) return failure();
      return paginated([{ id: 10, name: 'Synthetic Department', company_id: 1 },
        { id: 11, name: 'Global Synthetic Department', company_id: null }]);
    }
    else if (endpoint === '/work-locations/options') data = [];
    else if (endpoint === '/work-locations') return paginated([]);
    else if (endpoint === '/users/me/preferences') data = {};
    else if (endpoint === '/payroll') return paginated([{ id: 701, employee_id: 901, company_id: 1,
      employee, basic_salary: 8000000, gross_salary: 8000000, total_deductions: 0, net_salary: 8000000,
      bpjs_kes_employee: 80000, bpjs_kes_company: 320000,
      bpjs_jht_employee: 160000, bpjs_jp_employee: 80000,
      bpjs_jht_company: 296000, bpjs_jp_company: 160000, bpjs_jkk_company: 19200, bpjs_jkm_company: 24000,
      status: 'draft', period: '2026-09' }], 1, 'pagination');
    else {
      state.unexpected.push(`${req.method()} ${endpoint}`);
      return route.abort();
    }
    return route.fulfill({ json: { success: true, data } });
  });
  return state;
}

const cases: Array<[string[], string[]]> = [
  [['Super Admin'], ['/users', '/roles']],
  [['Group CEO'], ['/ceo/payroll-report']],
  [['CEO'], ['/ceo/company-performance']],
  [['HR Manager'], ['/employees', '/leave']],
  [['HR Staff'], ['/employees', '/leave']],
  [['Finance Manager'], ['/payroll', '/tax/pph21']],
  [['Tax Manager'], ['/tax/pph21']],
  [['Tax Staff'], ['/tax/pph21']],
  [['Manager'], ['/my-team']],
  [['Employee'], []],
  [['HR Staff', 'Tax Staff'], ['/employees', '/leave', '/tax/pph21']],
  [['HR Staff', 'Manager'], ['/employees', '/my-team']],
  [['Finance Manager', 'Manager'], ['/payroll', '/my-team']],
  [['Super Admin', 'HR Manager'], ['/users', '/employees', '/leave']],
];
for (const [roles, expected] of cases) {
  test(`navigation resolves without duplicates: ${roles.join(' + ')}`, async ({ page }) => {
    const state = await session(page, roles, { language: 'en' });
    await page.goto('/my-attendance');
    await expect(page.getByRole('heading', { name: 'My Attendance' })).toBeVisible();
    const nav = page.locator('aside nav');
    while (await nav.locator('button[aria-expanded=false]').count()) await nav.locator('button[aria-expanded=false]').first().click();
    const links = await nav.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!));
    expect(links.filter(link => link === '/my-attendance')).toHaveLength(1);
    expect(links.filter(link => link === '/my-leave')).toHaveLength(1);
    expect(links.filter(link => link === '/documents')).toHaveLength(1);
    expect(links.length).toBe(new Set(links).size);
    for (const link of links) expect(inventory.routes.some(route => route.path === link), link).toBe(true);
    for (const link of expected) expect(links).toContain(link);
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test('personal attendance uses own endpoint, WIB, pagination and visible retry without stale rows', async ({ page }) => {
  const state = await session(page, ['HR Staff']);
  await page.goto('/my-attendance');
  await expect(page.getByRole('cell', { name: '1 September 2026', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /09[.:]00/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: /17[.:]00/ })).toBeVisible();
  await page.getByRole('button', { name: 'Halaman berikutnya' }).click();
  await expect.poll(() => state.calls.some(call => call.includes('page=2'))).toBe(true);
  state.failAttendance = true;
  await page.getByLabel('Dari tanggal').fill('2026-09-01');
  await expect(page.getByRole('alert')).toContainText('Riwayat absensi belum berhasil dimuat');
  await expect(page.getByRole('table')).toHaveCount(0);
  state.failAttendance = false;
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByLabel('Sampai tanggal').fill('2026-08-01');
  await expect(page.getByRole('alert')).toContainText('Tanggal akhir harus sama');
  const calls = state.calls.filter(call => call.includes('/attendance'));
  expect(calls.every(call => call.startsWith('GET /attendance/me/history?') || call === 'GET /attendance/me/clock')).toBe(true);
  expect(calls.some(call => /employee_id|company_id|department_id/.test(call))).toBe(false);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

for (const options of [{ noEmployee: true }, { attendanceEnabled: false }]) {
  test(`personal attendance guard avoids API when ${JSON.stringify(options)}`, async ({ page }) => {
    const state = await session(page, ['HR Staff'], options);
    await page.goto('/my-attendance');
    await expect(page.getByRole('status')).toContainText(options.noEmployee ? 'Akun belum terhubung' : 'Fitur ini belum diaktifkan');
    expect(state.calls.filter(call => call.includes('/attendance'))).toEqual([]);
  });
}

test('Finance dashboard consumes authorized payroll summary and retries failed loads', async ({ page }) => {
  const state = await session(page, ['Finance Manager']);
  state.failFinance = true;
  await page.goto('/dashboard');
  // Indonesian scenario (alerts, period and Rp formatting): registered heading "Dasbor Keuangan".
  await expect(page.getByRole('heading', { name: 'Dasbor Keuangan' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Ringkasan payroll belum berhasil');
  await expect(page.getByText('Total take-home pay', { exact: true })).toHaveCount(0);
  state.failFinance = false;
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(page.getByText('Periode 2026-09', { exact: true })).toBeVisible();
  await expect(page.getByText(/Rp\s*120[.]000[.]000/)).toBeVisible();
  const summaryCalls = state.calls.filter(call => call.includes('/dashboard/'));
  expect(summaryCalls.length).toBeGreaterThanOrEqual(2);
  expect(new Set(summaryCalls)).toEqual(new Set(['GET /dashboard/payroll']));
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('shared documents opens the personal endpoint for HR Staff', async ({ page }) => {
  const state = await session(page, ['HR Staff'], { language: 'en' });
  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: 'My Documents' })).toBeVisible();
  await expect.poll(() => state.calls.includes('GET /documents/employee/me')).toBe(true);
  expect(new Set(state.calls.filter(call => call.includes('/documents')))).toEqual(new Set(['GET /documents/employee/me']));
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

// One test per restricted route (same assertions as the former single loop) so
// growth of the App.tsx inventory cannot exhaust one test's timeout.
const employeeRestricted = inventory.routes.filter(route => route.allowedRoles && !route.allowedRoles.includes('Employee'));
test('restricted route inventory is discovered from App.tsx', () => {
  expect(employeeRestricted.length).toBeGreaterThan(0);
});
for (const [index, route] of employeeRestricted.entries()) {
  test(`explicitly restricted route rejects Employee before page API calls: #${index + 1} ${route.path}`, async ({ page }) => {
    const state = await session(page, ['Employee']);
    await page.goto(route.path);
    await expect(page).toHaveURL(/\/403$/);
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test('BPJS detail uses the employee name returned by the API and does not crash', async ({ page }) => {
  const state = await session(page, ['Tax Staff']);
  await page.goto('/tax/bpjs-ketenagakerjaan');
  await page.getByRole('button', { name: 'Detail BPJS Synthetic Staff', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Detail BPJS Ketenagakerjaan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetic Staff', exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
  expect(state.unexpected).toEqual([]);
});

test('Group CEO payroll summary bookmark redirects to the report', async ({ page }) => {
  const state = await session(page, ['Group CEO']);
  await page.goto('/payroll/summary');
  await expect(page).toHaveURL(/\/ceo\/payroll-report$/);
  await expect.poll(() => state.calls.some(call => call.startsWith('GET /payroll?'))).toBe(true);
  expect(state.calls.filter(call => call.startsWith('GET /payroll?')).every(call => !call.includes('company_id='))).toBe(true);
  expect(state.errors).toEqual([]);
  expect(state.unexpected).toEqual([]);
});

test('edit employee preserves existing BPJS flags and custom probation when only name changes', async ({ page }) => {
  const state = await session(page, ['HR Manager'], { language: 'en' });
  await page.goto('/employees/901/edit');
  await expect(page.locator('input[name=name]')).toHaveValue('Synthetic Staff');
  await expect(page.locator('input[name=probation_end_date]')).toHaveValue('2026-06-30');
  await page.locator('input[name=name]').fill('Synthetic Staff Edited');
  for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('button', { name: 'Update Employee', exact: true }).click();
  await expect.poll(() => state.updates.length).toBe(1);
  // Preserving untouched fields now means omitting them from the update entirely.
  expect(state.updates[0]).toEqual({ name: 'Synthetic Staff Edited' });
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('new employee probation uses calendar months, including short months and leap years', async ({ page }) => {
  const state = await session(page, ['HR Manager'], { language: 'en' });
  await page.goto('/employees/create');
  await page.locator('input[name=name]').fill('Synthetic New Employee');
  await page.locator('select[name=company_id]').selectOption('1');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  const join = page.locator('input[name=join_date]');
  const start = page.locator('input[name=probation_start_date]');
  const end = page.locator('input[name=probation_end_date]');
  for (const [from, to] of [
    ['2026-01-31', '2026-04-30'], ['2026-11-30', '2027-02-28'],
    ['2023-11-30', '2024-02-29'], ['2026-03-15', '2026-06-15'],
  ]) {
    await join.fill(from);
    await expect(start).toHaveValue(from);
    await expect(end).toHaveValue(to);
  }
  await join.fill('');
  await expect(start).toHaveValue('');
  await expect(end).toHaveValue('');
  expect(state.updates).toEqual([]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('editing join date leaves recorded probation dates unchanged and explains this', async ({ page }) => {
  const state = await session(page, ['HR Manager'], { language: 'en' });
  await page.goto('/employees/901/edit');
  await expect(page.locator('input[name=name]')).toHaveValue('Synthetic Staff');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.locator('input[name=join_date]').fill('2026-02-01');
  await expect(page.locator('input[name=probation_start_date]')).toHaveValue('2026-01-01');
  await expect(page.locator('input[name=probation_end_date]')).toHaveValue('2026-06-30');
  // Registered English text of this hint (operations catalog).
  await expect(page.getByText('Saved probation date; does not change automatically when editing.', { exact: true })).toBeVisible();
  expect(state.updates).toEqual([]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

async function startCreate(page: Page) {
  await page.goto('/employees/create');
  await page.locator('input[name=name]').fill('Synthetic New Employee');
  await page.locator('select[name=company_id]').selectOption('1');
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW');
}
const next = (page: Page) => page.getByRole('button', { name: 'Next Step', exact: true }).click();

test('create employee validates company, retains all form fields and can retry failed save', async ({ page }) => {
  const state = await session(page, ['HR Staff'], { language: 'en' });
  await page.goto('/employees/create');
  await page.locator('input[name=name]').fill('Synthetic New Employee');
  // Clicking progress cannot bypass validation either.
  await page.getByRole('button', { name: 'Go to Employment', exact: true }).click();
  await expect(page.getByText('Company is required', { exact: true })).toBeVisible();
  await page.locator('select[name=company_id]').selectOption('1');
  await page.locator('input[name=family_card_number]').fill('0000000000000002');
  await next(page);
  await page.locator('input[name=join_date]').fill('2026-01-31');
  await expect(page.locator('select[name=department_id] option[value="11"]')).toHaveText('Global Synthetic Department');
  await page.locator('select[name=department_id]').selectOption('11');
  await next(page);
  await page.locator('select[name=salary_status]').selectOption('existing');
  await page.locator('input[name=basic_salary]').fill('0');
  await page.locator('input[name=bank_name]').fill('Synthetic Bank');
  await page.locator('input[name=bank_account_number]').fill('00012345');
  await page.locator('input[name=bank_account_holder]').fill('Synthetic New Employee');
  await expect(page.locator('input[name=jht_registered]')).toHaveValue('true');
  await next(page);
  await page.getByRole('switch', { name: 'Employee has office email' }).click();
  await page.locator('input[name=personal_email]').fill('new@example.test');
  await next(page);
  state.failCreate = true;
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(1);
  await expect(page).toHaveURL(/\/employees\/create$/);
  expect(state.creates[0]).toMatchObject({ name: 'Synthetic New Employee', company_id: 1, department_id: 11,
    family_card_number: '0000000000000002', salary_status: 'existing', basic_salary: 0,
    bank_name: 'Synthetic Bank', bank_account_number: '00012345', bank_account_holder: 'Synthetic New Employee',
    personal_email: 'new@example.test', probation_start_date: '2026-01-31', probation_end_date: '2026-04-30' });
  expect(state.creates[0]).not.toHaveProperty('email');
  expect(state.creates[0]).not.toHaveProperty('has_office_email');
  state.failCreate = false;
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(2);
  await expect(page).toHaveURL(/\/employees$/);
  expect(state.creates[1]).toEqual(state.creates[0]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('edit clears chosen fields without resending hidden position, probation or salary defaults', async ({ page }) => {
  const state = await session(page, ['HR Staff'], { language: 'en' });
  await page.goto('/employees/901/edit');
  await expect(page.locator('input[name=name]')).toHaveValue(employee.name);
  await next(page);
  await page.locator('input[name=job_title]').fill('New Title');
  await next(page);
  await expect(page.locator('select[name=salary_status]')).toHaveValue('existing');
  await page.locator('input[name=bank_name]').fill('');
  await next(page);
  await page.locator('[name=address]').fill('');
  await next(page);
  await page.getByRole('button', { name: 'Update Employee', exact: true }).click();
  await expect.poll(() => state.updates.length).toBe(1);
  expect(state.updates[0]).toEqual({ job_title: 'New Title', bank_name: null, address: null });
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('failed employee load never exposes an empty editable form and retry restores it', async ({ page }) => {
  const state = await session(page, ['HR Staff']);
  state.failEmployee = true;
  await page.goto('/employees/901/edit');
  await expect(page.getByRole('heading', { name: 'Data formulir karyawan gagal dimuat' })).toBeVisible();
  await expect(page.locator('input[name=name]')).toHaveCount(0);
  state.failEmployee = false;
  await page.getByRole('button', { name: 'Coba Lagi' }).click();
  await expect(page.locator('input[name=name]')).toHaveValue(employee.name);
  expect(state.updates).toEqual([]); expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('failed reference data blocks create until it can be loaded', async ({ page }) => {
  const state = await session(page, ['HR Staff']); state.failReferences = true;
  await page.goto('/employees/create');
  await expect(page.getByRole('heading', { name: 'Data formulir karyawan gagal dimuat' })).toBeVisible();
  await expect(page.locator('input[name=name]')).toHaveCount(0);
  state.failReferences = false;
  await page.getByRole('button', { name: 'Coba Lagi' }).click();
  await expect(page.locator('input[name=name]')).toBeVisible();
  expect(state.creates).toEqual([]); expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('changing company clears old department and stale next-ID responses cannot win', async ({ page }) => {
  const state = await session(page, ['HR Staff'], { language: 'en' });
  let release!: () => void;
  const first = new Promise<void>(resolve => { release = resolve; });
  let firstStarted = false;
  await page.route('**/api/v1/employees/next-id/1', async route => {
    firstStarted = true; await first;
    await route.fulfill({ json: { success: true, data: { employee_id: 'STALE-FIRST' } } });
  });
  await page.goto('/employees/create');
  await page.locator('input[name=name]').fill('Synthetic New Employee');
  await page.locator('select[name=company_id]').selectOption('1');
  await expect.poll(() => firstStarted).toBe(true);
  await next(page);
  await page.locator('select[name=department_id]').selectOption('10');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await page.locator('select[name=company_id]').selectOption('2');
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-2-NEW');
  release();
  await next(page);
  await expect(page.locator('select[name=department_id]')).toHaveValue('');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-2-NEW');
  await page.locator('select[name=company_id]').selectOption('');
  await expect(page.locator('input[name=employee_id]')).toHaveValue('');
  expect(state.creates).toEqual([]); expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('resign sends only its confirmed fields, excluding unrelated unsaved form edits', async ({ page }) => {
  const state = await session(page, ['HR Staff'], { language: 'en' });
  await page.goto('/employees/901/edit');
  await page.locator('input[name=name]').fill('Unsaved Name');
  await page.getByRole('button', { name: 'Resign', exact: true }).click();
  await page.locator('input[name=resign_date]').fill('2026-09-30');
  await page.locator('select[name=resign_type]').selectOption('voluntary');
  // "Konfirmasi Resign" is a legacy source alias; the registered English label is "Confirm Resignation".
  await page.getByRole('button', { name: /Confirm Resignation/ }).click();
  await expect.poll(() => state.updates.length).toBe(1);
  expect(state.updates[0]).toMatchObject({ employment_status: 'resigned', resign_date: '2026-09-30', resign_type: 'voluntary' });
  expect(Object.keys(state.updates[0]).every(key => key.startsWith('resign_') || key === 'employment_status')).toBe(true);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('employee search explicitly requests all employment statuses', async ({ page }) => {
  const state = await session(page, ['HR Staff'], { language: 'en' });
  await page.goto('/employees');
  await page.getByPlaceholder(/Search/).first().fill('Synthetic');
  await expect.poll(() => state.calls.some(call => call.startsWith('GET /employees?') && call.includes('search=Synthetic') && call.includes('employment_status=all'))).toBe(true);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('reference dropdowns include later pages and details show the entered join date', async ({ page }) => {
  const state = await session(page, ['HR Staff'], { language: 'en' });
  await page.route('**/api/v1/departments?**', async route => {
    const second = new URL(route.request().url()).searchParams.get('page') === '2';
    await route.fulfill({ json: { success: true,
      data: [{ id: second ? 99 : 10, name: second ? 'Later Page Department' : 'First Department', company_id: null }],
      meta: { page: second ? 2 : 1, limit: 1, total: 2, totalPages: 2 } } });
  });
  await startCreate(page);
  await next(page);
  await page.locator('select[name=department_id]').selectOption('99');
  await expect(page.locator('select[name=department_id]')).toHaveValue('99');
  await page.goto('/employees/901');
  const joinDateCard = page.locator('.ops-record-block').filter({ has: page.getByText('Join Date', { exact: true }) });
  await expect(joinDateCard).toContainText('1 Jan 2026');
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});
