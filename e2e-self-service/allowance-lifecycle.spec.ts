import { test, expect, type Page } from '@playwright/test';

// Isolated mocked configuration (no backend, real account, email or production).
// Complements the reviewer-owned allowance-independent.spec.ts: request
// whitelists, role-gated actions, the review subsection and EN copy.
const audits = new WeakMap<Page, { unexpected: string[]; errors: string[] }>();
test.afterEach(async ({ page }) => {
  expect(audits.get(page)?.unexpected).toEqual([]);
  expect(audits.get(page)?.errors).toEqual([]);
});

async function open(page: Page, path: string, role = 'HR Manager', language: 'id' | 'en' = 'id') {
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const employee = { id: 901, name: 'Synthetic Staff', employee_id: 'AL-901', company_id: 2, employment_status: 'active', profile_completed: true,
    national_id: '0000000000000901', company: { id: 2, name: 'Synthetic Company', code: 'AL' } };
  const user = { id: 91, email: 'tester@example.test', roles: [role], permissions: [], accessibleCompanyIds: [2], is_active: true,
    force_password_change: false, employee, language, companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
  const common = { employee_id: 901, company_id: 2, employee, is_taxable: true, is_bpjs_object: false, created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z', payment_state: 'none', payrollLinks: [] };
  const rows = {
    contract: [{ ...common, id: 101, name: 'OL Meal', type: 'meal', is_contract: true, lifecycle: 'contract', status: 'active', amount: '500000.00',
      effective_date: null, end_date: null, locked: true }],
    monthly: [
      { ...common, id: 201, name: 'Collection fee', type: 'bonus', lifecycle: 'monthly', status: 'pending', amount: '0.00', payroll_period: '2026-10', component_key: 'collection-fee' },
      { ...common, id: 202, name: 'Sales fee', type: 'bonus', lifecycle: 'monthly', status: 'draft', amount: null, payroll_period: '2026-10', component_key: 'sales-fee' },
      { ...common, id: 203, name: 'Field transport', type: 'transport', lifecycle: 'monthly', status: 'approved', amount: '150000.00', payroll_period: '2026-10', payment_state: 'paid' },
    ],
    review: [{ ...common, id: 301, name: 'Legacy phone', type: 'communication', is_contract: false, lifecycle: 'review', status: 'active', amount: '100000.00' }],
  };
  const state = { unexpected: [] as string[], errors: [] as string[], writes: [] as { method: string; path: string; body: any }[], reads: [] as URLSearchParams[],
    failEmployees: false };
  audits.set(page, state);
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(lang => { localStorage.setItem('token', 'isolated-allowance-lifecycle'); localStorage.setItem('peoplehub.language', lang); }, language);
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (url.origin === origin && !['xhr', 'fetch'].includes(req.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    if (url.origin !== origin || !url.pathname.startsWith('/api/v1/')) { state.unexpected.push(`${method} ${url.origin}${url.pathname}`); return route.abort(); }
    const endpoint = url.pathname.replace('/api/v1', '');
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (method === 'POST' && endpoint === '/audit-logs/events') return route.fulfill({ status: 204 });
    if (endpoint === '/auth/me') return json({ user });
    if (endpoint === '/employees/me') return json(employee);
    if (endpoint === '/notifications/unread-count') return json({ unread_count: 0 });
    if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) return json([]);
    if (['/presence', '/users/me/preferences', '/users/me/language'].includes(endpoint)) return json({});
    if (endpoint === '/employees' && state.failEmployees) return route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic roster failure' } } });
    if (['/companies', '/employees'].includes(endpoint)) {
      return route.fulfill({ json: { success: true, data: endpoint === '/companies' ? [employee.company] : [employee], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } } });
    }
    if (method === 'GET' && endpoint === '/allowances') {
      state.reads.push(url.searchParams);
      const lifecycle = url.searchParams.get('lifecycle') as keyof typeof rows;
      const data = lifecycle === 'monthly' && url.searchParams.get('payroll_period') !== '2026-10' ? [] : rows[lifecycle] ?? [];
      return route.fulfill({ json: { data, pagination: { page: 1, limit: 20, total: data.length, totalPages: 1 },
        ...(lifecycle === 'monthly' ? { summary: data.length ? [{ status: 'pending', count: 1, amount: '0.00' }, { status: 'draft', count: 1, amount: '0' }, { status: 'approved', count: 1, amount: '150000.00' }] : [] } : {}) } });
    }
    if (method === 'GET' && endpoint.endsWith('/history')) return route.fulfill({ json: { lifecycle: 'contract', rows: rows.contract } });
    if (['POST', 'PUT', 'PATCH'].includes(method) && endpoint.startsWith('/allowances')) {
      state.writes.push({ method, path: endpoint, body: req.postDataJSON() });
      if (endpoint.endsWith('/submit') || endpoint === '/allowances/bulk/status') return route.fulfill({ json: { updated: 1, failed: 0, errors: [] } });
      return route.fulfill({ json: { ...rows.monthly[1], ...req.postDataJSON() } });
    }
    state.unexpected.push(`${method} ${endpoint}`);
    return route.abort();
  });
  await page.goto(path);
  return state;
}

test('monthly entry sends only business fields; blank and explicit zero are distinct', async ({ page }) => {
  const state = await open(page, '/allowances?tab=monthly&period=2026-10');
  const zero = page.locator('[data-allowance-row="201"]');
  await expect(zero).toContainText('Nol final');
  await expect(page.locator('[data-allowance-row="202"]')).toContainText('Belum diisi');
  await expect(page.locator('[data-allowance-row="203"]')).toContainText('Dibayar');
  // A blank draft cannot be submitted from the row; the paid one cannot be cancelled.
  await expect(page.getByRole('button', { name: 'Ajukan · Synthetic Staff' })).toHaveCount(0);
  await expect(page.locator('[data-allowance-row="203"]').getByRole('button', { name: /^Batalkan entri/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tambah insentif', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('901');
  await dialog.getByLabel('Nama', { exact: true }).fill('Appraisal fee');
  await dialog.getByLabel('Tipe komponen').selectOption('bonus');
  await expect(dialog.getByLabel('Tipe komponen').locator('option[value="position"]')).toHaveCount(0);
  // No per-allowance tax/BPJS switch: payroll does not apply those flags yet, so the form does not promise it.
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toMatchObject({ method: 'POST', path: '/allowances/monthly' });
  expect(state.writes[0].body).toEqual({ name: 'Appraisal fee', type: 'bonus', amount: null, employee_id: 901, payroll_period: '2026-10' });
});

test('desktop table keeps readable money/status columns; actions stay a table cell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, '/allowances?tab=monthly&period=2026-10');
  const row = page.locator('[data-allowance-row="203"]');
  await expect(row).toContainText('Field transport');
  expect((await row.locator('.cp-money').boundingBox())!.width).toBeGreaterThanOrEqual(90);
  expect((await row.locator('.cp-status').boundingBox())!.height).toBeLessThan(50);
  expect(await row.locator('td.al-actions-cell').evaluate(cell => getComputedStyle(cell).display)).toBe('table-cell');
  // One line for the amount: every digit stays on the same line.
  const amount = row.locator('.cp-money strong');
  expect((await amount.boundingBox())!.height).toBeLessThan(30);
});

test('switching tabs and periods aborts old reads without any error toast', async ({ page }) => {
  await open(page, '/allowances');
  await expect(page.getByText('OL Meal', { exact: true })).toBeVisible();
  for (const [tab, period] of [['Insentif Bulanan', '2026-10'], ['Tunjangan Kontrak / OL', ''], ['Insentif Bulanan', '2026-11']]) {
    await page.getByRole('tab', { name: tab }).click();
    if (period) await page.getByLabel('Periode payroll', { exact: true }).fill(period);
  }
  await expect(page.getByText('Belum ada insentif untuk November 2026')).toBeVisible();
  await expect(page.getByText(/^(canceled|Request aborted)$/i)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /cancel/i })).toHaveCount(0);
});

test('a failed employee roster is a failure with retry, never an empty roster', async ({ page }) => {
  const state = await open(page, '/allowances?tab=monthly&period=2026-10');
  state.failEmployees = true;
  await page.getByRole('button', { name: 'Tambah insentif', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert').filter({ hasText: 'Daftar karyawan gagal dimuat.' })).toBeVisible();
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeDisabled();
  state.failEmployees = false;
  await dialog.getByRole('button', { name: 'Muat ulang karyawan' }).click();
  await expect(dialog.getByLabel('Karyawan', { exact: true }).locator('option[value="901"]')).toHaveCount(1);
  await expect(dialog.getByRole('alert').filter({ hasText: 'Daftar karyawan gagal dimuat.' })).toHaveCount(0);
});

test('profile-only values get explicit review guidance on the OL tab', async ({ page }) => {
  await open(page, '/allowances');
  await expect(page.locator('[data-profile-guidance]')).toContainText('tidak disalin otomatis');
});

test('approver approves through the dedicated endpoint; HR Staff never gets approval actions', async ({ page }) => {
  const state = await open(page, '/allowances?tab=monthly&period=2026-10', 'Finance Manager');
  await expect(page.getByRole('button', { name: 'Tambah insentif', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Setujui · Synthetic Staff' }).click();
  await expect.poll(() => state.writes.map(write => write.path)).toEqual(['/allowances/201/approve']);
  expect(state.writes[0].body).toBeNull();
});

test('HR Staff sees no approve/end actions on OL and creates versions, not edits', async ({ page }) => {
  const state = await open(page, '/allowances', 'HR Staff');
  const row = page.locator('[data-allowance-row="101"]');
  await expect(row).toContainText('OL Meal');
  await expect(row.getByRole('button', { name: /^(Setujui|Akhiri tunjangan|Edit) ·/ })).toHaveCount(0);
  await row.getByRole('button', { name: 'Versi baru · Synthetic Staff' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Mulai periode payroll').fill('2026-11');
  await dialog.getByLabel('Nominal baru (Rp)').fill('550000');
  await dialog.getByRole('button', { name: 'Ajukan versi' }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toEqual({ method: 'POST', path: '/allowances/contract/101/versions', body: { effective_period: '2026-11', amount: 550000 } });
});

test('legacy rows live in the review subsection of the monthly tab and are classified deliberately', async ({ page }) => {
  const state = await open(page, '/allowances?tab=monthly&period=2026-10');
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.getByRole('button', { name: /Perlu ditinjau/ }).click();
  const row = page.locator('[data-allowance-row="301"]');
  await expect(row).toContainText('Legacy phone');
  await row.getByRole('button', { name: 'Tandai sebagai OL · Synthetic Staff' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Tandai sebagai OL' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Alasan wajib diisi');
  expect(state.writes).toEqual([]);
  await dialog.getByLabel('Alasan', { exact: true }).fill('Confirmed in signed OL');
  await dialog.getByRole('button', { name: 'Tandai sebagai OL' }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toEqual({ method: 'POST', path: '/allowances/301/classify', body: { as: 'contract', reason: 'Confirmed in signed OL' } });
  expect(state.reads.some(params => params.get('lifecycle') === 'review')).toBe(true);
});

test('tabs are keyboard reachable and switching never shows stale rows (English)', async ({ page }) => {
  const state = await open(page, '/allowances', 'HR Manager', 'en');
  const contractTab = page.getByRole('tab', { name: 'Contract / OL Allowances' });
  await expect(contractTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('OL Meal', { exact: true })).toBeVisible();
  await contractTab.focus();
  await page.keyboard.press('ArrowRight');
  const monthlyTab = page.getByRole('tab', { name: 'Monthly Incentives' });
  await expect(monthlyTab).toHaveAttribute('aria-selected', 'true');
  await expect(monthlyTab).toBeFocused();
  await expect(page.getByText('OL Meal', { exact: true })).toHaveCount(0);
  await page.getByLabel('Payroll period', { exact: true }).fill('2026-12');
  await expect(page.getByText('No incentives for December 2026 yet')).toBeVisible();
  await expect(page.getByText('No submissions for this period yet', { exact: true })).toBeVisible();
  const lastMonthly = state.reads.filter(params => params.get('lifecycle') === 'monthly').at(-1)!;
  expect(lastMonthly.get('payroll_period')).toBe('2026-12');
  expect(state.writes).toEqual([]);
});
