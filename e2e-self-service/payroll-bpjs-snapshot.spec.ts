import { test, expect, type Page } from '@playwright/test';

const saved = {
  bpjs_kes_employee: '120000', bpjs_kes_company: '480000',
  bpjs_jkk_company: '24000', bpjs_jkm_company: '30000',
  bpjs_jht_employee: '200000', bpjs_jht_company: '370000',
  bpjs_jp_employee: '123456.75', bpjs_jp_company: '246913.50',
};
const pages = [
  { path: '/tax/bpjs-kesehatan', title: 'BPJS Kesehatan', file: 'bpjs-kesehatan',
    fields: ['bpjs_kes_employee', 'bpjs_kes_company'],
    cash: [120000, 480000, 600000] },
  { path: '/tax/bpjs-ketenagakerjaan', title: 'BPJS Ketenagakerjaan', file: 'bpjs-ketenagakerjaan',
    fields: ['bpjs_jkk_company', 'bpjs_jkm_company', 'bpjs_jht_employee', 'bpjs_jht_company', 'bpjs_jp_employee', 'bpjs_jp_company'],
    cash: [24000, 30000, 200000, 370000, 123456.75, 246913.5, 323456.75, 670913.5, 994370.25] },
] as const;

function payroll(id = 701): Record<string, unknown> {
  return {
    id, payroll_number: `SYNTHETIC-${id}`, employee_id: id, company_id: 2, period: '2025-01', status: 'approved',
    basic_salary: '1000000', is_prorated: true, actual_working_days: 2, working_days: 26,
    employee: { id, employee_id: `TEST-${id}`, name: `Synthetic BPJS ${id}`, company: { name: 'Synthetic Company' } },
    ...saved,
    metadata: { calculation: { version: 2, policy: { tax_allowance_mode: 'fixed', bpjs_paid_by_company: true, rounding: 'final_cent' },
      input: { external_bpjs: { reference: 'Synthetic HR override' } } } },
  };
}

// Same isolated session/routing pattern as the existing self-service fixtures.
// GET responses and the layout's presence beacon are mocked; unknown requests abort.
async function mockSession(page: Page, rows: Record<string, unknown>[]) {
  const user = { id: 91, email: 'bpjs-test@example.test', roles: ['Super Admin'], permissions: [],
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee: null };
  const state = { rows, fail: false, unexpected: [] as string[], errors: [] as string[], calls: [] as string[] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-bpjs-snapshot-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && !['xhr', 'fetch'].includes(request.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.hostname === 'ui-avatars.com' && request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    state.calls.push(`${request.method()} ${endpoint}`);
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && endpoint === '/presence' && request.method() === 'POST') {
      return route.fulfill({ json: { success: true, data: {} } });
    }
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (url.origin === (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') && endpoint === '/audit-logs/events' && request.method() === 'POST') {
      return route.fulfill({ status: 204 });
    }
    if (url.origin !== (process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177') || request.method() !== 'GET') {
      state.unexpected.push(`${request.method()} ${url.href}`);
      return route.abort();
    }
    let data: unknown;
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications/announcement-popups', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences'].includes(endpoint)) data = {};
    else if (['/payroll', '/companies'].includes(endpoint)) {
      if (endpoint === '/payroll' && state.fail) return route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic payroll unavailable' } } });
      data = endpoint === '/payroll' ? state.rows : [{ id: 2, name: 'Synthetic Company', code: 'TEST' }];
      return route.fulfill({ json: { success: true, data, pagination: { page: 1, limit: 1000, total: (data as unknown[]).length, totalPages: 1 } } });
    } else {
      state.unexpected.push(`${request.method()} ${endpoint}`);
      return route.abort();
    }
    return route.fulfill({ json: { success: true, data } });
  });
  return state;
}

async function csv(page: Page, file: string) {
  const downloaded = page.waitForEvent('download');
  // Indonesian UI (the fixture user has no account language): the Export button reads "Ekspor".
  await page.getByRole('button', { name: 'Ekspor', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe(`${file}-2025-01.csv`);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '').split('\r\n')
    .map(line => line.slice(1, -1).split('","'));
}

for (const config of pages) {
  test(`${config.title}: stored contributions drive table, detail, totals and CSV despite prorated salary`, async ({ page }) => {
    const zero = payroll(702);
    Object.keys(saved).forEach((field, index) => { zero[field] = index % 2 ? '0' : 0; });
    const state = await mockSession(page, [payroll(), zero]);
    await page.goto(config.path);
    const row = page.getByRole('row').filter({ hasText: 'Synthetic BPJS 701' });
    const zeroRow = page.getByRole('row').filter({ hasText: 'Synthetic BPJS 702' });
    await expect(row).toBeVisible();
    if (config.file === 'bpjs-kesehatan') {
      await expect(row.getByRole('cell').nth(2)).toContainText('1.000.000');
      await expect(row.getByRole('cell').nth(3)).toHaveText(/Rp\s*120\.000/);
      await expect(row.getByRole('cell').nth(4)).toHaveText(/Rp\s*480\.000/);
      await expect(zeroRow.getByRole('cell').nth(3)).toHaveText(/Rp\s*0/);
      await expect(zeroRow.getByRole('cell').nth(4)).toHaveText(/Rp\s*0/);
      await expect(page.getByText('Total Iuran', { exact: true }).locator('..')).toContainText('600.000');
    } else {
      await expect(row.getByRole('cell').nth(4)).toHaveText(/Rp\s*370\.370,25/);
      await expect(row.getByRole('cell').nth(5)).toHaveText(/Rp\s*994\.370,25/);
      for (const column of [2, 3, 4, 5]) await expect(zeroRow.getByRole('cell').nth(column)).toHaveText(/Rp\s*0/);
    }
    const rows = await csv(page, config.file);
    expect(rows).toHaveLength(3);
    expect(rows[1].slice(0, 3)).toEqual(['SYNTHETIC-701', 'TEST-701', 'Synthetic BPJS 701']);
    expect(rows[1].slice(3).map(Number)).toEqual(config.cash);
    expect(rows[2].slice(3).map(Number)).toEqual(config.cash.map(() => 0));
    await page.getByRole('button', { name: 'Detail BPJS Synthetic BPJS 701', exact: true }).click();
    const heading = page.getByRole('heading', { name: `Detail ${config.title}`, exact: true });
    await expect(heading).toBeVisible();
    const modal = page.getByRole('dialog').filter({ has: heading });
    await expect(modal.getByRole('heading', { name: 'Synthetic BPJS 701', exact: true })).toBeVisible();
    await expect(modal).toContainText('TEST-701');
    await expect(modal).toContainText(config.file === 'bpjs-kesehatan' ? '120.000' : '123.456,75');
    await expect(modal).toContainText(config.file === 'bpjs-kesehatan' ? '480.000' : '246.913,5');
    await expect(modal).not.toContainText(/max 1[02]jt|\([1-5](?:\.7)?%\)/);
    expect(state.calls).not.toContain('GET /payroll-settings/rates');
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
  });

  for (const [index, field] of config.fields.entries()) {
    test(`${config.title}: refuses ${field} ${index % 2 ? 'null' : 'missing'} rather than exporting zero`, async ({ page }) => {
      const record = payroll();
      if (index % 2) record[field] = null;
      else delete record[field];
      const state = await mockSession(page, [record]);
      await page.goto(config.path);
      await expect(page.getByRole('alert')).toContainText(`Nilai payroll tersimpan tidak tersedia atau tidak valid (${field})`);
      await expect(page.getByRole('button', { name: 'Ekspor', exact: true })).toHaveCount(0);
      await expect(page.getByRole('table')).toHaveCount(0);
      expect(state.unexpected).toEqual([]);
      expect(state.errors).toEqual([]);
    });
  }

  test(`${config.title}: rejects invalid numbers and recovers using saved data on retry`, async ({ page }) => {
    const record = payroll();
    record[config.fields[0]] = 'invalid';
    const state = await mockSession(page, [record]);
    await page.goto(config.path);
    await expect(page.getByRole('alert')).toContainText('tidak valid');
    state.rows = [payroll()];
    await page.getByRole('button', { name: 'Coba lagi' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Synthetic BPJS 701' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect((await csv(page, config.file))[1].slice(3).map(Number)).toEqual(config.cash);
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}
