import { test, expect, type Locator, type Page } from '@playwright/test';
import type { Announcement, AnnouncementOptions } from '../src/services/announcement.service';

// Synthetic users and intercepted APIs only. Unknown APIs/external requests fail
// closed; never import the real-account E2E login or storage-state helpers.
type Call = { method: string; path: string; query: URLSearchParams; body: Record<string, unknown> | null };
type SetupOptions = {
  options?: Partial<AnnouncementOptions>;
  menus?: Record<string, Record<string, boolean>>;
  permissions?: Announcement['permissions'];
  failOptions?: boolean;
};
const editors = ['Super Admin', 'Group CEO', 'HR Manager', 'HR Staff'];
const deleters = ['Super Admin', 'Group CEO', 'HR Manager'];
const title = (index: number) => `Pengumuman uji ${String(index).padStart(2, '0')}`;
const library = (page: Page) => page.getByRole('region', { name: 'Daftar pengumuman' });
const item = (page: Page, index: number) => library(page).getByRole('listitem').filter({ has: page.getByRole('heading', { name: title(index), exact: true }) });
const form = (page: Page, editing = false) => page.getByRole('dialog', { name: editing ? 'Edit pengumuman' : 'Buat pengumuman', exact: true });
async function respondToConfirmation(page: Page, accepted: boolean, checkMessage?: (message: string) => void) {
  const confirmation = page.getByRole('dialog', { name: 'Konfirmasi tindakan', exact: true });
  await expect(confirmation).toBeVisible();
  if (checkMessage) checkMessage(await confirmation.locator('p').innerText());
  await confirmation.getByRole('button', { name: accepted ? 'Lanjutkan' : 'Batal', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
}
const ready = async (page: Page) => {
  await expect(library(page)).toHaveAttribute('aria-busy', 'false');
  await expect(library(page).getByRole('listitem')).toHaveCount(20);
};

async function setup(page: Page, roles = ['Employee'], config: SetupOptions = {}) {
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const employee = { id: 901, employee_id: 'TEST-901', name: 'Synthetic User', company_id: 3, national_id: 'TEST', profile_completed: true };
  const user = { id: 91, email: 'announcements@example.test', employee, roles, permissions: [], accessibleCompanyIds: [2, 4],
    is_active: true, force_password_change: false, companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true } };
  const canEdit = roles.some(role => editors.includes(role));
  const canDelete = roles.some(role => deleters.includes(role));
  const options: AnnouncementOptions = {
    can_create: canEdit, can_publish_global: roles.includes('Super Admin'),
    companies: canEdit ? [{ id: 2, name: 'Company tugas Alpha' }, { id: 4, name: 'Company tugas Beta' }] : [],
    roles: canEdit ? [{ id: 71, name: 'Reader Alpha' }, { id: 88, name: 'Reader Beta' }] : [],
    departments: canEdit ? [{ id: 501, name: 'Department Alpha', company_id: 2 }, { id: 502, name: 'Department Beta', company_id: 4 }, { id: 599, name: 'Department bersama', company_id: null }] : [],
    ...config.options,
  };
  const rows: Announcement[] = Array.from({ length: 21 }, (_, i) => ({
    id: 200 + i, company_id: i === 2 ? 3 : 2, target_company_ids: null, is_global: false,
    title: title(i + 1), content: i === 20 ? 'needle-only-on-page-two' : `Ringkasan pengumuman lokal ${i + 1}.`,
    category: i === 20 ? 'policy' : 'general', priority: i === 20 ? 'high' : 'normal', visibility: 'all', target_audience: null, target_ids: null,
    is_pinned: false, is_published: true, published_at: '2026-09-16T00:00:00Z', expires_at: i === 0 ? '2089-12-01T17:30:00Z' : null,
    views_count: 3, created_by: 91, created_at: '2026-09-16T00:00:00Z', updated_at: '2026-09-16T00:00:00Z',
    company: { id: i === 2 ? 3 : 2, name: i === 2 ? 'Company pribadi' : 'Company tugas Alpha' }, creator: { id: 91, name: 'Synthetic P&C' },
    permissions: i === 3 ? undefined : i === 2 ? { can_edit: false, can_delete: false }
      : i === 1 ? { can_edit: canEdit, can_delete: false } : config.permissions ?? { can_edit: canEdit, can_delete: canDelete },
  }));
  rows.push({ ...rows[0], id: 299, title: 'Draft synthetic', content: 'Draft content', is_published: false, published_at: null });
  const state = {
    calls: [] as Call[], writes: [] as Call[], unexpected: [] as string[], errors: [] as string[], rows, options,
    failList: false, failOptions: config.failOptions ?? false, failWrite: false,
    deniedDetails: new Set<number>(), deniedEdits: new Set<number>(),
  };
  states.set(page, state);
  await page.addInitScript(menus => {
    localStorage.setItem('token', 'isolated-announcements');
    if (menus) localStorage.setItem('sidebar_role_config', JSON.stringify(menus));
  }, config.menus);
  page.on('pageerror', error => state.errors.push(error.message));
  await page.context().route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    // Only Vite/static assets and app documents can touch the local server.
    if (url.origin === origin && !url.pathname.startsWith('/api/') && !['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
    if (url.origin !== origin || !url.pathname.startsWith('/api/v1/')) {
      state.unexpected.push(req.method() + ' ' + req.url()); return route.abort();
    }
    const path = url.pathname.replace(/^\/api\/v1/, '');
    // Client audit beacon (page-view/error telemetry), not an application request under test.
    if (path === '/audit-logs/events' && req.method() === 'POST') return route.fulfill({ status: 204 });
    const call: Call ={ method: req.method(), path, query: url.searchParams, body: req.postData() ? req.postDataJSON() : null };
    state.calls.push(call);
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    const fail = (status = 503, message = 'Synthetic unavailable') => route.fulfill({ status, json: { success: false, error: { message } } });
    if (path === '/auth/me' && call.method === 'GET') return json({ user });
    if (path === '/employees/me' && call.method === 'GET') return json(employee);
    if (path === '/notifications/unread-count' && call.method === 'GET') return json({ unread_count: 0 });
    if (path === '/presence' && call.method === 'POST') return json(null);
    if (['/notifications/announcement-popups', '/presence', '/leaves/my-approvals', '/leaves/pending-approvals', '/overtime/pending-approvals'].includes(path) && call.method === 'GET') return json([]);
    if (path === '/announcements/options' && call.method === 'GET') return state.failOptions ? fail() : json(state.options);
    if (path === '/announcements' && call.method === 'GET') {
      if (state.failList) return fail();
      const n = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 20);
      const term = (url.searchParams.get('search') || '').toLowerCase();
      const filtered = state.rows.filter(row => (!term || `${row.title} ${row.content}`.toLowerCase().includes(term))
        && (!url.searchParams.has('is_published') || String(row.is_published) === url.searchParams.get('is_published'))
        && (!url.searchParams.get('category') || row.category === url.searchParams.get('category'))
        && (!url.searchParams.get('priority') || row.priority === url.searchParams.get('priority'))
        && (!url.searchParams.get('company_id') || String(row.company_id) === url.searchParams.get('company_id')));
      return route.fulfill({ json: { success: true, data: filtered.slice((n - 1) * limit, n * limit), pagination: { page: n, limit, total: filtered.length, total_pages: Math.ceil(filtered.length / limit) } } });
    }
    const match = path.match(/^\/announcements\/(\d+)(?:\/(view|publish|unpublish|toggle-pin))?$/);
    if (match) {
      const id = Number(match[1]), action = match[2], row = state.rows.find(value => value.id === id);
      if (!row) return fail(404, 'Synthetic not found');
      if (call.method === 'GET' && !action) {
        if (state.deniedDetails.has(id)) return fail(403, 'Synthetic forbidden detail');
        return json({ ...row, content: `Nội dung đầy đủ / isi lengkap #${id}.`,
          permissions: state.deniedEdits.has(id) ? { can_edit: false, can_delete: false } : row.permissions });
      }
      if (call.method === 'POST' && action === 'view') return json(null);
      if ((call.method === 'PUT' && !action) || (call.method === 'DELETE' && !action) || (call.method === 'POST' && ['publish', 'unpublish', 'toggle-pin'].includes(action))) {
        state.writes.push(call);
        if (state.failWrite) return fail();
        if (call.method === 'DELETE') state.rows.splice(state.rows.indexOf(row), 1);
        if (call.method === 'PUT') Object.assign(row, call.body);
        if (action === 'publish' || action === 'unpublish') row.is_published = action === 'publish';
        if (action === 'toggle-pin') row.is_pinned = !row.is_pinned;
        return json(row);
      }
    }
    if (path === '/announcements' && call.method === 'POST') {
      state.writes.push(call);
      if (state.failWrite) return fail();
      const created = { ...rows[0], ...call.body, id: 900 + state.writes.length } as Announcement;
      state.rows.unshift(created); return json(created);
    }
    state.unexpected.push(call.method + ' ' + req.url()); return route.abort();
  });
  return state;
}
type State = Awaited<ReturnType<typeof setup>>;
const states = new WeakMap<Page, State>();
test.afterEach(async ({ page }) => {
  const state = states.get(page);
  if (state) { expect.soft(state.errors, 'uncaught browser exceptions').toEqual([]); expect.soft(state.unexpected, 'unmocked API/external requests').toEqual([]); }
});
const listCalls = (state: State) => state.calls.filter(call => call.path === '/announcements' && call.method === 'GET');
async function openCreate(page: Page) { await page.getByRole('button', { name: 'Buat pengumuman', exact: true }).click(); await expect(form(page)).toBeVisible(); return form(page); }
async function fillDraft(dialog: Locator) {
  await dialog.getByLabel('Judul', { exact: true }).fill('Pengumuman baru');
  await dialog.getByRole('textbox', { name: 'Isi pengumuman', exact: true }).fill('Isi lengkap untuk pengujian lokal.');
}
async function expandNav(page: Page) {
  const nav = page.locator('aside nav'); await expect(nav).toBeVisible();
  while (await nav.locator('button[aria-expanded=false]').count()) await nav.locator('button[aria-expanded=false]').first().click();
  return nav;
}
async function searchPages(page: Page) {
  await page.getByRole('button', { name: 'Buka pencarian', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cari di PeopleHub' });
  await dialog.getByRole('button', { name: 'Halaman', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Cari halaman atau karyawan' }).fill('pengumuman');
  return dialog;
}

for (const roles of [
  ['Employee'], ['User'], ['Manager'], ['HR Staff'], ['HR Manager'], ['CEO'], ['Group CEO'], ['Finance Manager'], ['Tax Manager'], ['Tax Staff'], ['Super Admin'],
  ['Manager', 'HR Staff'], ['Tax Manager', 'HR Staff'], ['Finance Manager', 'Manager'], ['Super Admin', 'CEO'],
]) {
  test('shared route, canonical menu/search and scoped actions: ' + roles.join(' + '), async ({ page }) => {
    const state = await setup(page, roles); await page.goto('/announcements'); await ready(page);
    const edit = roles.some(role => editors.includes(role)), remove = roles.some(role => deleters.includes(role));
    await expect(page.getByRole('button', { name: 'Buat pengumuman', exact: true })).toHaveCount(edit ? 1 : 0);
    await expect(item(page, 1).getByRole('button', { name: `Edit ${title(1)}`, exact: true })).toHaveCount(edit ? 1 : 0);
    await expect(item(page, 1).getByRole('button', { name: `Hapus ${title(1)}`, exact: true })).toHaveCount(remove ? 1 : 0);
    await expect(item(page, 2).getByRole('button', { name: /^Hapus / })).toHaveCount(0);
    for (const index of [3, 4]) await expect(item(page, index).getByRole('button')).toHaveCount(1);
    if (!edit) {
      await expect(library(page).getByRole('button', { name: /^(Edit|Hapus|Terbitkan|Tarik publikasi|Sematkan) / })).toHaveCount(0);
      await expect(page.getByLabel('Status pengumuman')).toHaveCount(0);
    }
    const nav = await expandNav(page);
    await expect(nav.locator('a[href="/announcements"]')).toHaveCount(1);
    await expect(nav.locator('a[href$="/announcements"]')).toHaveCount(1);
    const search = await searchPages(page);
    await expect(search.getByRole('option')).toHaveCount(1);
    // Indonesian UI (fixture user has no account language), like every other label in this spec.
    await expect(search.getByRole('option')).toContainText('Pengumuman');
    await search.getByRole('option').click(); await expect(page).toHaveURL(/\/announcements$/);
    expect(state.calls.some(call => call.path === '/announcements/options')).toBe(true);
    expect(listCalls(state).every(call => call.query.get('is_published') === 'true' && !call.query.has('company_id'))).toBe(true);
    expect(state.writes).toHaveLength(0);
  });
}

for (const alias of ['/manager/announcements', '/employee/announcements', '/ceo/announcements', '/resources/announcements']) {
  test('legacy redirect preserves query/hash and replaces history: ' + alias, async ({ page }) => {
    await setup(page, ['User']); await page.goto('/announcements?previous=1'); await ready(page);
    await page.evaluate(next => { history.pushState(null, '', next); dispatchEvent(new PopStateEvent('popstate')); }, alias + '?origin=bookmark#notice');
    await expect(page).toHaveURL(/\/announcements\?origin=bookmark#notice$/); await ready(page);
    await page.goBack(); await expect(page).toHaveURL(/\/announcements\?previous=1$/);
    await page.goto(alias + '?origin=bookmark#notice'); await ready(page); await page.reload(); await ready(page);
    await expect(page).toHaveURL(/\/announcements\?origin=bookmark#notice$/);
    await expect(page.getByRole('heading', { name: 'Pengumuman', exact: true })).toHaveCount(1);
  });
}

for (const [role, alias] of [['Manager', '/manager/announcements'], ['Employee', '/employee/announcements'], ['CEO', '/ceo/announcements'], ['HR Manager', '/resources/announcements']]) {
  test('legacy hidden menu also stays hidden in search: ' + role, async ({ page }) => {
    await setup(page, [role], { menus: { [role]: { [alias]: false } } }); await page.goto('/announcements'); await ready(page);
    await expect((await expandNav(page)).locator('a[href$="/announcements"]')).toHaveCount(0);
    await expect((await searchPages(page)).getByRole('option')).toHaveCount(0);
  });
}
test('explicit canonical visibility takes precedence over the old hidden key', async ({ page }) => {
  await setup(page, ['Manager'], { menus: { Manager: { '/manager/announcements': false, '/announcements': true } } });
  await page.goto('/announcements'); await ready(page);
  await expect((await expandNav(page)).locator('a[href="/announcements"]')).toHaveCount(1);
});
test('combined roles retain additive visibility without duplicate links', async ({ page }) => {
  await setup(page, ['Manager', 'HR Staff'], { menus: { Manager: { '/manager/announcements': false }, 'HR Staff': { '/resources/announcements': true } } });
  await page.goto('/announcements'); await ready(page);
  await expect((await expandNav(page)).locator('a[href$="/announcements"]')).toHaveCount(1);
  await expect((await searchPages(page)).getByRole('option')).toHaveCount(1);
});

test('backend denial overrides Super Admin label and missing operational options fail closed', async ({ page }) => {
  const state = await setup(page, ['Super Admin'], { options: { can_create: false, can_publish_global: false, companies: [], roles: [], departments: [] }, permissions: { can_edit: false, can_delete: false } });
  // Every row is explicitly noneditable, even for the highest role in this UI fixture.
  state.rows.forEach(row => { row.permissions = { can_edit: false, can_delete: false }; });
  await page.goto('/announcements'); await ready(page);
  await expect(page.getByRole('button', { name: 'Buat pengumuman', exact: true })).toHaveCount(0);
  await expect(item(page, 1).getByRole('button')).toHaveCount(1);
  await expect(page.getByLabel('Status pengumuman')).toHaveCount(0);
});
test('backend options failure leaves reading usable, retries, and never invents a company', async ({ page }) => {
  const state = await setup(page, ['HR Manager'], { failOptions: true }); await page.goto('/announcements'); await ready(page);
  const alert = page.locator('.ph-announcement-notice[role=alert]');
  await expect(alert).toContainText('Pilihan pengelolaan gagal dimuat');
  await expect(page.getByRole('button', { name: 'Buat pengumuman', exact: true })).toHaveCount(0);
  await expect(item(page, 1).getByRole('button', { name: /^Edit / })).toBeDisabled();
  state.failOptions = false; await alert.getByRole('button', { name: 'Coba lagi' }).click();
  const dialog = await openCreate(page); await expect(dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true })).toHaveValue('');
  await expect(dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true }).locator('option')).toHaveText(['Pilih perusahaan', 'Company tugas Alpha', 'Company tugas Beta']);
  expect(state.calls.filter(call => call.path === '/announcements/options').length).toBeGreaterThanOrEqual(2);
});
test('edit permission is rechecked from detail and cannot use a stale list grant', async ({ page }) => {
  const state = await setup(page, ['HR Staff']); state.deniedEdits.add(200);
  await page.goto('/announcements'); await ready(page);
  const response = page.waitForResponse(value => value.url().endsWith('/announcements/200') && value.request().method() === 'GET');
  await item(page, 1).getByRole('button', { name: /^Edit / }).click(); await (await response).finished();
  await expect(item(page, 1).getByRole('button', { name: /^Edit / })).toBeEnabled();
  await expect(form(page, true)).toHaveCount(0); expect(state.writes).toHaveLength(0);
});

test('pagination and server content search find the 21st row, with correct filters', async ({ page }) => {
  const state = await setup(page, ['HR Manager']); await page.goto('/announcements'); await ready(page);
  await expect(item(page, 21)).toHaveCount(0); await page.getByRole('button', { name: 'Berikutnya', exact: true }).click();
  await expect(item(page, 21)).toBeVisible(); await expect(library(page).getByRole('listitem')).toHaveCount(1);
  expect(listCalls(state).at(-1)?.query.get('page')).toBe('2');
  await page.getByRole('button', { name: 'Sebelumnya', exact: true }).click(); await ready(page);
  await page.getByLabel('Cari pengumuman', { exact: true }).fill('needle-only-on-page-two');
  await expect(item(page, 21)).toBeVisible(); await expect(library(page).getByRole('listitem')).toHaveCount(1);
  expect(Object.fromEntries(listCalls(state).at(-1)!.query)).toMatchObject({ page: '1', limit: '20', search: 'needle-only-on-page-two' });
  await page.getByLabel('Kategori pengumuman', { exact: true }).selectOption('policy');
  await page.getByLabel('Prioritas pengumuman', { exact: true }).selectOption('high');
  await page.getByLabel('Filter perusahaan', { exact: true }).selectOption('2'); // t("Filter company") in the Indonesian UI
  await expect(item(page, 21)).toBeVisible();
  expect(Object.fromEntries(listCalls(state).at(-1)!.query)).toMatchObject({ category: 'policy', priority: 'high', company_id: '2' });
});
test('list failure clears stale rows and retry distinguishes an empty result', async ({ page }) => {
  const state = await setup(page); await page.goto('/announcements'); await ready(page);
  state.failList = true; await page.getByLabel('Cari pengumuman', { exact: true }).fill('not-present');
  await expect(library(page).getByRole('alert')).toContainText('Synthetic unavailable');
  await expect(library(page).getByRole('listitem')).toHaveCount(0);
  await expect(library(page)).not.toContainText('Belum ada pengumuman yang sesuai');
  state.failList = false; await library(page).getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(library(page)).toContainText('Belum ada pengumuman yang sesuai');
});
test('late search response cannot replace the newer server result', async ({ page }) => {
  await setup(page); await page.goto('/announcements'); await ready(page);
  let release!: () => void;
  await page.context().route('**/api/v1/announcements?**', async route => {
    if (new URL(route.request().url()).searchParams.get('search') !== 'old') return route.fallback();
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } } });
  });
  await page.getByLabel('Cari pengumuman', { exact: true }).fill('old'); await expect.poll(() => typeof release).toBe('function');
  try {
    await page.getByLabel('Cari pengumuman', { exact: true }).fill('needle-only-on-page-two'); await expect(item(page, 21)).toBeVisible();
  } finally {
    const response = page.waitForResponse(value => new URL(value.url()).searchParams.get('search') === 'old');
    release(); await (await response).finished();
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(item(page, 21)).toBeVisible();
});

test('single-company create requires explicit selection and retries retain draft, audience IDs and WIB expiry', async ({ page }) => {
  const state = await setup(page, ['HR Manager']); await page.goto('/announcements'); await ready(page);
  const dialog = await openCreate(page); await fillDraft(dialog);
  const company = dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true }); await expect(company).toHaveValue('');
  await expect(dialog.getByLabel('Tujuan publikasi').locator('option')).toHaveText(['Satu perusahaan', 'Beberapa perusahaan']); // normalized Indonesian copy (i18n/leaveResources.ts)
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click();
  await expect(company).toBeFocused(); expect(state.writes).toHaveLength(0);
  await company.selectOption('4'); await dialog.getByRole('combobox', { name: 'Pembaca', exact: true }).selectOption('department');
  await expect(dialog.getByRole('group', { name: 'Target pembaca' }).getByRole('checkbox')).toHaveCount(2);
  await expect(dialog.getByRole('checkbox', { name: 'Department Alpha', exact: true })).toHaveCount(0);
  await dialog.getByRole('checkbox', { name: 'Department Beta', exact: true }).check();
  await dialog.getByLabel('Berakhir pada (WIB, opsional)').fill('2089-12-02T00:30');
  state.failWrite = true; await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Synthetic unavailable');
  await expect(dialog.getByLabel('Judul', { exact: true })).toHaveValue('Pengumuman baru');
  await expect(company).toHaveValue('4'); await expect(dialog.getByRole('checkbox', { name: 'Department Beta', exact: true })).toBeChecked();
  state.failWrite = false; await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
  expect(state.writes).toHaveLength(2); expect(state.writes[1].body).toEqual(state.writes[0].body);
  expect(state.writes[1]).toMatchObject({ method: 'POST', path: '/announcements', body: { company_id: 4, target_ids: [502], visibility: 'department', target_audience: 'Department Beta', expires_at: '2089-12-01T17:30:00.000Z', is_published: false } });
  expect(state.writes[1].body).not.toHaveProperty('target_company_ids'); expect(state.writes[1].body).not.toHaveProperty('is_global');
  await expect(page.getByLabel('Status pengumuman')).toHaveValue('draft');
});

test('multiple-company create validates targets, resets stale department IDs and sends numeric role IDs', async ({ page }) => {
  const state = await setup(page, ['HR Staff']); await page.goto('/announcements'); await ready(page);
  const dialog = await openCreate(page); await fillDraft(dialog); await dialog.getByLabel('Tujuan publikasi').selectOption('multiple');
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Pilih perusahaan tujuan'); expect(state.writes).toHaveLength(0);
  await dialog.getByRole('group', { name: 'Perusahaan tujuan' }).getByRole('checkbox', { name: 'Company tugas Alpha' }).check();
  await dialog.getByRole('combobox', { name: 'Pembaca', exact: true }).selectOption('department');
  await dialog.getByRole('checkbox', { name: 'Department Alpha', exact: true }).check();
  await dialog.getByRole('group', { name: 'Perusahaan tujuan' }).getByRole('checkbox', { name: 'Company tugas Beta' }).check();
  await expect(dialog.getByRole('checkbox', { name: 'Department Alpha', exact: true })).not.toBeChecked();
  await dialog.getByRole('combobox', { name: 'Pembaca', exact: true }).selectOption('role');
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Pilih minimal satu target pembaca');
  await dialog.getByRole('checkbox', { name: 'Reader Beta', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Terbitkan setelah disimpan' }).check();
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
  expect(state.writes[0].body).toMatchObject({ target_company_ids: [2, 4], visibility: 'role', target_ids: [88], target_audience: 'Reader Beta', is_published: true });
  expect(state.writes[0].body).not.toHaveProperty('company_id'); expect(state.writes[0].body).not.toHaveProperty('is_global');
});
test('global publishing follows the backend option for HR and clears previous company selection', async ({ page }) => {
  const state = await setup(page, ['HR Manager'], { options: { can_publish_global: true } });
  await page.goto('/announcements'); await ready(page); const dialog = await openCreate(page); await fillDraft(dialog);
  await dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true }).selectOption('4');
  await dialog.getByLabel('Tujuan publikasi').selectOption('global');
  await expect(dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true })).toHaveCount(0);
  await dialog.getByRole('checkbox', { name: 'Terbitkan setelah disimpan' }).check();
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
  expect(state.writes[0].body).toMatchObject({ is_global: true, visibility: 'all', target_ids: [], target_audience: '', is_published: true });
  expect(state.writes[0].body).not.toHaveProperty('company_id'); expect(state.writes[0].body).not.toHaveProperty('target_company_ids');
});
test('exactly one backend company can be preselected without deriving own employee company', async ({ page }) => {
  const state = await setup(page, ['HR Manager'], { options: { companies: [{ id: 4, name: 'Only assigned company' }], can_publish_global: false } });
  await page.goto('/announcements'); await ready(page); const dialog = await openCreate(page); await fillDraft(dialog);
  await expect(dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true })).toHaveValue('4');
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
  expect(state.writes[0].body?.company_id).toBe(4);
});
test.describe('WIB conversion is independent of browser timezone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('edit loads WIB, sends UTC, clears expiry with null and preserves scope', async ({ page }) => {
    const state = await setup(page, ['HR Staff']); await page.goto('/announcements'); await ready(page);
    await item(page, 1).getByRole('button', { name: /^Edit / }).click(); let dialog = form(page, true);
    await expect(dialog.getByLabel('Berakhir pada (WIB, opsional)')).toHaveValue('2089-12-02T00:30');
    await expect(dialog.getByRole('textbox', { name: 'Isi pengumuman', exact: true })).toHaveValue('Nội dung đầy đủ / isi lengkap #200.');
    await expect(dialog.getByLabel('Tujuan publikasi')).toHaveCount(0);
    await dialog.getByLabel('Berakhir pada (WIB, opsional)').fill('2089-12-03T06:15');
    await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
    expect(state.writes[0].body?.expires_at).toBe('2089-12-02T23:15:00.000Z');
    await item(page, 1).getByRole('button', { name: /^Edit / }).click(); dialog = form(page, true);
    await expect(dialog.getByLabel('Berakhir pada (WIB, opsional)')).toHaveValue('2089-12-03T06:15');
    await dialog.getByLabel('Berakhir pada (WIB, opsional)').fill('');
    await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
    expect(state.writes[1]).toMatchObject({ method: 'PUT', path: '/announcements/200', body: { expires_at: null } });
    for (const write of state.writes) for (const key of ['company_id', 'target_company_ids', 'is_global', 'is_published']) expect(write.body).not.toHaveProperty(key);
  });
});

test('title-only edit preserves inactive historical audience and expired timestamp without resubmitting them', async ({ page }) => {
  const state = await setup(page, ['HR Staff']);
  Object.assign(state.rows[0], { visibility: 'department', target_ids: [9876], target_audience: 'Inactive historical department', expires_at: '2020-12-01T17:30:47Z' });
  await page.goto('/announcements'); await ready(page);
  await item(page, 1).getByRole('button', { name: /^Edit / }).click();
  const dialog = form(page, true);
  await expect(dialog.getByRole('checkbox', { name: 'Target tersimpan #9876', exact: true })).toBeChecked();
  await expect(dialog.getByLabel('Berakhir pada (WIB, opsional)')).toHaveValue('2020-12-02T00:30');
  await dialog.getByLabel('Judul', { exact: true }).fill('Only title changes');
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({ method: 'PUT', path: '/announcements/200' });
  expect(state.writes[0].body).toEqual({ title: 'Only title changes' });
});
test('large audience label stays within contract and retains every selected numeric target ID', async ({ page }) => {
  const targets = Array.from({ length: 8 }, (_, i) => ({ id: 700 + i, name: `Long synthetic role ${i + 1} ` + 'audience '.repeat(9) }));
  expect(targets.map(target => target.name).join(', ').length).toBeGreaterThan(500);
  const state = await setup(page, ['HR Manager'], { options: { roles: targets } });
  await page.goto('/announcements'); await ready(page); const dialog = await openCreate(page); await fillDraft(dialog);
  await dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true }).selectOption('2');
  await dialog.getByRole('combobox', { name: 'Pembaca', exact: true }).selectOption('role');
  for (const checkbox of await dialog.getByRole('group', { name: 'Target pembaca' }).getByRole('checkbox').all()) await checkbox.check();
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect(dialog).toHaveCount(0);
  expect(state.writes[0].body?.target_ids).toEqual(targets.map(target => target.id));
  expect(typeof state.writes[0].body?.target_audience).toBe('string');
  expect((state.writes[0].body?.target_audience as string).length).toBeLessThanOrEqual(500);
});
test('detail shows returned destination company names with an honest missing-name fallback', async ({ page }) => {
  const state = await setup(page);
  Object.assign(state.rows[0], { company_id: null, company: null, target_company_ids: [2, 4, 9],
    target_companies: [{ id: 2, name: 'Company tujuan Alpha' }, { id: 4, name: 'Company tujuan Beta' }] });
  await page.goto('/announcements'); await ready(page); await item(page, 1).getByRole('button', { name: /^Baca / }).click();
  const detail = page.getByRole('dialog', { name: 'Detail pengumuman' });
  await expect(detail.locator('dd').filter({ hasText: 'Company tujuan Alpha' })).toHaveText('Company tujuan Alpha, Company tujuan Beta, Perusahaan #9');
});

for (const close of ['Escape', 'close button', 'backdrop']) {
  test('dirty form protects draft and restores focus on discard: ' + close, async ({ page }) => {
    await setup(page, ['HR Manager']); await page.goto('/announcements'); await ready(page);
    const trigger = page.getByRole('button', { name: 'Buat pengumuman', exact: true });
    const dialog = await openCreate(page); await dialog.getByLabel('Judul', { exact: true }).fill('Keep this draft');
    const dismiss = async () => {
      if (close === 'Escape') await page.keyboard.press('Escape');
      else if (close === 'backdrop') await page.mouse.click(2, 2);
      else await dialog.getByRole('button', { name: 'Tutup formulir pengumuman' }).click();
    };
    let message = '';
    await dismiss(); await respondToConfirmation(page, false, value => { message = value; }); await expect(dialog).toBeVisible();
    expect(message).toContain('Buang perubahan'); await expect(dialog.getByLabel('Judul', { exact: true })).toHaveValue('Keep this draft');
    await dismiss(); await respondToConfirmation(page, true);
    await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  });
}
test('pending save locks fields, dismissal and duplicate submissions until response', async ({ page }) => {
  await setup(page, ['HR Manager']); await page.goto('/announcements'); await ready(page);
  let release!: () => void, writes = 0;
  await page.context().route('**/api/v1/announcements', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes++; await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { success: true, data: { id: 901 } } });
  });
  const dialog = await openCreate(page); await fillDraft(dialog); await dialog.getByRole('combobox', { name: 'Perusahaan tujuan', exact: true }).selectOption('2');
  await dialog.getByRole('button', { name: 'Simpan pengumuman' }).click(); await expect.poll(() => typeof release).toBe('function');
  try {
    await expect(dialog.getByLabel('Judul', { exact: true })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Tutup formulir pengumuman' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Batal', exact: true })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Menyimpan…' })).toBeDisabled();
    await page.keyboard.press('Escape'); await page.mouse.click(2, 2); await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible(); expect(writes).toBe(1);
  } finally { release(); }
  await expect(dialog).toHaveCount(0); expect(writes).toBe(1);
});

test('detail is fetched fresh, counts each open once, and forbidden/retried detail never shows prior content', async ({ page }) => {
  const state = await setup(page); await page.goto('/announcements'); await ready(page);
  await item(page, 1).getByRole('button', { name: /^Baca / }).click();
  const detail = page.getByRole('dialog', { name: 'Detail pengumuman' });
  await expect(detail.getByText('Nội dung đầy đủ / isi lengkap #200.', { exact: true })).toBeVisible();
  await expect.poll(() => state.calls.filter(call => call.path === '/announcements/200/view' && call.method === 'POST').length).toBe(1);
  await page.keyboard.press('Escape'); state.deniedDetails.add(201);
  await item(page, 2).getByRole('button', { name: /^Baca / }).click();
  await expect(detail.getByRole('alert')).toContainText('Synthetic forbidden detail');
  await expect(detail).not.toContainText('isi lengkap #200'); await expect(detail).not.toContainText('Ringkasan pengumuman lokal 2');
  state.deniedDetails.delete(201); await detail.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(detail).toContainText('isi lengkap #201');
  expect(state.calls.filter(call => call.path === '/announcements/201/view' && call.method === 'POST')).toHaveLength(1);
  await page.keyboard.press('Escape'); await item(page, 1).getByRole('button', { name: /^Baca / }).click();
  await expect(detail).toContainText('isi lengkap #200');
  expect(state.calls.filter(call => call.path === '/announcements/200/view' && call.method === 'POST')).toHaveLength(2);
});
test('closing an in-flight detail prevents its late response replacing a different announcement', async ({ page }) => {
  await setup(page); await page.goto('/announcements'); await ready(page);
  let release!: () => void;
  await page.context().route('**/api/v1/announcements/200', async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { success: true, data: { id: 200, title: 'STALE DETAIL', content: 'STALE DETAIL' } } });
  });
  await item(page, 1).getByRole('button', { name: /^Baca / }).click(); await expect.poll(() => typeof release).toBe('function');
  try {
    await page.keyboard.press('Escape'); await item(page, 2).getByRole('button', { name: /^Baca / }).click();
    await expect(page.getByRole('dialog', { name: 'Detail pengumuman' })).toContainText('isi lengkap #201');
  } finally {
    const response = page.waitForResponse(value => value.url().endsWith('/announcements/200'));
    release(); await (await response).finished();
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByRole('dialog', { name: 'Detail pengumuman' })).not.toContainText('STALE DETAIL');
});
test('publish/unpublish/delete require confirmation; pin and failures refresh only after successful writes', async ({ page }) => {
  const state = await setup(page, ['HR Manager']); await page.goto('/announcements'); await ready(page);
  await page.getByLabel('Status pengumuman').selectOption('draft');
  await expect(library(page).getByRole('heading', { name: 'Draft synthetic' })).toBeVisible();
  await page.getByRole('button', { name: 'Terbitkan Draft synthetic', exact: true }).click();
  await respondToConfirmation(page, false, message => { expect(message).toBe('Terbitkan pengumuman "Draft synthetic"?'); }); expect(state.writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Terbitkan Draft synthetic', exact: true }).click();
  await respondToConfirmation(page, true);
  await expect(library(page)).toContainText('Belum ada pengumuman yang sesuai');
  expect(state.writes[0]).toMatchObject({ path: '/announcements/299/publish', method: 'POST' });
  await page.getByLabel('Status pengumuman').selectOption('published'); await ready(page);
  const pin = item(page, 1).getByRole('button', { name: `Sematkan ${title(1)}`, exact: true }); await pin.click();
  await expect(item(page, 1)).toContainText('Disematkan'); expect(state.writes.at(-1)?.path).toBe('/announcements/200/toggle-pin');
  state.failWrite = true;
  await item(page, 1).getByRole('button', { name: /^Hapus / }).click(); await respondToConfirmation(page, true);
  await expect(page.getByText('Synthetic unavailable', { exact: true })).toBeVisible(); await expect(item(page, 1)).toBeVisible();
  state.failWrite = false;
  const before = state.writes.length; await item(page, 1).getByRole('button', { name: /^Hapus / }).click();
  await respondToConfirmation(page, false, message => { expect(message).toBe(`Hapus pengumuman "${title(1)}"?`); }); expect(state.writes).toHaveLength(before);
  await item(page, 1).getByRole('button', { name: /^Hapus / }).click(); await respondToConfirmation(page, true);
  await expect(item(page, 1)).toHaveCount(0); expect(state.writes.at(-1)).toMatchObject({ method: 'DELETE', path: '/announcements/200' });
  await item(page, 2).getByRole('button', { name: /^Tarik publikasi / }).click();
  await respondToConfirmation(page, true, message => { expect(message).toContain('Tarik publikasi'); }); await expect(item(page, 2)).toHaveCount(0);
  expect(state.writes.at(-1)?.path).toBe('/announcements/201/unpublish');
});

test('full width at 1920 and mobile 390 have no overflow; detail/form focus stays usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await setup(page, ['HR Manager']);
  await page.goto('/announcements'); await ready(page);
  await expect.poll(() => page.locator('.ph-announcements').evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(1400);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('announcements-desktop-1920.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.ph-announcements').evaluate(node => node.getBoundingClientRect().left)).toBeLessThan(25);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('announcements-mobile-390.png'), animations: 'disabled' });
  const trigger = item(page, 1).getByRole('button', { name: /^Baca / }); await trigger.click();
  const detail = page.getByRole('dialog', { name: 'Detail pengumuman' }); await expect(detail).toContainText('isi lengkap #200');
  await expect.poll(() => detail.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('announcements-detail-mobile.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  const dialog = await openCreate(page); await expect.poll(() => dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  const close = dialog.getByRole('button', { name: 'Tutup formulir pengumuman' }), save = dialog.getByRole('button', { name: 'Simpan pengumuman' });
  await close.focus(); await page.keyboard.press('Shift+Tab'); await expect(save).toBeFocused();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await save.scrollIntoViewIfNeeded(); await expect(save).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('announcements-create-mobile.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Buat pengumuman', exact: true })).toBeFocused();
});
