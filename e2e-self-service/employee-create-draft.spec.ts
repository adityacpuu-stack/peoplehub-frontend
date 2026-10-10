import { test, expect, type Page } from '@playwright/test';

// Isolated checks for the refresh-safe Add Employee draft. Every API call is
// mocked with synthetic records (unmocked API calls abort and are recorded).
// The init script only sets the token; sessionStorage is never cleared by it,
// so a reload behaves like a real refresh of this tab.

const company = { id: 1, name: 'Synthetic Company', code: 'TEST', status: 'active' };
const otherCompany = { id: 2, name: 'Synthetic Second Company', code: 'TWO', status: 'active' };
const employee = {
  id: 901, employee_id: 'TEST-901', name: 'Synthetic Staff', company_id: 1,
  personal_email: 'staff@example.test', email: 'staff-office@example.test',
  department_id: 10, position_id: 20, employment_status: 'active', employment_type: 'contract',
  profile_completed: true, national_id: '0000000000000901', join_date: '2026-01-01',
  salary_status: 'existing', basic_salary: 9000000, salary_currency: 'IDR', pay_type: 'gross', ptkp_status: 'K/1',
  job_title: 'Analyst', company,
};
const self = { ...employee, id: 500, employee_id: 'TEST-500', name: 'Synthetic Actor' };
const FULL = ['employee.view', 'employee.create', 'employee.update', 'employee.view_salary', 'employee.update_salary'];
const DRAFT_KEY = (userId: number) => `peoplehub.employee-create-draft.v1.${userId}`;

interface Control {
  userId: number;
  effectiveActions: string[];
  companies: typeof company[];
  meStatus: number;
  createStatus: number;
  nextIdStatus: number;
  language: 'en' | 'id';
}

async function session(page: Page, overrides: Partial<Control> = {}) {
  const control: Control = { userId: 91, effectiveActions: FULL, companies: [company, otherCompany], meStatus: 200,
    createStatus: 200, nextIdStatus: 200, language: 'en', ...overrides };
  const state = { control, unexpected: [] as string[], errors: [] as string[], creates: [] as Record<string, unknown>[],
    updates: [] as Record<string, unknown>[], logouts: 0, nextId: 0 };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-employee-draft');
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
    if (endpoint === '/audit-logs/events' || (endpoint === '/presence' && method !== 'GET')) return route.fulfill({ status: 204 });
    const paginated = (data: unknown[], key = 'meta') => route.fulfill({ json: { success: true, data,
      [key]: { page: Number(url.searchParams.get('page') || 1), limit: 100, total: data.length, totalPages: 1 } } });
    const user = { id: control.userId, email: `actor${control.userId}@example.test`, roles: ['HR Staff'], permissions: [],
      accessibleCompanyIds: control.companies.map(c => c.id), effectiveActions: control.effectiveActions, language: control.language,
      is_active: true, force_password_change: false, employee: self,
      companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
    let data: unknown;
    if (endpoint === '/auth/me') {
      if (control.meStatus !== 200) return route.fulfill({ status: control.meStatus, json: { success: false, error: { message: 'Session expired' } } });
      data = { user };
    } else if (endpoint === '/auth/logout') { state.logouts++; data = {}; }
    else if (endpoint === '/employees/me' || endpoint === '/employees/500') data = self;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (endpoint === '/employees/901' && method === 'PUT') { state.updates.push(req.postDataJSON()); data = employee; }
    else if (endpoint === '/employees/901') data = employee;
    else if (endpoint === '/employees' && method === 'POST') {
      state.creates.push(req.postDataJSON());
      if (control.createStatus !== 200) return route.fulfill({ status: control.createStatus, json: { success: false, error: { message: 'Synthetic create failure' } } });
      data = { ...employee, id: 903 };
    } else if (endpoint === '/employees') return paginated([employee]);
    else if (endpoint.startsWith('/employees/next-id/')) {
      if (control.nextIdStatus !== 200) return route.fulfill({ status: control.nextIdStatus, json: { success: false, error: { message: 'Session expired' } } });
      state.nextId++; data = { employee_id: `TEST-${endpoint.split('/').pop()}-NEW-${state.nextId}` };
    }
    else if (endpoint === '/companies') return paginated(control.companies, 'pagination');
    else if (endpoint === '/departments') return paginated([
      { id: 10, name: 'Synthetic Department', code: 'SD', description: '', company_id: 1, status: 'active' },
      { id: 11, name: 'Second Company Department', code: 'S2', description: '', company_id: 2, status: 'active' },
    ]);
    // workLocationService.getOptions() reads the list endpoint (no /work-locations/options route).
    else if (endpoint === '/work-locations' && method === 'GET') return paginated([]);
    else { state.unexpected.push(`${method} ${endpoint}`); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  return state;
}

type State = Awaited<ReturnType<typeof session>>;
const clean = (state: State) => { expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]); };
const next = (page: Page) => page.getByRole('button', { name: 'Next Step', exact: true }).click();
/** Header account menu sign-out (the sidebar also has a Logout control). */
async function signOut(page: Page) {
  await page.locator('[data-account-menu-trigger]').click();
  await page.locator('#navbar-popover').getByRole('button', { name: 'Sign out' }).click();
}
/** Client-side route change without a page reload (same mounted app). */
const softNavigate = (page: Page, path: string) => page.evaluate(target => {
  window.history.pushState({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}, path);
const notice = (page: Page) => page.getByTestId('employee-draft-notice');
const stored = (page: Page, userId = 91) => page.evaluate(key => window.sessionStorage.getItem(key), DRAFT_KEY(userId));
/** Seed a record exactly as the app stores it (used only for values the UI derives automatically). */
const seed = (page: Page, record: Record<string, unknown>, userId = 91) => page.evaluate(([key, value]) =>
  window.sessionStorage.setItem(key, value), [DRAFT_KEY(userId), JSON.stringify({ version: 1, user_id: userId,
  saved_at: Date.now(), expires_at: Date.now() + 3_600_000, ...record })] as const);

async function openCreate(page: Page) {
  await page.goto('/employees/create');
  await expect(page.locator('input[name=name]')).toBeVisible();
}

test('multi-step entries survive reloads as typed; a failed create keeps the draft, a successful one removes it', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await page.locator('input[name=name]').fill('Synthetic Draft Person');
  await page.locator('select[name=company_id]').selectOption('1');
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW-1');
  // Refresh immediately after typing (no blur, no debounce window).
  await page.locator('input[name=national_id]').fill('0012345678901234');
  await page.reload();
  await expect(notice(page)).toContainText('Draft restored');
  await expect(page.locator('input[name=name]')).toHaveValue('Synthetic Draft Person');
  await expect(page.locator('input[name=national_id]')).toHaveValue('0012345678901234');
  await expect(page.locator('select[name=company_id]')).toHaveValue('1');
  // The generated ID is fetched again, never reused from the old draft.
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW-2');
  expect(await stored(page)).not.toContain('TEST-1-NEW');

  await next(page);
  await page.locator('select[name=employment_type]').selectOption('contract');
  await page.locator('input[name=join_date]').fill('2026-01-31');
  await expect(page.locator('input[name=probation_end_date]')).toHaveValue('2026-04-30');
  await next(page);
  await expect(page.locator('input[name=basic_salary]')).toBeVisible();
  await page.reload();
  // Step 3 is restored, employment type and its BPJS defaults are not reset to "permanent".
  await expect(page.locator('input[name=basic_salary]')).toBeVisible();
  await expect(page.locator('select[name=employment_type]')).toHaveValue('contract');
  await expect(page.locator('input[name=probation_end_date]')).toHaveValue('2026-04-30');

  await next(page);
  await page.getByRole('switch', { name: 'Employee has office email' }).click();
  await page.locator('input[name=personal_email]').fill('draft@example.test');
  await next(page);
  // Initial company choice + two reloads: the third generated ID.
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW-3');
  state.control.createStatus = 500;
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(1);
  await expect(page).toHaveURL(/\/employees\/create$/);
  await page.reload();
  await expect(notice(page)).toContainText('Draft restored');
  await expect(page.getByRole('button', { name: 'Create Employee', exact: true })).toBeVisible();

  state.control.createStatus = 200;
  // Each restore fetched a fresh generated ID; the payload uses the latest one.
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW-4');
  expect(state.creates[0].employee_id).toBe('TEST-1-NEW-3');
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(2);
  await expect(page).toHaveURL(/\/employees$/);
  expect(state.creates[1]).toMatchObject({ name: 'Synthetic Draft Person', national_id: '0012345678901234', company_id: 1,
    employee_id: 'TEST-1-NEW-4', employment_type: 'contract', join_date: '2026-01-31', probation_end_date: '2026-04-30',
    jht_registered: false, jp_registered: false, personal_email: 'draft@example.test' });
  expect(await stored(page)).toBeNull();
  await openCreate(page);
  await expect(notice(page)).toHaveCount(0);
  await expect(page.locator('input[name=name]')).toHaveValue('');
  clean(state);
});

test('restored custom BPJS and probation values are not overwritten by default effects', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await seed(page, { step: 5, values: {
    has_office_email: false, name: 'Seeded Person', company_id: 1, employment_type: 'contract', employment_status: 'active',
    join_date: '2026-02-01', probation_start_date: '2026-02-01', probation_end_date: '2026-06-15',
    jht_registered: true, jp_registered: false, medical_insurance: true, life_insurance: false,
    personal_email: 'seeded@example.test', salary_currency: 'IDR', pay_frequency: 'monthly', pay_type: 'gross', salary_status: 'new_gross',
    nationality: 'Indonesia', employee_id: 'STALE-ID', token: 'must-not-load',
  } });
  await page.reload();
  await expect(notice(page)).toContainText('Draft restored');
  await expect(page.getByRole('button', { name: 'Create Employee', exact: true })).toBeVisible();
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW-1');
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(1);
  expect(state.creates[0]).toMatchObject({ name: 'Seeded Person', employment_type: 'contract', join_date: '2026-02-01',
    probation_start_date: '2026-02-01', probation_end_date: '2026-06-15', jht_registered: true, jp_registered: false,
    medical_insurance: true, life_insurance: false, employee_id: 'TEST-1-NEW-1' });
  expect(state.creates[0]).not.toHaveProperty('token');
  clean(state);
});

test('a later real join-date change still recalculates probation after a restore', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await seed(page, { step: 2, values: { name: 'Seeded Person', company_id: 1, employment_type: 'contract',
    join_date: '2026-02-01', probation_start_date: '2026-02-01', probation_end_date: '2026-06-15' } });
  await page.reload();
  await expect(page.locator('input[name=probation_end_date]')).toHaveValue('2026-06-15');
  await page.locator('input[name=join_date]').fill('2026-03-31');
  await expect(page.locator('input[name=probation_end_date]')).toHaveValue('2026-06-30');
  clean(state);
});

test('discard asks for confirmation, clears the form and storage; the edit route never uses the draft', async ({ page }, testInfo) => {
  const state = await session(page);
  await openCreate(page);
  await page.locator('input[name=name]').fill('Draft To Discard');
  await expect(notice(page)).toContainText('Draft saved in this browser tab');
  await page.screenshot({ path: testInfo.outputPath('employee-draft-saved-en-desktop.png') });
  await page.goto('/employees/901/edit');
  await expect(page.locator('input[name=name]')).toHaveValue('Synthetic Staff');
  await expect(notice(page)).toHaveCount(0);
  await page.locator('input[name=name]').fill('Edited Not Drafted');
  await openCreate(page);
  await expect(page.locator('input[name=name]')).toHaveValue('Draft To Discard');
  await page.getByTestId('employee-draft-discard').click();
  await page.getByRole('button', { name: 'Keep draft' }).click();
  await expect(page.locator('input[name=name]')).toHaveValue('Draft To Discard');
  await page.getByTestId('employee-draft-discard').click();
  await page.getByTestId('employee-draft-discard-confirm').click();
  await expect(page.locator('input[name=name]')).toHaveValue('');
  await expect(notice(page)).toHaveCount(0);
  expect(await stored(page)).toBeNull();
  await page.reload();
  await expect(page.locator('input[name=name]')).toHaveValue('');
  expect(state.updates).toEqual([]);
  clean(state);
});

test('sign-out, another account and a 401 each remove the draft', async ({ page }) => {
  const state = await session(page);
  // Explicit sign-out.
  await openCreate(page);
  await page.locator('input[name=name]').fill('Signed Out Draft');
  await signOut(page);
  await expect(page).toHaveURL(/\/login$/);
  expect(state.logouts).toBe(1);
  expect(await stored(page)).toBeNull();
  await openCreate(page);
  await expect(page.locator('input[name=name]')).toHaveValue('');

  // Another account in the same tab.
  await page.locator('input[name=name]').fill('Account A Draft');
  state.control.userId = 92;
  await openCreate(page);
  await expect(page.locator('input[name=name]')).toHaveValue('');
  expect(await stored(page, 91)).toBeNull();
  state.control.userId = 91;
  await openCreate(page);
  await expect(page.locator('input[name=name]')).toHaveValue('');

  // Authentication lost (401).
  await page.locator('input[name=name]').fill('Expired Session Draft');
  state.control.meStatus = 401;
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  expect(await stored(page)).toBeNull();
  state.control.meStatus = 200;
  await openCreate(page);
  await expect(page.locator('input[name=name]')).toHaveValue('');
  expect(state.unexpected.filter(call => !call.startsWith('POST /auth/'))).toEqual([]);
});

test('a company no longer accessible and revoked salary access are not restored', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await seed(page, { step: 3, values: { name: 'Scoped Person', company_id: 2, department_id: 11, basic_salary: '15000000',
    salary_status: 'existing', employment_type: 'permanent', join_date: '2026-01-31' } });
  state.control.companies = [company];
  state.control.effectiveActions = ['employee.view', 'employee.create', 'employee.update'];
  await page.reload();
  await expect(notice(page)).toContainText('were not restored');
  await expect(page.locator('input[name=name]')).toHaveValue('Scoped Person');
  await expect(page.locator('select[name=company_id]')).toHaveValue('');
  await expect(page.locator('select[name=company_id] option[value="2"]')).toHaveCount(0);
  await expect(page.getByTestId('compensation-locked')).toBeVisible();
  await expect(page.locator('input[name=basic_salary]')).toHaveCount(0);
  const record = JSON.parse((await stored(page))!);
  expect(record.values).not.toHaveProperty('company_id');
  expect(record.values).not.toHaveProperty('department_id');
  expect(record.values).not.toHaveProperty('basic_salary');
  expect(record.values).not.toHaveProperty('salary_status');
  clean(state);
});

test('a corrupt or expired record is ignored and removed', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await page.evaluate(key => window.sessionStorage.setItem(key, '{not json'), DRAFT_KEY(91));
  await page.reload();
  // Wait for the app to finish loading (restore runs after reference data).
  await expect(page.locator('input[name=name]')).toBeVisible();
  await expect.poll(() => stored(page)).toBeNull();
  await expect(notice(page)).toHaveCount(0);
  await seed(page, { step: 2, expires_at: Date.now() - 1, values: { name: 'Expired Person' } });
  await page.reload();
  await expect(page.locator('input[name=name]')).toBeVisible();
  await expect.poll(() => stored(page)).toBeNull();
  await expect(page.locator('input[name=name]')).toHaveValue('');
  // Unrelated keys in this tab are never touched by draft cleanup.
  await page.evaluate(() => window.sessionStorage.setItem('unrelated.key', 'keep'));
  await signOut(page);
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => window.sessionStorage.getItem('unrelated.key'))).toBe('keep');
  clean(state);
});

test('an immediate refresh keeps incomplete, invalid and raw money input exactly as typed', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await page.locator('input[name=name]').fill('Raw Input Person');
  await page.locator('select[name=company_id]').selectOption('1');
  await page.locator('input[name=national_id]').fill('0012');           // too short: invalid, still kept
  await page.reload();
  await expect(page.locator('input[name=national_id]')).toHaveValue('0012');
  await page.locator('input[name=national_id]').fill('3201234567890001');
  await expect(page.locator('input[name=employee_id]')).not.toHaveValue('');
  await next(page);
  await page.locator('input[name=join_date]').fill('2026-01-31');
  await next(page);
  await page.locator('input[name=basic_salary]').fill('0075000000');
  await page.locator('input[name=transport_allowance]').fill('000150000');
  await page.reload();
  await expect(page.locator('input[name=basic_salary]')).toHaveValue('0075000000');
  await expect(page.locator('input[name=transport_allowance]')).toHaveValue('000150000');
  await expect(page.locator('input[name=national_id]')).toHaveValue('3201234567890001');
  clean(state);
});

test('client-side create -> edit -> create keeps the draft and the employee record apart', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await page.locator('input[name=name]').fill('Soft Nav Draft');
  await page.locator('input[name=national_id]').fill('0099');
  await softNavigate(page, '/employees/901/edit');
  await expect(page.locator('input[name=name]')).toHaveValue('Synthetic Staff');
  await expect(page.locator('input[name=national_id]')).toHaveValue('0000000000000901');
  await expect(notice(page)).toHaveCount(0);
  await page.locator('input[name=name]').fill('Edited In Place');
  await softNavigate(page, '/employees/create');
  // The reused form instance shows the create draft, never the edited employee.
  await expect(page.locator('input[name=name]')).toHaveValue('Soft Nav Draft');
  await expect(page.locator('input[name=national_id]')).toHaveValue('0099');
  await expect(notice(page)).toContainText('Draft restored');
  const record = JSON.parse((await stored(page))!);
  expect(record.values).toMatchObject({ name: 'Soft Nav Draft', national_id: '0099' });
  expect(JSON.stringify(record)).not.toContain('Synthetic Staff');
  expect(JSON.stringify(record)).not.toContain('Edited In Place');
  expect(state.updates).toEqual([]);
  clean(state);
});

test('a 401 while the generated ID loads clears the draft and nothing writes it back', async ({ page }) => {
  const state = await session(page);
  await openCreate(page);
  await page.locator('input[name=name]').fill('Lost Session Draft');
  await expect.poll(() => stored(page)).not.toBeNull();
  state.control.nextIdStatus = 401;
  await page.locator('select[name=company_id]').selectOption('1');
  await expect(page).toHaveURL(/\/login$/);
  await page.waitForTimeout(300);
  expect(await stored(page)).toBeNull();
  const keys = await page.evaluate(() => Object.keys(window.sessionStorage));
  expect(keys.filter(key => key.startsWith('peoplehub.employee-create-draft'))).toEqual([]);
});

test('Indonesian notice and discard controls fit a small screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const state = await session(page, { language: 'id' });
  await openCreate(page);
  await page.locator('input[name=name]').fill('Draf Kecil');
  await expect(notice(page)).toContainText('Draf tersimpan di tab browser ini');
  await page.screenshot({ path: testInfo.outputPath('employee-draft-saved-id-360.png') });
  await page.reload();
  await expect(notice(page)).toContainText('Draf dipulihkan');
  await expect(notice(page).getByRole('button', { name: 'Buang draf' })).toBeVisible();
  const overflow = await page.evaluate(() => [document.body, document.querySelector('[data-testid=employee-draft-notice]')]
    .map(node => node ? node.scrollWidth - node.clientWidth : -1));
  for (const extra of overflow) expect(extra).toBeLessThanOrEqual(1);
  await notice(page).getByRole('button', { name: 'Buang draf' }).click();
  await expect(notice(page)).toContainText('Buang draf dan kosongkan formulir?');
  await page.screenshot({ path: testInfo.outputPath('employee-draft-restored-id-360.png') });
  clean(state);
});

test('unavailable session storage leaves the form usable and says the draft is not kept', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (this === window.sessionStorage) throw new DOMException('Synthetic quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const state = await session(page);
  await openCreate(page);
  await page.locator('input[name=name]').fill('No Storage Person');
  await expect(notice(page)).toContainText('not keeping a draft');
  await page.locator('select[name=company_id]').selectOption('1');
  await next(page);
  await page.locator('input[name=join_date]').fill('2026-01-31');
  await next(page);
  await next(page);
  await page.getByRole('switch', { name: 'Employee has office email' }).click();
  await page.locator('input[name=personal_email]').fill('nostorage@example.test');
  await next(page);
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW-1');
  await page.getByRole('button', { name: 'Create Employee', exact: true }).click();
  await expect.poll(() => state.creates.length).toBe(1);
  expect(state.creates[0]).toMatchObject({ name: 'No Storage Person', company_id: 1 });
  clean(state);
});
