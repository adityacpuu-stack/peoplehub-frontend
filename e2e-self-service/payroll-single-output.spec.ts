import { test, expect, type Page } from '@playwright/test';

// Synthetic saved payroll rows only. Each row carries the backend's saved read
// presentation (backend payroll-read-presentation.ts) exactly as list (earnings
// null) and detail (earnings included) return it. Pages must render it: no
// calculation endpoint, no write, nothing rebuilt from net + tax + BPJS.
const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
const company = { id: 2, name: 'Synthetic Company', code: 'TEST' };
const person = (id: number, name: string) => ({ id, employee_id: `TEST-${id}`, name, company_id: 2,
  employment_type: 'permanent', employment_status: 'active', profile_completed: true,
  national_id: `0000000000000${id}`, email: `staff${id}@example.test`, company,
  department: { id: 1, name: 'Synthetic Department' }, position: { id: 1, name: 'Synthetic Role' } });

type Bearer = 'company' | 'employee' | 'unknown';
type Row = Record<string, any>;

// Legacy rows: total_gross 10,000,000, system deductions 100,000, PPh21 300,000,
// employee BPJS 200,000, DPP 10,500,000. Company-borne THP 9,900,000; employee-borne 9,400,000.
function legacyRow(id: number, name: string, bearer: Bearer, extra: Row = {}, presentationExtra: Row = {}): Row {
  const company = bearer === 'company';
  const employee = bearer === 'employee';
  const thp = employee ? 9400000 : 9900000;
  const pph21 = extra.pph21 !== undefined ? Number(extra.pph21) : 300000;
  const tax = company ? pph21 : employee ? 0 : null;
  const positionTotal = Number(extra.position_allowance ?? (company ? 1000000 + pph21 : 1000000));
  const cost = extra.total_cost_to_company !== undefined ? extra.total_cost_to_company : '7000000';
  const presentation = {
    version: 1, basis: bearer === 'unknown' ? 'unrecorded' : 'saved_result',
    take_home_pay: thp, company_cost: cost === null ? null : Number(cost), taxable_base: 10500000,
    funding: bearer === 'unknown' ? { pph21: null, tax_allowance_mode: null, bpjs_employee: null }
      : { pph21: company ? 'company_paid' : 'withheld', tax_allowance_mode: company ? 'gross_up' : 'none', bpjs_employee: bearer },
    position: { total: positionTotal, business: tax === null ? null : positionTotal - tax, tax_allowance: tax },
    earnings: null,
    deductions: bearer === 'unknown' ? { pph21: null, bpjs_employee: null, system: 100000, total: null }
      : { pph21: company ? 0 : pph21, bpjs_employee: company ? 0 : 200000, system: 100000, total: company ? 100000 : pph21 + 300000 },
    company_borne: { pph21: company ? pph21 : employee ? 0 : null, bpjs_employee: company ? 200000 : employee ? 0 : null, bpjs_company: 500000 },
    ...presentationExtra,
  };
  return {
    id, employee_id: id, company_id: 2, employee: person(id, name), status: 'draft', period: '2026-10',
    payroll_number: `SAVED-${id}`, pay_type: 'gross', basic_salary: '9000000', position_allowance: String(positionTotal),
    total_gross: '10000000', gross_salary: '10500000', final_gross_up: '10500000', gross_up_initial: '10400000',
    total_deductions: '100000', loan_deduction: '100000', pph21: String(pph21), ter_rate: '0.03', ter_category: 'B',
    bpjs_kes_employee: '20000', bpjs_jht_employee: '120000', bpjs_jp_employee: '60000', bpjs_employee_total: '200000',
    bpjs_company_total: '500000', net_salary: String(thp), take_home_pay: String(thp), thp: String(thp),
    total_cost_company: cost, total_cost_to_company: cost, metadata: null, ...extra, presentation,
  };
}

/** Detail responses add the saved earning lines; list rows keep earnings null. */
function asDetail(row: Row): Row {
  const p = row.presentation;
  const items = [['basic_salary', 9000000], [p.position.business === null ? 'position_allowance_unsplit' : 'position_allowance',
    p.position.business ?? p.position.total], ['transport_allowance', 0], ['meal_allowance', 0], ['overtime_pay', 0],
  ['other_allowances', 0], ['thr', 0], ['bonus', 0]].map(([key, amount]) => ({ key, amount }));
  return { ...row, presentation: { ...p, earnings: { items, total: 10000000, unreconciled: 0 } } };
}

async function setup(page: Page, rows: Row[], path: string) {
  const self = person(990, 'Synthetic Finance');
  const user = { id: 91, email: 'finance@example.test', language: 'id', roles: ['Finance Manager'], permissions: [],
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee: self,
    companyFeatures: { payroll_enabled: true, attendance_enabled: true, leave_enabled: true, performance_enabled: true } };
  const state = { unexpected: [] as string[], errors: [] as string[], detailReads: [] as number[], listPages: [] as string[] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.clear(); localStorage.setItem('token', 'isolated-single-output');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin && !['xhr', 'fetch'].includes(request.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    if (['/presence', '/audit-logs/events'].includes(endpoint) && request.method() === 'POST') return route.fulfill({ status: 204 });
    if (url.origin !== origin || request.method() !== 'GET') {
      state.unexpected.push(`${request.method()} ${url.href}`); return route.abort();
    }
    let data: unknown;
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/employees/me') data = self;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (endpoint === '/dashboard/group') data = { summary: { total_employees: rows.length, total_companies: 1 }, companies: [] };
    else if (endpoint === '/companies') {
      return route.fulfill({ json: { success: true, data: [company], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } } });
    } else if (endpoint === '/payroll') {
      // Real paging: the page must request every page instead of one big limit.
      const pageNo = Number(url.searchParams.get('page') || 1);
      const limit = Number(url.searchParams.get('limit') || 10);
      state.listPages.push(`${pageNo}/${limit}`);
      return route.fulfill({ json: { success: true, data: rows.slice((pageNo - 1) * limit, pageNo * limit),
        pagination: { page: pageNo, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } } });
    } else {
      const detail = /^\/payroll\/(\d+)$/.exec(endpoint);
      const row = detail && rows.find(r => r.id === Number(detail[1]));
      if (!row) { state.unexpected.push(`GET ${endpoint}`); return route.abort(); }
      state.detailReads.push(row.id);
      data = asDetail(row);
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto(path);
  return state;
}

test('financial overview sums saved cost and saved THP, reporting missing rows instead of rebuilding them', async ({ page }) => {
  const rows = [
    legacyRow(801, 'Saved Cost Staff', 'company', { total_cost_company: '4500000', total_cost_to_company: '4500000' }),
    legacyRow(802, 'Other Saved Cost Staff', 'employee', { total_cost_company: '7500000', total_cost_to_company: '7500000' }),
    legacyRow(803, 'Unsaved Staff', 'company', { total_cost_company: null, total_cost_to_company: null,
      take_home_pay: null, thp: null, net_salary: '9900000' }, { take_home_pay: null }),
  ];
  const state = await setup(page, rows, '/ceo/financial-overview');
  const card = page.getByTestId('financial-total-cost');
  // Saved 4.5M + 7.5M = 12M. Net + PPh21 + both BPJS over the three rows would be ~32M.
  await expect(card).toContainText(/Rp\s*12\D/);
  await expect(card).not.toContainText(/Rp\s*3\d/);
  await expect(card).toContainText('1 payroll tanpa biaya perusahaan tersimpan tidak dijumlahkan');
  await expect(page.getByText(/^- % dari total$/)).toHaveCount(3);
  // Saved THP 9.9M + 9.4M; the third row's net_salary is NOT a payout fallback.
  await expect(page.getByTestId('financial-total-thp')).toHaveText(/Rp\s*19jt/);
  await expect(page.getByText('1 payroll tanpa THP tersimpan tidak dijumlahkan')).toBeVisible();
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('financial overview keeps a saved zero cost and shows shares only for a complete saved cost', async ({ page }) => {
  const rows = [legacyRow(801, 'Zero Cost Staff', 'company', { total_cost_company: '0', total_cost_to_company: '0' }),
    legacyRow(802, 'Saved Cost Staff', 'employee', { total_cost_company: '20000000', total_cost_to_company: '20000000' })];
  const state = await setup(page, rows, '/ceo/financial-overview');
  const card = page.getByTestId('financial-total-cost');
  await expect(card).toContainText(/Rp\s*20\D/);
  await expect(card).toContainText('Biaya perusahaan payroll tersimpan');
  // PPh21 600,000 of the saved 20,000,000 cost.
  await expect(page.getByText(/^3,0 % dari total$/)).toHaveCount(1);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('payroll detail renders the backend funding and Position split for a zero-tax gross-up row', async ({ page }) => {
  const row = legacyRow(801, 'Zero Tax Gross Up Staff', 'company',
    { pph21: '0', pph21_paid_by_company: false, total_cost_company: null, total_cost_to_company: null });
  const state = await setup(page, [row], '/payroll');
  await page.getByTitle('Lihat Detail').click();
  const detail = page.getByRole('dialog', { name: 'Detail payroll' });
  await expect(detail.getByRole('heading', { name: 'Zero Tax Gross Up Staff', exact: true })).toBeVisible();
  await expect(detail.getByTestId('payroll-detail-company-cost')).toHaveText('-');
  // The raw flag is false; the backend presentation says the company covered BPJS.
  await expect(detail.getByText('BPJS Kesehatan (1%)', { exact: true }).locator('..')).toContainText('Ditanggung Perusahaan');
  await expect(detail.getByTestId('payroll-position-business')).toContainText(/1[.]000[.]000/);
  await expect(detail.getByTestId('payroll-position-combined')).toHaveCount(0);
  await expect(detail.getByRole('region', { name: 'Ringkasan payroll' })).toContainText(/9[.]900[.]000/);
  expect(state.detailReads).toEqual([801]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('new-gross detail totals withheld tax, BPJS and a small saved system deduction from the presentation', async ({ page }) => {
  // Raw total_deductions (5,000) is system deductions only; the old card showed
  // it as the total and the old gate hid it because 5,000 < PPh21 + BPJS.
  const row = legacyRow(801, 'New Gross Staff', 'employee',
    { total_deductions: '5000', absence_deduction: '5000', loan_deduction: '0', take_home_pay: '9495000', thp: '9495000' },
    { take_home_pay: 9495000, deductions: { pph21: 300000, bpjs_employee: 200000, system: 5000, total: 505000 } });
  const state = await setup(page, [row], '/payroll');
  await page.getByTitle('Lihat Detail').click();
  const detail = page.getByRole('dialog', { name: 'Detail payroll' });
  await expect(detail.getByTestId('payroll-detail-total-deductions')).toHaveText(/505[.]000/);
  await expect(detail.getByTestId('payroll-system-deductions')).toContainText('Potongan sistem');
  await expect(detail.getByTestId('payroll-system-deductions')).toContainText(/Potongan Absen.*5[.]000/);
  await expect(detail.getByTestId('payroll-system-deductions-total')).toHaveText(/-Rp\s*5[.]000/);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('payroll detail keeps unrecorded funding unknown: no deduction, no Position split', async ({ page }) => {
  const row = legacyRow(801, 'Unrecorded Staff', 'unknown', { pph21_paid_by_company: null, position_allowance: '1300000' });
  const state = await setup(page, [row], '/payroll');
  await page.getByTitle('Lihat Detail').click();
  const detail = page.getByRole('dialog', { name: 'Detail payroll' });
  await expect(detail.getByTestId('payroll-funding-unrecorded')).toBeVisible();
  await expect(detail.getByTestId('payroll-pph21-unrecorded')).toHaveText('-');
  await expect(detail.getByTestId('payroll-position-combined')).toContainText(/1[.]300[.]000/);
  await expect(detail.getByTestId('payroll-position-tax')).toHaveCount(0);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('v2 payroll detail splits saved Position from the presentation', async ({ page }) => {
  const row = legacyRow(801, 'Snapshot Staff', 'company', {
    position_allowance: '1250000', pph21: '250000',
    metadata: { calculation: {
      version: 2, policy: { tax_allowance_mode: 'fixed', bpjs_paid_by_company: true, rounding: 'final_cent' },
      input: { reason: 'Synthetic saved decision' }, calculated_pph21: '250000', tax_allowance: '250000',
      tax_source: 'calculated', rounding_adjustment: 0, bpjs_base: '9000000',
      payments: { regular: '9900000', bonus: '0', total: '9900000', held: false },
    } },
  }, { basis: 'calculation_v2', position: { total: 1250000, business: 1000000, tax_allowance: 250000 } });
  const state = await setup(page, [row], '/payroll');
  await page.getByTitle('Lihat Detail').click();
  const detail = page.getByRole('dialog', { name: 'Detail payroll' });
  await expect(detail.getByTestId('payroll-position-business')).toHaveText(/Tunjangan Jabatan\+Rp\s*1[.]000[.]000,00/);
  await expect(detail.getByTestId('payroll-position-tax')).toHaveText(/Tunjangan pajak\+Rp\s*250[.]000,00/);
  await expect(detail.getByTestId('payroll-position-combined')).toHaveCount(0);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('payroll list summary counts rows without a saved THP instead of using net_salary', async ({ page }) => {
  const rows = [legacyRow(801, 'Saved Staff', 'company'),
    legacyRow(802, 'Missing Staff', 'employee', { take_home_pay: null, thp: null, net_salary: '9999999' }, { take_home_pay: null })];
  const state = await setup(page, rows, '/payroll');
  const summary = page.getByTestId('payroll-summary-thp');
  await expect(summary).toContainText(/9[.]900[.]000/);
  await expect(summary).not.toContainText(/19[.]899[.]999|9[.]999[.]999/);
  await expect(summary).toContainText('1 payroll tanpa THP tersimpan tidak dijumlahkan');
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('report payslip loads the saved detail and shows its earnings, DPP, deductions and contributions', async ({ page }) => {
  const rows = [legacyRow(801, 'Alpha Gross Up Staff', 'company'), legacyRow(802, 'Beta Pure Gross Staff', 'employee')];
  const state = await setup(page, rows, '/ceo/payroll-report');
  await page.getByRole('row').filter({ hasText: 'Alpha Gross Up Staff' }).getByRole('button').click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('payslip-earning-basic_salary')).toContainText(/9[.]000[.]000/);
  await expect(dialog.getByTestId('payslip-earning-position_allowance')).toContainText(/1[.]000[.]000/);
  // Saved zero allowances are not shown as fabricated lines.
  await expect(dialog.getByTestId('payslip-earning-transport_allowance')).toHaveCount(0);
  await expect(dialog.getByTestId('payslip-earnings-total')).toHaveText(/10[.]000[.]000/);
  // DPP is labelled as the tax base, separate from cash earnings.
  await expect(dialog.getByTestId('payslip-taxable-base')).toContainText(/DPP.*10[.]500[.]000/);
  await expect(dialog.getByTestId('payslip-deduction-pph21')).toHaveCount(0);
  await expect(dialog.getByTestId('payslip-deduction-bpjs')).toHaveCount(0);
  await expect(dialog.getByTestId('payslip-deduction-total')).toHaveText(/-Rp\s*100[.]000/);
  await expect(dialog.getByTestId('payslip-company-pph21')).toContainText(/300[.]000/);
  await expect(dialog.getByTestId('payslip-company-bpjs')).toContainText(/200[.]000/);
  await expect(dialog.getByTestId('payslip-thp')).toHaveText(/9[.]900[.]000/);
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('row').filter({ hasText: 'Beta Pure Gross Staff' }).getByRole('button').click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('payslip-deduction-pph21')).toContainText(/300[.]000/);
  await expect(dialog.getByTestId('payslip-deduction-bpjs')).toContainText(/200[.]000/);
  await expect(dialog.getByTestId('payslip-deduction-total')).toHaveText(/-Rp\s*600[.]000/);
  await expect(dialog.getByTestId('payslip-company-pph21')).toHaveCount(0);
  await expect(dialog.getByTestId('payslip-thp')).toHaveText(/9[.]400[.]000/);
  expect(state.detailReads).toEqual([801, 802]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('payroll report reads every page of a large period instead of one truncated request', async ({ page }) => {
  const rows = Array.from({ length: 150 }, (_, i) => legacyRow(1000 + i, `Paged Staff ${String(i).padStart(3, '0')}`, 'company'));
  const state = await setup(page, rows, '/ceo/payroll-report');
  await expect(page.getByText(/Menampilkan\s+150\s+dari\s+150/)).toBeVisible();
  expect([...new Set(state.listPages)].sort()).toEqual(['1/100', '2/100']);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});
