import { test, expect, type Page, type Request } from '@playwright/test';

// Leave supporting documents: self-service submission, and authorized download
// for the owner, approvers and read-only P&C monitoring. Synthetic data only; every API and
// storage request is intercepted and anything unknown is aborted.
const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
const STORAGE = 'https://storage.example.test';
const year = new Date().getFullYear();
const day = `${year}-10-15`;
const PDF = Buffer.from('%PDF-1.4\n% synthetic certificate\n%%EOF\n');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const employee = {
  id: 901, employee_id: 'TEST-901', name: 'Synthetic Staff', company_id: 2, department_id: 10, position_id: 20,
  employment_status: 'active', profile_completed: true, national_id: '0000000000000901',
  leaveApprover: { id: 800, name: 'Synthetic Approver' },
};
const annual = { id: 71, company_id: null, name: 'Annual Leave', code: 'AL', default_days: 12, min_days_per_request: '1', max_days_per_request: 12, is_paid: true, is_active: true, requires_document: false };
const sick = { id: 72, company_id: null, name: 'Sick Leave', code: 'SL', default_days: 14, min_days_per_request: '1', max_days_per_request: 14, is_paid: true, is_active: true, requires_document: true };
const bereavement = { id: 73, company_id: null, name: 'Bereavement Leave', code: 'BL', default_days: 3, min_days_per_request: '1', max_days_per_request: 3, is_paid: true, is_active: true, requires_document: true };
const leaveRow = (id: number, extra: Record<string, unknown> = {}) => ({
  id, employee_id: 901, leave_type_id: 72, start_date: `${day}T00:00:00.000Z`, end_date: `${day}T00:00:00.000Z`,
  total_days: '1', status: 'pending', reason: 'Synthetic fever', has_document: true, can_approve: true,
  created_at: `${day}T08:00:00.000Z`, leaveType: { id: 72, name: 'Sick Leave', code: 'SL', is_paid: true, requires_document: true },
  employee: { id: 901, name: 'Synthetic Staff', employee_id: 'TEST-901', department: { id: 10, name: 'Operations' } }, ...extra,
});

type Options = { roles?: string[]; language?: 'id' | 'en'; rows?: Record<string, unknown>[] };
async function mockSession(page: Page, options: Options = {}) {
  const roles = options.roles ?? ['Employee'];
  const user = { id: 91, email: 'synthetic@example.test', is_active: true, force_password_change: false, roles, permissions: [],
    accessibleCompanyIds: [2], language: options.language ?? 'id', employee,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
  const state = {
    posts: [] as Array<{ path: string; contentType: string; body: string }>,
    documentReads: [] as number[], downloads: 0, unexpected: [] as string[], errors: [] as string[],
    submitFailures: [] as Array<{ status: number; code: string; message: string }>,
    documentStatus: new Map<number, number>(),
  };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-leave-document-test');
    localStorage.setItem('sidebar-storage', JSON.stringify({ state: { isOpen: false, isCollapsed: false }, version: 0 }));
  });
  const json = (data: unknown, extra: Record<string, unknown> = {}) => ({ json: { success: true, data, ...extra } });
  await page.route('**/*', async route => {
    const req: Request = route.request();
    const url = new URL(req.url());
    if (url.origin === STORAGE) {
      // The signed, short-lived forced-download link (synthetic storage).
      state.downloads++;
      return route.fulfill({ status: 200, body: PDF, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="certificate.pdf"' } });
    }
    if (url.hostname === 'ui-avatars.com') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    if (url.origin === origin && !['xhr', 'fetch'].includes(req.resourceType()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (url.origin !== origin || !url.pathname.startsWith('/api/v1/')) { state.unexpected.push(`${req.method()} ${url.href}`); return route.abort(); }
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = req.method();
    if (method === 'POST' && path === '/audit-logs/events') return route.fulfill({ status: 204 });
    if (path === '/auth/me') return route.fulfill(json({ user }));
    if (path === '/employees/me') return route.fulfill(json(employee));
    if (path === '/notifications/unread-count') return route.fulfill(json({ unread_count: 0 }));
    if (['/notifications/announcement-popups', '/overtime/pending-approvals'].includes(path)) return route.fulfill(json([]));
    if (['/presence', '/users/me/preferences'].includes(path)) return route.fulfill(json({}));
    if (path === '/leaves/me/types') return route.fulfill(json([annual, sick, bereavement]));
    if (path === '/leaves/me/balances') return route.fulfill(json([]));
    if (path === '/leaves/me') return route.fulfill(json(options.rows ?? [], { pagination: { page: 1, limit: 10, total: (options.rows ?? []).length, totalPages: 1 } }));
    if (['/leaves/my-approvals', '/leaves/pending-approvals'].includes(path)) return route.fulfill(json(options.rows ?? []));
    if (path === '/leaves' && method === 'GET') return route.fulfill(json(options.rows ?? [], { pagination: { page: 1, limit: 10, total: (options.rows ?? []).length, totalPages: 1 } }));
    if (path === '/leaves/types') return route.fulfill(json([annual, sick, bereavement], { pagination: { page: 1, limit: 100, total: 3, totalPages: 1 } }));
    if (path === '/companies') return route.fulfill(json([{ id: 2, name: 'Synthetic Company', code: 'SYN', status: 'active', company_type: 'subsidiary' }], { pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } }));
    if (path === '/employees') return route.fulfill({ json: { success: true, data: [{ ...employee, company_id: Number(url.searchParams.get('company_id')) }], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } } });
    const documentMatch = path.match(/^\/leaves\/(\d+)\/document$/);
    if (documentMatch && method === 'GET') {
      const id = Number(documentMatch[1]);
      state.documentReads.push(id);
      const status = state.documentStatus.get(id) ?? 200;
      if (status !== 200) return route.fulfill({ status, json: { success: false, error: { message: 'Synthetic denial', code: status === 403 ? 'FORBIDDEN' : 'LEAVE_DOCUMENT_UNAVAILABLE' } } });
      return route.fulfill(json({ url: `${STORAGE}/signed/leave-${id}?X-Amz-Expires=60`, expires_in: 60, file_name: 'certificate.pdf' }));
    }
    if (method === 'POST' && (path === '/leaves' || path === '/leaves/employee')) {
      const contentType = req.headers()['content-type'] ?? '';
      state.posts.push({ path, contentType, body: (req.postDataBuffer() ?? Buffer.alloc(0)).toString('latin1') });
      const failure = state.submitFailures.shift();
      // status 0 = the request never reaches the server (network failure).
      if (failure?.status === 0) return route.abort('failed');
      if (failure) return route.fulfill({ status: failure.status, json: { success: false, error: { message: failure.message, code: failure.code } } });
      return route.fulfill({ status: 201, json: { success: true, data: { ...leaveRow(601), has_document: contentType.includes('multipart') } } });
    }
    state.unexpected.push(`${method} ${path}`);
    return route.abort();
  });
  return state;
}

const openRequestForm = async (page: Page, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
  return page.locator('#leave-request-form');
};
const fillDates = async (form: ReturnType<Page['locator']>) => {
  await form.locator('input[type=date]').nth(0).fill(day);
  await form.locator('input[type=date]').nth(1).fill(day);
};

for (const language of ['id', 'en'] as const) {
  test(`visible upload button opens the chooser; replace and remove work (${language})`, async ({ page }) => {
    const state = await mockSession(page, { language });
    await page.goto('/my-leave');
    const form = await openRequestForm(page, language === 'id' ? 'Ajukan Cuti' : 'Request Leave');
    await form.locator('select').first().selectOption('72');
    const field = form.getByTestId('leave-document-field');
    const choose = field.getByRole('button', { name: language === 'id' ? 'Pilih surat dokter' : "Choose doctor's certificate", exact: true });
    await choose.scrollIntoViewIfNeeded();
    await expect(choose).toBeVisible();
    expect((await choose.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await choose.focus();
    await expect(choose).toBeFocused();
    await page.screenshot({ path: `../.analysis/leave-document-ui/desktop-upload-empty-${language}.png` });
    const picker = page.waitForEvent('filechooser');
    await choose.press('Enter');
    await (await picker).setFiles({ name: 'surat-dokter.pdf', mimeType: 'application/pdf', buffer: PDF });
    await expect(field.getByText('surat-dokter.pdf', { exact: true })).toBeVisible();
    const replacement = page.waitForEvent('filechooser');
    await field.getByRole('button', { name: language === 'id' ? 'Ganti' : 'Change file', exact: true }).click();
    await (await replacement).setFiles({ name: 'surat-baru.png', mimeType: 'image/png', buffer: PNG });
    await expect(field.getByText('surat-baru.png', { exact: true })).toBeVisible();
    await expect(field.getByText('surat-dokter.pdf', { exact: true })).toHaveCount(0);
    await field.getByRole('button', { name: language === 'id' ? 'Hapus surat-baru.png' : 'Remove surat-baru.png', exact: true }).click();
    await expect(choose).toBeVisible();
    expect(state.posts).toHaveLength(0);
    expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
  });
}

test('self-service sick leave requires one valid certificate, keeps it on failure and clears it on success (ID)', async ({ page }) => {
  const state = await mockSession(page);
  await page.goto('/my-leave');
  const form = await openRequestForm(page, 'Ajukan Cuti');
  await form.locator('select').first().selectOption('72');
  await fillDates(form);
  const field = form.getByTestId('leave-document-field');
  await expect(field.getByText('Surat keterangan dokter')).toBeVisible();
  await expect(field.getByText('(wajib)')).toBeVisible();

  // Required: nothing is sent without a file.
  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
  await expect(field.getByRole('alert')).toHaveText('Lampirkan surat keterangan dokter sebelum mengirim.');
  expect(state.posts).toHaveLength(0);

  // Wrong type is refused on the client and not kept.
  const input = field.locator('input[type=file]');
  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic') });
  await expect(field.getByRole('alert')).toHaveText('Gunakan file PDF, JPG, JPEG, atau PNG.');
  await expect(field.getByRole('group', { name: 'File terpilih' })).toHaveCount(0);
  await input.setInputFiles({ name: 'large.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]) });
  await expect(field.getByRole('alert')).toHaveText('Ukuran file lebih dari 5 MB.');

  // A wrong original replaced by an invalid file is discarded, never sent silently.
  await input.setInputFiles({ name: 'wrong-original.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(field.getByRole('group', { name: 'File terpilih' })).toContainText('wrong-original.pdf');
  await input.setInputFiles({ name: 'replacement.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]) });
  await expect(field.getByRole('alert')).toHaveText('Ukuran file lebih dari 5 MB.');
  await expect(field.getByRole('group', { name: 'File terpilih' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
  await expect(field.getByRole('alert')).toHaveText('Lampirkan surat keterangan dokter sebelum mengirim.');
  expect(state.posts).toHaveLength(0);

  await input.setInputFiles({ name: 'surat-dokter.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(field.getByRole('group', { name: 'File terpilih' })).toContainText('surat-dokter.pdf');
  await field.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../.analysis/leave-document-ui/desktop-form-selected-file-id.png' });

  // A network failure keeps the form and the file for a retry.
  state.submitFailures.push({ status: 0, code: '', message: '' });
  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kirim Pengajuan', exact: true })).toBeEnabled();
  await expect(field.getByRole('group', { name: 'File terpilih' })).toContainText('surat-dokter.pdf');
  await expect(form).toBeVisible();

  // A storage failure keeps the form and the file for a retry.
  state.submitFailures.push({ status: 503, code: 'LEAVE_DOCUMENT_STORAGE_FAILED', message: 'Dokumen pendukung gagal disimpan.' });
  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
  await expect(field.getByRole('alert')).toHaveText('Dokumen gagal diunggah. Pengajuan belum dikirim; silakan coba lagi.');
  await expect(field.getByRole('group', { name: 'File terpilih' })).toContainText('surat-dokter.pdf');
  await expect(form).toBeVisible();

  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
  await expect(form).toHaveCount(0);
  // network failure, storage failure, success — always the valid certificate.
  expect(state.posts).toHaveLength(3);
  for (const post of state.posts) {
    expect(post.body).toMatch(/filename="surat-dokter\.pdf"/);
    expect(post.body).not.toMatch(/wrong-original|replacement/);
  }
  const sent = state.posts[2];
  expect(sent.path).toBe('/leaves');
  expect(sent.contentType).toMatch(/^multipart\/form-data; boundary=/);
  expect(sent.body).toContain('name="data"');
  expect(sent.body).toContain(JSON.stringify({ leave_type_id: 72, start_date: day, end_date: day }));
  expect(sent.body).toMatch(/name="document"; filename="surat-dokter\.pdf"/);
  expect(sent.body).toContain('%PDF-1.4');
  expect(sent.body).not.toMatch(/document_path|document_name/);

  // Reopening starts without the previous file.
  const again = await openRequestForm(page, 'Ajukan Cuti');
  await again.locator('select').first().selectOption('72');
  await expect(again.getByRole('group', { name: 'File terpilih' })).toHaveCount(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('changing leave type or closing the form discards the file; optional types stay JSON', async ({ page }) => {
  const state = await mockSession(page);
  await page.goto('/my-leave');
  let form = await openRequestForm(page, 'Ajukan Cuti');
  await form.locator('select').first().selectOption('73');
  const field = form.getByTestId('leave-document-field');
  await expect(field.locator('.leave-document-label')).toHaveText('Dokumen pendukung (wajib)');
  await expect(field.getByRole('button', { name: 'Pilih dokumen pendukung', exact: true })).toBeVisible();
  await field.locator('input[type=file]').setInputFiles({ name: 'akta.png', mimeType: 'image/png', buffer: PNG });
  await expect(field.getByRole('group', { name: 'File terpilih' })).toContainText('akta.png');
  await form.locator('select').first().selectOption('71');
  await expect(form.getByTestId('leave-document-field')).toHaveCount(0);
  await form.locator('select').first().selectOption('73');
  await expect(form.getByRole('group', { name: 'File terpilih' })).toHaveCount(0);

  await form.getByTestId('leave-document-field').locator('input[type=file]').setInputFiles({ name: 'akta.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  form = await openRequestForm(page, 'Ajukan Cuti');
  await form.locator('select').first().selectOption('73');
  await expect(form.getByRole('group', { name: 'File terpilih' })).toHaveCount(0);

  await form.locator('select').first().selectOption('71');
  await fillDates(form);
  await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
  await expect(form).toHaveCount(0);
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0].contentType).toContain('application/json');
  expect(JSON.parse(state.posts[0].body)).toEqual({ leave_type_id: 71, start_date: day, end_date: day });
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('owner downloads from My Leave through the authorized endpoint only', async ({ page }) => {
  const state = await mockSession(page, { rows: [leaveRow(601, { reason: 'Owner fever' })] });
  await page.goto('/my-leave');
  await page.getByRole('button', { name: /Sick Leave/ }).first().click();
  const dialog = page.getByRole('dialog');
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Unduh surat keterangan dokter' }).click();
  expect((await download).suggestedFilename()).toBe('certificate.pdf');
  expect(state.documentReads).toEqual([601]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('approver downloads in Leave Approval and sees a clear denial (EN)', async ({ page }) => {
  const state = await mockSession(page, { roles: ['Manager'], language: 'en', rows: [leaveRow(601), leaveRow(602, { reason: 'Second request' })] });
  state.documentStatus.set(602, 403);
  await page.goto('/leave-approval');
  await page.getByRole('button', { name: 'View request for Synthetic Staff' }).first().click();
  let dialog = page.getByRole('dialog');
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: "Download doctor's certificate" }).click();
  expect((await download).suggestedFilename()).toBe('certificate.pdf');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'View request for Synthetic Staff' }).nth(1).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: "Download doctor's certificate" }).click();
  await expect(dialog.getByRole('alert')).toHaveText('You do not have access to this document.');
  expect(state.documentReads).toEqual([601, 602]);
  expect(state.downloads).toBe(1);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('My Approval inbox offers the document in request details and the decision dialog (EN)', async ({ page }) => {
  const state = await mockSession(page, { roles: ['Manager'], language: 'en', rows: [leaveRow(601)] });
  await page.goto('/requests');
  const record = page.locator('[data-request-record]').first();
  await record.getByText('Request details').click();
  const download = page.waitForEvent('download');
  await record.getByRole('button', { name: "Download doctor's certificate" }).click();
  await download;
  await record.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: "Download doctor's certificate" })).toBeVisible();
  expect(state.documentReads).toEqual([601]);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('P&C monitoring stays read-only: document download and unavailable handling only (ID)', async ({ page }) => {
  const state = await mockSession(page, { roles: ['HR Staff'], rows: [leaveRow(601), leaveRow(602, { reason: 'Legacy request' })] });
  state.documentStatus.set(602, 404);
  await page.goto('/leave');
  const records = page.locator('[data-leave-record]');
  await expect(records).toHaveCount(2);
  // Monitoring only: no create, approve, reject or delete control on the page or in a row.
  const actionControls = /Ajukan cuti untuk karyawan|Request leave for an employee|Setujui|Tolak|Hapus|Approve|Reject|Delete/;
  await expect(page.getByRole('button', { name: actionControls })).toHaveCount(0);
  for (const row of [records.nth(0), records.nth(1)]) await expect(row.getByRole('button')).toHaveCount(1);

  await records.nth(0).getByRole('button').click();
  let detail = page.getByRole('dialog');
  // The existing monitoring-only note stays.
  await expect(detail.locator('.lw-note')).toBeVisible();
  await expect(detail.getByRole('button', { name: actionControls })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await detail.getByRole('button', { name: 'Unduh surat keterangan dokter' }).click();
  expect((await download).suggestedFilename()).toBe('certificate.pdf');
  await detail.getByRole('button', { name: 'Tutup', exact: true }).click();

  // A legacy/unavailable document fails safe with a clear message.
  await records.nth(1).getByRole('button').click();
  detail = page.getByRole('dialog');
  await detail.getByRole('button', { name: 'Unduh surat keterangan dokter' }).click();
  await expect(detail.getByRole('alert')).toHaveText('Dokumen ini tidak tersedia.');
  expect(state.documentReads).toEqual([601, 602]);
  expect(state.downloads).toBe(1);
  expect(state.posts).toHaveLength(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('the document field and download fit a 360px screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const state = await mockSession(page, { rows: [leaveRow(601)] });
  await page.goto('/my-leave');
  const form = await openRequestForm(page, 'Ajukan Cuti');
  await form.locator('select').first().selectOption('72');
  const field = form.getByTestId('leave-document-field');
  const choose = field.getByRole('button', { name: 'Pilih surat dokter', exact: true });
  // Center the whole field in the modal scroll area, clear of its sticky footer.
  await field.evaluate(element => element.scrollIntoView({ block: 'center' }));
  await expect(choose).toBeInViewport();
  await choose.focus();
  await page.screenshot({ path: '../.analysis/leave-document-ui/mobile-upload-empty-id.png' });
  const picker = page.waitForEvent('filechooser');
  await choose.click();
  await (await picker).setFiles({ name: 'surat-keterangan-dokter-dengan-nama-yang-sangat-panjang.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(field.getByRole('button', { name: /Hapus/ })).toBeVisible();
  const box = await field.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(361);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  // The field sits below the fold inside the modal's scroll area: bring it into view first.
  await field.scrollIntoViewIfNeeded();
  await expect(field).toBeInViewport();
  await page.screenshot({ path: '../.analysis/leave-document-ui/mobile-form-id-360.png' });
  await field.getByRole('button', { name: /Hapus/ }).click();
  await expect(field.getByRole('group', { name: 'File terpilih' })).toHaveCount(0);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});
