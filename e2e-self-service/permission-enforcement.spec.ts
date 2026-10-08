import { test, expect, type Page } from '@playwright/test';

// Isolated UI checks for server-resolved effectiveActions. Every API call is
// mocked with synthetic records; nothing reaches a backend or real account.

const employee = {
  id: 901, employee_id: 'TEST-901', name: 'Synthetic Staff', company_id: 1,
  personal_email: 'staff@example.test', email: 'staff-office@example.test',
  department_id: 10, position_id: 20, employment_status: 'active', employment_type: 'contract',
  profile_completed: true, national_id: '0000000000000901', join_date: '2026-01-01',
  salary_status: 'existing', basic_salary: 9000000, salary_currency: 'IDR', job_title: 'Analyst',
  // Real API contract: the company service derives is_active from status.
  company: { id: 1, name: 'Synthetic Company', code: 'TEST', status: 'active' },
};
const self = { ...employee, id: 500, employee_id: 'TEST-500', name: 'Synthetic Actor' };
const payrollRow = (id: number, status: string) => ({ id, employee_id: 901, company_id: 1, employee, basic_salary: 8000000,
  gross_salary: 8000000, total_deductions: 0, net_salary: 8000000, status, period: '2026-09' });

type Options = { roles: string[]; effectiveActions?: string[]; language?: 'en' | 'id'; payroll?: ReturnType<typeof payrollRow>[] };

async function session(page: Page, options: Options) {
  const user = {
    id: 91, email: 'actor@example.test', roles: options.roles, permissions: [], accessibleCompanyIds: [1],
    ...(options.effectiveActions ? { effectiveActions: options.effectiveActions } : {}),
    language: options.language ?? 'en', is_active: true, force_password_change: false, employee: self,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true },
  };
  const state = { calls: [] as string[], unexpected: [] as string[], errors: [] as string[],
    updates: [] as Record<string, unknown>[], creates: [] as Record<string, unknown>[],
    // Mutable so a test can change server-resolved actions before the next /auth/me.
    user: user as { effectiveActions?: string[] } & typeof user };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-permission-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const localOrigin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
    if (url.origin === localOrigin && !['xhr', 'fetch'].includes(req.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    if (!url.pathname.startsWith('/api/')) return route.abort();
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    const method = req.method();
    // Client audit beacons are not application mutations.
    if (endpoint === '/audit-logs/events') return route.fulfill({ status: 204 });
    state.calls.push(`${method} ${endpoint}${url.search}`);
    const paginated = (data: unknown[], key = 'meta') => route.fulfill({ json: { success: true, data,
      [key]: { page: Number(url.searchParams.get('page') || 1), limit: 10, total: data.length, totalPages: 1 } } });
    let data: unknown;
    if (endpoint === '/auth/me') data = { user: state.user };
    else if (endpoint === '/users/me/language') data = user;
    else if (endpoint === '/employees/me') data = self;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (endpoint === '/leaves/my-approvals') data = [{ id: 41, employee_id: 902, employee: { id: 902, name: 'Assigned Report', employee_id: 'TEST-902' },
      leave_type_id: 1, leaveType: { id: 1, name: 'Annual Leave' }, start_date: '2026-10-01', end_date: '2026-10-02', total_days: '2',
      status: 'pending', can_approve: true, reason: 'Synthetic leave', created_at: '2026-09-28T01:00:00Z' }];
    else if (endpoint === '/presence') data = {};
    else if (endpoint === '/employees/500') data = self;
    else if (endpoint === '/companies/1') data = { ...employee.company, address: null, phone: null, email: null, website: null };
    else if (endpoint === '/payroll-settings/company/1') data = { company_id: 1, payroll_cutoff_date: 20, payment_date: 25, prorate_method: 'working_days' };
    else if (/^\/departments\/\d+$/.test(endpoint) && method !== 'GET') { state.updates.push({ [method]: endpoint }); data = {}; }
    else if (endpoint === '/employees/901' && method === 'PUT') { state.updates.push(req.postDataJSON()); data = employee; }
    else if (endpoint === '/employees/901') {
      // Mirrors server redaction: compensation is null unless employee.view_salary.
      const salaryVisible = !options.effectiveActions || options.effectiveActions.includes('employee.view_salary');
      data = salaryVisible ? employee : { ...employee, basic_salary: null, salary_currency: null, salary_status: null };
    }
    else if (endpoint === '/employees' && method === 'POST') { state.creates.push(req.postDataJSON()); data = { ...employee, id: 903 }; }
    else if (endpoint === '/employees') {
      // Type-filtered lists (freelance/internship estimates) return a matching employee.
      const type = url.searchParams.get('employment_type');
      return paginated(type ? [{ ...employee, id: type === 'freelance' ? 905 : 906, name: `Synthetic ${type}`, employee_id: `TEST-${type}`, employment_type: type }] : [employee]);
    }
    else if (endpoint.startsWith('/employees/next-id/')) data = { employee_id: 'TEST-1-NEW' };
    else if (endpoint === '/companies') return paginated([employee.company], 'pagination');
    else if (endpoint === '/departments' && method === 'POST') { state.creates.push(req.postDataJSON()); data = {}; }
    else if (endpoint === '/departments') return paginated([{ id: 10, name: 'Synthetic Department', code: 'SD', description: '', company_id: 1, status: 'active' }]);
    else if (endpoint === '/work-locations/options') data = [];
    else if (endpoint === '/work-locations') return paginated([]);
    else if (endpoint === '/users/me/preferences') data = {};
    else if (endpoint === '/payroll') return paginated(options.payroll ?? [], 'pagination');
    else { state.unexpected.push(`${method} ${endpoint}`); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  return state;
}
// Non-GET requests other than the shell's presence heartbeat (audit beacons are
// never recorded). Any settings/company/payroll write would appear here.
const domainWrites = (state: Awaited<ReturnType<typeof session>>) =>
  state.calls.filter(call => !call.startsWith('GET ') && !/^(POST|PUT|PATCH) \/presence(\?|$)/.test(call));
const clean = (state: Awaited<ReturnType<typeof session>>) => { expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]); };
const navLinks = async (page: Page) => {
  const nav = page.locator('aside nav');
  while (await nav.locator('button[aria-expanded=false]').count()) await nav.locator('button[aria-expanded=false]').first().click();
  return nav.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!));
};

test('HR Staff view-only: salary visible, no employee mutations in list, detail or direct routes', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: ['employee.view', 'employee.view_salary'] });
  await page.goto('/employees');
  await expect(page.getByRole('link', { name: 'View Synthetic Staff' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Export/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Add Employee' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit Synthetic Staff' })).toHaveCount(0);
  await page.goto('/employees/901');
  await expect(page.getByRole('heading', { name: 'Synthetic Staff', exact: true })).toBeVisible();
  await expect(page.getByTestId('compensation-unavailable')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
  for (const path of ['/employees/901/edit', '/employees/create']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/403$/);
  }
  expect(state.updates).toEqual([]);
  expect(state.creates).toEqual([]);
  clean(state);
});

test('HR Staff edit without salary rights: compensation hidden, never sent, other fields saved', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: ['employee.view', 'employee.create', 'employee.update', 'employee.export'] });
  await page.goto('/employees');
  await expect(page.getByRole('button', { name: /^Export/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add Employee' })).toBeVisible();
  await page.goto('/employees/901');
  await expect(page.getByTestId('compensation-unavailable')).toBeVisible();
  await page.goto('/employees/901/edit');
  await expect(page.locator('input[name=name]')).toHaveValue('Synthetic Staff');
  await page.locator('input[name=name]').fill('Synthetic Staff Edited');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await expect(page.getByTestId('compensation-locked')).toBeVisible();
  await expect(page.locator('input[name=basic_salary]')).toHaveCount(0);
  for (let step = 0; step < 2; step++) await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('button', { name: 'Update Employee', exact: true }).click();
  await expect.poll(() => state.updates.length).toBe(1);
  expect(state.updates[0]).toEqual({ name: 'Synthetic Staff Edited' });
  clean(state);
});

test('HR Staff create without salary rights: hidden salary inputs neither block nor are sent', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: ['employee.view', 'employee.create', 'employee.update'] });
  await page.goto('/employees/create');
  await page.locator('input[name=name]').fill('Synthetic New Employee');
  await page.locator('select[name=company_id]').selectOption('1');
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.locator('input[name=join_date]').fill('2026-01-31');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await expect(page.getByTestId('compensation-locked')).toBeVisible();
  await expect(page.locator('input[name=basic_salary], select[name=salary_status]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('switch', { name: 'Employee has office email' }).click();
  await page.locator('input[name=personal_email]').fill('new@example.test');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await expect(page.getByText('Not changed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(1);
  // Form defaults (IDR / monthly / gross / new_gross) would be compensation input.
  for (const field of ['basic_salary', 'salary_currency', 'pay_frequency', 'pay_type', 'salary_status', 'transport_allowance', 'meal_allowance', 'position_allowance']) {
    expect(state.creates[0]).not.toHaveProperty(field);
  }
  expect(state.creates[0]).toMatchObject({ name: 'Synthetic New Employee', company_id: 1, personal_email: 'new@example.test' });
  clean(state);
});

for (const roles of [['Finance Manager'], ['Tax Manager']]) {
  test(`${roles[0]} with employee.view can list but not open another record; own record stays available`, async ({ page }) => {
    const state = await session(page, { roles, effectiveActions: ['employee.view'] });
    await page.goto('/employees');
    await expect(page.getByText('Synthetic Staff', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Synthetic Staff' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Synthetic Staff', exact: true })).toHaveCount(0);
    for (const path of ['/employees/901', '/employees/901/edit']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/403$/);
    }
    expect(state.calls).not.toContain('GET /employees/901');
    await page.goto('/employees/500');
    await expect(page.getByRole('heading', { name: 'Synthetic Actor', exact: true })).toBeVisible();
    clean(state);
  });
}

test('Group CEO keeps read-only employee access (no edit link or edit route)', async ({ page }) => {
  const state = await session(page, { roles: ['Group CEO'] });
  await page.goto('/employees');
  await expect(page.getByRole('link', { name: 'View Synthetic Staff' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Synthetic Staff' })).toHaveCount(0);
  await page.goto('/employees/901/edit');
  await expect(page).toHaveURL(/\/403$/);
  clean(state);
});

test('settings: payroll hidden without payroll.view, company profile read-only without company.update', async ({ page }) => {
  const state = await session(page, { roles: ['HR Manager'], effectiveActions: [] });
  await page.goto('/settings/payroll');
  await expect(page.getByText('This setting is not available for your access.', { exact: true })).toBeVisible();
  await page.goto('/settings/general');
  await expect(page.locator('#setting-name')).toHaveValue('Synthetic Company');
  await expect(page.locator('#setting-name')).toBeDisabled();
  await expect(page.locator('.ph-settings-actions')).toHaveCount(0);
  expect(state.calls.some(call => call.startsWith('GET /payroll-settings'))).toBe(false);
  expect(domainWrites(state)).toEqual([]);
  clean(state);
});

test('settings: payroll schedule is view-only with payroll.view but without payroll.settings', async ({ page }) => {
  const state = await session(page, { roles: ['HR Manager'], effectiveActions: ['payroll.view'] });
  await page.goto('/settings/payroll');
  await expect(page.locator('#setting-payroll_cutoff_date')).toHaveValue('20');
  await expect(page.locator('#setting-payroll_cutoff_date')).toBeDisabled();
  await expect(page.locator('.ph-settings-actions')).toHaveCount(0);
  expect(domainWrites(state)).toEqual([]);
  clean(state);
});

test('an open edit dialog stops submitting when update is revoked by a session refresh', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T02:00:00Z') });
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: ['department.create', 'department.update'] });
  await page.goto('/departments');
  await page.getByRole('button', { name: 'Edit' }).first().click();
  const form = page.locator('form.dw-form');
  await expect(form).toBeVisible();
  await form.locator('input').first().fill('Renamed while open');
  // The server now keeps create but revokes update; a tab refocus re-reads /auth/me.
  state.user.effectiveActions = ['department.create'];
  const meCalls = state.calls.filter(call => call === 'GET /auth/me').length;
  await page.clock.fastForward(20_000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => state.calls.filter(call => call === 'GET /auth/me').length).toBe(meCalls + 1);
  await expect(page.getByTestId('access-changed')).toBeVisible();
  await expect(form.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
  await expect(form.locator('input').first()).toHaveValue('Renamed while open');
  await form.locator('input').first().press('Enter');
  expect(state.calls.filter(call => call.startsWith('PUT /departments'))).toEqual([]);
  expect(state.updates).toEqual([]);
  clean(state);
});

const employeeListCalls = (state: Awaited<ReturnType<typeof session>>) => state.calls.filter(call => call.startsWith('GET /employees?'));

for (const [label, options] of [
  ['legacy Finance Manager (not salary-eligible)', { roles: ['Finance Manager'] }],
  ['HR Staff with payroll.view and employee.view but no employee.view_salary', { roles: ['HR Staff'], effectiveActions: ['payroll.view', 'employee.view', 'payroll.export'] }],
] as const) {
  test(`freelance estimates are unavailable, never zero, for ${label}`, async ({ page }) => {
    const state = await session(page, { ...options, roles: [...options.roles] } as Options);
    await page.goto('/payroll/freelance');
    await expect(page.getByTestId('estimate-unavailable')).toBeVisible();
    await expect(page.getByText(/Rp\s*0\b/)).toHaveCount(0);
    expect(employeeListCalls(state)).toEqual([]);
    clean(state);
  });
}

test('freelance estimates still load employee data for a legacy HR Manager', async ({ page }) => {
  const state = await session(page, { roles: ['HR Manager'] });
  await page.goto('/payroll/freelance');
  await expect.poll(() => employeeListCalls(state).some(call => call.includes('employment_type=freelance'))).toBe(true);
  await expect(page.getByTestId('estimate-unavailable')).toHaveCount(0);
  await expect(page.getByText('Synthetic freelance', { exact: true })).toBeVisible();
  clean(state);
});

test('create-only account can create without the employee directory lookup', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: ['employee.create'] });
  await page.goto('/employees/create');
  await page.locator('input[name=name]').fill('Synthetic Create Only');
  await page.locator('select[name=company_id]').selectOption('1');
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await expect(page.getByTestId('manager-lookup-unavailable')).toBeVisible();
  await page.locator('input[name=join_date]').fill('2026-01-31');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await expect(page.getByTestId('compensation-locked')).toBeVisible();
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('switch', { name: 'Employee has office email' }).click();
  await page.locator('input[name=personal_email]').fill('create-only@example.test');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(1);
  expect(state.creates[0]).toMatchObject({ name: 'Synthetic Create Only', company_id: 1, join_date: '2026-01-31', personal_email: 'create-only@example.test' });
  expect(state.creates[0]).not.toHaveProperty('manager_id');
  expect(state.creates[0]).not.toHaveProperty('basic_salary');
  expect(employeeListCalls(state)).toEqual([]);
  clean(state);
});

test('older server without effectiveActions keeps existing HR Staff controls', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'] });
  await page.goto('/employees');
  await expect(page.getByRole('button', { name: /^Export/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add Employee' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Synthetic Staff' })).toBeVisible();
  clean(state);
});

const payroll = [payrollRow(701, 'draft'), payrollRow(702, 'submitted'), payrollRow(703, 'approved')];
const rowActions = async (page: Page, tab: 'Processing' | 'Validation' | 'Approved') => {
  await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
  return page.locator('.pw-row-action');
};

test('HR Manager payroll read-only: no generate, export, validate, approve or pay', async ({ page }) => {
  const state = await session(page, { roles: ['HR Manager'], effectiveActions: ['payroll.view'], payroll });
  await page.goto('/payroll');
  await expect(page.getByRole('tab', { name: /^Processing/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Generate Payroll/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Export Excel/ })).toHaveCount(0);
  for (const tab of ['Processing', 'Validation', 'Approved'] as const) await expect(await rowActions(page, tab)).toHaveCount(0);
  expect(domainWrites(state)).toEqual([]);
  clean(state);
});

test('HR Manager with approve but not pay sees approval only', async ({ page }) => {
  const state = await session(page, { roles: ['HR Manager'], effectiveActions: ['payroll.view', 'payroll.approve'], payroll });
  await page.goto('/payroll');
  await expect(await rowActions(page, 'Validation')).toHaveCount(1);
  await expect(await rowActions(page, 'Approved')).toHaveCount(0);
  await expect(await rowActions(page, 'Processing')).toHaveCount(0);
  clean(state);
});

test('HR Manager legacy keeps generate/export and every payroll step', async ({ page }) => {
  const state = await session(page, { roles: ['HR Manager'], payroll });
  await page.goto('/payroll');
  await expect(page.getByRole('button', { name: /Generate Payroll/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export Excel/ })).toBeVisible();
  for (const tab of ['Processing', 'Validation', 'Approved'] as const) await expect(await rowActions(page, tab)).toHaveCount(1);
  clean(state);
});

test('Manager with empty effectiveActions keeps personal pages and assigned approvals only', async ({ page }) => {
  const state = await session(page, { roles: ['Manager'], effectiveActions: [] });
  await page.goto('/requests');
  const record = page.locator('[data-request-record]').filter({ hasText: 'Assigned Report' });
  await expect(record.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
  const links = await navLinks(page);
  for (const personal of ['/my-leave', '/my-attendance', '/documents']) expect(links).toContain(personal);
  expect(links).not.toContain('/employees');
  expect(links).not.toContain('/leave');
  await page.goto('/employees');
  await expect(page).toHaveURL(/\/403$/);
  clean(state);
});

test('navbar search and direct routes agree with the sidebar for covered pages', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: ['leave.view_all'], language: 'id' });
  await page.goto('/settings/integrations');
  const links = await navLinks(page);
  expect(links).toContain('/leave');
  expect(links).not.toContain('/employees');
  expect(links).not.toContain('/payroll');
  await page.getByRole('button', { name: 'Buka pencarian', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'Cari di PeopleHub', exact: true });
  await expect(search).toBeVisible();
  // No employee.view: the employee search tab is not offered.
  await expect(search.getByRole('button', { name: 'Karyawan', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  for (const path of ['/employees', '/payroll', '/payroll/freelance']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/403$/);
  }
  clean(state);
});
