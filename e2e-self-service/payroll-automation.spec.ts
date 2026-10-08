import { test, expect, type Page } from '@playwright/test';
import type { GeneratePayrollRequest, PayrollAutomationInput, PayrollPreparationInput, PayrollPreparationPreview } from '../src/services/payroll.service';

const period = '2026-08';
const audits = new WeakMap<Page, { unexpected: string[]; errors: string[] }>();
test.afterEach(async ({ page }) => {
  expect(audits.get(page)?.unexpected).toEqual([]);
  expect(audits.get(page)?.errors).toEqual([]);
});
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

const defaultRule: PayrollAutomationInput = {
  reason: 'Synthetic company approval', work_days_per_week: 5, rounding: 'final_cash',
  existing: { tax_allowance_mode: 'gross_up', bpjs_paid_by_company: true },
  new_gross: { tax_allowance_mode: 'none', bpjs_paid_by_company: false },
};
function previewResult(): PayrollPreparationPreview {
  return { generated: 0, previewed: 2, errors: 0, errorDetails: [], results: [901, 902].map((id, index) => ({
    employee_id: id, employee_name: index ? 'Synthetic Zero Staff' : 'Synthetic Refund Staff', employee_code: `TEST-${id}`,
    basic_salary: index ? 0 : 1234567.89, gross_salary: index ? 0 : 4567890.12,
    net_salary: index ? 0 : 7654321.23, take_home_pay: index ? 0 : 7654321.23,
    total_deductions: index ? 0 : -23456.75, total_cost_to_company: index ? 0 : 8765432.19,
    tax: { taxable_income: 1234567.89, pph21: index ? 0 : -23456.75, pph21_paid_by_company: false, ter_rate: 0, ter_category: 'A', ptkp_status: 'TK/0', ptkp_amount: 54000000 },
    bpjs: { bpjs_kes_employee: 0, bpjs_jht_employee: 0, bpjs_jp_employee: 0, bpjs_employee_total: 0,
      bpjs_kes_company: 0, bpjs_jht_company: 0, bpjs_jp_company: 0, bpjs_jkk_company: 0, bpjs_jkm_company: 0, bpjs_company_total: 0 },
  })) };
}

// Every API is synthetic and every unrecognized API/external request fails closed.
// Indonesian UI (fixture user has no account language): t("Generate Payroll") renders "Buat Payroll".
async function openPayroll(page: Page, entry = 'Buat Payroll') {
  const employee = { id: 901, name: 'Synthetic Refund Staff', employee_id: 'TEST-901', company_id: 2,
    employment_type: 'permanent', employment_status: 'active', profile_completed: true,
    national_id: '0000000000000901', email: 'staff@example.test', company: { id: 2, name: 'Synthetic Company', code: 'TEST' } };
  const user = { id: 91, email: 'hr@example.test', roles: ['HR Manager'], permissions: [], accessibleCompanyIds: [2, 3],
    is_active: true, force_password_change: false, employee,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
  const state = {
    unexpected: [] as string[], errors: [] as string[], listReads: 0, exceptionReads: 0,
    automationReads: [] as string[], automationSaves: [] as Array<{ company_id: number; period: string; input: PayrollAutomationInput | null }>,
    previews: [] as GeneratePayrollRequest[], generations: [] as GeneratePayrollRequest[],
    exceptionSaves: [] as Array<{ period: string; input: PayrollPreparationInput | null }>,
    rules: new Map<string, PayrollAutomationInput | null>(), exceptions: new Map<string, PayrollPreparationInput | null>(),
    preview: previewResult(), saveGate: null as Promise<void> | null, previewGate: null as Promise<void> | null,
    generateGate: null as Promise<void> | null, loadGates: new Map<string, Promise<void>>(),
    failLoad: false, failSave: false, failPreview: false, failGenerate: false, failExceptions: false,
    malformedSave: false, generateConflict: false,
  };
  audits.set(page, state);
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-payroll-automation-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && !['xhr', 'fetch'].includes(request.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    if (url.origin !== (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') || !url.pathname.startsWith('/api/v1/')) {
      state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    const endpoint = url.pathname.replace(/^\/api\/v1/, ''); const method = request.method();
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (method === 'POST' && endpoint === '/audit-logs/events') return route.fulfill({ status: 204 });
    const reject =(message: string) => route.fulfill({ status: 503, json: { success: false, error: { message } } });
    let data: unknown;
    if (method === 'GET' && endpoint === '/auth/me') data = { user };
    else if (method === 'GET' && endpoint === '/employees/me') data = employee;
    else if (method === 'GET' && endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (method === 'GET' && ['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (method === 'GET' && ['/companies', '/payroll'].includes(endpoint)) {
      if (endpoint === '/payroll') state.listReads++;
      data = endpoint === '/companies' ? [employee.company, { id: 3, name: 'Synthetic Other Company', code: 'OTHER' }] : [];
      return route.fulfill({ json: { success: true, data, meta: { page: 1, limit: 500, total: 0, totalPages: 1 } } });
    } else if (method === 'GET' && endpoint === '/payroll/automation') {
      const company_id = Number(url.searchParams.get('company_id')); const selected = url.searchParams.get('period')!;
      const key = `${company_id}:${selected}`; state.automationReads.push(key);
      const effectiveKey = [...state.rules.keys()].filter(item => item.startsWith(`${company_id}:`) && item.split(':')[1] <= selected).sort().at(-1);
      data = { company_id, period: selected, effective_from: effectiveKey?.split(':')[1] ?? null, input: effectiveKey ? structuredClone(state.rules.get(effectiveKey)) : null };
      if (state.loadGates.has(key)) await state.loadGates.get(key);
      if (state.failLoad) return reject('Synthetic rules load failure');
    } else if (method === 'PUT' && endpoint === '/payroll/automation') {
      const body = request.postDataJSON(); state.automationSaves.push(body);
      if (state.saveGate) await state.saveGate;
      if (state.failSave) return reject('Synthetic rules save failure');
      state.rules.set(`${body.company_id}:${body.period}`, body.input);
      data = { ...body, company_id: state.malformedSave ? 999 : body.company_id, effective_from: body.period };
    } else if (method === 'POST' && endpoint === '/payroll/preparation/preview') {
      const body = request.postDataJSON(); state.previews.push(body);
      const result = structuredClone(state.preview); const fail = state.failPreview;
      if (state.previewGate) await state.previewGate;
      if (fail) return reject('Synthetic preview failure');
      data = result;
    } else if (method === 'POST' && endpoint === '/payroll/generate') {
      const body: GeneratePayrollRequest = request.postDataJSON(); state.generations.push(body);
      if (state.generateGate) await state.generateGate;
      if (state.failGenerate) return reject('Synthetic generate failure');
      const results = state.preview.results.filter(row => body.employee_ids?.includes(row.employee_id) && !(state.generateConflict && row.employee_id === 902))
        .map(row => ({ ...row, id: row.employee_id + 1000, company_id: body.company_id, period: body.period,
          payroll_number: `TEST-PAY-${row.employee_id}`, employee: { ...employee, id: row.employee_id }, status: 'draft' }));
      const errorDetails = state.generateConflict ? [{ employee_id: 902, employee_name: 'Synthetic Zero Staff', employee_code: 'TEST-902', error: 'Synthetic payroll already exists' }] : [];
      return route.fulfill({ json: { success: true, generated: results.length, results, errors: errorDetails.length, errorDetails } });
    } else if (method === 'GET' && endpoint === '/payroll/preparation') {
      state.exceptionReads++;
      if (state.failExceptions) return reject('Synthetic exception list failure');
      const selected = url.searchParams.get('period')!;
      data = [{ employee_id: 901, employee_name: employee.name, employee_code: employee.employee_id,
        salary_status: 'Existing', basic_salary: 6000000, input: state.exceptions.get(selected) ?? null, locked: false }];
    } else if (method === 'PUT' && endpoint === '/payroll/preparation/901') {
      const body = request.postDataJSON(); state.exceptionSaves.push(body);
      if (state.saveGate) await state.saveGate;
      state.exceptions.set(body.period, body.input); data = { employee_id: 901, ...body };
    } else { state.unexpected.push(`${method} ${endpoint}`); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/payroll');
  await page.getByRole('button', { name: entry, exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Persiapan Payroll' });
  await dialog.getByLabel('Periode persiapan').fill(period);
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeEnabled();
  return { state, dialog };
}

test('main Generate opens bulk preview without any employee preparation or default save, then generates and refreshes', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText('Belum ada aturan perusahaan tersimpan.', { exact: false })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
  expect(state.automationSaves).toEqual([]); expect(state.exceptionSaves).toEqual([]); expect(state.exceptionReads).toBe(0);
  await dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true }).click();
  const preview = dialog.getByRole('region', { name: 'Preview semua karyawan', exact: true });
  await expect(preview.getByRole('row', { name: /Synthetic Refund Staff \(TEST-901\)/ })).toContainText('7.654.321,23');
  await expect(preview.getByRole('row', { name: /Synthetic Refund Staff/ })).toContainText('-Rp');
  await expect(preview.getByRole('row', { name: /Synthetic Zero Staff \(TEST-902\)/ })).toContainText('0,00');
  await expect(preview.getByText('Total biaya perusahaan siap').locator('..')).toContainText('8.765.432,19');
  expect(state.previews).toEqual([{ company_id: 2, period }]);
  const reads = state.listReads; const gate = deferred(); state.generateGate = gate.promise;
  await dialog.getByRole('button', { name: 'Generate siap (2)', exact: true }).click();
  await expect.poll(() => state.generations.length).toBe(1);
  expect(state.generations[0]).toEqual({ company_id: 2, period, employee_ids: [901, 902] });
  await expect(dialog.getByLabel('Periode persiapan')).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeDisabled();
  gate.resolve();
  await expect(dialog.getByRole('region', { name: 'Hasil generate payroll' })).toContainText('2 payroll berhasil dibuat');
  await expect(dialog.getByRole('region', { name: 'Hasil generate payroll' })).toContainText('Synthetic Refund Staff (TEST-901)');
  await expect.poll(() => state.listReads).toBeGreaterThan(reads);
  await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
  expect(state.automationSaves).toEqual([]); expect(state.exceptionSaves).toEqual([]);
});

test('rules remain a draft until explicit save; recurring defaults and disabling preserve effective history', async ({ page }) => {
  const { state, dialog } = await openPayroll(page, 'Buat Payroll');
  await dialog.getByText('Aturan perusahaan', { exact: true }).click();
  // Indonesian UI: t("Existing") = "Eksisting", t("New / Gross") = "Baru / Bruto".
  await expect(dialog.getByLabel('Tunjangan pajak Eksisting', { exact: true })).toHaveValue('gross_up');
  await expect(dialog.getByLabel('BPJS karyawan ditanggung perusahaan — Eksisting', { exact: true })).toBeChecked();
  await expect(dialog.getByLabel('Tunjangan pajak Baru / Bruto', { exact: true })).toHaveValue('none');
  await expect(dialog.getByLabel('BPJS karyawan ditanggung perusahaan — Baru / Bruto', { exact: true })).not.toBeChecked();
  await expect(dialog.getByLabel('Hari kerja aturan perusahaan')).toHaveValue('5');
  await expect(dialog.getByLabel('Pembulatan aturan perusahaan')).toHaveValue('final_cash');
  expect(state.automationSaves).toEqual([]);
  await dialog.getByLabel('Alasan aturan perusahaan').fill(defaultRule.reason);
  const gate = deferred(); state.saveGate = gate.promise;
  await dialog.getByRole('button', { name: 'Simpan aturan perusahaan', exact: true }).click();
  await expect.poll(() => state.automationSaves.length).toBe(1);
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Perusahaan persiapan')).toBeDisabled();
  expect(state.automationSaves[0]).toEqual({ company_id: 2, period, input: defaultRule });
  gate.resolve();
  await expect(dialog.getByText('Aturan perusahaan tersimpan, berlaku mulai 2026-08.')).toBeVisible();
  await dialog.getByLabel('Periode persiapan').fill('2026-09');
  await expect(dialog.getByText('Aturan perusahaan tersimpan, berlaku mulai 2026-08.')).toBeVisible();
  await dialog.getByText('Aturan perusahaan', { exact: true }).click();
  await expect(dialog.getByLabel('Alasan aturan perusahaan')).toHaveValue(defaultRule.reason);
  await dialog.getByRole('button', { name: 'Nonaktifkan mulai periode ini' }).click();
  await expect(dialog.getByText('Aturan perusahaan nonaktif mulai 2026-09.', { exact: false })).toBeVisible();
  expect(state.automationSaves[1]).toEqual({ company_id: 2, period: '2026-09', input: null });
  await dialog.getByLabel('Periode persiapan').fill('2026-10');
  await expect(dialog.getByText('Aturan perusahaan nonaktif mulai 2026-09.', { exact: false })).toBeVisible();
  await dialog.getByLabel('Periode persiapan').fill(period);
  await expect(dialog.getByText('Aturan perusahaan tersimpan, berlaku mulai 2026-08.')).toBeVisible();
  expect(state.rules.get('2:2026-08')).toEqual(defaultRule);
});

test('fixed Position rules send no invented allowance; partial preview displays named failures and generates only ready IDs', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  await dialog.getByText('Aturan perusahaan', { exact: true }).click();
  await dialog.getByLabel('Alasan aturan perusahaan').fill('Synthetic approved Position rule');
  await dialog.getByLabel('Tunjangan pajak Eksisting').selectOption('fixed_position');
  await dialog.getByLabel('Hari kerja aturan perusahaan').selectOption('6');
  await dialog.getByRole('button', { name: 'Simpan aturan perusahaan', exact: true }).click();
  await expect(dialog.getByText('Aturan perusahaan tersimpan, berlaku mulai 2026-08.')).toBeVisible();
  expect(state.automationSaves[0].input).toEqual({ ...defaultRule, reason: 'Synthetic approved Position rule', work_days_per_week: 6,
    existing: { tax_allowance_mode: 'fixed_position', bpjs_paid_by_company: true } });
  state.preview = { ...previewResult(), previewed: 1, results: [previewResult().results[1]], errors: 2,
    errorDetails: [{ employee_id: 901, employee_name: 'Synthetic Refund Staff', employee_code: 'TEST-901', error: 'Approved Position allowance missing' },
      { employee_id: 999, error: 'Synthetic unknown employee error' }] };
  await dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true }).click();
  const preview = dialog.getByRole('region', { name: 'Preview semua karyawan', exact: true });
  await expect(preview).toContainText('Synthetic Refund Staff (TEST-901): Approved Position allowance missing');
  await expect(preview).toContainText('Karyawan #999: Synthetic unknown employee error');
  await expect(preview.getByRole('row', { name: /Synthetic Zero Staff/ })).toContainText('0,00');
  await dialog.getByRole('button', { name: 'Generate siap (1)', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Hasil generate payroll' })).toContainText('1 payroll berhasil dibuat');
  expect(state.generations).toEqual([{ company_id: 2, period, employee_ids: [902] }]);
  await expect(dialog.getByRole('region', { name: 'Tidak ikut generate' })).toContainText('Approved Position allowance missing');
});

test('draft changes, rule saves, exception edits and exception saves invalidate bulk preview', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  const preview = dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true });
  const ready = dialog.getByRole('button', { name: 'Generate siap (2)', exact: true });
  await preview.click(); await expect(ready).toBeEnabled();
  await dialog.getByText('Aturan perusahaan', { exact: true }).click();
  await dialog.getByLabel('Alasan aturan perusahaan').fill(defaultRule.reason);
  await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
  await expect(preview).toBeDisabled();
  await dialog.getByRole('button', { name: 'Batalkan perubahan aturan' }).click();
  await preview.click(); await expect(ready).toBeEnabled();
  await dialog.getByLabel('Alasan aturan perusahaan').fill(defaultRule.reason);
  await dialog.getByRole('button', { name: 'Simpan aturan perusahaan', exact: true }).click();
  await expect(preview).toBeEnabled(); await expect(ready).toHaveCount(0);
  await preview.click(); await expect(ready).toBeEnabled();
  await dialog.getByText('Pengecualian periode ini', { exact: true }).click();
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('901');
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic one-period exception');
  await expect(preview).toBeDisabled(); await expect(ready).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Simpan persiapan', exact: true }).click();
  await expect(preview).toBeEnabled(); await expect(ready).toHaveCount(0);
  await preview.click(); await expect(ready).toBeEnabled();
  await dialog.getByRole('button', { name: 'Hapus persiapan periode ini' }).click();
  await expect(preview).toBeEnabled(); await expect(ready).toHaveCount(0);
  expect(state.exceptionSaves).toEqual([{ period, input: { reason: 'Synthetic one-period exception' } }, { period, input: null }]);
  expect(state.generations).toEqual([]);
});

test('rules load failure and save uncertainty block preview, with explicit retries', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  state.failLoad = true;
  await dialog.getByLabel('Periode persiapan').fill('2026-07');
  await expect(dialog.getByRole('alert')).toContainText('Synthetic rules load failure');
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeDisabled();
  await expect(dialog.getByText('Belum ada aturan perusahaan tersimpan.', { exact: false })).toHaveCount(0);
  state.failLoad = false;
  await dialog.getByRole('button', { name: 'Muat ulang aturan' }).click();
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeEnabled();
  await dialog.getByText('Aturan perusahaan', { exact: true }).click();
  await dialog.getByLabel('Alasan aturan perusahaan').fill(defaultRule.reason);
  state.failSave = true;
  await dialog.getByRole('button', { name: 'Simpan aturan perusahaan', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic rules save failure');
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeDisabled();
  state.failSave = false; state.malformedSave = true;
  await dialog.getByRole('button', { name: 'Simpan aturan perusahaan', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Simpan aturan belum terkonfirmasi');
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Muat ulang aturan' }).click();
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeEnabled();
});

test('late previews and rule loads cannot restore results for a changed company or period', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  const previewGate = deferred(); state.previewGate = previewGate.promise;
  await dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true }).click();
  await expect.poll(() => state.previews.length).toBe(1);
  await dialog.getByLabel('Periode persiapan').fill('2026-07');
  await expect(dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true })).toBeDisabled();
  const response = page.waitForResponse(item => item.url().endsWith('/payroll/preparation/preview'));
  previewGate.resolve(); await (await response).finished();
  await expect(dialog.getByRole('region', { name: 'Preview semua karyawan', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
  state.rules.set('2:2026-06', defaultRule);
  const loadGate = deferred(); state.loadGates.set('2:2026-06', loadGate.promise);
  await dialog.getByLabel('Periode persiapan').fill('2026-06');
  await expect.poll(() => state.automationReads.includes('2:2026-06')).toBe(true);
  await dialog.getByLabel('Perusahaan persiapan').selectOption('3');
  await expect(dialog.getByText('Belum ada aturan perusahaan tersimpan.', { exact: false })).toBeVisible();
  const loaded = page.waitForResponse(item => item.url().includes('/payroll/automation?') && item.url().includes('company_id=2') && item.url().includes('period=2026-06'));
  loadGate.resolve(); await (await loaded).finished();
  await expect(dialog.getByText('Aturan perusahaan tersimpan, berlaku mulai 2026-06.')).toHaveCount(0);
  state.previewGate = null;
  await dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Generate siap (2)', exact: true })).toBeEnabled();
  expect(state.previews[1]).toEqual({ company_id: 3, period: '2026-06' });
});

test('failed or inconsistent previews cannot generate; successful retries replace them', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  for (const invalid of ['all failed', 'missing errors', 'duplicate IDs', 'overlapping IDs', 'wrong count', 'missing cost'] as const) {
    if (invalid === 'all failed') state.preview = { generated: 0, previewed: 0, results: [], errors: 1, errorDetails: [{ employee_id: 901, error: 'Synthetic employee failure' }] };
    if (invalid === 'missing errors') state.preview.errors = 1;
    if (invalid === 'duplicate IDs') state.preview.results[1].employee_id = 901;
    if (invalid === 'overlapping IDs') { state.preview.errors = 1; state.preview.errorDetails = [{ employee_id: 901, error: 'Synthetic conflicting result' }]; }
    if (invalid === 'wrong count') state.preview.previewed = 9;
    if (invalid === 'missing cost') Object.assign(state.preview.results[0], { total_cost_to_company: null });
    await dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true }).click();
    await expect(dialog.getByRole('region', { name: 'Preview semua karyawan', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
    state.preview = previewResult();
    await dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Generate siap (2)', exact: true })).toBeEnabled();
    expect(state.generations).toEqual([]);
  }
});

test('failed preview clears old results; failed and partial generation refresh and require a new preview', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  const preview = dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true });
  await preview.click(); await expect(dialog.getByRole('button', { name: 'Generate siap (2)', exact: true })).toBeEnabled();
  state.failPreview = true; await preview.click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic preview failure');
  await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
  state.failPreview = false; await preview.click();
  state.failGenerate = true; const reads = state.listReads;
  await dialog.getByRole('button', { name: 'Generate siap (2)', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic generate failure');
  await expect.poll(() => state.listReads).toBeGreaterThan(reads);
  await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
  state.failGenerate = false; state.generateConflict = true;
  await preview.click();
  await dialog.getByRole('button', { name: 'Generate siap (2)', exact: true }).click();
  const outcome = dialog.getByRole('region', { name: 'Hasil generate payroll' });
  await expect(outcome).toContainText('1 payroll berhasil dibuat · 1 karyawan gagal');
  await expect(outcome).toContainText('Synthetic Zero Staff (TEST-902): Synthetic payroll already exists');
  await expect(dialog.getByRole('button', { name: 'Generate siap (0)', exact: true })).toBeDisabled();
  expect(state.generations).toHaveLength(2);
});

test('exception list failure is visible and does not block server bulk results; exceptions never populate the next period', async ({ page }) => {
  const { state, dialog } = await openPayroll(page);
  state.failExceptions = true;
  await dialog.getByText('Pengecualian periode ini', { exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic exception list failure');
  await expect(dialog.getByText('Tidak ada karyawan untuk perusahaan dan periode ini.')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Preview semua karyawan', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Generate siap (2)', exact: true })).toBeEnabled();
  state.failExceptions = false;
  state.exceptions.set(period, { reason: 'Synthetic refund and BPJS exception', tax_allowance_mode: 'none', bpjs_base: 6000000,
    bpjs_paid_by_company: true, external_tax: { amount: -23456.75, reference: 'SYNTHETIC-REF' } });
  await dialog.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('901');
  await expect(dialog.getByLabel('Pajak eksternal', { exact: true })).toHaveValue('-23456.75');
  await dialog.getByLabel('Periode persiapan').fill('2026-09');
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('901');
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('Gunakan pajak eksternal / refund', { exact: true })).not.toBeChecked();
  await expect(dialog.getByLabel('Dasar BPJS', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('BPJS karyawan ditanggung perusahaan', { exact: true })).toHaveValue('');
  expect(state.exceptionSaves).toEqual([]); expect(state.automationSaves).toEqual([]);
});
