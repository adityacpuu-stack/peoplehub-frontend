import { test, expect, type Page } from '@playwright/test';

// Isolated mocked configuration: every API call is intercepted, synthetic data only.
// Not a real-account test; it verifies role navigation, route guards, request
// contracts and the IT workspace UI against the documented API shapes.
const SHOTS = '../.analysis/it-admin-ui';
// unlinked: the account has no employee record ('null' = employee: null, 'missing' = no employee key).
// accountScope: an unlinked account that has account-based IT company assignments (it_user_company_assignments).
type Options = { roles?: string[]; language?: 'en' | 'id'; m365?: boolean; effectiveActions?: string[]; unlinked?: 'null' | 'missing'; accountScope?: boolean };
// effectiveActions: what the server resolves; IT Admin is in no action ceiling, so [] for IT-only accounts.
async function setup(page: Page, { roles = ['IT Admin', 'Employee'], language = 'en', m365 = true, effectiveActions = [], unlinked, accountScope = false }: Options = {}) {
  // IT scope as the server resolves it; the general scope of an unlinked account is always empty.
  const scoped = !unlinked || accountScope;
  const calls: { method: string; path: string; query: Record<string, string>; body: unknown }[] = [];
  const unexpected: string[] = [], errors: string[] = [];
  const state = { delay: 0, provisionError: '' as string, provisionStatus: 'completed' as 'completed' | 'needs_attention' };
  const employee = { id: 700, name: 'Synthetic IT Lead', employee_id: 'IT-700', company_id: 2, profile_completed: true, national_id: '0000000000000700' };
  const mailbox = (status: string, extra: Record<string, unknown> = {}) => ({ status, email: null, failure_code: null, license_requested: false, license_assigned: false, groups_added: false, credential_sent: false, updated_at: null, ...extra });
  const rows = [
    { id: 801, employee_id: 'SYN-801', name: 'Synthetic Staff', company: { id: 2, name: 'Synthetic Holding' }, work_email: null, personal_email_hint: 's***@mail.example',
      domain: 'synthetic.example', mailbox: mailbox('none'), can_provision: true, ineligible_reason: null },
    { id: 802, employee_id: 'SYN-802', name: 'Synthetic HR Person', company: { id: 2, name: 'Synthetic Holding' }, work_email: null, personal_email_hint: 'h***@mail.example',
      domain: 'synthetic.example', mailbox: mailbox('none'), can_provision: false, ineligible_reason: 'protected_account' },
    { id: 803, employee_id: 'SYN-803', name: 'Synthetic Pending', company: { id: 2, name: 'Synthetic Holding' }, work_email: 'pending@synthetic.example', personal_email_hint: null,
      domain: 'synthetic.example', mailbox: mailbox('needs_attention', { email: 'pending@synthetic.example', failure_code: 'license_failed', license_requested: true, groups_added: true, credential_sent: true, updated_at: '2026-10-09T01:00:00Z' }), can_provision: false, ineligible_reason: 'needs_attention' },
    { id: 804, employee_id: 'SYN-804', name: 'Synthetic Unlicensed', company: { id: 4, name: 'Synthetic Subsidiary' }, work_email: 'unlicensed@synthetic.example', personal_email_hint: null,
      domain: 'synthetic.example', mailbox: mailbox('completed', { email: 'unlicensed@synthetic.example', credential_sent: true, updated_at: '2026-10-09T02:00:00Z' }), can_provision: false, ineligible_reason: 'completed' },
  ];
  const report = { id: 902, name: 'Synthetic Direct Report', employee_id: 'TEST-902', department: { id: 1, name: 'IT' } };
  const leave = { id: 41, employee_id: 902, employee: report, leave_type_id: 1, leaveType: { id: 1, name: 'Annual Leave' }, start_date: '2026-10-20', end_date: '2026-10-20',
    total_days: '1', status: 'pending', can_approve: true, reason: 'Synthetic leave', created_at: '2026-10-09T01:00:00Z' };
  const blocked = { ...leave, id: 42, employee: { ...report, name: 'Report With Other Approver' }, can_approve: false };
  await page.addInitScript(() => localStorage.setItem('token', 'isolated-it-admin'));
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const path = url.pathname.replace(/^\/api\/v1/, ''), method = req.method();
    if (['localhost', '127.0.0.1'].includes(url.hostname) && !url.pathname.startsWith('/api/') && !['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
    if (!url.pathname.startsWith('/api/')) return route.abort();
    if (path === '/audit-logs/events' && method === 'POST') return route.fulfill({ status: 204 });
    calls.push({ path, method, query: Object.fromEntries(url.searchParams), body: req.postData() ? req.postDataJSON() : null });
    const json = (data: unknown, extra: Record<string, unknown> = {}, status = 200) => route.fulfill({ status, json: { success: true, data, ...extra } });
    if (path === '/auth/me') return json({ user: { id: 91, email: 'it@example.test', roles, language, permissions: [], is_active: true, force_password_change: false,
      ...(unlinked === 'missing' ? {} : { employee: unlinked === 'null' ? null : employee }),
      // Unlinked accounts get IT scope only from account-based assignments; never general scope.
      accessibleCompanyIds: unlinked ? [] : [2], itCompanyIds: scoped ? [2, 4] : [], effectiveActions,
      companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } } });
    if (path === '/notifications/unread-count') return json({ unread_count: 0 });
    // The real API answers 404 for employee-bound endpoints of an unlinked account (the reported toast).
    if (unlinked && (path === '/employees/me' || path === '/leaves/my-approvals')) {
      return route.fulfill({ status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } } });
    }
    if (path === '/employees/me') return json(employee);
    // Presence heartbeat (GET/POST) is layout telemetry, not a business request under test.
    if (['/notifications/announcement-popups', '/presence'].includes(path)) return json([]);
    if (path === '/it/summary') return json(scoped ? { companies: 2, without_mailbox: 2, provisioned: 1, needs_attention: 1, m365_configured: m365 }
      : { companies: 0, without_mailbox: 0, provisioned: 0, needs_attention: 0, m365_configured: m365 });
    if (path === '/it/companies') return json(scoped ? [{ id: 2, name: 'Synthetic Holding', domain: 'synthetic.example' }, { id: 4, name: 'Synthetic Subsidiary', domain: 'synthetic.example' }] : []);
    if (path === '/it/licenses') return json([{ sku_id: '3b555118-da6a-4418-894f-7df1e2096870', name: 'Business Basic', available: 4 }, { sku_id: '00000000-0000-0000-0000-000000000001', name: 'Exhausted Plan', available: 0 }]);
    if (path === '/it/accounts' && method === 'GET') {
      const visible = scoped ? rows : [];
      return json(visible, { meta: { page: 1, limit: 20, total: visible.length, totalPages: 1 } });
    }
    if (path === '/it/accounts/mailbox' && method === 'POST') {
      if (state.delay) await new Promise(r => setTimeout(r, state.delay));
      if (state.provisionError) return route.fulfill({ status: 409, json: { success: false, error: { message: 'Raw provider text must not be shown', code: state.provisionError } } });
      const body = req.postDataJSON() as { employee_id: number; username: string; license_sku_id?: string };
      const ok = state.provisionStatus === 'completed';
      return json({ employee_id: body.employee_id, email: `${body.username}@synthetic.example`, status: state.provisionStatus,
        failure_code: ok ? null : 'license_failed', license_requested: !!body.license_sku_id, license_assigned: ok && !!body.license_sku_id, groups_added: true, credential_sent: true });
    }
    if (path === '/leaves/my-approvals') return json([leave, blocked]);
    // Own documents (personal page with a sidebar), used to inspect navigation after a /403.
    if (path === '/documents/employee/me' && method === 'GET') return json([]);
    if (method === 'POST' && path === '/leaves/41/approve') { leave.status = 'approved'; return json(leave); }
    unexpected.push(`${method} ${path}`); return route.abort();
  });
  // Business mutations only: the presence heartbeat is excluded explicitly (security assertions stay).
  const businessPosts = () => calls.filter(c => c.method === 'POST' && c.path !== '/presence').map(c => c.path);
  return { calls, state, unexpected, errors, businessPosts };
}
const sidebarLinks = async (page: Page) => {
  // Wait for the menu itself: the sidebar logo also links to /dashboard.
  await expect(page.locator('aside nav a[href="/dashboard"]')).toBeVisible();
  return page.locator('aside a').evaluateAll(links => links.map(link => link.getAttribute('href')));
};

for (const roles of [['IT Admin'], ['IT Admin', 'Employee']]) {
  test(`IT workspace navigation and dashboard: ${roles.join('+')}`, async ({ page }) => {
    const s = await setup(page, { roles });
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Open Microsoft 365 accounts' })).toBeVisible();
    await expect(page.locator('.ow-metrics')).toContainText('Without work email');
    const links = await sidebarLinks(page);
    for (const href of ['/dashboard', '/it/accounts', '/requests', '/my-leave', '/my-attendance', '/documents']) expect(links).toContain(href);
    expect(links).not.toContain('/templates');
    expect(links).not.toContain('/announcements');
    for (const href of ['/employees', '/users', '/roles', '/payroll', '/leave', '/company-assignments', '/audit-logs', '/payroll-settings']) expect(links).not.toContain(href);
    expect(s.calls.some(c => c.path === '/leaves/my-approvals')).toBe(true);
    if (roles.length === 2) await page.screenshot({ path: `${SHOTS}/dashboard-en-1440.png`, fullPage: true });
    expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
  });
}

// Reported bug: a standalone IT Admin account without an employee record got
// "Employee profile not found" toasts from employee-bound calls on the dashboard and /requests.
for (const roles of [['IT Admin'], ['IT Admin', 'Employee']]) {
  for (const unlinked of ['null', 'missing'] as const) {
    test(`unlinked IT account (${roles.join('+')}, employee ${unlinked}): no employee-bound calls, IT links kept`, async ({ page }) => {
      const s = await setup(page, { roles, unlinked });
      const employeeBound = () => s.calls.filter(c => c.path === '/employees/me' || c.path.startsWith('/leaves'));
      await page.goto('/dashboard');
      const notice = page.locator('[data-it-unlinked]');
      await expect(notice).toContainText('This account is not linked to an employee record');
      await expect(notice).toContainText('IT operations are not affected.');
      // No account-based assignment either: the empty IT scope is explained separately and honestly.
      const noScope = page.locator('[data-it-no-scope]');
      await expect(noScope).toContainText('No companies are assigned to this IT account');
      await expect(noScope).toContainText('Ask a system administrator.');
      await expect(noScope).not.toContainText('Company Assignments');
      await expect(page.locator('.ow-metrics')).toContainText('IT companies');
      // Greeting falls back to the account email instead of an empty name.
      await expect(page.locator('.ow-header h1')).toContainText(', it@example.test');
      const itNav = page.getByRole('navigation', { name: 'IT workspace' });
      await expect(itNav.getByRole('link', { name: 'Open Microsoft 365 accounts' })).toBeVisible();
      await expect(itNav.getByRole('link', { name: 'Approval settings' })).toBeVisible();
      await expect(itNav.getByRole('link', { name: 'Announcements' })).toBeVisible();
      for (const name of ['My Approval', 'My Leave', 'My Attendance', 'My Documents']) await expect(itNav.getByRole('link', { name })).toHaveCount(0);
      await expect(page.locator('.ow-metrics')).not.toContainText('Awaiting your approval');
      const links = await sidebarLinks(page);
      for (const href of ['/it/accounts', '/it/approval-settings']) expect(links).toContain(href);
      expect(links).not.toContain('/requests');
      await page.goto('/requests');
      await expect(page.locator('[data-requests-unlinked]')).toContainText('No approval inbox for this account');
      await expect(page.getByText('Unable to load approval requests.')).toHaveCount(0);
      await page.goto('/it/accounts');
      await expect(page.getByRole('heading', { name: 'Microsoft 365 accounts' })).toBeVisible();
      await expect(page.getByText('No employees in this view')).toBeVisible();
      await expect(page.getByText('Employee profile not found')).toHaveCount(0);
      await expect(page.getByText('Profil karyawan tidak ditemukan')).toHaveCount(0);
      expect(employeeBound()).toEqual([]);
      expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
    });
  }
}

for (const unlinked of ['null', 'missing'] as const) {
  test(`unlinked IT account with account-based IT companies (employee ${unlinked}): operations scoped, personal features hidden`, async ({ page }) => {
    const s = await setup(page, { roles: ['IT Admin', 'Employee'], unlinked, accountScope: true });
    await page.goto('/dashboard');
    await expect(page.locator('[data-it-unlinked]')).toContainText('IT operations are not affected.');
    // Scope is not empty: no missing-scope notice; the metric shows the real count.
    await expect(page.locator('[data-it-no-scope]')).toHaveCount(0);
    await expect(page.locator('.ow-metrics')).toContainText('IT companies');
    await expect(page.locator('.ow-metrics div').filter({ hasText: 'IT companies' }).locator('dd')).toHaveText('2');
    await expect(page.locator('.ow-metrics')).not.toContainText('Awaiting your approval');
    const itNav = page.getByRole('navigation', { name: 'IT workspace' });
    for (const name of ['My Approval', 'My Leave', 'My Attendance', 'My Documents']) await expect(itNav.getByRole('link', { name })).toHaveCount(0);
    expect(await sidebarLinks(page)).not.toContain('/requests');
    await page.screenshot({ path: `${SHOTS}/dashboard-unlinked-scoped-en-1440.png`, fullPage: true });
    // Operations list works with the same safe fields.
    await page.goto('/it/accounts');
    await expect(page.locator('[data-it-row]')).toHaveCount(4);
    await expect(page.locator('[data-it-row="802"]')).toContainText('Restricted account: ask a Super Admin');
    expect(await page.locator('main, body').first().innerText()).not.toContain('0000000000000700');
    await page.goto('/requests');
    await expect(page.locator('[data-requests-unlinked]')).toContainText('No approval inbox for this account');
    expect(s.calls.filter(c => c.path === '/employees/me' || c.path.startsWith('/leaves'))).toEqual([]);
    expect(s.calls.filter(c => /^\/(users|employees(?!\/me)|payroll|company-assignments)/.test(c.path))).toEqual([]);
    expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
  });
}

test('linked IT account with an empty IT scope is directed to an administrator, not promised a page', async ({ page }) => {
  // A linked account whose scope resolved to nothing (for example only inactive account-level grants,
  // which Company Assignments cannot override).
  const s = await setup(page);
  await page.route('**/api/v1/it/summary', route => route.fulfill({ json: { success: true, data: { companies: 0, without_mailbox: 0, provisioned: 0, needs_attention: 0, m365_configured: true } } }));
  await page.goto('/dashboard');
  await expect(page.locator('[data-it-no-scope]')).toContainText('No companies are assigned to this IT account');
  await expect(page.locator('[data-it-no-scope]')).toContainText('Ask a system administrator.');
  await expect(page.locator('[data-it-no-scope]')).not.toContainText('Company Assignments');
  await expect(page.locator('[data-it-unlinked]')).toHaveCount(0);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('unlinked IT account: Indonesian copy on the dashboard and My Approval', async ({ page }) => {
  const s = await setup(page, { unlinked: 'null', language: 'id' });
  await page.goto('/dashboard');
  await expect(page.locator('[data-it-unlinked]')).toContainText('Akun ini tidak terhubung ke data karyawan');
  await expect(page.locator('[data-it-unlinked]')).toContainText('Operasional IT tidak terpengaruh.');
  await expect(page.locator('[data-it-no-scope]')).toContainText('Belum ada perusahaan yang ditugaskan ke akun IT ini');
  await expect(page.locator('[data-it-no-scope]')).toContainText('Hubungi administrator sistem.');
  await expect(page.locator('.ow-metrics')).toContainText('Perusahaan IT');
  await page.screenshot({ path: `${SHOTS}/dashboard-unlinked-id-1440.png`, fullPage: true });
  await page.goto('/requests');
  await expect(page.locator('[data-requests-unlinked]')).toContainText('Tidak ada kotak persetujuan untuk akun ini');
  await expect(page.getByText('Profil karyawan tidak ditemukan')).toHaveCount(0);
  expect(s.calls.filter(c => c.path === '/employees/me' || c.path.startsWith('/leaves'))).toEqual([]);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('linked IT account keeps the approval metric, personal links and inbox', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/dashboard');
  await expect(page.locator('[data-it-unlinked]')).toHaveCount(0);
  await expect(page.locator('[data-it-no-scope]')).toHaveCount(0);
  await expect(page.locator('.ow-metrics')).toContainText('Awaiting your approval');
  const itNav = page.getByRole('navigation', { name: 'IT workspace' });
  for (const name of ['My Approval', 'My Leave', 'My Attendance', 'My Documents', 'Approval settings']) await expect(itNav.getByRole('link', { name })).toBeVisible();
  await expect(page.locator('.ow-header h1')).toContainText(', Synthetic IT Lead');
  await page.goto('/requests');
  await expect(page.locator('[data-request-record]')).toHaveCount(2);
  await expect(page.locator('[data-requests-unlinked]')).toHaveCount(0);
  expect(s.calls.filter(c => c.path === '/leaves/my-approvals').length).toBeGreaterThan(0);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('IT dashboard stays readable at desktop and mobile widths with the correct workspace label', async ({ page }) => {
  const s = await setup(page, { unlinked: 'null', accountScope: true, language: 'id' });
  await page.goto('/dashboard');
  await expect(page.locator('.ph-navbar-heading .ess-navbar-title')).toHaveText('Ruang kerja IT');
  await expect(page.locator('.it-tasks a')).toHaveCount(2);
  await expect(page.locator('[data-it-no-scope]')).toHaveCount(0);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('.it-task').first()).toBeVisible();
    await expect(page.locator('.it-task').last()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/it-redesign-dashboard-id-${width}.png`, fullPage: true });
  }
  expect(s.calls.some(c => c.path.startsWith('/leaves'))).toBe(false);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('a failed account refresh hides old rows and totals, and retry restores the register', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/accounts');
  await expect(page.locator('[data-it-row]')).toHaveCount(4);
  await page.route('**/api/v1/it/accounts?*', route => route.fulfill({ status: 503, json: { success: false, error: { code: 'UNAVAILABLE', message: 'Service unavailable' } } }));
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load employees.');
  await expect(page.locator('[data-it-row]')).toHaveCount(0);
  await expect(page.locator('.ow-metrics')).toHaveCount(0);
  await page.unroute('**/api/v1/it/accounts?*');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('[data-it-row]')).toHaveCount(4);
  await expect(page.locator('.ow-metrics')).toBeVisible();
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('IT Admin cannot open administration, HR or payroll pages by URL', async ({ page }) => {
  const s = await setup(page);
  for (const path of ['/users', '/roles', '/payroll', '/employees', '/leave', '/company-assignments', '/audit-logs', '/payroll-settings', '/leave-approval']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/403$/);
  }
  expect(s.calls.filter(c => /^\/(users|rbac|payroll|employees(?!\/me)|company-assignments|audit-logs)/.test(c.path))).toEqual([]);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('a role without IT Admin cannot open the IT workspace', async ({ page }) => {
  const s = await setup(page, { roles: ['Employee'] });
  await page.goto('/it/accounts');
  await expect(page).toHaveURL(/\/403$/);
  expect(s.calls.some(c => c.path.startsWith('/it/'))).toBe(false);
  // The standalone /403 page has no sidebar: inspect navigation from an allowed personal page.
  await page.goto('/documents');
  await expect(page).toHaveURL(/\/documents$/);
  expect(await sidebarLinks(page)).not.toContain('/it/accounts');
  expect(s.calls.some(c => c.path.startsWith('/it/'))).toBe(false);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('IT plus HR Staff keeps both workspaces (roles are additive)', async ({ page }) => {
  // A genuine legacy HR Staff resolves employee.view; IT Admin adds the IT section on top.
  const s = await setup(page, { roles: ['HR Staff', 'IT Admin'], effectiveActions: ['employee.view'] });
  await page.goto('/requests');
  await expect(page.getByRole('heading', { name: 'My Approval', exact: true })).toBeVisible();
  await expect(page.locator('aside a[href="/it/accounts"]')).toBeVisible();
  const links = await sidebarLinks(page);
  expect(links).toContain('/it/accounts');
  expect(links).toContain('/employees');
  expect(links).toContain('/templates');
  expect(links).toContain('/announcements');
  expect(links.filter(href => href === '/requests')).toHaveLength(1);
  expect(s.errors).toEqual([]);
});

test('account list contract, filters and sanitized display', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/accounts');
  await expect(page.getByRole('heading', { name: 'Microsoft 365 accounts' })).toBeVisible();
  await expect(page.locator('[data-it-row]')).toHaveCount(4);
  await expect(page.locator('[data-it-row="802"]')).toContainText('Restricted account: ask a Super Admin');
  await expect(page.locator('[data-it-row="802"]').getByRole('button', { name: 'Create account' })).toHaveCount(0);
  await expect(page.locator('[data-it-row="803"]')).toContainText('Needs attention');
  await expect(page.locator('[data-it-row="803"]')).toContainText('The license was not assigned.');
  // A created account without a license is not presented as a working mailbox.
  await expect(page.locator('[data-it-row="804"]')).toContainText('Account created');
  await expect(page.locator('[data-it-row="804"]')).toContainText('No license: email not active yet');
  await page.screenshot({ path: `${SHOTS}/accounts-en-1440.png`, fullPage: true });
  await page.getByLabel('Company', { exact: true }).selectOption('4');
  await page.getByLabel('Account status').selectOption('no_mailbox');
  await page.getByLabel('Search employees').fill('syn');
  await expect.poll(() => s.calls.filter(c => c.path === '/it/accounts').at(-1)?.query).toEqual({ page: '1', limit: '20', status: 'no_mailbox', company_id: '4', search: 'syn' });
  const body = await page.locator('main, body').first().innerText();
  expect(body).not.toContain('0000000000000700');
  expect(s.calls.every(c => !/^\/(users|employees(?!\/me)|payroll)/.test(c.path))).toBe(true);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('create account: strict request body, one request per click, licensed result without secrets', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/accounts');
  await page.locator('[data-it-row="801"]').getByRole('button', { name: 'Create account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create Microsoft 365 account' });
  await expect(dialog).toContainText('s***@mail.example');
  await expect(dialog).toContainText("The employee's PeopleHub sign-in and password do not change.");
  await expect(dialog).toContainText('Without a license the account has no working mailbox');
  const submit = dialog.getByRole('button', { name: 'Create account' });
  await dialog.getByLabel('Username').fill('Bad Name!');
  await expect(dialog.getByRole('alert')).toContainText('Use lowercase letters');
  await dialog.getByLabel('Username').fill('a..b');
  await expect(submit).toBeDisabled();
  await dialog.getByLabel('Username').fill('synthetic.staff');
  await expect(dialog).toContainText('synthetic.staff@synthetic.example');
  // Desktop: the domain suffix stays on one line beside the input (no '@synthetic.exam' / 'ple' break).
  const suffix = dialog.locator('.it-username span');
  expect(await suffix.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(24);
  expect(await suffix.textContent()).toBe('@synthetic.example');
  // Exhausted licenses cannot be chosen (DOM state; Playwright's toBeDisabled does not apply to <option>).
  const exhausted = dialog.locator('option', { hasText: 'Exhausted Plan' });
  await expect.poll(() => exhausted.evaluate(option => (option as HTMLOptionElement).disabled)).toBe(true);
  await dialog.getByLabel('Microsoft 365 license').selectOption('3b555118-da6a-4418-894f-7df1e2096870');
  await expect(dialog.getByLabel('Microsoft 365 license')).toHaveValue('3b555118-da6a-4418-894f-7df1e2096870');
  await page.screenshot({ path: `${SHOTS}/create-dialog-en-1440.png`, fullPage: true });
  s.state.delay = 600;
  await submit.click();
  // A second click while busy: the button is disabled/relabelled and the ref guard holds.
  await dialog.locator('.ph-form-actions button').last().click({ force: true, timeout: 500 }).catch(() => undefined);
  const result = page.getByRole('dialog', { name: 'Account request result' });
  await expect(result).toBeVisible();
  const posts = s.calls.filter(c => c.path === '/it/accounts/mailbox');
  expect(posts).toHaveLength(1);
  expect(posts[0].body).toEqual({ employee_id: 801, username: 'synthetic.staff', license_sku_id: '3b555118-da6a-4418-894f-7df1e2096870' });
  expect(s.businessPosts()).toEqual(['/it/accounts/mailbox']);
  await expect(result).toContainText('synthetic.staff@synthetic.example');
  await expect(result).toContainText('inbox delivery is not confirmed');
  await expect(result).toContainText('You will not see the password.');
  await expect(result.locator('[data-it-license-followup]')).toHaveCount(0);
  await result.getByRole('button', { name: 'Done' }).click();
  await expect(result).toHaveCount(0);
  expect(s.calls.filter(c => c.path === '/it/accounts').length).toBeGreaterThan(1);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('create account without a license shows the license follow-up, not a ready mailbox', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/accounts');
  await page.locator('[data-it-row="801"]').getByRole('button', { name: 'Create account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create Microsoft 365 account' });
  await dialog.getByLabel('Username').fill('nolicense');
  await dialog.getByRole('button', { name: 'Create account' }).click();
  const result = page.getByRole('dialog', { name: 'Account request result' });
  await expect(result.locator('[data-it-license-followup]')).toContainText('the work email is not active yet');
  await expect(result).toContainText('No license requested');
  expect(s.calls.find(c => c.path === '/it/accounts/mailbox')?.body).toEqual({ employee_id: 801, username: 'nolicense' });
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('create account: mapped errors keep the dialog; needs-attention is not shown as success', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/accounts');
  await page.locator('[data-it-row="801"]').getByRole('button', { name: 'Create account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create Microsoft 365 account' });
  await dialog.getByLabel('Username').fill('taken');
  s.state.provisionError = 'IT_ADDRESS_TAKEN';
  await dialog.getByRole('button', { name: 'Create account' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('This address is already in use. Choose another username.');
  await expect(dialog).not.toContainText('Raw provider text');
  s.state.provisionError = 'IT_EMPLOYEE_CHANGED';
  await dialog.getByRole('button', { name: 'Create account' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The employee record changed. Reload and try again.');
  s.state.provisionError = ''; s.state.provisionStatus = 'needs_attention';
  await dialog.getByLabel('Username').fill('other');
  await dialog.getByRole('button', { name: 'Create account' }).click();
  const result = page.getByRole('dialog', { name: 'Account request result' });
  await expect(result).toContainText('The account needs attention:');
  await expect(result).toContainText('The license was not assigned.');
  await expect(result).not.toContainText('The Microsoft 365 account was created.');
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('Microsoft 365 not configured disables creation with an explanation', async ({ page }) => {
  await setup(page, { m365: false });
  await page.goto('/it/accounts');
  await expect(page.getByText('Not configured. Accounts cannot be created yet.')).toBeVisible();
  await expect(page.locator('[data-it-row="801"]').getByRole('button', { name: 'Create account' })).toBeDisabled();
});

test('IT My Approval: direct-report scope text and assigned decision endpoint', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/requests');
  await expect(page.locator('[data-request-record]')).toHaveCount(2);
  await page.getByText('Approval scope').click();
  await expect(page.getByText('Only leave requests from your current direct reports appear here')).toBeVisible();
  await expect(page.locator('[data-request-record]').filter({ hasText: 'Report With Other Approver' }).getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
  await page.locator('[data-request-record]').filter({ hasText: 'Synthetic Direct Report' }).getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('dialog', { name: 'Approve Leave Request?' }).getByRole('button', { name: 'Yes, Approve' }).click();
  await expect(page.getByRole('dialog', { name: 'Approve Leave Request?' })).toHaveCount(0);
  expect(s.businessPosts()).toEqual(['/leaves/41/approve']);
  expect(s.calls.some(c => c.path.includes('pending-approvals') || c.path.startsWith('/overtime'))).toBe(false);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('Indonesian copy and mobile layout without horizontal overflow', async ({ page }) => {
  const s = await setup(page, { language: 'id' });
  await page.goto('/it/accounts');
  await expect(page.getByRole('heading', { name: 'Akun Microsoft 365' })).toBeVisible();
  await expect(page.locator('[data-it-row="801"]').getByRole('button', { name: 'Buat akun' })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: `${SHOTS}/accounts-id-390.png`, fullPage: true });
  await page.locator('[data-it-row="801"]').getByRole('button', { name: 'Buat akun' }).click();
  const dialog = page.getByRole('dialog', { name: 'Buat akun Microsoft 365' });
  await expect(dialog).toContainText('Akun masuk dan kata sandi PeopleHub karyawan tidak berubah.');
  await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `${SHOTS}/create-dialog-id-390.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => dialog.evaluate(el => el.getBoundingClientRect().bottom - innerHeight)).toBeLessThanOrEqual(0);
  await expect.poll(() => dialog.getByRole('button', { name: 'Buat akun', exact: true }).evaluate(el => el.getBoundingClientRect().bottom - innerHeight)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${SHOTS}/create-dialog-id-320.png`, fullPage: false });
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});
