import { test, expect, type Page } from '@playwright/test';

type Options = { roles?: string[]; ids?: number[]; empty?: boolean; missing?: boolean; fail?: boolean; paginated?: boolean; forcePasswordChange?: boolean };
async function setup(page: Page, options: Options = {}) {
  const localOrigin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const calls: { method: string; path: string; body?: Record<string, unknown> }[] = [];
  const unexpected: string[] = [];
  const errors: string[] = [];
  const companyPages: number[] = [];
  const roles = options.roles ?? ['HR Manager'];
  const ids = options.ids ?? [2, 3];
  // Assertions are Indonesian; the account language is explicit rather than relying on the default.
  const user = { id: 91, email: 'settings@example.test', roles, permissions: [], employee: null, language: 'id',
    is_active: true, force_password_change: options.forcePasswordChange ?? false, accessibleCompanyIds: ids };
  const companies = [1, 2, 3, 11].map(id => ({ id, name: 'Perusahaan ' + id, code: 'TEST-' + id }));
  const prefs = { email_leave_request: true, email_leave_approval: false, whatsapp_enabled: true, email_payslip: false };
  const companyRows = new Map(companies.map(row => [row.id, { ...row, address: 'Alamat ' + row.id, email: 'office@example.test', phone: null, website: null, settings: { payroll_automation: { enabled: true } } }]));
  const attendanceRows = new Map([2, 3, 11].map(id => [id, {
    id: 90 + id, company_id: id, work_start_time: '1970-01-01T08:30:00.000Z',
    work_end_time: '1970-01-01T17:00:00.000Z', break_start_time: null, break_end_time: null,
    check_in_tolerance_minutes: '0', company: { id }, require_photo_check_in: true,
  }]));
  const payrollRows = new Map([2, 3, 11].map(id => [id, { id: 100 + id, company_id: id, payroll_cutoff_date: id === 3 ? 21 : 20,
    payment_date: 28, prorate_method: 'working_days', bpjs_jp_max_salary: '10547400', company: { id } }]));
  let missing = options.missing ?? false;
  await page.addInitScript(() => localStorage.setItem('token', 'isolated-settings-test'));
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === localOrigin && !url.pathname.startsWith('/api/') && !['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
    if (url.origin === 'https://ui-avatars.com') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = req.method();
    // Client audit beacon (telemetry), not an application request under test.
    if (path === '/audit-logs/events' && method === 'POST') return route.fulfill({ status: 204 });
    const body = req.postData() ? req.postDataJSON() : undefined;
    calls.push({ method, path, body });
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (path === '/auth/me') return json({ user });
    if (path === '/notifications/unread-count') return json({ unread_count: 0 });
    if (['/notifications/announcement-popups', '/presence', '/leaves/my-approvals', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(path)) return json([]);
    if (path === '/companies') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      companyPages.push(pageNumber);
      return route.fulfill({ json: { success: true,
        data: options.empty ? [] : options.paginated ? (pageNumber === 1 ? companies.slice(0, 3) : companies.slice(3)) : companies,
        pagination: { page: pageNumber, totalPages: options.paginated ? 2 : 1 } } });
    }
    if (path === '/users/me/preferences') {
      if (options.fail) return route.fulfill({ status: 500, json: { success: false, error: { message: 'Preferences unavailable' } } });
      if (method === 'PUT') Object.assign(prefs, body);
      return json(prefs);
    }
    if (path === '/auth/change-password') return route.fulfill({ status: 400, json: { success: false, error: { message: 'Kata sandi saat ini salah' } } });
    const company = path.match(/^\/companies\/(\d+)$/);
    if (company) {
      const row = companyRows.get(Number(company[1]));
      if (method === 'PUT') Object.assign(row!, body);
      return json(row);
    }
    const setting = path.match(/^\/(attendance|payroll)-settings(?:\/company\/(\d+))?$/);
    if (setting) {
      const id = Number(setting[2] ?? body?.company_id);
      const row = setting[1] === 'attendance' ? attendanceRows.get(id) : payrollRows.get(id);
      if (method === 'GET' && missing) return route.fulfill({ status: 404, json: { success: false, error: { message: 'Not configured' } } });
      if (method === 'POST') missing = false;
      if (method === 'PATCH') Object.assign(row!, body);
      return route.fulfill({ json: row });
    }
    unexpected.push(method + ' ' + path);
    return route.abort();
  });
  return { calls, unexpected, errors, prefs, companyRows, companyPages };
}

const roleCases: [string[], string[]][] = [
  [['Employee'], []], [['User'], []], [['Manager'], []], [['Tax Staff'], []], [['Tax Manager'], []],
  [['HR Staff'], ['Kehadiran', 'Jadwal payroll']], [['HR Manager'], ['Profil perusahaan', 'Kehadiran', 'Jadwal payroll']],
  [['Finance Manager'], ['Jadwal payroll']], [['CEO'], ['Profil perusahaan', 'Kehadiran', 'Jadwal payroll']],
  [['Group CEO'], ['Profil perusahaan', 'Kehadiran', 'Jadwal payroll']], [['Super Admin'], ['Profil perusahaan', 'Kehadiran', 'Jadwal payroll']],
  [['CEO', 'HR Manager'], ['Profil perusahaan', 'Kehadiran', 'Jadwal payroll']],
];
for (const [roles, business] of roleCases) {
  test(roles.join(' + ') + ': personal settings and exact permitted tabs without an employee', async ({ page }) => {
    const mock = await setup(page, { roles });
    await page.goto('/settings/notifications');
    await expect(page.getByRole('checkbox', { name: /Status cuti saya/ })).not.toBeChecked();
    const nav = page.getByRole('navigation', { name: 'Kategori pengaturan' });
    await expect(nav.getByRole('button')).toHaveText(['Profil saya', 'Notifikasi', 'Keamanan akun', ...business]);
    expect(mock.calls.filter(call => call.path === '/companies')).toHaveLength(0);
    expect(mock.unexpected).toEqual([]);
    expect(mock.errors).toEqual([]);
  });
}

test('preferences save only the changed supported key; unrelated preferences survive', async ({ page }) => {
  const mock = await setup(page, { roles: ['Employee'], ids: [] });
  await page.goto('/settings/notifications');
  const save = page.getByRole('button', { name: 'Simpan', exact: true });
  await expect(save).toBeDisabled();
  await page.getByRole('checkbox', { name: /Pengajuan cuti/ }).uncheck();
  await save.click();
  await expect(save).toBeDisabled();
  expect(mock.calls.find(call => call.method === 'PUT')?.body).toEqual({ email_leave_request: false });
  expect(mock.prefs).toMatchObject({ email_leave_request: false, whatsapp_enabled: true, email_payslip: false });
  expect(mock.unexpected).toEqual([]);
});

test('assigned companies include later pages, exclude foreign companies and save master identity through the correct API', async ({ page }) => {
  const mock = await setup(page, { ids: [11], paginated: true });
  await page.goto('/settings/general');
  await expect(page.getByLabel('Perusahaan', { exact: true })).toHaveValue('11');
  await expect(page.getByLabel('Perusahaan', { exact: true }).locator('option')).toHaveCount(1);
  await expect(page.getByLabel('Nama perusahaan')).toHaveValue('Perusahaan 11');
  await page.getByLabel('Nama perusahaan').fill('Identitas diperbarui');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  expect(mock.calls.find(call => call.method === 'PUT')).toEqual({ method: 'PUT', path: '/companies/11', body: { name: 'Identitas diperbarui' } });
  expect(mock.companyRows.get(11)?.settings).toEqual({ payroll_automation: { enabled: true } });
  // React StrictMode can replay read effects; every server page must still be fetched.
  expect([...new Set(mock.companyPages)].sort()).toEqual([1, 2]);
  expect(mock.unexpected).toEqual([]);
});

test('raw attendance response keeps wall-clock time, nullable breaks and zero tolerance; save is minimal', async ({ page }) => {
  const mock = await setup(page, { ids: [2] });
  await page.goto('/settings/attendance');
  await expect(page.getByLabel('Jam masuk')).toHaveValue('08:30');
  await expect(page.getByLabel('Toleransi check-in (menit)')).toHaveValue('0');
  await expect(page.getByLabel('Mulai istirahat', { exact: true })).toHaveValue('');
  await page.getByLabel('Jam masuk').fill('09:00');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  expect(mock.calls.find(call => call.method === 'PATCH')?.body).toEqual({ work_start_time: '09:00' });
  expect(mock.calls.some(call => call.path.includes('/init'))).toBe(false);
  expect(mock.unexpected).toEqual([]);
});

for (const roles of [['Group CEO'], ['CEO'], ['HR Staff']]) {
  test(roles[0] + ': company payroll is read-only and viewing never creates a row', async ({ page }) => {
    const mock = await setup(page, { roles });
    await page.goto('/settings/payroll');
    await expect(page.getByLabel('Tanggal cut-off')).toHaveValue('20');
    await expect(page.getByLabel('Tanggal cut-off')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toHaveCount(0);
    expect(mock.calls.filter(call => call.path.startsWith('/payroll-settings')).some(call => call.method !== 'GET' || call.path.includes('/init'))).toBe(false);
    expect(mock.unexpected).toEqual([]);
  });
}

test('CEO + Finance Manager retains independent finance edit rights', async ({ page }) => {
  const mock = await setup(page, { roles: ['CEO', 'Finance Manager'], ids: [2] });
  await page.goto('/settings/payroll');
  await expect(page.getByLabel('Tanggal cut-off')).toBeEditable();
  await page.getByLabel('Rencana tanggal pembayaran').fill('29');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  expect(mock.calls.find(call => call.method === 'PATCH')).toEqual({ method: 'PATCH', path: '/payroll-settings/company/2', body: { payment_date: 29 } });
});

test('missing config requires an explicit writer action and never displays invented defaults', async ({ page }) => {
  const mock = await setup(page, { missing: true, ids: [2] });
  await page.goto('/settings/attendance');
  await expect(page.getByText('Konfigurasi perusahaan belum dibuat.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Jam masuk')).toHaveCount(0);
  expect(mock.calls.some(call => call.method === 'POST' && call.path === '/attendance-settings')).toBe(false);
  await page.getByRole('button', { name: 'Buat konfigurasi' }).click();
  await expect(page.getByLabel('Jam masuk')).toHaveValue('08:30');
  expect(mock.calls.find(call => call.method === 'POST' && call.path === '/attendance-settings')).toEqual({ method: 'POST', path: '/attendance-settings', body: { company_id: 2 } });
});

test('missing config cannot be created by a reader', async ({ page }) => {
  const mock = await setup(page, { roles: ['CEO'], missing: true });
  await page.goto('/settings/attendance');
  await expect(page.getByText('Konfigurasi perusahaan belum dibuat.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buat konfigurasi' })).toHaveCount(0);
  expect(mock.calls.filter(call => call.path.startsWith('/attendance-settings')).some(call => call.method !== 'GET')).toBe(false);
});

test('forbidden deep links retain personal navigation without fetching company data', async ({ page }) => {
  const mock = await setup(page, { roles: ['Employee'] });
  await page.goto('/settings/payroll');
  await expect(page.getByText('Pengaturan ini tidak tersedia untuk role Anda.')).toBeVisible();
  expect(mock.calls.some(call => call.path.startsWith('/payroll-settings') || call.path === '/companies')).toBe(false);
  await page.getByRole('navigation', { name: 'Kategori pengaturan' }).getByRole('button', { name: 'Notifikasi', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Pengajuan cuti/ })).toBeVisible();
});

test('empty assignments explain the state and leave personal settings accessible', async ({ page }) => {
  const mock = await setup(page, { ids: [] });
  await page.goto('/settings/general');
  await expect(page.getByText('Belum ada perusahaan yang ditugaskan.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toHaveCount(0);
  expect(mock.calls.some(call => call.path === '/companies')).toBe(false);
});

test('company switching discards a late old response and never saves the previous company values', async ({ page }) => {
  const mock = await setup(page);
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/api/v1/payroll-settings/company/2', async route => {
    requested = true; await wait;
    await route.fulfill({ json: { company_id: 2, payroll_cutoff_date: 7, payment_date: 8, prorate_method: 'working_days' } });
  });
  await page.goto('/settings/payroll');
  await expect.poll(() => requested).toBe(true);
  await page.getByLabel('Perusahaan', { exact: true }).selectOption('3');
  await expect(page.getByLabel('Tanggal cut-off')).toHaveValue('21');
  release();
  await page.getByLabel('Rencana tanggal pembayaran').fill('30');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Tanggal cut-off')).toHaveValue('21');
  expect(mock.calls.find(call => call.method === 'PATCH')).toEqual({ method: 'PATCH', path: '/payroll-settings/company/3', body: { payment_date: 30 } });
});

test('unsaved changes can cancel navigation or be reset before changing company', async ({ page }) => {
  await setup(page);
  await page.goto('/settings/payroll');
  await page.getByLabel('Rencana tanggal pembayaran').fill('30');
  await page.getByLabel('Perusahaan', { exact: true }).selectOption('3');
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
  await expect(page.getByLabel('Perusahaan', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Rencana tanggal pembayaran')).toHaveValue('30');
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.getByLabel('Rencana tanggal pembayaran')).toHaveValue('28');
});

test('a failed personal load retains navigation and does not enable save', async ({ page }) => {
  const mock = await setup(page, { fail: true });
  await page.goto('/settings/notifications');
  await expect(page.getByText('Gagal memuat pengaturan. Data belum dapat disimpan.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Kategori pengaturan' }).getByRole('button', { name: 'Keamanan akun' }).click();
  await expect(page.getByLabel('Kata sandi saat ini', { exact: true })).toBeVisible();
  expect(mock.errors).toEqual([]);
});

test('password validation matches the backend and displays canonical server errors', async ({ page }) => {
  const mock = await setup(page, { roles: ['Employee'] });
  await page.goto('/settings/security');
  await page.getByLabel('Kata sandi saat ini', { exact: true }).fill('SyntheticCurrent1');
  await page.getByLabel('Kata sandi baru', { exact: true }).fill('weakpassword');
  await page.getByLabel('Konfirmasi kata sandi baru', { exact: true }).fill('weakpassword');
  await page.getByRole('button', { name: 'Perbarui kata sandi' }).click();
  await expect(page.getByRole('alert')).toContainText('huruf besar');
  expect(mock.calls.some(call => call.path === '/auth/change-password')).toBe(false);
  await page.getByLabel('Kata sandi baru', { exact: true }).fill('SyntheticNew1');
  await page.getByLabel('Konfirmasi kata sandi baru', { exact: true }).fill('SyntheticNew1');
  await page.getByRole('button', { name: 'Perbarui kata sandi' }).click();
  await expect(page.getByRole('alert')).toHaveText('Kata sandi saat ini salah');
  expect(mock.calls.filter(call => call.path === '/auth/change-password')).toHaveLength(1);
});

test('failed saves retain the draft and show the server error without claiming success', async ({ page }) => {
  await setup(page, { ids: [2] });
  await page.goto('/settings/general');
  await page.getByLabel('Nama perusahaan').fill('Perubahan belum tersimpan');
  await page.route('**/api/v1/companies/2', route => route.fulfill({ status: 409,
    json: { success: false, error: { message: 'Kode perusahaan sudah digunakan' } } }));
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByText('Kode perusahaan sudah digunakan', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nama perusahaan')).toHaveValue('Perubahan belum tersimpan');
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeEnabled();
  await expect(page.getByText('Pengaturan berhasil disimpan', { exact: true })).toHaveCount(0);
});

test('a company mismatch in the API response is rejected instead of exposing another company form', async ({ page }) => {
  await setup(page, { ids: [2] });
  await page.route('**/api/v1/payroll-settings/company/2', route => route.fulfill({ json: { company_id: 3, payroll_cutoff_date: 25, payment_date: 28 } }));
  await page.goto('/settings/payroll');
  await expect(page.getByText('Gagal memuat pengaturan. Data belum dapat disimpan.')).toBeVisible();
  await expect(page.getByLabel('Tanggal cut-off')).toHaveCount(0);
});

test('settings layout stays usable on desktop and mobile', async ({ page }, testInfo) => {
  await setup(page, { ids: [2] });
  await page.goto('/settings/general');
  await expect(page.getByLabel('Nama perusahaan')).toHaveValue('Perusahaan 2');
  await page.screenshot({ path: testInfo.outputPath('settings-desktop.png'), fullPage: true });
  const navigation = page.getByRole('navigation', { name: 'Kategori pengaturan' });
  for (const [label, field, screenshot] of [
    ['Kehadiran', 'Jam masuk', 'attendance'],
    ['Jadwal payroll', 'Tanggal cut-off', 'payroll'],
    ['Notifikasi', 'Status cuti saya', 'notifications'],
    ['Keamanan akun', 'Kata sandi saat ini', 'security'],
  ]) {
    await navigation.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByLabel(field)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`settings-${screenshot}.png`), fullPage: true });
  }
  await navigation.getByRole('button', { name: 'Profil perusahaan', exact: true }).click();
  await expect(page.getByLabel('Nama perusahaan')).toHaveValue('Perusahaan 2');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('settings-desktop-1280.png'), fullPage: true });
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('settings-tablet.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Kategori pengaturan' })).toBeVisible();
  // The shared shell animates its desktop padding/side panel for 300ms on resize.
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Email perusahaan').fill('updated@example.test');
  await page.getByRole('button', { name: 'Simpan', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeVisible();
  await page.locator('.ph-settings-panel').evaluate(element => element.scrollTo(0, 0));
  await expect.poll(() => page.locator('.ph-settings-panel').evaluate(element => element.scrollTop)).toBe(0);
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png'), fullPage: true });
  await page.getByLabel('Bagian pengaturan').selectOption('notifications');
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
  await expect(page.getByLabel('Bagian pengaturan')).toHaveValue('general');
  await expect(page.getByLabel('Email perusahaan')).toHaveValue('updated@example.test');
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await page.getByLabel('Bagian pengaturan').selectOption('notifications');
  const leaveStatus = page.getByLabel('Status cuti saya');
  await expect(leaveStatus).not.toBeChecked();
  await leaveStatus.focus();
  await page.keyboard.press('Space');
  await expect(leaveStatus).toBeChecked();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  await expect(page.getByText('Pengaturan berhasil disimpan', { exact: true })).not.toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('settings-mobile-notifications.png'), fullPage: true });
});

test('settings modal preserves the underlying page and closes after tab changes with focus restored', async ({ page }) => {
  const mock = await setup(page);
  await page.goto('/settings/integrations?from=work#section');
  // Registered Indonesian title of the Integrations placeholder (shared catalog).
  const background = page.getByRole('heading', { name: 'Integrasi', exact: true, includeHidden: true });
  await background.evaluate(element => { element.dataset.mountCheck = 'preserved'; });
  const openSettings = async () => {
    await page.getByRole('button', { name: 'Menu akun' }).click();
    await page.getByRole('button', { name: 'Profil & Pengaturan', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true })).toBeVisible();
  };
  await openSettings();
  await expect(background).toHaveAttribute('data-mount-check', 'preserved');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.getByRole('navigation', { name: 'Kategori pengaturan' }).getByRole('button', { name: 'Notifikasi', exact: true }).click();
  await page.getByRole('navigation', { name: 'Kategori pengaturan' }).getByRole('button', { name: 'Keamanan akun', exact: true }).click();
  await page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click();
  await expect(page).toHaveURL(/\/settings\/integrations\?from=work#section$/);
  await expect(background).toHaveAttribute('data-mount-check', 'preserved');
  await expect(page.getByRole('button', { name: 'Menu akun' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await openSettings();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await openSettings();
  await page.mouse.click(8, 8);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await openSettings();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

test('close button, Escape and backdrop all protect an unsaved settings draft', async ({ page }) => {
  await setup(page, { ids: [2] });
  await page.goto('/settings/integrations');
  await page.getByRole('button', { name: 'Menu akun' }).click();
  await page.getByRole('button', { name: 'Profil & Pengaturan', exact: true }).click();
  await page.getByRole('navigation', { name: 'Kategori pengaturan' }).getByRole('button', { name: 'Profil perusahaan', exact: true }).click();
  await page.getByLabel('Nama perusahaan').fill('Draft tetap ada');
  for (const close of [
    () => page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click(),
    () => page.keyboard.press('Escape'),
    () => page.mouse.click(8, 8),
  ]) {
    await close();
    await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
    await expect(page.getByLabel('Nama perusahaan')).toHaveValue('Draft tetap ada');
    await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click();
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tinggalkan perubahan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/settings\/integrations$/);
});

test('settings stays open during a save and renders feedback inside the modal', async ({ page }) => {
  await setup(page, { ids: [2] });
  await page.goto('/settings/general');
  await page.getByLabel('Nama perusahaan').fill('Saved Company');
  let finishSave!: () => void;
  await page.route('**/api/v1/companies/2', async route => {
    await new Promise<void>(resolve => { finishSave = resolve; });
    await route.fulfill({ json: { success: true, data: { id: 2, name: 'Saved Company', code: 'TEST-2' } } });
  });
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeDisabled();
  await expect.poll(() => typeof finishSave).toBe('function');
  await page.keyboard.press('Escape');
  await page.mouse.click(8, 8);
  await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true })).toBeVisible();
  finishSave();
  await expect(page.getByRole('dialog').getByText('Pengaturan berhasil disimpan', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeEnabled();
});

test('settings modal does not cover mandatory password onboarding', async ({ page }) => {
  await setup(page, { forcePasswordChange: true });
  await page.goto('/settings/notifications');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.locator('dialog.ph-settings-dialog')).toHaveCount(0);
});
