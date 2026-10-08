import { test, expect, type Page } from '@playwright/test';

// Synthetic records only. Every application request is intercepted.
async function setup(page: Page, options: { role?: string; unlinked?: boolean; failLoad?: boolean; forcePassword?: boolean } = {}) {
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const role = options.role ?? 'HR Manager';
  const employee = { id: 119, employee_id: 'TEST-119', name: 'Karyawan Contoh', email: 'work@example.test',
    national_id: 'TEST-NIK', family_card_number: 'TEST-KK', profile_completed: true, company_id: 7,
    company: { id: 7, name: 'Perusahaan Contoh' }, department: { id: 12, name: 'Operasional' },
    position: { id: 16, name: 'Staf Operasional' }, gender: 'female', employment_status: 'active',
    employment_type: 'permanent', phone: '081234567890', mobile_number: '081234567890', address: 'Alamat contoh',
    city: 'Jakarta', province: 'DKI Jakarta', postal_code: '12345', current_address: 'Domisili contoh',
    last_education: 's1', education_major: 'Administrasi', education_institution: 'Universitas Contoh',
    graduation_year: 2020, children_count: 0, number_of_dependents: 0, bank_name: 'Bank Contoh',
    bank_account_number: 'TEST-ACCOUNT', join_date: '2020-01-01', updated_at: '2026-09-15T00:00:00.000Z' };
  const user = { id: 91, email: 'profile@example.test', roles: [role], permissions: [],
    employee: options.unlinked ? null : employee, is_active: true, force_password_change: options.forcePassword ?? false,
    accessibleCompanyIds: [3] }; // Different operational company; own profile still belongs to7.
  const calls: { method: string; path: string; body?: Record<string, unknown> }[] = [];
  const errors: string[] = [];
  const unexpected: string[] = [];
  const state = { failLoad: options.failLoad ?? false };
  const preferences = { email_leave_request: true, email_leave_approval: false };
  const company = { id: 3, name: 'Perusahaan Penugasan', code: 'TEST-3', address: 'Alamat kantor', email: 'company@example.test' };
  await page.addInitScript(() => localStorage.setItem('token', 'isolated-profile-test'));
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === origin && !url.pathname.startsWith('/api/') && !['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
    if (url.origin === 'https://ui-avatars.com') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    const path = url.pathname.replace(/^\/api\/v1/, '');
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (url.origin === origin && path === '/audit-logs/events' && req.method() === 'POST') return route.fulfill({ status: 204 });
    const body = req.postData() ? req.postDataJSON() : undefined;
    calls.push({ method: req.method(), path, body });
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (path === '/auth/me') return json({ user });
    if (path === '/users/me/preferences') {
      if (req.method() === 'PUT') Object.assign(preferences, body);
      return json(preferences);
    }
    if (path === '/companies') return route.fulfill({ json: { success: true, data: [company], pagination: { page: 1, totalPages: 1 } } });
    if (path === '/companies/3') {
      if (req.method() === 'PUT') Object.assign(company, body);
      return json(company);
    }
    if (path === '/employees/me') {
      if (state.failLoad) return route.fulfill({ status: 500, json: { success: false, error: { message: 'Profile temporarily unavailable' } } });
      if (req.method() === 'PUT') Object.assign(employee, body);
      return json(employee);
    }
    if (path === '/notifications/unread-count') return json({ unread_count: 0 });
    if (['/notifications/announcement-popups', '/presence', '/leaves/my-approvals', '/leaves/pending-approvals', '/overtime/pending-approvals', '/audit-logs/recent'].includes(path)) return json([]);
    if (path === '/dashboard/super-admin-stats') return json({ total_users: 1, total_companies: 1, total_employees: 1, audit_entries_today: 0 });
    if (path === '/audit-logs/statistics') return json({ total: 0, by_action: [], top_users: [], daily_activity: [] });
    unexpected.push(req.method() + ' ' + path);
    return route.abort();
  });
  return { employee, calls, errors, unexpected, state };
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true });
const nav = (page: Page) => page.getByRole('navigation', { name: 'Kategori profil' });
// Indonesian UI (no stored language): copy follows i18n/account.ts and role labels in ProfilePage.
const phone = (page: Page) => page.getByRole('region', { name: 'Informasi Kontak', exact: true }).getByLabel('Telepon (opsional)', { exact: true });
const roleLabel: Record<string, string> = { Employee: 'Karyawan', Manager: 'Manajer', 'HR Manager': 'Manajer SDM', 'Finance Manager': 'Manajer Keuangan', 'Super Admin': 'Administrator Utama' };
async function openFromMenu(page: Page) {
  await page.getByRole('button', { name: 'Menu akun' }).click();
  await page.getByRole('button', { name: 'Profil & Pengaturan', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
}

for (const role of ['Employee', 'Manager', 'HR Manager', 'Finance Manager', 'Super Admin']) {
  test(role + ': profile is own data regardless of operational company assignments', async ({ page }) => {
    const mock = await setup(page, { role });
    await page.goto('/profile');
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Karyawan Contoh', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit profil' })).toBeEnabled();
    expect(mock.calls.filter(call => call.path.startsWith('/employees')).every(call => call.path === '/employees/me')).toBe(true);
    await nav(page).getByRole('button', { name: 'Pekerjaan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Informasi Pekerjaan' })).toBeVisible();
    await nav(page).getByRole('button', { name: 'Akun', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Akses Sistem' }).getByText(roleLabel[role], { exact: true })).toBeVisible();
    expect(mock.unexpected).toEqual([]);
    expect(mock.errors).toEqual([]);
  });
}

test('editing preserves protected fields and draft across tabs; Enter does not auto-save', async ({ page }) => {
  const mock = await setup(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  expect(mock.calls.filter(call => call.method === 'PUT')).toHaveLength(0);
  await phone(page).fill('089876543210');
  await phone(page).press('Enter');
  expect(mock.calls.filter(call => call.method === 'PUT')).toHaveLength(0);
  await nav(page).getByRole('button', { name: 'Pekerjaan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Informasi Bank' })).toBeVisible();
  await nav(page).getByRole('button', { name: 'Pribadi', exact: true }).click();
  await expect(phone(page)).toHaveValue('089876543210');
  await expect(page.locator('input[name="name"], input[name="national_id"], input[name="bank_account_number"], input[name="basic_salary"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(dialog(page).getByText('Profil berhasil diperbarui', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeVisible();
  const writes = mock.calls.filter(call => call.method === 'PUT');
  expect(writes).toHaveLength(1);
  expect(writes[0].path).toBe('/employees/me');
  expect(writes[0].body).toMatchObject({ phone: '089876543210' });
  for (const key of ['name', 'national_id', 'bank_account_number', 'basic_salary', 'company_id', 'user_id']) expect(writes[0].body).not.toHaveProperty(key);
  expect(mock.employee.national_id).toBe('TEST-NIK');
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

test('close controls confirm unsaved edits and cancellation restores the saved data', async ({ page }) => {
  const mock = await setup(page);
  await page.goto('/settings/integrations');
  await openFromMenu(page);
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await phone(page).fill('089876543210');
  for (const close of [() => page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click(), () => page.keyboard.press('Escape'), () => page.mouse.click(8, 8)]) {
    await close();
    await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(phone(page)).toHaveValue('089876543210');
  }
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await expect(phone(page)).toHaveValue('081234567890');
  await page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click();
  await expect(page).toHaveURL(/\/settings\/integrations$/);
  expect(mock.calls.filter(call => call.method === 'PUT')).toHaveLength(0);
});

test('invalid phone stays editable; server errors remain inside the modal without losing the draft', async ({ page }) => {
  const mock = await setup(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await phone(page).fill('invalid');
  await nav(page).getByRole('button', { name: 'Akun', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(phone(page)).toBeFocused();
  await expect(page.getByText(/Format telepon tidak valid/)).toBeVisible();
  expect(mock.calls.filter(call => call.method === 'PUT')).toHaveLength(0);
  await phone(page).fill('089876543210');
  await page.route('**/api/v1/employees/me', route => route.fulfill({ status: 400, json: { success: false, error: { message: 'Profil tidak dapat diperbarui sekarang' } } }));
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(dialog(page).getByText('Profil tidak dapat diperbarui sekarang', { exact: true })).toBeVisible();
  await expect(phone(page)).toHaveValue('089876543210');
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeEnabled();
  await expect(page.getByText('Profil berhasil diperbarui', { exact: true })).toHaveCount(0);
});

test('saving locks profile fields and prevents modal dismissal', async ({ page }) => {
  const mock = await setup(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await phone(page).fill('089876543210');
  let complete!: () => void;
  await page.route('**/api/v1/employees/me', async route => {
    await new Promise<void>(resolve => { complete = resolve; });
    await route.fulfill({ json: { success: true, data: { ...mock.employee, phone: '089876543210' } } });
  });
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect.poll(() => typeof complete).toBe('function');
  await expect(phone(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeDisabled();
  for (const button of await page.getByRole('navigation', { name: 'Kategori pengaturan' }).getByRole('button').all()) await expect(button).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.mouse.click(8, 8);
  await expect(dialog(page)).toBeVisible();
  complete();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeVisible();
});

test('unlinked users see their account without blank employee editing', async ({ page }) => {
  const mock = await setup(page, { unlinked: true });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Akun belum terhubung ke data karyawan' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Akses Sistem' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toHaveCount(0);
  expect(mock.calls.filter(call => call.path === '/employees/me')).toHaveLength(0);
});

test('load failure has retry and does not expose an editable empty employee record', async ({ page }) => {
  const mock = await setup(page, { failLoad: true });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Profil belum dapat dimuat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toHaveCount(0);
  mock.state.failLoad = false;
  await page.getByRole('button', { name: 'Coba Lagi' }).click();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeEnabled();
  expect(mock.errors).toEqual([]);
});

test('menu modal preserves the underlying page, focus and scroll lock; direct refresh has a safe close target', async ({ page }) => {
  const mock = await setup(page, { role: 'Super Admin' });
  await page.goto('/settings/integrations?profile=test#keep');
  const background = page.getByRole('heading', { name: 'Integrasi', exact: true, includeHidden: true });
  await background.evaluate(element => { element.dataset.mountCheck = 'preserved'; });
  await openFromMenu(page);
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/settings\/integrations\?profile=test#keep$/);
  await expect(background).toHaveAttribute('data-mount-check', 'preserved');
  await expect(page.getByRole('button', { name: 'Menu akun' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await page.goto('/profile');
  await expect(dialog(page)).toBeVisible();
  await page.reload();
  await expect(dialog(page)).toBeVisible();
  await page.getByRole('button', { name: 'Tutup profil dan pengaturan' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

test('profile does not cover mandatory password onboarding', async ({ page }) => {
  await setup(page, { forcePassword: true });
  await page.goto('/profile');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
});

test('profile modal layout and editing remain usable on desktop tablet and mobile', async ({ page }, testInfo) => {
  const mock = await setup(page);
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('profile-personal.png') });
  for (const label of ['Pekerjaan', 'Akun']) {
    await nav(page).getByRole('button', { name: label, exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`profile-${label}.png`) });
  }
  await nav(page).getByRole('button', { name: 'Pribadi', exact: true }).click();
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('profile-tablet.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Bagian pengaturan', { exact: true })).toBeVisible();
  await nav(page).getByRole('button', { name: 'Pekerjaan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Informasi Pekerjaan' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await expect(nav(page).getByRole('button', { name: 'Pribadi', exact: true })).toHaveAttribute('aria-current', 'page');
  await phone(page).fill('089876543210');
  await page.locator('.ph-profile-content').evaluate(element => element.scrollTo(0, 0));
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('profile-mobile.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeVisible();
  expect(mock.employee.phone).toBe('089876543210');
  expect(mock.errors).toEqual([]);
});

test('one avatar entry and every profile alias open the same account modal', async ({ page }) => {
  const mock = await setup(page, { role: 'Employee' });
  await page.goto('/settings/integrations');
  await page.getByRole('button', { name: 'Menu akun' }).click();
  await expect(page.getByRole('button', { name: 'Profil & Pengaturan', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^(Profile|Settings)$/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Profil & Pengaturan', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeEnabled();
  for (const path of ['/settings/profile', '/profile', '/settings']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Edit profil' })).toBeEnabled();
    await expect(dialog(page)).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Kategori pengaturan' }).getByRole('button')).toHaveText(['Profil saya', 'Notifikasi', 'Keamanan akun']);
  }
  expect(mock.calls.filter(call => call.path === '/companies')).toHaveLength(0);
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

test('switching between profile and settings protects drafts, keeps one dialog, and saves only the selected form', async ({ page }) => {
  const mock = await setup(page);
  await page.goto('/settings');
  const categories = page.getByRole('navigation', { name: 'Kategori pengaturan' });
  await dialog(page).evaluate(element => { element.dataset.sameDialog = 'retained'; });
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await phone(page).fill('089876543210');
  await categories.getByRole('button', { name: 'Notifikasi', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
  await expect(phone(page)).toHaveValue('089876543210');
  await expect(page).toHaveURL(/\/settings$/);
  expect(mock.calls.some(call => call.path === '/users/me/preferences')).toBe(false);
  await categories.getByRole('button', { name: 'Notifikasi', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tinggalkan perubahan', exact: true }).click();
  await expect(dialog(page)).toHaveAttribute('data-same-dialog', 'retained');
  await page.getByLabel('Status cuti saya').check();
  await categories.getByRole('button', { name: 'Profil saya', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
  await expect(page.getByLabel('Status cuti saya')).toBeChecked();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  await categories.getByRole('button', { name: 'Profil saya', exact: true }).click();
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await expect(phone(page)).toHaveValue('081234567890');
  await phone(page).fill('089876543210');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeVisible();
  await categories.getByRole('button', { name: 'Profil perusahaan', exact: true }).click();
  await expect(page.getByLabel('Perusahaan', { exact: true })).toHaveValue('3');
  await page.getByLabel('Nama perusahaan').fill('Nama kantor baru');
  await categories.getByRole('button', { name: 'Profil saya', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
  await expect(page.getByLabel('Nama perusahaan')).toHaveValue('Nama kantor baru');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  const writes = mock.calls.filter(call => call.method === 'PUT');
  expect(writes.map(call => call.path)).toEqual(['/users/me/preferences', '/employees/me', '/companies/3']);
  expect(writes[0].body).toEqual({ email_leave_approval: true });
  expect(writes[1].body).toMatchObject({ phone: '089876543210' });
  expect(writes[1].body).not.toHaveProperty('company_id');
  expect(writes[2].body).toEqual({ name: 'Nama kantor baru' });
  await expect(dialog(page)).toHaveAttribute('data-same-dialog', 'retained');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});

test('leaving security protects password drafts and discards them only after confirmation', async ({ page }) => {
  const mock = await setup(page, { unlinked: true });
  await page.goto('/security/sessions');
  const categories = page.getByRole('navigation', { name: 'Kategori pengaturan' });
  await page.getByLabel('Kata sandi saat ini').fill('Synthetic-only-password');
  await categories.getByRole('button', { name: 'Profil saya', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
  await expect(page.getByLabel('Kata sandi saat ini')).toHaveValue('Synthetic-only-password');
  await categories.getByRole('button', { name: 'Profil saya', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tinggalkan perubahan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Akun belum terhubung ke data karyawan' })).toBeVisible();
  await categories.getByRole('button', { name: 'Keamanan akun', exact: true }).click();
  await expect(page.getByLabel('Kata sandi saat ini')).toHaveValue('');
  expect(mock.calls.filter(call => ['PUT', 'PATCH', 'POST'].includes(call.method) && call.path !== '/presence')).toHaveLength(0);
  expect(mock.calls.filter(call => call.path === '/employees/me')).toHaveLength(0);
  expect(mock.unexpected).toEqual([]);
});

test('mobile category selector protects profile edits and the shared controls stay visible', async ({ page }, testInfo) => {
  const mock = await setup(page, { role: 'Employee' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Edit profil' }).click();
  await phone(page).fill('089876543210');
  await page.getByLabel('Bagian pengaturan').selectOption('notifications');
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tetap mengedit', exact: true }).click();
  await expect(page.getByLabel('Bagian pengaturan')).toHaveValue('profile');
  await expect(phone(page)).toHaveValue('089876543210');
  await page.getByLabel('Bagian pengaturan').selectOption('notifications');
  await page.getByRole('alertdialog', { name: 'Tinggalkan perubahan?', exact: true }).getByRole('button', { name: 'Tinggalkan perubahan', exact: true }).click();
  await page.getByLabel('Status cuti saya').check();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  await page.getByLabel('Bagian pengaturan').selectOption('profile');
  await page.setViewportSize({ width: 320, height: 667 });
  await expect(page.getByRole('button', { name: 'Tutup profil dan pengaturan' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Edit profil' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('unified-account-small-mobile.png'), animations: 'disabled' });
  expect(mock.calls.filter(call => call.method === 'PUT').map(call => call.path)).toEqual(['/users/me/preferences']);
  expect(mock.unexpected).toEqual([]);
  expect(mock.errors).toEqual([]);
});
