import { test, expect, type Page } from '@playwright/test';

// Isolated mocked configuration: every API call is intercepted, synthetic data only.
// Verifies the IT approval-settings page against the documented /it/approval-settings
// contract: changed fields only + version, mapped errors, no general employee API.
const SHOTS = '../.analysis/it-admin-ui';
type Options = { roles?: string[]; language?: 'en' | 'id'; effectiveActions?: string[] };
const T0 = '2026-10-09T01:00:00.000Z';
const holding = { id: 2, name: 'Synthetic Holding' };
const view = (id: number, name: string, state: 'assigned' | 'unavailable' = 'assigned') => ({ state, id, name, employee_id: `SYN-${id}` });
const none = { state: 'none' } as const;

async function setup(page: Page, { roles = ['IT Admin', 'Employee'], language = 'en', effectiveActions = [] }: Options = {}) {
  const calls: { method: string; path: string; query: Record<string, string>; body: unknown }[] = [];
  const unexpected: string[] = [], errors: string[] = [];
  // Candidate mock: optional extra synthetic people (paged by 20), per-search delays and one-shot failures.
  const state = { patchError: '' as string, delay: 0, extraCandidates: 0, candidateDelay: {} as Record<string, number>, candidateFailOnce: false };
  // Synthetic completed-onboarding fixture (same as it-admin.spec.ts): a national_id keeps the profile-completion modal closed.
  const employee = { id: 700, name: 'Synthetic IT Lead', employee_id: 'IT-700', company_id: 2, profile_completed: true, national_id: '0000000000000700' };
  const rows: Record<string, unknown>[] = [
    { id: 700, employee_id: 'IT-700', name: 'Synthetic IT Lead', company: holding, department: 'IT', title: 'IT Lead', updated_at: T0,
      manager: view(810, 'Synthetic Manager'), direct_manager: none, leave_approver: none, effective_route: 'managers', editable: false },
    { id: 801, employee_id: 'SYN-801', name: 'Synthetic Staff', company: holding, department: 'Ops', title: 'Analyst', updated_at: T0,
      manager: view(810, 'Synthetic Manager'), direct_manager: none, leave_approver: view(811, 'Synthetic Approver'), effective_route: 'leave_approver', editable: true },
    { id: 820, employee_id: 'SYN-820', name: 'Synthetic HR Person', company: holding, department: 'People', title: 'HR Staff', updated_at: T0,
      manager: { state: 'out_of_scope' }, direct_manager: view(813, 'Synthetic Legacy Lead', 'unavailable'), leave_approver: none, effective_route: 'managers', editable: true },
  ];
  const candidates = [
    { id: 811, employee_id: 'SYN-811', name: 'Synthetic Approver', company: holding, department: 'Ops', title: 'Manager', capability: 'manager' },
    { id: 812, employee_id: 'SYN-812', name: 'Synthetic IT Peer', company: { id: 4, name: 'Synthetic Subsidiary' }, department: 'IT', title: 'IT', capability: 'direct_reports_only' },
  ];
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
    if (path === '/auth/me') return json({ user: { id: 91, email: 'it@example.test', roles, employee, language, permissions: [], is_active: true, force_password_change: false,
      accessibleCompanyIds: [2], itCompanyIds: [2, 4], effectiveActions, companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } } });
    if (path === '/notifications/unread-count') return json({ unread_count: 0 });
    if (path === '/employees/me') return json(employee);
    if (['/notifications/announcement-popups', '/presence'].includes(path)) return json([]);
    if (path === '/it/summary') return json({ companies: 2, without_mailbox: 0, provisioned: 0, needs_attention: 0, m365_configured: true });
    if (path === '/it/companies') return json([{ ...holding, domain: 'synthetic.example' }, { id: 4, name: 'Synthetic Subsidiary', domain: 'synthetic.example' }]);
    if (path === '/leaves/my-approvals') return json([]);
    if (path === '/documents/employee/me' && method === 'GET') return json([]);
    if (path === '/it/approval-settings' && method === 'GET') return json(rows, { meta: { page: 1, limit: 20, total: rows.length, totalPages: 1 } });
    if (path === '/users/me/language' && method === 'PUT') return json({ language: (req.postDataJSON() as { language: string }).language });
    if (path === '/it/approval-settings/candidates' && method === 'GET') {
      const search = url.searchParams.get('search') ?? '';
      const delay = state.candidateDelay[search];
      if (delay) await new Promise(r => setTimeout(r, delay));
      if (state.candidateFailOnce) { state.candidateFailOnce = false; return route.fulfill({ status: 500, json: { success: false, error: { code: 'INTERNAL_ERROR', message: 'x' } } }); }
      const extra = Array.from({ length: state.extraCandidates }, (_, i) => ({ id: 1000 + i, employee_id: `SYN-${1000 + i}`, name: `Synthetic Lead ${String(i + 1).padStart(2, '0')}`,
        company: holding, department: 'Ops', title: 'Manager', capability: 'manager' }));
      const all = [...candidates, ...extra].filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      const page = Number(url.searchParams.get('page') ?? 1);
      return json(all.slice((page - 1) * 20, page * 20), { meta: { page, limit: 20, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / 20)) } });
    }
    const match = path.match(/^\/it\/approval-settings\/(\d+)$/);
    if (match && method === 'PATCH') {
      if (state.delay) await new Promise(r => setTimeout(r, state.delay));
      if (state.patchError) return route.fulfill({ status: 409, json: { success: false, error: { message: 'Raw server text must not be shown', code: state.patchError } } });
      const row = rows.find(r => r.id === Number(match[1]))!;
      const body = req.postDataJSON() as Record<string, number | null>;
      const pick = (id: number | null | undefined, previous: unknown) => id === undefined ? previous : id === null ? none : view(id, candidates.find(c => c.id === id)!.name);
      Object.assign(row, {
        updated_at: '2026-10-09T02:00:00.000Z',
        manager: pick(body.manager_id, row.manager), direct_manager: pick(body.direct_manager_id, row.direct_manager), leave_approver: pick(body.leave_approver_id, row.leave_approver),
      });
      row.effective_route = (row.leave_approver as { state: string }).state !== 'none' ? 'leave_approver' : 'managers';
      return json(row);
    }
    unexpected.push(`${method} ${path}`); return route.abort();
  });
  const patches = () => calls.filter(c => c.method === 'PATCH');
  // No general employee API (list/detail/update) is ever used by this page; only the own /employees/me.
  const employeeApi = () => calls.filter(c => /^\/employees(?!\/me$)/.test(c.path));
  return { calls, state, unexpected, errors, patches, employeeApi };
}
const openDialog = async (page: Page, id: number) => {
  await page.locator(`[data-approval-row="${id}"]`).getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit approval routing' });
  await expect(dialog.locator('option', { hasText: 'Synthetic IT Peer' }).first()).toBeAttached();
  return dialog;
};

test('IT navigation and dashboard link to approval settings; list is scoped and safe', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Approval settings' }).first()).toBeVisible();
  await expect(page.locator('aside a[href="/it/approval-settings"]')).toBeVisible();
  await page.locator('aside a[href="/it/approval-settings"]').click();
  await expect(page.getByRole('heading', { name: 'Approval settings' })).toBeVisible();
  await expect(page.locator('[data-approval-row]')).toHaveCount(3);
  await expect(page.locator('[data-approval-row="801"]')).toContainText('Synthetic Approver');
  await expect(page.locator('[data-approval-row="801"]')).toContainText('Leave approver');
  // Out-of-scope assignee reveals nothing; a legacy non-approving value stays visible and flagged.
  await expect(page.locator('[data-approval-row="820"]')).toContainText('Outside your companies');
  await expect(page.locator('[data-approval-row="820"]')).toContainText('Synthetic Legacy Lead');
  await expect(page.locator('[data-approval-row="820"]')).toContainText('Cannot approve leave');
  // Own record is read-only.
  await expect(page.locator('[data-approval-row="700"]').getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await expect(page.locator('[data-approval-row="700"]')).toContainText('Your own routing: ask another administrator');
  await page.screenshot({ path: `${SHOTS}/approval-settings-en-1440.png`, fullPage: true });
  await page.getByLabel('Company', { exact: true }).selectOption('2');
  await page.getByLabel('Search employees').fill('syn');
  await expect.poll(() => s.calls.filter(c => c.path === '/it/approval-settings').at(-1)?.query).toEqual({ page: '1', limit: '20', company_id: '2', search: 'syn' });
  expect(await page.locator('main, body').first().innerText()).not.toContain('0000000000000700');
  expect(s.employeeApi()).toEqual([]);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('save sends only the changed field plus the version, once, then refreshes', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/approval-settings');
  const dialog = await openDialog(page, 801);
  await expect(dialog).toContainText('A designated leave approver takes priority');
  expect(s.calls.find(c => c.path === '/it/approval-settings/candidates')?.query).toEqual({ target_employee_id: '801', page: '1', limit: '20' });
  const save = dialog.getByRole('button', { name: 'Save routing' });
  await expect(save).toBeDisabled();
  await expect(dialog.locator('option', { hasText: 'direct reports only' })).toHaveCount(3);
  await dialog.getByLabel('Manager', { exact: true }).selectOption('811');
  await page.screenshot({ path: `${SHOTS}/approval-dialog-en-1440.png`, fullPage: true });
  s.state.delay = 500;
  await save.click();
  await dialog.locator('.ph-form-actions button').last().click({ force: true, timeout: 400 }).catch(() => undefined);
  await expect(dialog).toHaveCount(0);
  expect(s.patches()).toHaveLength(1);
  expect(s.patches()[0].path).toBe('/it/approval-settings/801');
  expect(s.patches()[0].body).toEqual({ expected_updated_at: T0, manager_id: 811 });
  await expect(page.locator('[data-approval-row="801"]')).toContainText('Synthetic Approver');
  expect(s.calls.filter(c => c.path === '/it/approval-settings').length).toBeGreaterThan(1);
  expect(s.employeeApi()).toEqual([]);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('clearing the leave approver sends an explicit null and explains the fallback', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/approval-settings');
  const dialog = await openDialog(page, 801);
  await dialog.getByLabel('Leave approver', { exact: true }).selectOption('clear');
  await expect(dialog.getByRole('status').filter({ hasText: 'manager and direct manager approve' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save routing' }).click();
  await expect(dialog).toHaveCount(0);
  expect(s.patches().map(c => c.body)).toEqual([{ expected_updated_at: T0, leave_approver_id: null }]);
  await expect(page.locator('[data-approval-row="801"]')).toContainText('Manager and direct manager');
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('cancel sends nothing; legacy direct manager is shown and only changed when chosen', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/approval-settings');
  const dialog = await openDialog(page, 820);
  await expect(dialog).toContainText('Synthetic Legacy Lead');
  await expect(dialog).toContainText('A separate reporting field kept from earlier data');
  // An out-of-scope manager is shown without any name or id.
  await expect(dialog).toContainText('Outside your companies');
  await dialog.getByLabel('Manager', { exact: true }).selectOption('811');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  expect(s.patches()).toEqual([]);
  // Reopen: state was discarded.
  const again = await openDialog(page, 820);
  await expect(again.getByLabel('Manager', { exact: true })).toHaveValue('keep');
  await again.getByLabel('Direct manager', { exact: true }).selectOption('clear');
  await again.getByRole('button', { name: 'Save routing' }).click();
  await expect(again).toHaveCount(0);
  expect(s.patches().map(c => c.body)).toEqual([{ expected_updated_at: T0, direct_manager_id: null }]);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('server refusals are mapped to clear messages and keep the dialog open', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/approval-settings');
  const dialog = await openDialog(page, 801);
  await dialog.getByLabel('Leave approver', { exact: true }).selectOption('812');
  for (const [code, text] of [
    ['IT_APPROVER_NOT_DIRECT_MANAGER', 'An IT Admin can only approve leave for direct reports'],
    ['IT_ASSIGNMENT_CHANGED', 'This employee was changed by someone else. Reload and try again.'],
    ['IT_ASSIGNMENT_CYCLE', 'This would create a reporting cycle.'],
    ['IT_ROUTING_UNAPPROVABLE', "Nobody in the resulting routing could approve this employee's leave."],
    ['IT_ASSIGNEE_OUT_OF_SCOPE', 'The selected person is not available in your companies.'],
    ['SOMETHING_NEW', 'The routing could not be saved. Try again.'],
  ]) {
    s.state.patchError = code;
    await dialog.getByRole('button', { name: 'Save routing' }).click();
    await expect(dialog.getByRole('alert')).toContainText(text);
    await expect(dialog).not.toContainText('Raw server text');
  }
  await expect(dialog).toBeVisible();
  expect(s.patches().every(c => JSON.stringify(c.body) === JSON.stringify({ expected_updated_at: T0, leave_approver_id: 812 }))).toBe(true);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('an open failure re-translates when the language changes', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/it/approval-settings');
  const dialog = await openDialog(page, 801);
  await dialog.getByLabel('Leave approver', { exact: true }).selectOption('812');
  s.state.patchError = 'IT_ASSIGNMENT_CYCLE';
  await dialog.getByRole('button', { name: 'Save routing' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('This would create a reporting cycle.');
  // The header switcher sits behind the modal overlay: dispatch the click directly.
  await page.locator('button[aria-label="Bahasa Indonesia"]').first().dispatchEvent('click');
  const translated = page.getByRole('dialog', { name: 'Ubah routing persetujuan' });
  await expect(translated.getByRole('alert')).toHaveText('Perubahan ini akan membuat siklus pelaporan.');
  await expect(translated.getByLabel('Atasan langsung', { exact: true })).toBeVisible();
  expect(s.calls.filter(c => c.path === '/users/me/language').map(c => c.body)).toEqual([{ language: 'id' }]);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('candidate search: a late response from an older search never replaces the current results', async ({ page }) => {
  const s = await setup(page);
  s.state.candidateDelay = { slow: 1500 };
  await page.goto('/it/approval-settings');
  const dialog = await openDialog(page, 801);
  await dialog.getByLabel('Find a person').fill('slow');
  await expect.poll(() => s.calls.some(c => c.path === '/it/approval-settings/candidates' && c.query.search === 'slow')).toBe(true);
  await dialog.getByLabel('Find a person').fill('IT Peer');
  await expect(dialog.locator('[data-candidate-count]')).toContainText('Showing 1 of 1 people who can approve leave.');
  // Let the older 'slow' response (0 matches) arrive: it must be ignored.
  await page.waitForTimeout(1800);
  await expect(dialog.locator('[data-candidate-count]')).toContainText('Showing 1 of 1 people who can approve leave.');
  await expect(dialog).not.toContainText('No one who can approve leave matches this search.');
  await expect(dialog.getByLabel('Manager', { exact: true }).locator('option', { hasText: 'Synthetic Approver' })).toHaveCount(0);
  // Closing while a request is in flight leaves no error behind.
  s.state.candidateDelay = { late: 800 };
  await dialog.getByLabel('Find a person').fill('late');
  await expect.poll(() => s.calls.some(c => c.query.search === 'late')).toBe(true);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await page.waitForTimeout(1000);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('candidate pages: totals are shown, more can be loaded, chosen values survive a new search', async ({ page }) => {
  const s = await setup(page);
  s.state.extraCandidates = 25;
  await page.goto('/it/approval-settings');
  const dialog = await openDialog(page, 801);
  const count = dialog.locator('[data-candidate-count]');
  await expect(count).toContainText('Showing 20 of 27 people who can approve leave.');
  const manager = dialog.getByLabel('Manager', { exact: true });
  await expect(manager.locator('option', { hasText: 'Synthetic Lead 25' })).toHaveCount(0);
  await manager.selectOption('1000');
  await dialog.getByRole('button', { name: 'Load more' }).click();
  await expect(count).toContainText('Showing 27 of 27 people who can approve leave.');
  await expect(dialog.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  await expect(manager.locator('option', { hasText: 'Synthetic Lead 25' })).toHaveCount(1);
  expect(s.calls.filter(c => c.path === '/it/approval-settings/candidates').map(c => c.query.page)).toEqual(['1', '2']);
  await dialog.getByLabel('Find a person').fill('IT Peer');
  await expect(count).toContainText('Showing 1 of 1');
  await expect(manager).toHaveValue('1000');
  await expect(manager.locator('option', { hasText: 'Synthetic Lead 01' })).toHaveCount(1);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('candidate load failure offers retry; an empty search says so', async ({ page }) => {
  const s = await setup(page);
  s.state.candidateFailOnce = true;
  await page.goto('/it/approval-settings');
  await page.locator('[data-approval-row="801"]').getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit approval routing' });
  await expect(dialog.getByRole('alert')).toContainText('People could not be loaded.');
  await dialog.getByRole('button', { name: 'Retry' }).click();
  await expect(dialog.locator('[data-candidate-count]')).toContainText('Showing 2 of 2 people who can approve leave.');
  await dialog.getByLabel('Find a person').fill('nobody');
  await expect(dialog.getByRole('status').filter({ hasText: 'No one who can approve leave matches this search.' })).toBeVisible();
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('a role without IT Admin cannot open IT approval settings; Super Admin page is separate', async ({ page }) => {
  const s = await setup(page, { roles: ['Employee'] });
  await page.goto('/it/approval-settings');
  await expect(page).toHaveURL(/\/403$/);
  await page.goto('/documents');
  await expect(page.locator('aside nav a[href="/dashboard"]')).toBeVisible();
  expect(await page.locator('aside a').evaluateAll(links => links.map(link => link.getAttribute('href')))).not.toContain('/it/approval-settings');
  expect(s.calls.some(c => c.path.startsWith('/it/'))).toBe(false);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('IT Admin still cannot open the Super Admin approval settings or employee pages', async ({ page }) => {
  const s = await setup(page);
  for (const path of ['/approval-settings', '/employees']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/403$/);
  }
  expect(s.employeeApi()).toEqual([]);
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});

test('IT plus HR Staff keeps the IT approval settings link (additive roles)', async ({ page }) => {
  const s = await setup(page, { roles: ['HR Staff', 'IT Admin'], effectiveActions: ['employee.view'] });
  await page.goto('/documents');
  await expect(page.locator('aside a[href="/it/approval-settings"]')).toBeVisible();
  expect(s.errors).toEqual([]);
});

test('Indonesian copy and mobile layout without horizontal overflow', async ({ page }) => {
  const s = await setup(page, { language: 'id' });
  await page.goto('/it/approval-settings');
  await expect(page.getByRole('heading', { name: 'Pengaturan persetujuan' })).toBeVisible();
  await expect(page.locator('[data-approval-row="820"]')).toContainText('Di luar perusahaan Anda');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: `${SHOTS}/approval-settings-id-390.png`, fullPage: true });
  await page.locator('[data-approval-row="801"]').getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ubah routing persetujuan' });
  await expect(dialog).toContainText('Penyetuju cuti yang ditetapkan diutamakan');
  await expect(dialog.getByRole('button', { name: 'Simpan routing' })).toBeDisabled();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => dialog.evaluate(el => el.getBoundingClientRect().bottom - innerHeight)).toBeLessThanOrEqual(0);
  await expect.poll(() => dialog.getByRole('button', { name: 'Simpan routing' }).evaluate(el => el.getBoundingClientRect().bottom - innerHeight)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${SHOTS}/approval-dialog-id-320.png`, fullPage: false });
  expect(s.unexpected).toEqual([]); expect(s.errors).toEqual([]);
});
