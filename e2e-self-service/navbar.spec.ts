import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, options: { roles?: string[]; unlinked?: boolean; disabledFeatures?: boolean; noScope?: boolean; hiddenEmployees?: boolean } = {}) {
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const roles = options.roles ?? ['HR Manager'];
  const employee = { id: 901, employee_id: 'TEST-901', name: 'Synthetic User', national_id: 'TEST-NIK', profile_completed: true, company_id: 1 };
  // Assertions use the Indonesian UI; pin the account language explicitly.
  const user = { id: 91, email: 'navbar@example.test', roles, permissions: [], language: 'id', employee: options.unlinked ? null : employee,
    is_active: true, force_password_change: false, accessibleCompanyIds: options.noScope ? [] : [2],
    companyFeatures: { attendance_enabled: !options.disabledFeatures, leave_enabled: !options.disabledFeatures, payroll_enabled: true } };
  const notes = Array.from({ length: 21 }, (_, i) => ({ id: 100 + i, user_id: 91, type: 'leave_request_approved', title: `Notifikasi uji ${String(i + 1).padStart(2, '0')}`,
    message: 'Pemberitahuan contoh untuk pengujian lokal.', is_read: false, created_at: '2026-09-15T00:00:00.000Z', link: null as string | null }));
  const state = { calls: [] as { path: string; method: string; query: string }[], errors: [] as string[], unexpected: [] as string[],
    failSearch: false, failList: false, failWrite: false, notes };
  await page.addInitScript(({ hiddenEmployees }) => {
    localStorage.setItem('token', 'isolated-navbar');
    if (hiddenEmployees) localStorage.setItem('sidebar_role_config', JSON.stringify({ 'HR Manager': { '/employees': false } }));
  }, options);
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === origin && !url.pathname.startsWith('/api/') && !['fetch', 'xhr'].includes(req.resourceType())) return route.continue();
    const path = url.pathname.replace(/^\/api\/v1/, '');
    state.calls.push({ path, method: req.method(), query: url.search });
    if (path === '/audit-logs/events' && req.method() === 'POST') return route.fulfill({ status: 204 });
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    const fail = () => route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic unavailable' } } });
    if (path === '/auth/me') return json({ user });
    if (path === '/employees/me') return json(employee);
    if (path === '/notifications/unread-count') return json({ unread_count: notes.filter(row => !row.is_read).length });
    if (['/leaves/my-approvals', '/notifications/announcement-popups', '/presence', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(path)) return json([]);
    if (path === '/employees') {
      if (state.failSearch) return fail();
      return route.fulfill({ json: { data: [{ id: 902, name: 'Karyawan Hasil', employee_id: 'TEST-902', company: { name: 'Perusahaan Penugasan' } }], meta: { total: 1, page: 1, limit: 8, totalPages: 1 } } });
    }
    if (path === '/notifications') {
      if (state.failList) return fail();
      const rows = url.searchParams.get('is_read') === 'false' ? notes.filter(row => !row.is_read) : notes;
      const pageNumber = Number(url.searchParams.get('page') ?? 1), limit = Number(url.searchParams.get('limit') ?? 20);
      return route.fulfill({ json: { success: true, data: rows.slice((pageNumber - 1) * limit, pageNumber * limit), unread_count: notes.filter(row => !row.is_read).length,
        pagination: { page: pageNumber, limit, total: rows.length, total_pages: Math.ceil(rows.length / limit) } } });
    }
    if (path === '/notifications/mark-all-read' || /^\/notifications\/\d+\/read$/.test(path)) {
      if (state.failWrite) return fail();
      const row = notes.find(item => item.id === Number(path.split('/')[2]));
      if (row) row.is_read = true; else notes.forEach(item => { item.is_read = true; });
      return json(row ?? { success: true });
    }
    state.unexpected.push(req.method() + ' ' + path);
    return route.abort();
  });
  return state;
}

const search = (page: Page) => page.getByRole('dialog', { name: 'Cari di PeopleHub', exact: true });
async function openSearch(page: Page) { await page.getByRole('button', { name: 'Buka pencarian', exact: true }).click(); await expect(search(page)).toBeVisible(); }
const input = (page: Page) => page.getByRole('combobox', { name: 'Cari halaman atau karyawan' });

for (const destination of [
  { path: '/leave/policy', module: 'Leave Management' },
  { path: '/payroll/freelance', module: 'Payroll' },
]) {
  test('nested module destination has a single active sidebar item: ' + destination.path, async ({ page }) => {
    const state = await setup(page);
    await page.route('**/api/v1/companies?**', route => route.fulfill({ json: {
      success: true, data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 1 },
      pagination: { total: 0, page: 1, limit: 100, totalPages: 1 },
    } }));
    await page.route('**/api/v1/leaves/types?**', route => route.fulfill({ json: { success: true, data: [] } }));
    await page.goto(destination.path);
    const sidebar = page.getByRole('navigation', { name: 'Navigasi utama', exact: true });
    const module = page.getByRole('navigation', { name: 'Navigasi ' + destination.module, exact: true });
    // Module tabs were removed from page content; navigation belongs in the sidebar.
    await expect(module).toHaveCount(0);
    await expect(sidebar.locator('a[aria-current=page]')).toHaveCount(1);
    await expect(sidebar.locator('a[aria-current=page]')).toHaveAttribute('href', destination.path);
    expect(state.errors).toEqual([]);
    expect(state.unexpected).toEqual([]);
  });
}

for (const roles of [['Employee'], ['User'], ['Manager'], ['HR Staff'], ['Finance Manager'], ['Tax Staff'], ['CEO'], ['Super Admin'], ['HR Staff', 'Tax Staff'], ['Finance Manager', 'Manager']]) {
  test('shared navbar destinations and employee search access: ' + roles.join(' + '), async ({ page }) => {
    const state = await setup(page, { roles });
    await page.goto('/settings/integrations');
    const sidebar = page.locator('aside nav');
    await expect(sidebar.getByRole('link', { name: 'Kehadiran Saya', exact: true })).toBeVisible();
    while (await sidebar.locator('button[aria-expanded=false]').count()) await sidebar.locator('button[aria-expanded=false]').first().click();
    const allowed = await sidebar.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    await page.getByRole('button', { name: 'Akses cepat', exact: true }).click();
    const shortcuts = await page.getByRole('region', { name: 'Akses cepat', exact: true }).getByRole('link').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    expect(shortcuts.length).toBeGreaterThan(0);
    shortcuts.forEach(path => expect(allowed).toContain(path));
    expect(shortcuts).toContain('/my-attendance');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Akses cepat', exact: true })).toBeFocused();
    await openSearch(page);
    const canSearch = roles.some(role => ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager'].includes(role));
    await expect(search(page).getByRole('button', { name: 'Karyawan', exact: true })).toHaveCount(canSearch ? 1 : 0);
    await search(page).getByRole('button', { name: 'Halaman', exact: true }).click();
    await input(page).fill('cuti');
    await expect(search(page).getByRole('option', { name: /Cuti Saya/ })).toBeVisible();
    expect(state.calls.filter(call => call.path === '/employees')).toHaveLength(0);
    expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
  });
}

test('personal links require employee and enabled features; configured employee menu stays hidden in search', async ({ page }) => {
  const state = await setup(page, { unlinked: true, disabledFeatures: true, hiddenEmployees: true });
  await page.goto('/settings/integrations'); await openSearch(page);
  await expect(search(page).getByRole('button', { name: 'Karyawan', exact: true })).toHaveCount(0);
  for (const term of ['my-attendance', 'my-leave', 'my documents', '/employees']) {
    await input(page).fill(term); await expect(search(page).getByRole('option')).toHaveCount(0);
  }
  expect(state.calls.filter(call => call.path === '/employees')).toHaveLength(0);
});

test('no assigned operational company avoids employee search without hiding personal profile', async ({ page }) => {
  const state = await setup(page, { noScope: true });
  await page.goto('/settings/integrations'); await openSearch(page);
  await expect(search(page).getByRole('button', { name: 'Karyawan', exact: true })).toHaveCount(0);
  await input(page).fill('profil');
  await expect(search(page).getByRole('option', { name: /Profil & Pengaturan/ })).toBeVisible();
  expect(state.calls.filter(call => call.path === '/employees')).toHaveLength(0);
});

test('Ctrl K, result arrows and Enter work, search traps focus and closes to its trigger', async ({ page }) => {
  const state = await setup(page, { roles: ['Employee'] });
  await page.goto('/settings/integrations');
  const trigger = page.getByRole('button', { name: 'Buka pencarian', exact: true });
  await trigger.focus(); await page.keyboard.press('Control+k');
  await expect(input(page)).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await input(page).fill('notifikasi');
  await input(page).press('ArrowDown'); await input(page).press('Enter');
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('heading', { name: 'Notifikasi', exact: true })).toBeVisible();
  await openSearch(page); await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await openSearch(page); await page.mouse.click(8, 8); await expect(search(page)).toHaveCount(0);
  expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([]);
});

test('employee query failure has retry and old responses cannot overwrite a newer query or cleared input', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/settings/integrations'); await openSearch(page);
  await search(page).getByRole('button', { name: 'Karyawan', exact: true }).click();
  let release!: () => void;
  await page.route('**/api/v1/employees?**', async route => {
    const term = new URL(route.request().url()).searchParams.get('search');
    if (term !== 'old') return route.fallback();
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { data: [{ id: 999, name: 'Hasil Lama', employee_id: 'OLD' }], meta: { page: 1, limit: 8, total: 1, totalPages: 1 } } });
  });
  await input(page).fill('old'); await expect.poll(() => typeof release).toBe('function');
  await input(page).fill('baru'); await expect(search(page).getByRole('option', { name: /Karyawan Hasil/ })).toBeVisible();
  const oldResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('search') === 'old');
  release(); await (await oldResponse).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(search(page).getByRole('option', { name: /Hasil Lama/ })).toHaveCount(0);
  release = undefined!;
  await input(page).fill('old'); await expect.poll(() => typeof release).toBe('function');
  await input(page).fill('');
  const clearedResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('search') === 'old');
  release(); await (await clearedResponse).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(search(page).getByRole('option')).toHaveCount(0);
  state.failSearch = true; await input(page).fill('error');
  await expect(search(page).getByRole('alert')).toContainText('Pencarian karyawan gagal');
  await expect(search(page).getByText('Tidak ada hasil.', { exact: false })).toHaveCount(0);
  state.failSearch = false; await search(page).getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(search(page).getByRole('option', { name: /Karyawan Hasil/ })).toBeVisible();
  expect(state.calls.filter(call => call.path === '/employees').every(call => !/company_id|employee_id/.test(call.query))).toBe(true);
  expect(state.errors).toEqual([]);
});

test('notification dropdown loads real list, marks once and syncs count with the paginated inbox', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/settings/integrations');
  await page.getByRole('button', { name: 'Notifikasi, 21 belum dibaca', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Notifikasi terbaru' });
  await expect(panel.getByRole('listitem')).toHaveCount(10);
  await panel.getByRole('button', { name: /Notifikasi uji 01/ }).click();
  await expect(page.getByRole('button', { name: 'Notifikasi, 20 belum dibaca', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: /Notifikasi uji 01/ })).toContainText('Sudah dibaca');
  await panel.getByRole('link', { name: 'Lihat semua notifikasi' }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.locator('.ph-inbox').getByRole('listitem')).toHaveCount(20);
  await page.getByRole('button', { name: 'Berikutnya', exact: true }).click();
  await expect(page.locator('.ph-inbox').getByRole('listitem')).toHaveCount(1);
  await expect(page.getByText('21 notifikasi · Halaman 2 dari 2')).toBeVisible();
  await page.getByRole('button', { name: /Belum dibaca \(20\)/ }).click();
  await expect(page.locator('.ph-inbox').getByRole('listitem')).toHaveCount(20);
  await expect(page.getByText('20 notifikasi · Halaman 1 dari 1')).toBeVisible();
  await page.getByRole('button', { name: 'Tandai semua dibaca', exact: true }).click();
  await expect(page.getByText('Tidak ada notifikasi pada daftar ini.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notifikasi, 0 belum dibaca', exact: true })).toBeVisible();
  expect(state.calls.filter(call => call.method === 'POST' && call.path === '/notifications/100/read')).toHaveLength(1);
  expect(state.calls.filter(call => call.method === 'POST' && call.path === '/notifications/mark-all-read')).toHaveLength(1);
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]);
});

test('notification load/write failures stay explicit and do not claim read success', async ({ page }) => {
  const state = await setup(page); state.failList = true;
  await page.goto('/notifications');
  await expect(page.getByRole('alert')).toContainText('Notifikasi gagal dimuat');
  await expect(page.getByText('Tidak ada notifikasi pada daftar ini.')).toHaveCount(0);
  state.failList = false; await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  state.failWrite = true; await page.getByRole('button', { name: /Notifikasi uji 01/ }).click();
  await expect(page.getByRole('alert')).toContainText('Gagal menandai notifikasi');
  await expect(page.getByRole('button', { name: 'Notifikasi, 21 belum dibaca', exact: true })).toBeVisible();
  expect(state.notes[0].is_read).toBe(false);
  state.failWrite = false; await page.getByRole('button', { name: /Notifikasi uji 01/ }).click();
  await expect(page.getByRole('button', { name: 'Notifikasi, 20 belum dibaca', exact: true })).toBeVisible();
});

test('notification action blocks duplicate writes and untrusted links stay inside the app', async ({ page }) => {
  const state = await setup(page); state.notes[0].link = '//example.test';
  await page.goto('/notifications');
  let release!: () => void;
  await page.route('**/api/v1/notifications/100/read', async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.fallback();
  });
  const row = page.getByRole('button', { name: /Notifikasi uji 01/ });
  await row.click(); await expect.poll(() => typeof release).toBe('function');
  await expect(row).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tandai semua dibaca', exact: true })).toBeDisabled();
  release(); await expect(row).toContainText('Sudah dibaca');
  await expect(page).toHaveURL(/\/notifications$/);
  expect(state.calls.filter(call => call.path === '/notifications/100/read')).toHaveLength(1);
  expect(state.unexpected).toEqual([]);
});

test('navbar, search, notifications and breadcrumbs fit desktop and mobile', async ({ page }, testInfo) => {
  await setup(page);
  await page.goto('/notifications');
  // Indonesian rendering of t("Breadcrumb") and t("Dashboard").
  await expect(page.getByRole('navigation', { name: 'Jejak navigasi' })).toContainText('DasborNotifikasi');
  await expect(page.getByRole('button', { name: 'Buka menu navigasi' })).toBeHidden();
  await expect(page.locator('.ph-inbox').getByRole('listitem')).toHaveCount(20);
  await page.screenshot({ path: testInfo.outputPath('navbar-inbox-desktop.png') });
  await openSearch(page); await input(page).fill('gaji');
  await expect(search(page).getByRole('option', { name: /Karyawan Reguler/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('navbar-search-desktop.png') });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Buka menu navigasi' })).toBeVisible();
  await page.getByRole('button', { name: 'Notifikasi, 21 belum dibaca', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Notifikasi terbaru' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('navbar-notifications-mobile.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); await openSearch(page);
  await input(page).fill('profil');
  expect((await search(page).boundingBox())!.height).toBeLessThan(600);
  await page.screenshot({ path: testInfo.outputPath('navbar-search-mobile.png'), animations: 'disabled' });
  await search(page).getByRole('option', { name: /Profil & Pengaturan/ }).click();
  await expect(page.getByRole('dialog', { name: 'Profil & Pengaturan', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toHaveCount(1);
});
