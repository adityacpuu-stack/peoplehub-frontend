import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, roles = ['Employee'], options: { noScope?: boolean; hiddenLegacy?: boolean } = {}) {
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const employee = { id: 901, employee_id: 'TEST-901', name: 'Synthetic User', company_id: 3, national_id: 'TEST', profile_completed: true };
  const user = { id: 91, email: 'templates@example.test', employee, roles, permissions: [], accessibleCompanyIds: options.noScope ? [] : [2, 4],
    is_active: true, force_password_change: false, companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true } };
  const templates = Array.from({ length: 21 }, (_, i) => ({ id: 200 + i, company_id: i === 1 ? 1 : i === 2 ? 3 : 2,
    name: `Template uji ${String(i + 1).padStart(2, '0')}`, description: 'Dokumen acuan pengujian lokal.', category: 'form', file_type: 'pdf',
    file_name: 'uji.pdf', file_path: 'https://must-not-request.example.test/private.pdf', file_size: 1234, mime_type: 'application/pdf',
    version: '1.0', is_active: true, download_count: 2, created_at: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T00:00:00Z',
    company: { id: i === 1 ? 1 : i === 2 ? 3 : 2, name: i === 1 ? 'Holding' : i === 2 ? 'Company sendiri' : 'Company tugas' } }));
  const state = { calls: [] as string[], writes: [] as { path: string; body: any }[], unexpected: [] as string[], errors: [] as string[], failList: false, failWrite: false, failDownload: false, failUpload: false };
  await page.addInitScript(({ hiddenLegacy }) => {
    localStorage.setItem('token', 'isolated-templates');
    if (hiddenLegacy) localStorage.setItem('sidebar_role_config', JSON.stringify({ Manager: { '/manager/templates': false } }));
  }, options);
  page.on('pageerror', error => state.errors.push(error.message));
  await page.context().route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === origin && !url.pathname.startsWith('/api/') && !['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
    const path = url.pathname.replace(/^\/api\/v1/, '');
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (url.origin === origin && path === '/audit-logs/events' && req.method() === 'POST') return route.fulfill({ status: 204 });
    state.calls.push(req.method() + ' ' + path + url.search);
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    const fail = () => route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic unavailable' } } });
    if (path === '/auth/me') return json({ user });
    if (path === '/employees/me') return json(employee);
    if (path === '/notifications/unread-count') return json({ unread_count: 0 });
    if (['/notifications/announcement-popups', '/presence', '/leaves/my-approvals', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(path)) return json([]);
    if (path === '/companies') {
      const second = url.searchParams.get('page') === '2';
      return route.fulfill({ json: { success: true, data: second ? [{ id: 4, name: 'Company halaman kedua', code: 'T4' }] : [{ id: 2, name: 'Company tugas', code: 'T2' }, { id: 9, name: 'Company asing', code: 'T9' }], pagination: { page: second ? 2 : 1, limit: 100, total: 3, totalPages: 2 } } });
    }
    if (path === '/templates' && req.method() === 'GET') {
      if (state.failList) return fail();
      const n = Number(url.searchParams.get('page') || 1), term = url.searchParams.get('search') || '';
      const rows = templates.filter(row => row.name.toLowerCase().includes(term.toLowerCase()));
      return route.fulfill({ json: { data: rows.slice((n - 1) * 20, n * 20), pagination: { page: n, limit: 20, total: rows.length, total_pages: Math.ceil(rows.length / 20) } } });
    }
    if (/^\/templates\/\d+\/download-url$/.test(path)) {
      if (state.failDownload) return fail();
      return json({ url: 'https://files.example.test/uji.pdf', filename: 'uji.pdf' });
    }
    if (url.hostname === 'files.example.test') return route.fulfill({ contentType: 'application/pdf', headers: { 'content-disposition': 'attachment; filename="uji.pdf"' }, body: '%PDF-1.4\n%%EOF' });
    if (path === '/upload/templates') {
      if (state.failUpload) return fail();
      return json({ file_path: 'templates/synthetic.pdf', file_name: 'new.pdf', file_size: 8, mime_type: 'application/pdf' });
    }
    if (path.startsWith('/templates') && req.method() !== 'GET') {
      state.writes.push({ path, body: req.postData() ? req.postDataJSON() : null });
      if (state.failWrite) return fail();
      return json({ ...templates[0], id: 299 });
    }
    state.unexpected.push(req.method() + ' ' + req.url()); return route.abort();
  });
  return state;
}
const library = (page: Page) => page.locator('.ph-template-library');
const row = (page: Page, name: string) => library(page).getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });
const ready = async (page: Page) => expect(library(page).getByRole('listitem')).toHaveCount(20);

for (const roles of [['Employee'], ['User'], ['Manager'], ['HR Staff'], ['HR Manager'], ['CEO'], ['Group CEO'], ['Finance Manager'], ['Tax Manager'], ['Tax Staff'], ['Super Admin'], ['Manager', 'HR Staff']]) {
  test('one shared library with correct actions: ' + roles.join(' + '), async ({ page }) => {
    const state = await setup(page, roles);
    await page.goto('/templates'); await ready(page);
    const upload = roles.some(role => ['Super Admin', 'Group CEO', 'HR Manager'].includes(role));
    const edit = upload || roles.includes('HR Staff');
    await expect(page.getByRole('button', { name: 'Unggah templat', exact: true })).toHaveCount(upload ? 1 : 0);
    await expect(row(page, 'Template uji 01').getByRole('button', { name: 'Edit Template uji 01', exact: true })).toHaveCount(edit ? 1 : 0);
    await expect(row(page, 'Template uji 01').getByRole('button', { name: 'Hapus Template uji 01', exact: true })).toHaveCount(upload ? 1 : 0);
    await expect(row(page, 'Template uji 02').getByRole('button', { name: /Edit|Hapus|Duplikasi/ })).toHaveCount(roles.includes('Super Admin') ? 3 : 0);
    await expect(row(page, 'Template uji 03').getByRole('button', { name: /Edit|Hapus|Duplikasi/ })).toHaveCount(roles.includes('Super Admin') ? 3 : 0);
    const nav = page.locator('aside nav');
    while (await nav.locator('button[aria-expanded=false]').count()) await nav.locator('button[aria-expanded=false]').first().click();
    await expect(nav.locator('a[href="/templates"]')).toHaveCount(1);
    await expect(nav.locator('a[href$="/templates"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Buka pencarian', exact: true }).click();
    await page.getByRole('button', { name: 'Halaman', exact: true }).click();
    await page.getByRole('combobox', { name: 'Cari halaman atau karyawan' }).fill('templates');
    await expect(page.getByRole('dialog', { name: 'Cari di PeopleHub' }).getByRole('option')).toHaveCount(1);
    await page.keyboard.press('Escape');
    if (!upload) expect(state.calls.filter(call => call.startsWith('GET /companies'))).toHaveLength(0);
    expect(state.calls.filter(call => call.startsWith('GET /templates?')).every(call => !call.includes('company_id'))).toBe(true);
    expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([]);
  });
}
for (const alias of ['/manager/templates', '/employee/templates', '/resources/templates']) {
  test('legacy URL redirects once and preserves query/hash: ' + alias, async ({ page }) => {
    await setup(page, ['User']);
    await page.goto(alias + '?origin=bookmark#library'); await ready(page);
    await expect(page).toHaveURL(/\/templates\?origin=bookmark#library$/);
    await page.reload(); await ready(page);
    await expect(page.getByRole('heading', { name: 'Templat', exact: true })).toHaveCount(1);
  });
}
test('old hidden-menu configuration remains hidden after route consolidation', async ({ page }) => {
  await setup(page, ['Manager'], { hiddenLegacy: true }); await page.goto('/templates'); await ready(page);
  const nav = page.locator('aside nav');
  while (await nav.locator('button[aria-expanded=false]').count()) await nav.locator('button[aria-expanded=false]').first().click();
  await expect(nav.locator('a[href="/templates"]')).toHaveCount(0);
});
test('HR uploads to an explicitly selected assigned company from later pages and retries without reuploading', async ({ page }) => {
  const state = await setup(page, ['HR Manager']); await page.goto('/templates'); await ready(page);
  await page.getByRole('button', { name: 'Unggah templat', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Unggah templat', exact: true });
  await expect(dialog.getByLabel('Perusahaan pengunggah')).toHaveValue('');
  await expect(dialog.getByLabel('Perusahaan pengunggah').locator('option')).toHaveCount(3);
  await expect(dialog.getByLabel('Perusahaan pengunggah').getByRole('option', { name: 'Company asing' })).toHaveCount(0);
  await dialog.getByLabel('Perusahaan pengunggah').selectOption('4'); await dialog.getByLabel('Nama templat').fill('Template baru');
  await dialog.getByLabel('Berkas templat').setInputFiles({ name: 'new.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDFtest') });
  state.failWrite = true; await dialog.getByRole('button', { name: 'Simpan templat', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic unavailable');
  await expect(dialog.getByLabel('Nama templat')).toHaveValue('Template baru');
  state.failWrite = false; await dialog.getByRole('button', { name: 'Simpan templat', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1].body).toMatchObject({ company_id: 4, name: 'Template baru', file_type: 'pdf', file_path: 'templates/synthetic.pdf' });
  expect(state.calls.filter(call => call === 'POST /upload/templates')).toHaveLength(1);
  expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([]);
});
test('HR Staff edits existing metadata including clearing description with no company/file upload permission', async ({ page }) => {
  const state = await setup(page, ['HR Staff']); await page.goto('/templates'); await ready(page);
  await page.getByRole('button', { name: 'Edit Template uji 01', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit templat', exact: true });
  await expect(dialog.locator('input[type=file]')).toHaveCount(0);
  await dialog.getByLabel('Deskripsi').fill(''); await dialog.getByRole('button', { name: 'Simpan templat' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]).toMatchObject({ path: '/templates/200', body: { description: '' } });
  expect(state.writes[0].body.company_id).toBeUndefined();
});
test('missing operational assignments leaves library readable and management disabled', async ({ page }) => {
  const state = await setup(page, ['HR Manager'], { noScope: true }); await page.goto('/templates'); await ready(page);
  await expect(page.getByRole('button', { name: 'Unggah templat', exact: true })).toBeDisabled();
  await expect(library(page).getByRole('button', { name: /^Edit / })).toHaveCount(0);
  expect(state.calls.some(call => call.startsWith('GET /companies'))).toBe(false);
});
test('pagination, search and load retries use server results; failures do not look empty', async ({ page }) => {
  const state = await setup(page); await page.goto('/templates'); await ready(page);
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(library(page).getByRole('listitem')).toHaveCount(1);
  await page.getByLabel('Cari templat').fill('Template uji 03');
  await expect(row(page, 'Template uji 03')).toBeVisible();
  expect(state.calls.some(call => call.includes('/templates?page=1') && call.includes('search='))).toBe(true);
  state.failList = true; await page.getByLabel('Cari templat').fill('fail');
  await expect(library(page).getByRole('alert')).toBeVisible(); await expect(library(page).getByRole('listitem')).toHaveCount(0);
  state.failList = false; await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(library(page)).toContainText('Tidak ada templat yang sesuai');
});
test('download errors never fall back to an unprotected raw file URL', async ({ page }) => {
  const state = await setup(page); state.failDownload = true;
  await page.goto('/templates'); await ready(page);
  await page.getByRole('button', { name: 'Unduh Template uji 01', exact: true }).click();
  await expect(page.getByText('Synthetic unavailable', { exact: true })).toBeVisible();
  expect(state.calls).toContain('GET /templates/200/download-url');
  expect(state.calls.some(call => call.includes('private.pdf') || call === 'POST /templates/200/download')).toBe(false);
  expect(state.unexpected).toEqual([]);
});
test('a late search response cannot replace the current list', async ({ page }) => {
  await setup(page); await page.goto('/templates'); await ready(page);
  let release!: () => void;
  await page.context().route('**/api/v1/templates?**', async route => {
    if (new URL(route.request().url()).searchParams.get('search') !== 'old') return route.fallback();
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { data: [], pagination: { page: 1, total: 0, limit: 20, total_pages: 0 } } });
  });
  await page.getByLabel('Cari templat').fill('old'); await expect.poll(() => typeof release).toBe('function');
  await page.getByLabel('Cari templat').fill('Template uji 01'); await expect(row(page, 'Template uji 01')).toBeVisible();
  const response = page.waitForResponse(value => new URL(value.url()).searchParams.get('search') === 'old');
  release(); await (await response).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(row(page, 'Template uji 01')).toBeVisible();
});
test('download uses the authorized signed URL and the returned filename', async ({ page }) => {
  const state = await setup(page); await page.goto('/templates'); await ready(page);
  const download = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: 'Unduh Template uji 01', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('uji.pdf');
  expect(state.calls).toContain('GET /templates/200/download-url');
  expect(state.unexpected).toEqual([]);
});
test('shared list and detail are usable on mobile and the modal restores focus', async ({ page }, testInfo) => {
  await setup(page, ['HR Manager']); await page.goto('/templates'); await ready(page);
  await page.screenshot({ path: testInfo.outputPath('templates-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.ph-templates').evaluate(element => element.getBoundingClientRect().left)).toBeLessThan(25);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('templates-mobile.png'), animations: 'disabled' });
  const trigger = page.getByRole('button', { name: 'Lihat detail Template uji 01', exact: true });
  await trigger.click(); await expect(page.getByRole('dialog', { name: 'Detail templat' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Unggah templat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan templat' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('templates-upload-mobile.png') });
});
