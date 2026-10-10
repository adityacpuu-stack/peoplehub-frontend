import { test, expect, type Page } from '@playwright/test';
import type { PayrollPreparationInput, PayrollPreparationRow } from '../src/services/payroll.service';

const period = '2026-08';
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

// Synthetic data only. Every unrecognized API or external request is aborted.
async function openPayroll(page: Page, role = 'HR Manager') {
  const employee = {
    id: 901, employee_id: 'TEST-901', name: 'Synthetic Payroll Staff', company_id: 2,
    employment_type: 'permanent', employment_status: 'active', profile_completed: true,
    national_id: '0000000000000901', email: 'staff@example.test',
    company: { id: 2, name: 'Synthetic Company', code: 'TEST' },
  };
  // Assertions are Indonesian; English-sourced labels use their registered Indonesian text.
  const user = { id: 91, email: 'hr@example.test', roles: [role], permissions: [], language: 'id',
    accessibleCompanyIds: [2, 3], is_active: true, force_password_change: false, employee,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
  const snapshot = {
    version: 2, policy: { tax_allowance_mode: 'fixed', bpjs_paid_by_company: false, rounding: 'final_cent' },
    input: { reason: 'Synthetic saved decision', payment_hold_reason: 'Synthetic review' },
    calculated_pph21: '32123.45', tax_allowance: '0', tax_source: 'external', tax_reference: 'SYNTHETIC-REF',
    rounding_adjustment: 0,
    bpjs_base: '6000000', payments: { regular: '9876543.21', bonus: '456789.12', total: '10333332.33', held: true },
  };
  const payroll = {
    id: 701, employee_id: 901, company_id: 2, employee, status: 'draft', period,
    payroll_number: 'TEST-PAY-701', pay_type: 'gross', basic_salary: '1234567.89', gross_salary: '2345678.91',
    total_deductions: '123.45', net_salary: '9876543.21', take_home_pay: '10333332.33',
    pph21: '-23456.75', bpjs_employee_total: '24680.12', bpjs_company_total: '55555.55',
    metadata: { calculation: snapshot, proration: { work_days_per_week: 6 } },
  };
  const baseRows: PayrollPreparationRow[] = [
    { employee_id: 901, employee_code: 'TEST-901', employee_name: employee.name, salary_status: 'Existing', basic_salary: '6000000', input: null, locked: false },
    { employee_id: 902, employee_code: 'TEST-902', employee_name: 'Synthetic Locked Staff', salary_status: null, basic_salary: null, input: { reason: 'Locked decision', work_days_per_week: 5 }, locked: true },
    { employee_id: 903, employee_code: 'TEST-903', employee_name: 'Synthetic Other Staff', salary_status: 'New', basic_salary: '0', input: { reason: 'Other decision', tax_allowance_mode: 'none', work_days_per_week: 5 }, locked: false },
  ];
  const state = {
    unexpected: [] as string[], errors: [] as string[],
    saves: [] as Array<{ id: number; body: { period: string; input: PayrollPreparationInput | null } }>,
    previews: [] as unknown[], lists: [] as string[], holds: [] as unknown[], detailReads: 0,
    saveGate: null as Promise<void> | null, previewGate: null as Promise<void> | null,
    listGates: new Map<string, Promise<void>>(), failList: false, failSave: false, failPreview: false,
    malformedPreview: false, failHold: false, saveConflict: false, rejectPrecision: false, rows: new Map<string, PayrollPreparationRow[]>(), payroll,
  };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-payroll-preparation-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && !['xhr', 'fetch'].includes(request.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    if (url.origin !== (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') || !url.pathname.startsWith('/api/v1/')) {
      state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    const method = request.method();
    const reject = (message: string, status = 409) => route.fulfill({ status, json: { success: false, error: { message } } });
    let data: unknown;
    // Client audit beacon (telemetry), not an application request under test.
    if (method === 'POST' && endpoint === '/audit-logs/events') return route.fulfill({ status: 204 });
    if (method === 'GET' && endpoint === '/auth/me') data = { user };
    else if (method === 'GET' && endpoint === '/employees/me') data = employee;
    else if (method === 'GET' && endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (method === 'GET' && ['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (method === 'GET' && ['/companies', '/payroll'].includes(endpoint)) {
      data = endpoint === '/companies' ? [employee.company, { id: 3, name: 'Synthetic Other Company', code: 'OTHER' }] : [payroll];
      return route.fulfill({ json: { success: true, data, pagination: { page: 1, limit: 500, total: 2, totalPages: 1 } } });
    } else if (method === 'GET' && endpoint === '/payroll/701') {
      state.detailReads++; data = payroll;
    } else if (method === 'GET' && endpoint === '/payroll/automation') {
      data = { company_id: Number(url.searchParams.get('company_id')), period: url.searchParams.get('period'), effective_from: null, input: null };
    } else if (method === 'GET' && endpoint === '/payroll/preparation') {
      const key = `${url.searchParams.get('company_id')}:${url.searchParams.get('period')}`;
      state.lists.push(key);
      if (!state.rows.has(key)) state.rows.set(key, structuredClone(baseRows));
      data = structuredClone(state.rows.get(key));
      if (state.listGates.has(key)) await state.listGates.get(key);
      if (state.failList) return reject('Synthetic list failure', 503);
    } else if (method === 'PUT' && /^\/payroll\/preparation\/\d+$/.test(endpoint)) {
      const id = Number(endpoint.split('/').at(-1));
      const body = request.postDataJSON();
      state.saves.push({ id, body });
      if (state.saveGate) await state.saveGate;
      if (state.failSave) return reject('Synthetic save failure', 503);
      if (state.saveConflict) return reject('Synthetic stale payroll conflict');
      if (state.rejectPrecision && body.input?.rounding !== 'final_cash') return route.fulfill({ status: 400, json: {
        success: false, error: { message: 'Validation failed', code: 'VALIDATION_ERROR',
          errors: [{ field: 'input.paid_basic_salary', message: 'Nominal input maksimal dua angka desimal', code: 'custom' }] },
      } });
      const rows = state.rows.get(`2:${body.period}`);
      const row = rows?.find(item => item.employee_id === id);
      if (!row || row.locked) return reject('Synthetic locked row');
      row.input = body.input; data = { employee_id: id, period: body.period, input: body.input };
    } else if (method === 'POST' && endpoint === '/payroll/preparation/preview') {
      const body = request.postDataJSON(); state.previews.push(body);
      const failure = state.failPreview;
      const malformed = state.malformedPreview;
      if (state.previewGate) await state.previewGate;
      data = failure ? { generated: 0, previewed: 0, errors: 1, results: [], errorDetails: [{ employee_id: body.employee_ids[0], error: 'Synthetic preview failure' }] } : {
        generated: 0, previewed: 1, errors: 0, errorDetails: [], results: [{
          employee_id: malformed ? 999 : body.employee_ids[0], basic_salary: 1234567.89, gross_salary: 2345678.91,
          take_home_pay: 10333332.33, bpjs: { bpjs_employee_total: 24680.12 }, tax: { pph21: -23456.75 },
          calculation_snapshot: snapshot, proration_snapshot: { work_days_per_week: 6 },
        }],
      };
    } else if (method === 'POST' && endpoint === '/payroll/701/payment-hold') {
      const body = request.postDataJSON(); state.holds.push(body);
      if (state.failHold) return reject('Synthetic hold failure');
      payroll.metadata.calculation.payments.held = body.held;
      data = payroll;
    } else {
      state.unexpected.push(`${method} ${endpoint}`); return route.abort();
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/payroll');
  await expect(page.getByRole('button', { name: 'Buat Payroll', exact: true })).toBeVisible();
  return state;
}

async function openPreparation(page: Page) {
  await page.getByRole('button', { name: 'Buat Payroll', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Persiapan Payroll' });
  await dialog.getByLabel('Periode persiapan').fill(period);
  await dialog.getByText('Pengecualian periode ini', { exact: true }).click();
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeEnabled();
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('901');
  return dialog;
}

test('saves the full employee-period input including fixed zero, signed refunds and six days before preview', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic HR decision');
  await dialog.getByLabel('Hari kerja per minggu', { exact: true }).selectOption('6');
  await dialog.getByLabel('Gaji pokok dibayar (override manual)', { exact: true }).fill('0');
  await dialog.getByLabel('Mode tunjangan pajak', { exact: true }).selectOption('fixed');
  await dialog.getByLabel('Tunjangan pajak tetap', { exact: true }).fill('0');
  await dialog.getByLabel('Gunakan pajak eksternal / refund', { exact: true }).check();
  await dialog.getByLabel('Pajak eksternal', { exact: true }).fill('-23456.75');
  await dialog.getByLabel('Referensi pajak eksternal', { exact: true }).fill('SYNTHETIC-REF');
  await dialog.getByLabel('BPJS karyawan ditanggung perusahaan', { exact: true }).selectOption('false');
  await dialog.getByLabel('Dasar BPJS', { exact: true }).fill('6000000');
  await dialog.getByLabel('Pembulatan', { exact: true }).selectOption('final_cent');
  await dialog.getByText('Lanjutan: bonus dan penahanan pembayaran', { exact: true }).click();
  await dialog.getByLabel('Alasan penahanan pembayaran', { exact: true }).fill('Synthetic review');
  await dialog.getByLabel('Sertakan bonus', { exact: true }).check();
  await dialog.getByLabel('Bonus bruto', { exact: true }).fill('500000.5');
  await dialog.getByLabel('Gunakan total pajak eksternal termasuk bonus', { exact: true }).check();
  await dialog.getByLabel('Total pajak eksternal termasuk bonus', { exact: true }).fill('-10000.25');
  await dialog.getByLabel('Referensi total pajak bonus', { exact: true }).fill('SYNTHETIC-BONUS');
  const gate = deferred(); state.saveGate = gate.promise;
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.saves[0]).toEqual({ id: 901, body: { period, input: {
    reason: 'Synthetic HR decision', work_days_per_week: 6, paid_basic_salary: 0,
    tax_allowance_mode: 'fixed', fixed_tax_allowance: 0,
    external_tax: { amount: -23456.75, reference: 'SYNTHETIC-REF' },
    bpjs_paid_by_company: false, bpjs_base: 6000000, rounding: 'final_cent', payment_hold_reason: 'Synthetic review',
    bonus: { amount: 500000.5, external_total_tax: { amount: -10000.25, reference: 'SYNTHETIC-BONUS' } },
  } } });
  expect(state.previews).toEqual([]);
  await expect(dialog.getByRole('button', { name: 'Simpan & preview' })).toBeDisabled();
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeDisabled();
  gate.resolve();
  const preview = dialog.getByRole('region', { name: 'Preview payroll', exact: true });
  await expect(preview).toBeVisible();
  expect(state.previews).toEqual([{ company_id: 2, period, employee_ids: [901] }]);
  await expect(preview.getByText('Gaji pokok dibayar', { exact: true }).locator('..')).toContainText('1.234.567,89');
  await expect(preview.getByText('Gaji Bersih Diterima', { exact: true }).locator('..')).toContainText('10.333.332,33');
  await expect(preview.getByText('Pajak diterapkan', { exact: true }).first().locator('..')).toContainText('-Rp');
  await expect(preview.getByText('Tunjangan pajak', { exact: true }).first().locator('..')).toContainText('0,00');
  await expect(preview.getByText('Total BPJS karyawan', { exact: true }).locator('..')).toContainText('24.680,12');
  await expect(preview.getByText('Pembayaran bonus', { exact: true }).locator('..')).toContainText('456.789,12');
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Changed decision');
  await expect(preview).toHaveCount(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('failed saves and previews clear previous results, and locked payroll is read-only', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic default decision');
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  const preview = dialog.getByRole('region', { name: 'Preview payroll', exact: true });
  await expect(preview).toBeVisible();
  state.failSave = true;
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic save failure');
  await expect(preview).toHaveCount(0); expect(state.previews).toHaveLength(1);
  state.failSave = false; state.failPreview = true;
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic preview failure');
  await expect(preview).toHaveCount(0);
  state.failPreview = false; state.malformedPreview = true;
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Preview tidak lengkap');
  await expect(preview).toHaveCount(0);
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('902');
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveValue('Locked decision');
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Simpan & preview' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Hapus persiapan periode ini' })).toBeDisabled();
  await expect(dialog.getByText(/Persiapan hanya dapat dibaca/)).toBeVisible();
  expect(state.saves.every(call => call.id === 901)).toBe(true);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('selection changes discard stale previews and late list responses; failed loading exposes no editor', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic first employee');
  const previewGate = deferred(); state.previewGate = previewGate.promise;
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect.poll(() => state.previews.length).toBe(1);
  await expect(dialog.getByText('Memuat preview dari server…')).toBeVisible();
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('903');
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveValue('Other decision');
  const previewResponse = page.waitForResponse(response => response.url().endsWith('/payroll/preparation/preview'));
  previewGate.resolve(); await (await previewResponse).finished();
  await expect(dialog.getByRole('region', { name: 'Preview payroll', exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Hari kerja per minggu', { exact: true })).toHaveValue('5');
  const listGate = deferred(); state.listGates.set('2:2026-07', listGate.promise);
  state.rows.set('2:2026-07', [{ employee_id: 999, employee_code: 'STALE', employee_name: 'Stale Employee', salary_status: null, basic_salary: null, input: null, locked: false }]);
  await dialog.getByLabel('Periode persiapan').fill('2026-07');
  await expect.poll(() => state.lists.includes('2:2026-07')).toBe(true);
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveCount(0);
  await dialog.getByLabel('Periode persiapan').fill('2026-06');
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeEnabled();
  const staleListResponse = page.waitForResponse(response => response.url().includes('/payroll/preparation?') && response.url().includes('2026-07'));
  listGate.resolve(); await (await staleListResponse).finished();
  await expect(dialog.getByRole('option', { name: /Stale Employee/ })).toHaveCount(0);
  state.failList = true;
  await dialog.getByLabel('Perusahaan persiapan').selectOption('3');
  await expect(dialog.getByRole('alert')).toContainText('Synthetic list failure');
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveCount(0);
  state.failList = false;
  await dialog.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeEnabled();
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toHaveValue('');
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('omitted settings retain legacy defaults, validation blocks invalid bonus/tax, and removal sends null', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Default only');
  await dialog.getByRole('button', { name: 'Simpan persiapan', exact: true }).click();
  await expect(dialog.getByText('Persiapan karyawan untuk periode ini tersimpan.', { exact: true })).toBeVisible();
  expect(state.saves[0]).toEqual({ id: 901, body: { period, input: { reason: 'Default only' } } });
  await dialog.getByLabel('Mode tunjangan pajak', { exact: true }).selectOption('fixed');
  await expect(dialog.getByLabel('Tunjangan pajak tetap', { exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect(dialog.getByText('Isi tunjangan pajak tetap secara eksplisit, termasuk 0 bila nihil.', { exact: true })).toBeVisible();
  expect(state.saves).toHaveLength(1); expect(state.previews).toEqual([]);
  await dialog.getByLabel('Mode tunjangan pajak', { exact: true }).selectOption('');
  await dialog.getByLabel('Gunakan pajak eksternal / refund', { exact: true }).check();
  await dialog.getByLabel('Pajak eksternal', { exact: true }).fill('-1');
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect(dialog.getByText('Referensi pajak wajib diisi.', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/gross-up untuk bonus belum didukung/)).toBeVisible();
  await dialog.getByLabel('Gunakan pajak eksternal / refund', { exact: true }).uncheck();
  await dialog.getByText('Lanjutan: bonus dan penahanan pembayaran', { exact: true }).click();
  await dialog.getByLabel('Sertakan bonus', { exact: true }).check();
  await dialog.getByLabel('Bonus bruto', { exact: true }).fill('0');
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect(dialog.getByText('Bonus harus lebih dari 0.', { exact: true })).toBeVisible();
  expect(state.saves).toHaveLength(1); expect(state.previews).toEqual([]);
  await dialog.getByRole('button', { name: 'Hapus persiapan periode ini', exact: true }).click();
  await expect(dialog.getByText('Persiapan dihapus. Pengaturan payroll berlaku kembali.', { exact: true })).toBeVisible();
  expect(state.saves[1]).toEqual({ id: 901, body: { period, input: null } });
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveValue('');
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('saved policy displays server amounts and approval-role hold release requires a reason then reloads detail', async ({ page }) => {
  const state = await openPayroll(page);
  await page.getByTitle('Lihat Detail').click();
  const panel = page.getByRole('region', { name: 'Kebijakan dan pembayaran payroll' });
  await expect(panel.getByText('Pajak diterapkan', { exact: true }).locator('..')).toContainText('23.456,75');
  await expect(panel.getByText('Hari kerja per minggu', { exact: true }).locator('..')).toContainText('6');
  // Server tax_source stays 'external'; the Indonesian display label is "Eksternal".
  await expect(panel.getByText('Sumber pajak', { exact: true }).locator('..')).toContainText('Eksternal');
  const hold = page.getByRole('region', { name: 'Ubah penahanan pembayaran' });
  await expect(hold.getByRole('button', { name: 'Lepaskan penahanan' })).toBeDisabled();
  await hold.getByLabel('Alasan perubahan penahanan').fill('Synthetic release approval');
  await hold.getByRole('button', { name: 'Lepaskan penahanan' }).click();
  await expect(panel.getByText('Status pembayaran', { exact: true }).locator('..')).toContainText('Tidak ditahan');
  expect(state.holds).toEqual([{ held: false, reason: 'Synthetic release approval' }]);
  expect(state.detailReads).toBe(2);
  await expect(panel.getByText('Total pembayaran', { exact: true }).locator('..')).toContainText('10.333.332,33');
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('saved missing snapshot amounts show a dash and non-approvers cannot change holds', async ({ page }) => {
  const state = await openPayroll(page, 'Finance Manager');
  Reflect.deleteProperty(state.payroll.metadata.calculation, 'calculated_pph21');
  Reflect.deleteProperty(state.payroll.metadata.calculation, 'tax_reference');
  Reflect.deleteProperty(state.payroll.metadata.calculation.payments, 'bonus');
  await page.getByTitle('Lihat Detail').click();
  const panel = page.getByRole('region', { name: 'Kebijakan dan pembayaran payroll' });
  await expect(panel.getByText('Pajak hasil kalkulasi', { exact: true }).locator('..')).toHaveText('Pajak hasil kalkulasi-');
  await expect(panel.getByText('Referensi pajak', { exact: true }).locator('..')).toHaveText('Referensi pajak-');
  await expect(panel.getByText('Pembayaran bonus', { exact: true }).locator('..')).toHaveText('Pembayaran bonus-');
  await expect(page.getByRole('region', { name: 'Ubah penahanan pembayaran' })).toHaveCount(0);
  expect(state.holds).toEqual([]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('a payroll created after loading blocks further edits until reload reveals the locked row', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Stale HR decision');
  state.saveConflict = true;
  state.rows.get(`2:${period}`)![0].locked = true;
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic stale payroll conflict');
  await expect(dialog.getByRole('button', { name: 'Simpan & preview' })).toBeDisabled();
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeEnabled();
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('901');
  await expect(dialog.getByText(/Persiapan hanya dapat dibaca/)).toBeVisible();
  await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Simpan & preview' })).toBeDisabled();
  expect(state.saves).toHaveLength(1); expect(state.previews).toEqual([]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('closing during save ignores the late response and never dispatches a preview', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic saved before closing');
  const gate = deferred(); state.saveGate = gate.promise;
  await dialog.getByRole('button', { name: 'Simpan & preview' }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
  const response = page.waitForResponse(result => result.url().endsWith('/payroll/preparation/901'));
  gate.resolve(); await (await response).finished();
  const reopened = await openPreparation(page);
  await expect(reopened.getByLabel('Alasan persiapan', { exact: true })).toHaveValue('Synthetic saved before closing');
  await expect(reopened.getByRole('region', { name: 'Preview payroll', exact: true })).toHaveCount(0);
  expect(state.previews).toEqual([]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('failed hold updates preserve displayed cash and require a reload before retry', async ({ page }) => {
  const state = await openPayroll(page);
  await page.getByTitle('Lihat Detail').click();
  const hold = page.getByRole('region', { name: 'Ubah penahanan pembayaran' });
  const panel = page.getByRole('region', { name: 'Kebijakan dan pembayaran payroll' });
  state.failHold = true;
  await hold.getByLabel('Alasan perubahan penahanan').fill('Synthetic release retry');
  await hold.getByRole('button', { name: 'Lepaskan penahanan' }).click();
  await expect(hold.getByRole('alert')).toContainText('Synthetic hold failure');
  await expect(panel.getByText('Status pembayaran', { exact: true }).locator('..')).toHaveText('Status pembayaranDitahan');
  await expect(panel.getByText('Total pembayaran', { exact: true }).locator('..')).toContainText('10.333.332,33');
  await hold.getByRole('button', { name: 'Muat ulang status penahanan' }).click();
  await expect(hold.getByRole('button', { name: 'Lepaskan penahanan' })).toBeDisabled();
  expect(state.holds).toHaveLength(1); expect(state.detailReads).toBe(2);
  state.failHold = false;
  await hold.getByLabel('Alasan perubahan penahanan').fill('Synthetic release retry');
  await hold.getByRole('button', { name: 'Lepaskan penahanan' }).click();
  await expect(panel.getByText('Status pembayaran', { exact: true }).locator('..')).toHaveText('Status pembayaranTidak ditahan');
  expect(state.holds).toHaveLength(2); expect(state.detailReads).toBe(3);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('HR BPJS requires all eight nonnegative components and a reference; unchecking omits the object and clears preview', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic BPJS exception');
  await dialog.getByText('Lanjutan: komponen BPJS HR', { exact: true }).click();
  await dialog.getByLabel('Komponen BPJS dari perhitungan HR', { exact: true }).check();
  await dialog.getByRole('button', { name: 'Simpan persiapan', exact: true }).click();
  await expect(dialog.getByText('Referensi komponen BPJS wajib diisi.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Isi komponen BPJS minimal 0; semua komponen wajib diisi.', { exact: true })).toHaveCount(8);
  await dialog.getByLabel('Referensi komponen BPJS HR', { exact: true }).fill('SYNTHETIC-BPJS-REF');
  const fields = [
    ['BPJS Kesehatan karyawan (HR)', '-1'], ['BPJS JHT karyawan (HR)', '120000.25'], ['BPJS JP karyawan (HR)', '60000.5'],
    ['BPJS Kesehatan perusahaan (HR)', '240000.75'], ['BPJS JHT perusahaan (HR)', '222000.9'], ['BPJS JP perusahaan (HR)', '120000.01'],
    ['BPJS JKK perusahaan (HR)', '6000.02'], ['BPJS JKM perusahaan (HR)', '18000.03'],
  ];
  for (const [label, value] of fields) await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog.getByRole('button', { name: 'Simpan persiapan', exact: true }).click();
  await expect(dialog.getByText('Isi komponen BPJS minimal 0; semua komponen wajib diisi.', { exact: true })).toHaveCount(1);
  expect(state.saves).toEqual([]);
  await dialog.getByLabel('BPJS Kesehatan karyawan (HR)', { exact: true }).fill('0');
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  const preview = dialog.getByRole('region', { name: 'Preview payroll', exact: true });
  await expect(preview).toBeVisible();
  expect(state.saves[0]).toEqual({ id: 901, body: { period, input: { reason: 'Synthetic BPJS exception', external_bpjs: {
    reference: 'SYNTHETIC-BPJS-REF', bpjs_kes_employee: 0, bpjs_jht_employee: 120000.25, bpjs_jp_employee: 60000.5,
    bpjs_kes_company: 240000.75, bpjs_jht_company: 222000.9, bpjs_jp_company: 120000.01,
    bpjs_jkk_company: 6000.02, bpjs_jkm_company: 18000.03,
  } } } });
  await expect(preview.getByText('Total BPJS karyawan', { exact: true }).locator('..')).toContainText('24.680,12');
  await dialog.getByLabel('Komponen BPJS dari perhitungan HR', { exact: true }).uncheck();
  await expect(preview).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Simpan persiapan', exact: true }).click();
  await expect(dialog.getByText('Persiapan karyawan untuk periode ini tersimpan.', { exact: true })).toBeVisible();
  expect(state.saves[1]).toEqual({ id: 901, body: { period, input: { reason: 'Synthetic BPJS exception' } } });
  expect(state.previews).toHaveLength(1);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('only final_cash uses raw manual precision and displays the server rounding adjustment', async ({ page }) => {
  const state = await openPayroll(page);
  const dialog = await openPreparation(page);
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic precision check');
  const amount = dialog.getByLabel('Gaji pokok dibayar (override manual)', { exact: true });
  await expect(amount).toHaveAttribute('step', '0.01');
  await amount.fill('1234.567');
  state.rejectPrecision = true;
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Nominal input maksimal dua angka desimal');
  await expect(amount).toHaveValue('1234.567');
  expect(state.saves[0]).toEqual({ id: 901, body: { period, input: { reason: 'Synthetic precision check', paid_basic_salary: 1234.567 } } });
  await expect(dialog.getByRole('region', { name: 'Preview payroll', exact: true })).toHaveCount(0);
  expect(state.previews).toEqual([]);

  await dialog.getByLabel('Pembulatan', { exact: true }).selectOption({ label: 'Bulatkan total akhir (HR)' });
  await expect(dialog.getByLabel('Pembulatan', { exact: true })).toHaveAttribute('title', /presisi input mentah/);
  await amount.fill('100.004');
  await dialog.getByLabel('Mode tunjangan pajak', { exact: true }).selectOption('none');
  await dialog.getByLabel('Gunakan pajak eksternal / refund', { exact: true }).check();
  await dialog.getByLabel('Pajak eksternal', { exact: true }).fill('1.005');
  await dialog.getByLabel('Referensi pajak eksternal', { exact: true }).fill('SYNTHETIC-RAW-HR');
  for (const input of await dialog.locator('input[type="number"]').all()) await expect(input).toHaveAttribute('step', 'any');
  state.payroll.metadata.calculation.policy.rounding = 'final_cash';
  state.payroll.metadata.calculation.rounding_adjustment = -0.03;
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  const preview = dialog.getByRole('region', { name: 'Preview payroll', exact: true });
  await expect(preview).toBeVisible();
  expect(state.saves[1]).toEqual({ id: 901, body: { period, input: {
    reason: 'Synthetic precision check', paid_basic_salary: 100.004, rounding: 'final_cash', tax_allowance_mode: 'none',
    external_tax: { amount: 1.005, reference: 'SYNTHETIC-RAW-HR' },
  } } });
  await expect(preview.getByText('Selisih pembulatan', { exact: true }).locator('..')).toContainText(/-Rp\s*0,03/);
  await expect(dialog.getByLabel('Selisih pembulatan', { exact: true })).toHaveCount(0);
  await dialog.getByLabel('Pembulatan', { exact: true }).selectOption('final_cent');
  await expect(preview).toHaveCount(0);
  for (const input of await dialog.locator('input[type="number"]').all()) await expect(input).toHaveAttribute('step', '0.01');
  await expect(amount).toHaveValue('100.004');
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Nominal input maksimal dua angka desimal');
  expect(state.saves[2].body.input?.rounding).toBe('final_cent');
  expect(state.previews).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
  await page.getByTitle('Lihat Detail').click();
  await expect(page.getByRole('region', { name: 'Kebijakan dan pembayaran payroll' }).getByText('Selisih pembulatan', { exact: true }).locator('..')).toContainText(/-Rp\s*0,03/);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('v2 fixed allowance and external refund override contradictory legacy flags throughout list and detail', async ({ page }) => {
  const state = await openPayroll(page);
  Object.assign(state.payroll, {
    pph21_paid_by_company: true, position_allowance: '12500.25', pph21: '-23456.75',
    gross_up_initial: '888888.88', final_gross_up: '777777.77', net_salary: 0, take_home_pay: 0,
    bpjs_kes_employee: '9000.01', bpjs_jht_employee: '15000.11', bpjs_jp_employee: '680',
  });
  state.payroll.metadata.calculation.policy.bpjs_paid_by_company = true;
  state.payroll.metadata.calculation.tax_allowance = '12500.25';
  Object.assign(state.payroll.metadata.calculation.payments, { regular: 0, bonus: 0, total: 0 });
  // Backend saved read presentation for this row (payroll-read-presentation.ts).
  Object.assign(state.payroll, { presentation: { version: 1, basis: 'calculation_v2', take_home_pay: 0, company_cost: null,
    taxable_base: 777777.77, funding: { pph21: 'withheld', tax_allowance_mode: 'fixed', bpjs_employee: 'company' },
    position: { total: 12500.25, business: 0, tax_allowance: 12500.25 }, earnings: null,
    deductions: { pph21: -23456.75, bpjs_employee: 0, system: 123.45, total: -23333.3 },
    company_borne: { pph21: 12500.25, bpjs_employee: 24680.12, bpjs_company: 55555.55 } } });
  await page.reload();
  const row = page.getByRole('row').filter({ hasText: 'TEST-901' });
  await expect(row.getByText('Pajak diterapkan', { exact: true }).locator('..')).toContainText(/-Rp\s*23\.456,75/);
  await expect(row.getByText('Ditanggung perusahaan', { exact: true }).locator('..')).toHaveText(/Rp\s*24\.680,12Ditanggung perusahaan/);
  await expect(row.getByRole('cell').nth(5)).toHaveText(/Rp\s*0,00/);
  await page.getByTitle('Lihat Detail').click();
  const detail = page.getByRole('dialog', { name: 'Detail payroll' });
  const policy = detail.getByRole('region', { name: 'Kebijakan dan pembayaran payroll' });
  await expect(policy.getByText('Pajak diterapkan', { exact: true }).locator('..')).toHaveText(/Pajak diterapkan-Rp\s*23\.456,75/);
  await expect(policy.getByText('Tunjangan pajak', { exact: true }).locator('..')).toHaveText(/Tunjangan pajakRp\s*12\.500,25/);
  // Saved Position 12,500.25 is entirely the snapshot's tax allowance: it is
  // shown as tax allowance income, not as business Position.
  await expect(detail.getByTestId('payroll-position-tax')).toHaveText(/Tunjangan pajak\+Rp\s*12\.500,25/);
  await expect(detail.getByTestId('payroll-position-business')).toHaveCount(0);
  await expect(detail.getByTestId('payroll-position-combined')).toHaveCount(0);
  const bpjs = detail.getByRole('region', { name: 'Rincian BPJS tersimpan' });
  await expect(bpjs.getByText('Total BPJS karyawan', { exact: true }).locator('..')).toHaveText(/Total BPJS karyawanRp\s*24\.680,12/);
  await expect(bpjs.getByText('BPJS Kesehatan karyawan', { exact: true }).locator('..')).toHaveText(/BPJS Kesehatan karyawanRp\s*9\.000,01/);
  await expect(bpjs.getByText(/Porsi karyawan: Ditanggung perusahaan/)).toBeVisible();
  await expect(detail.getByText(/= nilai PPh21/)).toHaveCount(0);
  await expect(detail.getByText(/Gross Up|GROSS UP|Calculation Breakdown/)).toHaveCount(0);
  await expect(detail.getByText('Total Potongan BPJS', { exact: true })).toHaveCount(0);
  await expect(detail.getByText('BPJS (Karyawan)', { exact: true })).toHaveCount(0);
  await expect(detail.getByText('PPh21 (Ditanggung Perusahaan)', { exact: true })).toHaveCount(0);
  await expect(detail.getByText(/--Rp/)).toHaveCount(0);
  const summary = detail.getByRole('region', { name: 'Ringkasan payroll' });
  // Registered Indonesian labels: "Net Salary" → "Gaji Neto", "Take Home Pay" → "Gaji Bersih Diterima".
  await expect(summary.getByText('Gaji Neto', { exact: true }).locator('..')).toHaveText(/Gaji NetoRp\s*0,00/);
  await expect(summary.getByText('Gaji Bersih Diterima', { exact: true }).locator('..')).toHaveText(/Gaji Bersih DiterimaRp\s*0,00/);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

for (const version of ['legacy', 'v2']) {
  test(`${version} detail preserves numeric zero THP and final gross-up before nonzero fallbacks`, async ({ page }) => {
    const state = await openPayroll(page);
    // take_home_pay is the canonical saved THP (as in exports and reports); its
    // zero must not fall back to the nonzero thp column.
    Object.assign(state.payroll, {
      pph21_paid_by_company: version === 'legacy', take_home_pay: 0, thp: '9876543.21',
      final_gross_up: 0, gross_up_initial: '888888.88', gross_salary: '777777.77',
    });
    if (version === 'legacy') {
      Reflect.deleteProperty(state.payroll, 'metadata');
      // Backend presentation of this legacy row: company-paid gross-up, saved THP 0.
      Object.assign(state.payroll, { presentation: { version: 1, basis: 'saved_flag', take_home_pay: 0, company_cost: null,
        taxable_base: 0, funding: { pph21: 'company_paid', tax_allowance_mode: 'gross_up', bpjs_employee: 'company' },
        position: { total: null, business: null, tax_allowance: null }, earnings: null,
        deductions: { pph21: 0, bpjs_employee: 0, system: 123.45, total: 123.45 },
        company_borne: { pph21: -23456.75, bpjs_employee: 24680.12, bpjs_company: 55555.55 } } });
    } else state.payroll.metadata.calculation.policy.tax_allowance_mode = 'gross_up';
    await page.getByTitle('Lihat Detail').click();
    const summary = page.getByRole('region', { name: 'Ringkasan payroll' });
    const zero = version === 'legacy' ? /Rp\s*0$/ : /Rp\s*0,00$/;
    await expect(summary.getByText('Gross Up Akhir', { exact: true }).locator('..')).toHaveText(zero);
    await expect(summary.getByText('Gaji Bersih Diterima', { exact: true }).locator('..')).toHaveText(zero);
    expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
  });
}
