import { test, expect, type Page } from '@playwright/test';

// Isolated checks for the shared Target THP -> basic salary simulator. Every
// API call is mocked with synthetic records; no backend or real account. The
// simulation response mirrors the backend contract (payroll-salary-simulation.service).

const company = { id: 1, name: 'Synthetic Company', code: 'TEST', status: 'active' };
const otherCompany = { id: 2, name: 'Synthetic Second Company', code: 'TWO', status: 'active' };
/** Current payroll month in WIB, as the employee form sends it. */
const wibPeriod = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
};
const employee = {
  id: 901, employee_id: 'TEST-901', name: 'Synthetic Staff', company_id: 1,
  personal_email: 'staff@example.test', email: 'staff-office@example.test',
  department_id: 10, position_id: 20, employment_status: 'active', employment_type: 'contract',
  profile_completed: true, national_id: '0000000000000901', join_date: '2026-01-01',
  salary_status: 'existing', basic_salary: 9000000, salary_currency: 'IDR', pay_type: 'gross', ptkp_status: 'K/1',
  job_title: 'Analyst', company,
};
const self = { ...employee, id: 500, employee_id: 'TEST-500', name: 'Synthetic Actor' };
const SALARY_EDITOR = ['employee.view', 'employee.create', 'employee.update', 'employee.view_salary', 'employee.update_salary'];

type SimBody = Record<string, unknown> & { target_thp: number };
type SimReply = { status?: number; json?: unknown; data?: Record<string, unknown>; wait?: Promise<void> };

/** Backend-shaped simulation result (values are synthetic; the page only renders them). */
function simulation(body: SimBody, overrides: Record<string, unknown> = {}) {
  const basic = Number(overrides.basic_salary ?? body.target_thp - 1750000);
  const context = body.context as string;
  return {
    status: 'exact', target_thp: body.target_thp, basic_salary: basic, achieved_thp: body.target_thp, difference: 0,
    salary_status: body.salary_status, ptkp_status: body.ptkp_status,
    allowances_used: { position: 1000000, transport: 500000, meal: 0, other: 250000, total: 1750000 },
    allowance_source: body.allowance_source,
    breakdown: {
      basic_salary: basic, fixed_allowances: 1750000, gross_cash: basic + 1750000, taxable_base_dpp: basic + 2400000,
      bpjs_object_pph21: 120000, ter_golongan: 'B', ter_rate: 0.03, pph21: 300000, pph21_paid_by: 'company', tax_allowance: 300000,
      bpjs_employee: { jht: 160000, jp: 80000, jks: 80000, total: 320000 }, bpjs_employee_paid_by: 'company',
      bpjs_company: { jht: 296000, jkm: 24000, jkk: 19200, jks: 320000, jp: 160000, total: 819200 },
      employee_deductions: 0, take_home_pay: body.target_thp, company_cost: body.target_thp + 1439200,
    },
    scope: { period: body.period, automation_active: false, policy_rules_apply: false, rules_unreadable: false },
    employee_context: body.employee_id ? { employee_id: body.employee_id, pending_sources: 0, one_time_excluded: 0,
      contract_income: { position: 1000000, transport: 500000, meal: 0, other: 250000, total: 1750000 } } : null,
    apply: context === 'standalone' ? { allowed: false, reasons: ['standalone'] } : { allowed: true, reasons: [] },
    assumptions: ['full_month', 'no_overtime'],
    ...overrides,
  };
}

type Options = { roles: string[]; effectiveActions?: string[]; language?: 'en' | 'id'; reply?: (body: SimBody, index: number) => SimReply };

async function session(page: Page, options: Options) {
  const user = {
    id: 91, email: 'actor@example.test', roles: options.roles, permissions: [], accessibleCompanyIds: [1, 2],
    ...(options.effectiveActions ? { effectiveActions: options.effectiveActions } : {}),
    language: options.language ?? 'en', is_active: true, force_password_change: false, employee: self,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true },
  };
  const state = { calls: [] as string[], unexpected: [] as string[], errors: [] as string[],
    simulations: [] as SimBody[], updates: [] as Record<string, unknown>[], creates: [] as Record<string, unknown>[] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-salary-simulator');
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
    state.calls.push(`${method} ${endpoint}`);
    const paginated = (data: unknown[], key = 'meta') => route.fulfill({ json: { success: true, data,
      [key]: { page: Number(url.searchParams.get('page') || 1), limit: 100, total: data.length, totalPages: 1 } } });
    let data: unknown;
    if (endpoint === '/payroll/salary-simulation' && method === 'POST') {
      const body = req.postDataJSON() as SimBody;
      const index = state.simulations.push(body) - 1;
      const reply = options.reply ? options.reply(body, index) : {};
      if (reply.wait) await reply.wait;
      if (reply.status) return route.fulfill({ status: reply.status, json: reply.json }).catch(() => undefined);
      return route.fulfill({ json: { success: true, data: simulation(body, reply.data) } }).catch(() => undefined);
    }
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/employees/me' || endpoint === '/employees/500') data = self;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (endpoint === '/employees/901' && method === 'PUT') { state.updates.push(req.postDataJSON()); data = employee; }
    else if (endpoint === '/employees/901') data = employee;
    else if (endpoint === '/employees' && method === 'POST') { state.creates.push(req.postDataJSON()); data = { ...employee, id: 903 }; }
    else if (endpoint === '/employees') return paginated([employee]);
    else if (endpoint.startsWith('/employees/next-id/')) data = { employee_id: 'TEST-1-NEW' };
    else if (endpoint === '/companies') return paginated([company, otherCompany], 'pagination');
    else if (endpoint === '/departments') return paginated([{ id: 10, name: 'Synthetic Department', code: 'SD', description: '', company_id: 1, status: 'active' }]);
    // workLocationService.getOptions() reads the list endpoint (there is no /work-locations/options route).
    else if (endpoint === '/work-locations' && method === 'GET') return paginated([]);
    else if (endpoint === '/payroll') return paginated([], 'pagination');
    else { state.unexpected.push(`${method} ${endpoint}`); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  return state;
}

type State = Awaited<ReturnType<typeof session>>;
const writes = (state: State) => state.calls.filter(call => !call.startsWith('GET ') && call !== 'POST /payroll/salary-simulation');
const clean = (state: State) => { expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]); };
const dialog = (page: Page) => page.getByTestId('salary-simulator');

async function openEditStep3(page: Page) {
  await page.goto('/employees/901/edit');
  await expect(page.locator('input[name=name]')).toHaveValue('Synthetic Staff');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await expect(page.locator('input[name=basic_salary]')).toBeVisible();
}

test('employee edit: simulate with approved allowances, Apply fills the form only, Save sends the basic salary', async ({ page }, testInfo) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: SALARY_EDITOR });
  await openEditStep3(page);
  await page.getByTestId('employee-salary-sim-open').click();
  const sim = dialog(page);
  await expect(sim).toBeVisible();
  await expect(sim.getByTestId('salary-sim-status')).toHaveValue('existing');
  await expect(sim.getByTestId('salary-sim-ptkp')).toHaveValue('K/1');
  await expect(sim.getByTestId('salary-sim-source-contract')).toBeChecked();
  await sim.getByTestId('salary-sim-target').fill('10000000');
  // Enter calculates inside the dialog and never submits the employee form.
  await sim.getByTestId('salary-sim-target').press('Enter');
  await expect(sim.getByTestId('salary-sim-basic')).toContainText(/8[.,]250[.,]000/);
  await expect(sim.getByTestId('salary-sim-thp')).toContainText(/10[.,]000[.,]000/);
  await expect(sim).toContainText('Taxable base (DPP), not cash');
  await expect(sim.getByTestId('salary-sim-scope')).toContainText(`Payroll period: ${wibPeriod()}`);
  // Concise option with a readable helper instead of clipped option text.
  await expect(sim.getByTestId('salary-sim-status').locator('option:checked')).toHaveText('Existing (Gross-up)');
  await expect(sim.getByTestId('salary-sim-status-help')).toHaveText('Company bears PPh21 and employee BPJS; take-home pay equals basic plus allowances.');
  // The period never wraps.
  const periodBox = await sim.locator('.salary-sim-scope .salary-sim-nowrap').boundingBox();
  const lineHeight = await sim.locator('.salary-sim-scope').evaluate(node => parseFloat(getComputedStyle(node).lineHeight) || 18);
  expect(periodBox!.height).toBeLessThanOrEqual(lineHeight + 1);
  await page.screenshot({ path: testInfo.outputPath('salary-simulator-employee-desktop.png'), fullPage: true });
  expect(state.simulations[0]).toEqual({ company_id: 1, context: 'employee_form', period: wibPeriod(), employee_id: 901, target_thp: 10000000,
    ptkp_status: 'K/1', salary_status: 'existing', allowance_source: 'employee_contract',
    allowances: { position: 0, transport: 0, meal: 0, other: 0 } });
  await expect(page.getByTestId('salary-sim-apply-info')).toContainText('The employee is not saved');
  await page.getByTestId('salary-sim-apply').click();
  await expect(page.getByTestId('salary-simulator')).toHaveCount(0);
  await expect(page.locator('input[name=basic_salary]')).toHaveValue('8250000');
  expect(writes(state)).toEqual([]);
  for (let step = 0; step < 2; step++) await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('button', { name: 'Update Employee', exact: true }).click();
  await expect.poll(() => state.updates.length).toBe(1);
  expect(Number(state.updates[0].basic_salary)).toBe(8250000);
  expect(state.updates[0]).not.toHaveProperty('position_allowance');
  clean(state);
});

test('any input change invalidates the result and disables Apply; blocked reasons are shown', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: SALARY_EDITOR,
    reply: (body, index) => index === 1 ? { data: { apply: { allowed: false, reasons: ['allowances_not_registered'] } } } : {} });
  await openEditStep3(page);
  await page.getByTestId('employee-salary-sim-open').click();
  const sim = dialog(page);
  await sim.getByTestId('salary-sim-target').fill('10000000');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(page.getByTestId('salary-sim-apply')).toBeEnabled();
  await sim.getByTestId('salary-sim-target').fill('10000001');
  await expect(sim.getByTestId('salary-sim-basic')).toHaveCount(0);
  await expect(page.getByTestId('salary-sim-apply')).toBeDisabled();
  await sim.getByTestId('salary-sim-source-manual').check();
  await sim.getByTestId('salary-sim-allowance-transport').fill('400000');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-reason-allowances_not_registered')).toBeVisible();
  await expect(page.getByTestId('salary-sim-apply')).toBeDisabled();
  expect(state.simulations[1]).toMatchObject({ allowance_source: 'manual', allowances: { position: 0, transport: 400000, meal: 0, other: 0 } });
  // Blank is not zero: a cleared allowance blocks calculation with an inline error.
  await sim.getByTestId('salary-sim-allowance-meal').fill('');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim).toContainText('Required. Enter 0 if none.');
  expect(state.simulations).toHaveLength(2);
  await page.getByTestId('salary-sim-close').click();
  expect(writes(state)).toEqual([]);
  clean(state);
});

test('an out-of-order response is ignored; the latest calculation wins', async ({ page }) => {
  let release!: () => void;
  const firstGate = new Promise<void>(resolve => { release = resolve; });
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: SALARY_EDITOR,
    reply: (_body, index) => index === 0 ? { wait: firstGate, data: { basic_salary: 1111111 } } : { data: { basic_salary: 2222222 } } });
  await openEditStep3(page);
  await page.getByTestId('employee-salary-sim-open').click();
  const sim = dialog(page);
  await sim.getByTestId('salary-sim-target').fill('5000000');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect.poll(() => state.simulations.length).toBe(1);
  await sim.getByTestId('salary-sim-target').fill('6000000');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-basic')).toContainText(/2[.,]222[.,]222/);
  release();
  await page.waitForTimeout(300);
  await expect(sim.getByTestId('salary-sim-basic')).toContainText(/2[.,]222[.,]222/);
  // Closing and reopening starts without the old result.
  await page.getByTestId('salary-sim-close').click();
  await page.getByTestId('employee-salary-sim-open').click();
  await expect(dialog(page).getByTestId('salary-sim-basic')).toHaveCount(0);
  clean(state);
});

test('inline error with retry, no partial result', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: SALARY_EDITOR,
    reply: (_body, index) => index === 0 ? { status: 400, json: { success: false, message: 'Target THP melebihi batas simulasi gaji pokok' } } : {} });
  await openEditStep3(page);
  await page.getByTestId('employee-salary-sim-open').click();
  const sim = dialog(page);
  await sim.getByTestId('salary-sim-target').fill('9000000');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByRole('alert')).toBeVisible();
  // The known Indonesian server sentence is shown in English for an EN user.
  await expect(sim.getByTestId('salary-sim-error')).toHaveText('The target THP is above what the simulated basic salary range can reach');
  await expect(sim.getByTestId('salary-sim-basic')).toHaveCount(0);
  await sim.getByRole('button', { name: 'Retry' }).click();
  await expect(sim.getByTestId('salary-sim-basic')).toBeVisible();
  expect(state.simulations).toHaveLength(2);
  clean(state);
});

test('employee create: needs a company first, manual allowances, Apply fills without creating', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: SALARY_EDITOR });
  await page.goto('/employees/create');
  await page.locator('input[name=name]').fill('Synthetic New Employee');
  await page.locator('select[name=company_id]').selectOption('1');
  await expect(page.locator('input[name=employee_id]')).toHaveValue('TEST-1-NEW');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.locator('input[name=join_date]').fill('2026-01-31');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByTestId('employee-salary-sim-open').click();
  const sim = dialog(page);
  await expect(sim.getByTestId('salary-sim-source-contract')).toHaveCount(0);
  await expect(sim.getByTestId('salary-sim-status')).toHaveValue('new_gross');
  await sim.getByTestId('salary-sim-target').fill('8000000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  expect(state.simulations[0]).toMatchObject({ context: 'employee_form', allowance_source: 'manual', salary_status: 'new_gross' });
  expect(state.simulations[0]).not.toHaveProperty('employee_id');
  await page.getByTestId('salary-sim-apply').click();
  await expect(page.locator('input[name=basic_salary]')).toHaveValue('6250000');
  await expect(page.locator('select[name=ptkp_status]')).toHaveValue('TK/0');
  expect(state.creates).toEqual([]);
  expect(writes(state)).toEqual([]);
  clean(state);
});

test('payroll standalone simulation: header entry, no Apply, read-only', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'] });
  await page.goto('/payroll');
  await page.getByTestId('payroll-salary-sim-open').click();
  const sim = dialog(page);
  await sim.getByTestId('salary-sim-target').fill('12000000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('K/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-basic')).toBeVisible();
  await expect(page.getByTestId('salary-sim-apply')).toHaveCount(0);
  expect(state.simulations[0]).toMatchObject({ company_id: 1, context: 'standalone', allowance_source: 'manual' });
  expect(state.simulations[0]).not.toHaveProperty('employee_id');
  expect(writes(state)).toEqual([]);
  clean(state);
});

test('entry points are hidden without salary-edit or payroll-generate authority', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], effectiveActions: ['employee.view', 'employee.update', 'employee.view_salary', 'payroll.view'] });
  await page.goto('/employees/901/edit');
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await page.getByRole('button', { name: 'Next Step', exact: true }).click();
  await expect(page.getByTestId('compensation-locked')).toBeVisible();
  await expect(page.getByTestId('employee-salary-sim-open')).toHaveCount(0);
  await page.goto('/payroll');
  await expect(page.getByRole('heading', { name: 'Payroll Management' })).toBeVisible();
  await expect(page.getByTestId('payroll-salary-sim-open')).toHaveCount(0);
  expect(state.simulations).toEqual([]);
  clean(state);
});

const periodSelect = (page: Page) => page.locator('section.pw-controls select').nth(1);
const companySelect = (page: Page) => page.locator('section.pw-controls select').nth(0);

test('closing during a calculation drops the late response; reopening shows no previous result or error', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const state = await session(page, { roles: ['HR Staff'],
    reply: (_body, index) => index === 0 ? { wait: gate } : index === 1 ? { status: 400, json: { success: false, message: 'Synthetic late failure' } } : {} });
  await page.goto('/payroll');
  await page.getByTestId('payroll-salary-sim-open').click();
  let sim = dialog(page);
  await sim.getByTestId('salary-sim-target').fill('12000000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect.poll(() => state.simulations.length).toBe(1);
  await page.getByTestId('salary-sim-close').click();
  release();
  await page.waitForTimeout(300);
  await page.getByTestId('payroll-salary-sim-open').click();
  sim = dialog(page);
  await expect(sim.getByTestId('salary-sim-basic')).toHaveCount(0);
  await expect(sim.getByRole('alert')).toHaveCount(0);
  // A failing request closed mid-flight leaves no error behind either.
  await sim.getByTestId('salary-sim-target').fill('13000000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('payroll-salary-sim-open').click();
  await expect(dialog(page).getByRole('alert')).toHaveCount(0);
  await expect(dialog(page).getByTestId('salary-sim-basic')).toHaveCount(0);
  expect(writes(state)).toEqual([]);
  clean(state);
});

test('payroll simulation uses the selected period and company; changing either invalidates the result', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'] });
  await page.goto('/payroll');
  const firstPeriod = await periodSelect(page).inputValue();
  await page.getByTestId('payroll-salary-sim-open').click();
  let sim = dialog(page);
  await expect(sim.getByTestId('salary-sim-scope')).toContainText(`Payroll period: ${firstPeriod}`);
  await sim.getByTestId('salary-sim-target').fill('12000000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-basic')).toBeVisible();
  expect(state.simulations[0]).toMatchObject({ company_id: 1, period: firstPeriod });
  await page.getByTestId('salary-sim-close').click();
  await periodSelect(page).selectOption({ index: 1 });
  const secondPeriod = await periodSelect(page).inputValue();
  expect(secondPeriod).not.toBe(firstPeriod);
  await companySelect(page).selectOption('2');
  await page.getByTestId('payroll-salary-sim-open').click();
  sim = dialog(page);
  await expect(sim.getByTestId('salary-sim-basic')).toHaveCount(0);
  await expect(sim.getByTestId('salary-sim-scope')).toContainText('Synthetic Second Company');
  await expect(sim.getByTestId('salary-sim-scope')).toContainText(`Payroll period: ${secondPeriod}`);
  await sim.getByTestId('salary-sim-target').fill('12000000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-basic')).toBeVisible();
  expect(state.simulations[1]).toMatchObject({ company_id: 2, period: secondPeriod, context: 'standalone' });
  expect(writes(state)).toEqual([]);
  clean(state);
});

test('standalone shows the unsupported-policy warning and the actual minimum basic', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], reply: () => ({ data: {
    status: 'below_minimum', basic_salary: 2, achieved_thp: 8400376, difference: 7400376,
    scope: { period: '2026-10', automation_active: true, policy_rules_apply: true, rules_unreadable: false },
    apply: { allowed: false, reasons: ['standalone', 'policy_rules_apply'] },
  } }) });
  await page.goto('/payroll');
  await page.getByTestId('payroll-salary-sim-open').click();
  const sim = dialog(page);
  await sim.getByTestId('salary-sim-target').fill('1000000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-warning-policy')).toContainText('does not model');
  await expect(sim.getByTestId('salary-sim-status-text')).toContainText(/lowest achievable take-home pay is .*8[.,]400[.,]376.*at a basic salary of .*\b2\b/);
  await expect(sim).not.toContainText('certification');
  clean(state);
});

test('known simulator errors stay Indonesian for an ID user; unknown messages are shown unchanged', async ({ page }) => {
  const state = await session(page, { roles: ['HR Staff'], language: 'id', reply: (_body, index) => ({ status: 400, json: { success: false,
    message: index === 0 ? 'Target THP melebihi batas simulasi gaji pokok' : 'Synthetic unmapped server text' } }) });
  await page.goto('/payroll');
  await page.getByTestId('payroll-salary-sim-open').click();
  const sim = dialog(page);
  await sim.getByTestId('salary-sim-target').fill('1999999999');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-error')).toHaveText('Target THP melebihi batas simulasi gaji pokok');
  await sim.getByRole('button', { name: 'Coba Lagi' }).click();
  await expect(sim.getByTestId('salary-sim-error')).toHaveText('Synthetic unmapped server text');
  clean(state);
});

test('Indonesian copy and a stacked mobile layout', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await session(page, { roles: ['HR Staff'], language: 'id' });
  await page.goto('/payroll');
  await page.getByTestId('payroll-salary-sim-open').click();
  const sim = dialog(page);
  await expect(page.getByRole('heading', { name: 'Simulasi gaji' })).toBeVisible();
  await expect(sim.getByTestId('salary-sim-calculate')).toHaveText('Hitung');
  await sim.getByTestId('salary-sim-target').fill('12.000.000');
  await sim.getByTestId('salary-sim-ptkp').selectOption('TK/0');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-basic')).toBeVisible();
  expect(state.simulations[0].target_thp).toBe(12000000);
  const inputs = await sim.locator('.salary-sim-inputs').boundingBox();
  const result = await sim.locator('.salary-sim-result').boundingBox();
  expect(result!.y).toBeGreaterThanOrEqual(inputs!.y + inputs!.height - 1);
  expect(result!.x + result!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('salary-simulator-payroll-mobile.png'), fullPage: true });
  // Largest supported amounts with company-funded rows ("ditanggung perusahaan").
  await sim.getByTestId('salary-sim-target').fill('1.999.999.999');
  await sim.getByTestId('salary-sim-calculate').click();
  await expect(sim.getByTestId('salary-sim-thp')).toContainText(/1[.,]999[.,]999[.,]999/);
  await expect(sim.locator('.salary-sim-rows em').first()).toHaveText('ditanggung perusahaan');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await sim.locator('.salary-sim-rows').scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(() => [document.body, document.querySelector('.salary-sim-dialog'),
      document.querySelector('.salary-sim-dialog .ph-dialog-body'), document.querySelector('.salary-sim-result'),
      document.querySelector('.salary-sim-rows')].map(node => node ? node.scrollWidth - node.clientWidth : -1));
    for (const extra of overflow) expect(extra).toBeLessThanOrEqual(1);
    // Every money amount (headline and rows) renders as ONE physical text line:
    // the client rects of its text node all share one top. Labels may wrap.
    const amounts = await page.evaluate(() => [
      ...document.querySelectorAll('[data-testid=salary-sim-basic], [data-testid=salary-sim-thp], .salary-sim-rows dd'),
    ].map(node => {
      const text = [...node.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.textContent!.trim() !== '')!;
      const range = document.createRange();
      range.selectNodeContents(text);
      const tops = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top)));
      return { text: text.textContent!.trim(), lines: tops.size, whiteSpace: getComputedStyle(node).whiteSpace };
    }));
    expect(amounts.length).toBeGreaterThanOrEqual(11);
    for (const amount of amounts) {
      expect(amount, `${amount.text} at ${width}px`).toMatchObject({ lines: 1, whiteSpace: 'nowrap' });
    }
    expect(amounts.some(amount => /1[.,]998[.,]249[.,]999/.test(amount.text))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`salary-simulator-payroll-mobile-result-${width}.png`) });
  }
  await sim.getByTestId('salary-sim-target').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('salary-simulator')).toHaveCount(0);
  clean(state);
});
