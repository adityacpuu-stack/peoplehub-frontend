import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import type { PayrollAnnualTax, PayrollPreparationInput, PayrollPreparationRow } from '../src/services/payroll.service';

// Final (annual) PPh 21 period: saved worksheet display and HR recovery inputs.
// Synthetic data only; every unrecognized API or external request is aborted.
const period = '2026-12';
const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';

const annual = (changes: Partial<PayrollAnnualTax> = {}): PayrollAnnualTax => ({
  version: 1, tax_year: 2026, period, final_reason: 'december', explicit_choice: null, source: 'calculated',
  policy_source: 'salary_status_default', reference: null,
  ptkp: { status: 'TK/0', amount: 54000000, basis: 'consistent_saved_status', evidence: ['TK/0'] },
  residency: { mode: 'full_year' }, months: 12, months_basis: 'employment_dates', payroll_periods_covered: 12,
  history: {
    rows: [{ id: 511, period: '2026-11', status: 'paid', gross: 10454000, tax: 261350, deductible_contributions: 300000,
      funding: 'employee_withheld', ptkp_status: 'TK/0', corrected: [] }],
    excluded: [{ id: 990, period: '2026-06', status: 'cancelled', reason: 'cancelled_or_rejected' }],
    opening: { periods: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'],
      gross: 104540000, deductible_contributions: 3000000, tax_withheld: 2613500, replaces_unfinalized: false },
    corrections: null, expected_periods: [],
    totals: { gross: 114994000, deductible_contributions: 3300000, tax: 2874850 },
  },
  current: { dpp_before_tax_allowance: 10454000, bonus: 0, deductible_contributions: 300000 },
  other_deductions: null,
  worksheet: { annual_gross: 125448000, tax_allowance: 0, occupational_deduction: 6000000, deductible_contributions: 3600000,
    other_deductions: 0, net_income: 115848000, annualized_net_income: null, ptkp: 54000000, pkp: 61848000,
    pasal17_full_year: 3277200, annual_liability: 3277200, prior_tax: 2874850, period_tax: 402350 },
  settlement: { mode: 'none', period_tax: 402350, tax_allowance: 0, employee_tax: 402350, company_tax: 0,
    iterations: 1, bonus_tax: 0 },
  ...changes,
});

async function openPayroll(page: Page, options: { language?: 'id' | 'en'; annualTax?: PayrollAnnualTax | null } = {}) {
  const employee = {
    id: 901, employee_id: 'TEST-901', name: 'Synthetic Annual Staff', company_id: 2,
    employment_type: 'permanent', employment_status: 'active', profile_completed: true,
    national_id: '0000000000000901', email: 'staff@example.test',
    company: { id: 2, name: 'Synthetic Company', code: 'TEST' },
  };
  const user = { id: 91, email: 'hr@example.test', roles: ['HR Manager'], permissions: [], language: options.language ?? 'id',
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
  const annualTax = options.annualTax === undefined ? annual() : options.annualTax;
  const pph21 = annualTax ? annualTax.settlement.period_tax : 261350;
  const snapshot = {
    version: 2, policy: { tax_allowance_mode: 'none', bpjs_paid_by_company: false, rounding: 'legacy' },
    input: { reason: 'Masa pajak terakhir PPh 21 otomatis' }, calculated_pph21: pph21, tax_allowance: 0,
    tax_source: 'calculated', bpjs_base: 10000000, rounding_adjustment: 0,
    payments: { regular: 10000000 - 400000 - pph21, bonus: 0, total: 10000000 - 400000 - pph21, held: false },
    ...(annualTax ? { annual_tax: annualTax } : {}),
  };
  const payroll = {
    id: 701, employee_id: 901, company_id: 2, employee, status: 'draft', period: annualTax ? period : '2026-11',
    payroll_number: 'TEST-PAY-701', pay_type: 'gross', basic_salary: '10000000', gross_salary: '10454000',
    total_deductions: '0', net_salary: String(10000000 - 400000 - pph21), take_home_pay: String(10000000 - 400000 - pph21),
    pph21: String(pph21), ter_rate: annualTax ? null : '0.025', ptkp_status: 'TK/0', ptkp_amount: '54000000',
    bpjs_employee_total: '400000', bpjs_company_total: '1024000', total_gross: '10000000', final_gross_up: '10454000',
    metadata: { calculation: snapshot, proration: { work_days_per_week: 5 } },
    presentation: { version: 1, basis: 'calculation_v2', take_home_pay: 10000000 - 400000 - pph21, company_cost: 11024000,
      taxable_base: 10454000, funding: { pph21: 'withheld', tax_allowance_mode: 'none', bpjs_employee: 'employee' },
      position: { total: 0, business: 0, tax_allowance: 0 }, earnings: null,
      deductions: { pph21, bpjs_employee: 400000, system: 0, total: pph21 + 400000 },
      company_borne: { pph21: 0, bpjs_employee: 0, bpjs_company: 1024000 }, annual_tax: annualTax },
  };
  const row: PayrollPreparationRow = { employee_id: 901, employee_code: 'TEST-901', employee_name: employee.name,
    salary_status: 'new_gross', basic_salary: '10000000', input: null, locked: false };
  const state = {
    unexpected: [] as string[], errors: [] as string[],
    saves: [] as Array<{ id: number; body: { period: string; input: PayrollPreparationInput | null } }>,
    previews: 0, previewError: null as string | null, row, snapshot,
  };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-payroll-annual-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin && !['xhr', 'fetch'].includes(request.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    if (url.origin !== origin || !url.pathname.startsWith('/api/v1/')) {
      state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    const method = request.method();
    let data: unknown;
    if (method === 'POST' && endpoint === '/audit-logs/events') return route.fulfill({ status: 204 });
    if (method === 'GET' && endpoint === '/auth/me') data = { user };
    else if (method === 'GET' && endpoint === '/employees/me') data = employee;
    else if (method === 'GET' && endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (method === 'GET' && ['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (method === 'GET' && ['/companies', '/payroll'].includes(endpoint)) {
      data = endpoint === '/companies' ? [employee.company] : [payroll];
      return route.fulfill({ json: { success: true, data, pagination: { page: 1, limit: 500, total: 1, totalPages: 1 } } });
    } else if (method === 'GET' && endpoint === '/payroll/701') data = payroll;
    else if (method === 'GET' && endpoint === '/payroll/automation') {
      data = { company_id: Number(url.searchParams.get('company_id')), period: url.searchParams.get('period'), effective_from: null, input: null };
    } else if (method === 'GET' && endpoint === '/payroll/preparation') data = [structuredClone(state.row)];
    else if (method === 'PUT' && endpoint === '/payroll/preparation/901') {
      const body = request.postDataJSON();
      state.saves.push({ id: 901, body });
      state.row.input = body.input;
      data = { employee_id: 901, period: body.period, input: body.input };
    } else if (method === 'POST' && endpoint === '/payroll/preparation/preview') {
      state.previews++;
      data = state.previewError
        ? { generated: 0, previewed: 0, errors: 1, results: [], errorDetails: [{ employee_id: 901, error: state.previewError }] }
        : { generated: 0, previewed: 1, errors: 0, errorDetails: [], results: [{ employee_id: 901, basic_salary: 10000000,
          gross_salary: 10454000, take_home_pay: 9197650, bpjs: { bpjs_employee_total: 400000 }, tax: { pph21: 402350 },
          calculation_snapshot: snapshot, proration_snapshot: { work_days_per_week: 5 } }] };
    } else {
      state.unexpected.push(`${method} ${endpoint}`); return route.abort();
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/payroll');
  return state;
}

test('shows the saved final-period worksheet, never recalculated and without TER', async ({ page }) => {
  const state = await openPayroll(page);
  await page.getByTitle('Lihat Detail').click();
  const section = page.getByTestId('payroll-annual-tax');
  await expect(section).toBeVisible();
  await expect(section.getByText('Tahun pajak', { exact: true }).locator('..')).toContainText('2026');
  await expect(section.getByText('Alasan masa pajak terakhir', { exact: true }).locator('..')).toContainText('Desember');
  await expect(section.getByText('PTKP awal tahun', { exact: true }).locator('..')).toContainText('TK/0');
  await expect(section.getByText('Biaya jabatan', { exact: true }).locator('..')).toContainText('6.000.000,00');
  await expect(section.getByText('PKP (dibulatkan ke ribuan)', { exact: true }).locator('..')).toContainText('61.848.000,00');
  await expect(section.getByText('PPh 21 terutang setahun', { exact: true }).locator('..')).toContainText('3.277.200,00');
  await expect(section.getByText('PPh 21 sudah dipotong', { exact: true }).locator('..')).toContainText('2.874.850,00');
  await expect(section.getByText('PPh 21 periode ini', { exact: true }).locator('..')).toContainText('402.350,00');
  await expect(section.getByText('Setahun penuh (tidak disetahunkan)', { exact: true })).toBeVisible();
  await section.getByText('Riwayat tahun ini yang dipakai', { exact: true }).click();
  await expect(section.getByRole('row').filter({ hasText: '2026-11' })).toContainText('Dipotong dari karyawan');
  await expect(section.getByRole('row').filter({ hasText: 'Saldo awal HR' })).toContainText('104.540.000,00');
  await expect(section.getByText(/Tidak dihitung: 2026-06 \(#990/)).toBeVisible();
  await expect(page.getByText('Kategori TER', { exact: true })).toHaveCount(0);
  await section.scrollIntoViewIfNeeded();
  await shot(page, 'desktop-detail-id.png');
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('labels a signed final-period refund as paid to the employee, with no retention option', async ({ page }) => {
  const refund = annual({ settlement: { mode: 'gross_up', period_tax: -313300, tax_allowance: 0, employee_tax: -313300,
    company_tax: 0, iterations: 1, bonus_tax: 0 } });
  const state = await openPayroll(page, { annualTax: refund });
  await page.getByTitle('Lihat Detail').click();
  const section = page.getByTestId('payroll-annual-tax');
  await expect(section.getByText('PPh 21 periode ini (refund kelebihan potong)', { exact: true }).locator('..')).toContainText(/-Rp\s*313\.300,00/);
  await expect(section.getByText('Pengaruh pajak ke karyawan', { exact: true }).locator('..')).toContainText(/-Rp\s*313\.300,00/);
  await expect(section.getByTestId('payroll-annual-refund-note')).toContainText('dikembalikan kepada karyawan');
  await expect(section.getByTestId('payroll-annual-refund-note')).toContainText('DTP');
  await expect(page.getByText(/ditahan perusahaan/i)).toHaveCount(0);
  await expect(page.getByText(/--Rp/)).toHaveCount(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('a monthly TER payroll shows no annual worksheet', async ({ page }) => {
  const state = await openPayroll(page, { annualTax: null });
  await page.getByTitle('Lihat Detail').click();
  await expect(page.getByRole('region', { name: 'Kebijakan dan pembayaran payroll' })).toBeVisible();
  await expect(page.getByTestId('payroll-annual-tax')).toHaveCount(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('renders the annual worksheet in English with the same saved values', async ({ page }) => {
  const state = await openPayroll(page, { language: 'en' });
  await page.getByTitle('View Details').click();
  const section = page.getByTestId('payroll-annual-tax');
  await expect(section.getByRole('heading', { name: 'PPh 21 final tax period (annual)' })).toBeVisible();
  await expect(section.getByText('Annual worksheet', { exact: true })).toBeVisible();
  await expect(section.getByText('PKP (floored to thousands)', { exact: true }).locator('..')).toContainText('61,848,000.00');
  await expect(section.getByText("This period's PPh 21", { exact: true }).locator('..')).toContainText('402,350.00');
  await expect(section.getByText('Full year (not annualized)', { exact: true })).toBeVisible();
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

// Reviewer-inspectable captures (workspace .analysis, outside the app).
const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(process.cwd(), '..', '.analysis', 'annual-final-ui', name), fullPage: true });

// Every money value and every single period ("YYYY-MM") renders on one text
// line: the rendered text's line boxes (Range client rects, merged by line y)
// are counted, not the cell box, which a tall table row would inflate. The
// page itself never scrolls horizontally (the history table scrolls inside).
async function expectNoMoneyWrap(page: Page, scope: string) {
  const report = await page.evaluate(selector => {
    const root = document.querySelector(selector) as HTMLElement | null;
    const lines = (el: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = [...range.getClientRects()].filter(box => box.width > 0 && box.height > 0)
        .map(box => box.top).sort((a, b) => a - b);
      return tops.filter((top, i) => i === 0 || top - tops[i - 1] > 2).length;
    };
    const check = (cls: string) => [...(root?.querySelectorAll<HTMLElement>(cls) ?? [])];
    const amounts = check('.pw-annual-amount');
    const periods = check('.pw-annual-period-item');
    return {
      found: amounts.length,
      periods: periods.length,
      wrapped: [...amounts, ...periods].filter(el => lines(el) !== 1).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  }, scope);
  expect(report.found).toBeGreaterThan(0);
  expect(report.periods).toBeGreaterThan(0);
  expect(report.wrapped).toEqual([]);
  expect(report.pageOverflow).toBeLessThanOrEqual(1);
}

test('keeps annual money and periods on one line without page overflow at 360px (ID)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const state = await openPayroll(page);
  await page.getByTitle('Lihat Detail').click();
  const section = page.getByTestId('payroll-annual-tax');
  await expect(section).toBeVisible();
  await section.getByText('Riwayat tahun ini yang dipakai', { exact: true }).click();
  await expect(section.getByRole('row').filter({ hasText: 'Saldo awal HR' })).toBeVisible();
  await expectNoMoneyWrap(page, '[data-testid="payroll-annual-tax"]');
  await section.scrollIntoViewIfNeeded();
  await shot(page, 'mobile-detail-id-360.png');
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('structured annual recovery inputs fit a 360px screen in English', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const state = await openPayroll(page, { language: 'en' });
  await page.getByRole('button', { name: 'Generate Payroll', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Payroll Preparation' });
  await dialog.getByLabel('Preparation period').fill(period);
  await dialog.getByText('Exceptions for this period', { exact: true }).click();
  // "Karyawan" is registered in English as "Employees" (common catalog), the label the DOM shows.
  const employee = dialog.getByLabel('Employees', { exact: true });
  await expect(employee).toBeEnabled();
  await employee.selectOption('901');
  await dialog.getByLabel('Preparation reason', { exact: true }).fill('Synthetic December review');
  await dialog.getByText('Advanced: PPh 21 final tax period (annual)', { exact: true }).click();
  await dialog.getByLabel('Enter annual PPh 21 decisions or data', { exact: true }).check();
  await expect(dialog.getByLabel('Employment months in the tax year', { exact: true })).toBeVisible();
  await dialog.getByLabel('Opening balance for months not saved in PeopleHub', { exact: true }).check();
  await expect(dialog.getByText('Opening-balance months', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('2026-11', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Add month correction', exact: true }).click();
  await dialog.getByRole('button', { name: 'Add month correction', exact: true }).click();
  const row = dialog.getByRole('group', { name: 'Correction 1' });
  const second = dialog.getByRole('group', { name: 'Correction 2' });
  for (const label of ['Correction month', 'Saved DPP (correction)', 'JHT/JP contributions (correction)', 'PPh 21 withheld (correction)']) {
    await expect(row.getByLabel(label, { exact: true })).toBeVisible();
  }
  // English validation copy on the structured rows; nothing is sent.
  await row.getByLabel('Correction month', { exact: true }).fill('2026-03');
  await dialog.getByRole('button', { name: 'Save & preview', exact: true }).click();
  await expect(row.getByText('Enter at least one correction value, or remove this row.', { exact: true })).toBeVisible();
  await expect(second.getByText('Select the correction month.', { exact: true })).toBeVisible();
  expect(state.saves).toHaveLength(0);
  await second.getByRole('button', { name: 'Remove correction', exact: true }).click();
  await expect(second).toHaveCount(0);
  await row.getByLabel('Saved DPP (correction)', { exact: true }).fill('10454000');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const box = await row.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(361);
  await row.scrollIntoViewIfNeeded();
  await shot(page, 'mobile-preparation-en-360.png');
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('shows the server history error and saves referenced annual recovery inputs', async ({ page }) => {
  const state = await openPayroll(page);
  await page.getByRole('button', { name: 'Buat Payroll', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Persiapan Payroll' });
  await dialog.getByLabel('Periode persiapan').fill(period);
  await dialog.getByText('Pengecualian periode ini', { exact: true }).click();
  await expect(dialog.getByLabel('Karyawan', { exact: true })).toBeEnabled();
  await dialog.getByLabel('Karyawan', { exact: true }).selectOption('901');
  await dialog.getByLabel('Alasan persiapan', { exact: true }).fill('Synthetic December review');
  state.previewError = 'PPh 21 masa pajak terakhir 2026-12: Periode 2026-01, 2026-02 tidak memiliki payroll final; isi saldo awal (opening) dari bukti potong/rekap yang direview, bukan nol';
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('isi saldo awal (opening)');
  state.previewError = null;

  await dialog.getByText('Lanjutan: PPh 21 masa pajak terakhir (tahunan)', { exact: true }).click();
  await dialog.getByLabel('Isi keputusan/data PPh 21 tahunan', { exact: true }).check();
  await dialog.getByLabel('Referensi dokumen pajak', { exact: true }).fill('BUKTI-POTONG-2026');
  await dialog.getByLabel('Status PTKP awal tahun', { exact: true }).selectOption('TK/0');
  await expect(dialog.getByText('Refund gross-up')).toHaveCount(0);
  await dialog.getByLabel('Saldo awal untuk bulan yang tidak tersimpan di PeopleHub', { exact: true }).check();
  // Months are a checklist of the tax year before this period, never typed text.
  await expect(dialog.getByLabel('2026-11', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('2026-12', { exact: true })).toHaveCount(0);
  await dialog.getByLabel('2026-01', { exact: true }).check();
  await dialog.getByLabel('2026-02', { exact: true }).check();
  await dialog.getByLabel('DPP saldo awal', { exact: true }).fill('20908000');
  await dialog.getByLabel('Iuran JHT/JP saldo awal', { exact: true }).fill('600000');
  await dialog.getByLabel('PPh 21 sudah dipotong (saldo awal)', { exact: true }).fill('-1500.5');
  await dialog.getByLabel(/Payroll belum final \(draft\) pada bulan terpilih/).check();
  // Structured, repeatable corrections: an empty row is rejected, a removed row is not sent.
  await dialog.getByRole('button', { name: 'Tambah koreksi bulan', exact: true }).click();
  await dialog.getByRole('button', { name: 'Tambah koreksi bulan', exact: true }).click();
  const first = dialog.getByRole('group', { name: 'Koreksi 1' });
  const second = dialog.getByRole('group', { name: 'Koreksi 2' });
  await first.getByLabel('Bulan koreksi', { exact: true }).fill('2026-03');
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  await expect(first.getByText('Isi minimal satu nilai koreksi, atau hapus baris ini.')).toBeVisible();
  await expect(second.getByText('Pilih bulan koreksi.')).toBeVisible();
  expect(state.saves).toHaveLength(1);

  await first.getByLabel('DPP tersimpan (koreksi)', { exact: true }).fill('10454000');
  await second.getByRole('button', { name: 'Hapus koreksi', exact: true }).click();
  await expect(second).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Simpan & preview', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(2);
  expect(state.saves[1].body).toEqual({ period, input: { reason: 'Synthetic December review', annual_tax: {
    reference: 'BUKTI-POTONG-2026', ptkp_status_start_of_year: 'TK/0',
    opening: { periods: ['2026-01', '2026-02'], gross: 20908000, deductible_contributions: 600000, tax_withheld: -1500.5,
      replaces_unfinalized: true },
    corrections: [{ period: '2026-03', gross: 10454000 }] } } });
  const preview = dialog.getByRole('region', { name: 'Preview payroll', exact: true });
  await expect(preview.getByTestId('payroll-annual-tax')).toBeVisible();
  await expect(preview.getByTestId('payroll-annual-tax').getByText('PPh 21 periode ini', { exact: true }).locator('..')).toContainText('402.350,00');
  expect(state.previews).toBe(2);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});
