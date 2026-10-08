import { test, expect, type Page } from '@playwright/test';

function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

// Server action catalog (GET /rbac/permissions/actions): covered keys and the
// built-in roles eligible for each. Synthetic permission names are stored-only.
const defaultActions = [
  { key: 'employee.view', group: 'employee', description: 'View other employees (list, detail, lookups)', eligible_roles: ['Super Admin', 'HR Manager', 'HR Staff', 'Manager'] },
  { key: 'payroll.approve', group: 'payroll', description: 'Approve/reject payroll and adjustments', eligible_roles: ['Super Admin', 'HR Manager'] },
];

async function mockRoles(page: Page, options: { roles?: string[]; language?: 'en' | 'id'; count?: number; legacyRole?: boolean; nullLevel?: boolean; assignedUsers?: number;
  permissionNames?: string[]; actions?: typeof defaultActions } = {}) {
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const permissions = Array.from({ length: options.count ?? 125 }, (_, index) => ({
    id: index + 1, name: options.permissionNames?.[index] ?? `synthetic.permission.${index + 1}`, description: `Synthetic permission ${index + 1}`,
    group: 'synthetic', guard_name: 'web', created_at: '', updated_at: '',
  }));
  const actions = options.actions ?? defaultActions;
  const roles = Array.from({ length: 112 }, (_, index) => ({
    id: index + 1, name: index === 0 ? 'Super Admin' : index === 1 && options.legacyRole ? 'HR Manager' : `Synthetic Role ${index + 1}`,
    description: '', level: index === 1 ? options.nullLevel ? null : 1 : 8, is_system: index === 0,
    guard_name: 'web', created_at: '', updated_at: '', _count: { userRoles: index === 1 ? options.assignedUsers ?? 0 : 0, rolePermissions: 0 },
  }));
  const assigned = new Map<number, number[]>([[2, permissions.length ? [1] : []]]);
  const state = {
    calls: [] as string[], unexpected: [] as string[], errors: [] as string[],
    writes: [] as { role_id: number; permission_ids: number[]; permission_mode?: string }[],
    syncs: 0,
    roleWrites: [] as { method: string; body: unknown }[],
    failCatalog: false, failDetail: 0, failSave: false, failForm: false, failDelete: false,
    saveGate: undefined as ReturnType<typeof gate> | undefined,
    formGate: undefined as ReturnType<typeof gate> | undefined,
    detailGates: new Map<number, ReturnType<typeof gate>>(),
  };
  const user = { id: 99001, email: 'synthetic@example.test', roles: options.roles ?? ['Super Admin'],
    language: options.language ?? 'en', permissions: [], employee: null, is_active: true,
    force_password_change: false, accessibleCompanyIds: [] };
  await page.addInitScript(() => localStorage.setItem('token', 'synthetic-roles-only'));
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin && !url.pathname.startsWith('/api/') && !['fetch', 'xhr'].includes(request.resourceType())) return route.continue();
    if (url.origin === 'https://ui-avatars.com') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = request.method();
    state.calls.push(`${method} ${path}${url.search}`);
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } });
    const fail = () => route.fulfill({ status: 500, json: { error: { message: 'Synthetic failure' } } });
    if (path === '/auth/me') return ok({ user });
    if (path === '/users/me/language') { user.language = request.postDataJSON().language; return ok(user); }
    if (path === '/notifications/unread-count') return ok({ unread_count: 0 });
    if (['/notifications/announcement-popups', '/companies', '/presence', '/audit-logs/recent'].includes(path)) return ok([]);
    if (path === '/audit-logs/events') return ok({});
    if (method === 'GET' && path === '/rbac/permissions/actions') return ok({ modes: ['legacy', 'enforced'], actions });
    if (method === 'POST' && path === '/rbac/permissions/sync-catalog') {
      state.syncs++;
      // Additive catalog registration only; never touches role assignments or modes.
      const created = actions.filter(action => !permissions.some(item => item.name === action.key)).map(action => action.key);
      created.forEach(key => permissions.push({ id: permissions.length + 1, name: key, description: actions.find(action => action.key === key)!.description,
        group: key.split('.')[0], guard_name: 'web', created_at: '', updated_at: '' }));
      return ok({ created, existing: [], total: actions.length });
    }
    if (method === 'GET' && ['/rbac/roles', '/rbac/permissions'].includes(path)) {
      const current = Number(url.searchParams.get('page') || 1);
      const limit = Number(url.searchParams.get('limit') || 50);
      if (state.failCatalog && current === 2) return fail();
      const list = path.endsWith('/roles') ? roles : permissions;
      return route.fulfill({ json: { data: list.slice((current - 1) * limit, current * limit),
        pagination: { page: current, limit, total: list.length, totalPages: Math.ceil(list.length / limit) } } });
    }
    if (path === '/rbac/roles/assign-permissions' && method === 'POST') {
      const body = request.postDataJSON();
      state.writes.push(body);
      if (state.saveGate) await state.saveGate.promise;
      if (state.failSave) return fail();
      assigned.set(body.role_id, body.permission_ids);
      if (body.permission_mode) Object.assign(roles.find(item => item.id === body.role_id)!, { permission_mode: body.permission_mode });
      return ok({ message: 'saved' });
    }
    if (path === '/rbac/roles' && method === 'POST') {
      const body = request.postDataJSON();
      state.roleWrites.push({ method, body });
      if (state.formGate) await state.formGate.promise;
      if (state.failForm) return fail();
      const role = { ...roles[1], ...body, id: 999, _count: { userRoles: 0, rolePermissions: 0 } };
      roles.push(role);
      return ok({ ...role, rolePermissions: [] });
    }
    const detail = path.match(/^\/rbac\/roles\/(\d+)$/);
    if (detail) {
      const id = Number(detail[1]);
      const role = roles.find(item => item.id === id)!;
      if (method === 'GET') {
        if (state.detailGates.has(id)) await state.detailGates.get(id)!.promise;
        if (state.failDetail === id) return fail();
        return ok({ ...role, rolePermissions: (assigned.get(id) ?? []).map(permissionId => ({ permission: permissions[permissionId - 1] })) });
      }
      if (method === 'PUT') {
        const body = request.postDataJSON();
        state.roleWrites.push({ method, body });
        if (state.formGate) await state.formGate.promise;
        if (state.failForm) return fail();
        Object.assign(role, body);
        return ok({ ...role, rolePermissions: (assigned.get(id) ?? []).map(permissionId => ({ permission: permissions[permissionId - 1] })) });
      }
      if (method === 'DELETE') {
        state.roleWrites.push({ method, body: id });
        if (state.failDelete) return fail();
        roles.splice(roles.indexOf(role), 1);
        return ok({});
      }
    }
    state.unexpected.push(`${method} ${url.pathname}`);
    return route.abort();
  });
  return state;
}

const roleButton = (page: Page, id: number) => page.locator('.admin-scope-buttons button').filter({ has: page.getByText(`Synthetic Role ${id}`, { exact: true }) });
const permission = (page: Page, id: number) => page.locator('.admin-permission-options button').filter({ has: page.getByText(`synthetic.permission.${id}`, { exact: true }) });
const save = (page: Page) => page.getByRole('button', { name: 'Save', exact: true });
const clean = (state: Awaited<ReturnType<typeof mockRoles>>) => { expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([]); };

test('loads every role/permission page and never gives a custom level-one role Super Admin authority', async ({ page }) => {
  const state = await mockRoles(page);
  await page.goto('/roles');
  await expect(page.locator('.admin-scope-buttons button')).toHaveCount(112);
  await roleButton(page, 2).click();
  await expect(page.locator('.admin-permission-options button')).toHaveCount(125);
  await expect(page.getByText('1 of 125 registered permissions selected', { exact: true })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('never more than its built-in role allows');
  await expect(permission(page, 125)).toBeEnabled();
  await page.getByPlaceholder('Search roles...').fill('Role 112');
  await expect(page.locator('.admin-scope-buttons button')).toHaveCount(1);
  await roleButton(page, 112).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Role 112', exact: true })).toBeVisible();
  expect(state.calls).toContain('GET /rbac/permissions?page=2&limit=100');
  expect(state.calls).toContain('GET /rbac/roles?page=2&limit=100');
  clean(state);
});

test('draft cancellation, same-role selection, exact dirty comparison, discard and reset', async ({ page }) => {
  const state = await mockRoles(page);
  await page.goto('/roles');
  await roleButton(page, 2).click();
  await permission(page, 125).click();
  await roleButton(page, 2).click();
  await expect(permission(page, 125)).toHaveAttribute('aria-pressed', 'true');
  await roleButton(page, 3).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(permission(page, 125)).toHaveAttribute('aria-pressed', 'true');
  await permission(page, 125).click();
  await expect(save(page)).toHaveCount(0);
  await permission(page, 124).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(permission(page, 124)).toHaveAttribute('aria-pressed', 'false');
  await permission(page, 125).click();
  await roleButton(page, 3).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Role 3', exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
  clean(state);
});

test('save failure keeps the draft; delayed retry freezes all mutations and commits a fresh reset baseline', async ({ page }) => {
  const state = await mockRoles(page);
  state.failSave = true;
  await page.goto('/roles');
  await roleButton(page, 2).click();
  await permission(page, 125).click();
  await save(page).click();
  await expect(page.getByText('Synthetic failure', { exact: true }).first()).toBeVisible();
  await expect(permission(page, 125)).toHaveAttribute('aria-pressed', 'true');
  await expect(save(page)).toBeEnabled();
  state.failSave = false;
  state.saveGate = gate();
  await save(page).click();
  await expect.poll(() => state.writes.length).toBe(2);
  for (const control of [save(page), permission(page, 124), roleButton(page, 3), page.getByRole('button', { name: 'Reset', exact: true }),
    page.getByRole('button', { name: 'Create Role', exact: true }), page.getByRole('button', { name: 'Edit', exact: true }),
    page.locator('.admin-permission-group').getByRole('button', { name: 'All', exact: true })]) await expect(control).toBeDisabled();
  state.failDetail = 2; // A redundant post-save refresh would now fail.
  state.saveGate.release();
  await expect(save(page)).toHaveCount(0);
  await expect(page.getByText('2 of 125 registered permissions selected', { exact: true })).toBeVisible();
  await permission(page, 124).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(permission(page, 125)).toHaveAttribute('aria-pressed', 'true');
  await expect(permission(page, 124)).toHaveAttribute('aria-pressed', 'false');
  expect(state.writes).toEqual([{ role_id: 2, permission_ids: [1, 125] }, { role_id: 2, permission_ids: [1, 125] }]);
  expect(state.calls.filter(call => call === 'GET /rbac/roles/2')).toHaveLength(1);
  clean(state);
});

test('failed catalog pages fail closed with retry; detail retries and late responses cannot replace the current selection', async ({ page }) => {
  const state = await mockRoles(page);
  state.failCatalog = true;
  await page.goto('/roles');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(page.locator('.admin-permission-options button')).toHaveCount(0);
  state.failCatalog = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  state.failDetail = 2;
  await roleButton(page, 2).click();
  await expect(page.getByRole('alert')).toContainText('Failed to load role details');
  state.failDetail = 0;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Role 2', exact: true })).toBeVisible();
  const delayed = gate();
  state.detailGates.set(3, delayed);
  await roleButton(page, 3).click();
  await expect.poll(() => state.calls.includes('GET /rbac/roles/3')).toBe(true);
  await roleButton(page, 4).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Role 4', exact: true })).toBeVisible();
  const returned = page.waitForResponse(response => response.url().endsWith('/rbac/roles/3'));
  delayed.release();
  await returned;
  await expect(page.getByRole('heading', { name: 'Synthetic Role 4', exact: true })).toBeVisible();
  clean(state);
});

test('edit preserves permission drafts; form failure and busy controls retain input; create selects its new role', async ({ page }) => {
  const state = await mockRoles(page);
  await page.goto('/roles');
  await roleButton(page, 2).click();
  await permission(page, 125).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input').first().fill('Renamed synthetic role');
  state.failForm = true;
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await expect(dialog.locator('input').first()).toHaveValue('Renamed synthetic role');
  state.failForm = false;
  state.formGate = gate();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => state.roleWrites.length).toBe(2);
  await expect(dialog.locator('input').first()).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Close dialog', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  state.formGate.release();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Renamed synthetic role', exact: true })).toBeVisible();
  await expect(permission(page, 125)).toHaveAttribute('aria-pressed', 'true');
  await expect(save(page)).toBeVisible();
  await page.getByRole('button', { name: 'Create Role', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(permission(page, 125)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await page.getByRole('button', { name: 'Create Role', exact: true }).click();
  await dialog.locator('input').first().fill('Created synthetic role');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Created synthetic role', exact: true })).toBeVisible();
  await expect(page.locator('.admin-scope-buttons button[aria-pressed="true"]')).toContainText('Created synthetic role');
  clean(state);
});

test('delete failure/cancel retains the selected role and draft; success removes them', async ({ page }) => {
  const state = await mockRoles(page);
  await page.goto('/roles');
  await roleButton(page, 2).click();
  await permission(page, 125).click();
  const remove = page.locator('.admin-scope-detail').getByRole('button', { name: 'Delete', exact: true }).first();
  await remove.click();
  state.failDelete = true;
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' })).toBeEnabled();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(permission(page, 125)).toHaveAttribute('aria-pressed', 'true');
  state.failDelete = false;
  await remove.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(roleButton(page, 2)).toHaveCount(0);
  await expect(save(page)).toHaveCount(0);
  clean(state);
});

test('canonical Super Admin is recognized by name even with different level metadata', async ({ page }) => {
  const state = await mockRoles(page);
  await page.goto('/roles');
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'Super Admin' }).click();
  await expect(page.getByText('Super Admin access follows built-in role rules, independently of these assignments.', { exact: true })).toBeVisible();
  await expect(page.locator('.admin-permission-options button')).toHaveCount(0);
  clean(state);
});

test('legacy built-in identity is protected without a system flag while description edits remain supported', async ({ page }) => {
  const state = await mockRoles(page, { legacyRole: true });
  await page.goto('/roles');
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'HR Manager' }).click();
  await expect(page.locator('.admin-scope-detail').getByRole('button', { name: 'Delete', exact: true }).first()).toBeDisabled();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('input').first()).toBeDisabled();
  await expect(dialog.locator('input[type=number]')).toBeDisabled();
  await dialog.locator('textarea').fill('Synthetic description update');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.roleWrites).toEqual([{ method: 'PUT', body: { name: 'HR Manager', description: 'Synthetic description update' } }]);
  clean(state);
});

test('editing a description preserves a missing level', async ({ page }) => {
  const state = await mockRoles(page, { nullLevel: true });
  await page.goto('/roles');
  await roleButton(page, 2).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('input[type=number]')).toHaveValue('');
  await dialog.locator('textarea').fill('Synthetic description update');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.roleWrites).toEqual([{ method: 'PUT', body: { name: 'Synthetic Role 2', description: 'Synthetic description update' } }]);
  clean(state);
});

test('assigned custom roles cannot be deleted from the page', async ({ page }) => {
  const state = await mockRoles(page, { assignedUsers: 3 });
  await page.goto('/roles');
  await roleButton(page, 2).click();
  await expect(page.locator('.admin-scope-detail').getByRole('button', { name: 'Delete', exact: true }).first()).toBeDisabled();
  await expect(page.getByText('Remove assigned users before deleting this role.', { exact: true })).toBeVisible();
  expect(state.roleWrites).toEqual([]);
  clean(state);
});

for (const role of ['Employee', 'HR Manager', 'Synthetic Role 2']) {
  test(`${role} direct role route cannot expose write controls`, async ({ page }) => {
    const state = await mockRoles(page, { roles: [role] });
    await page.goto('/roles');
    if (role === 'HR Manager') {
      // The route owner may retain denial or allow existing API read access.
      await expect(page.getByRole('heading').first()).toBeVisible();
      if (new URL(page.url()).pathname === '/roles') {
        await roleButton(page, 2).click();
        await expect(permission(page, 125)).toBeDisabled();
        await expect(page.getByText('Read-only access', { exact: true })).toBeVisible();
      } else await expect(page).toHaveURL(/\/403$/);
    } else await expect(page).toHaveURL(/\/403$/);
    await expect(page.getByRole('button', { name: 'Create Role', exact: true })).toHaveCount(0);
    await expect(save(page)).toHaveCount(0);
    expect(state.writes).toEqual([]);
    clean(state);
  });
}

const modeRadio = (page: Page, name: 'Legacy' | 'Enforced') => page.getByTestId('permission-mode').getByRole('radio', { name: new RegExp(`^${name}`) });

test('permission mode is part of the draft: reset, failure and atomic save with the permission set', async ({ page }) => {
  const state = await mockRoles(page, { legacyRole: true });
  await page.goto('/roles');
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'HR Manager' }).click();
  await expect(modeRadio(page, 'Legacy')).toBeChecked();
  await modeRadio(page, 'Enforced').check();
  // Switching mode never auto-selects permissions.
  await expect(page.getByText('1 of 125 registered permissions selected', { exact: true })).toBeVisible();
  await expect(page.getByText('Mode change is not saved yet. Review the selection, then Save.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(modeRadio(page, 'Legacy')).toBeChecked();
  await expect(save(page)).toHaveCount(0);
  await modeRadio(page, 'Enforced').check();
  state.failSave = true;
  await save(page).click();
  await expect(page.getByText('Synthetic failure', { exact: true }).first()).toBeVisible();
  await expect(modeRadio(page, 'Enforced')).toBeChecked();
  state.failSave = false;
  await save(page).click();
  await expect(save(page)).toHaveCount(0);
  expect(state.writes).toEqual([
    { role_id: 2, permission_ids: [1], permission_mode: 'enforced' },
    { role_id: 2, permission_ids: [1], permission_mode: 'enforced' },
  ]);
  await expect(page.locator('.admin-scope-buttons button').filter({ hasText: 'HR Manager' })).toContainText('Enforced');
  // Leaving another role untouched must not resend a mode.
  await roleButton(page, 3).click();
  await permission(page, 2).click();
  await save(page).click();
  await expect.poll(() => state.writes.length).toBe(3);
  expect(state.writes[2]).toEqual({ role_id: 3, permission_ids: [2] });
  clean(state);
});

test('navigating away from an unsaved mode change asks before discarding', async ({ page }) => {
  const state = await mockRoles(page, { legacyRole: true });
  await page.goto('/roles');
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'HR Manager' }).click();
  await modeRadio(page, 'Enforced').check();
  await roleButton(page, 3).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(modeRadio(page, 'Enforced')).toBeChecked();
  expect(state.writes).toEqual([]);
  clean(state);
});

test('Super Admin stays legacy and cannot be toggled', async ({ page }) => {
  const state = await mockRoles(page);
  await page.goto('/roles');
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'Super Admin' }).click();
  await expect(page.getByTestId('permission-mode')).toContainText('Super Admin access cannot be enforced');
  await expect(page.getByTestId('permission-mode').getByRole('radio')).toHaveCount(0);
  clean(state);
});

test('labels separate supported keys, role eligibility and stored-only permissions honestly', async ({ page }) => {
  const state = await mockRoles(page, { legacyRole: true, permissionNames: ['employee.view', 'payroll.approve'] });
  await page.goto('/roles');
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'HR Manager' }).click();
  const status = (id: number) => page.locator('.admin-permission-options button').nth(id - 1).locator('[data-permission-status]');
  await expect(status(1)).toHaveAttribute('data-permission-status', 'supported');
  await expect(status(3)).toHaveAttribute('data-permission-status', 'stored-only');
  await expect(status(3)).toHaveText('Stored only — not enforced');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Synthetic data only; English desktop viewport capture for visual review (full page is unreadably tall).
  await page.screenshot({ path: '../.analysis/role-permissions/roles-en-desktop.png' });
  await roleButton(page, 3).click();
  await expect(status(2)).toHaveAttribute('data-permission-status', 'not-eligible');
  await modeRadio(page, 'Enforced').check();
  await expect(page.getByText('Custom roles are not eligible for any supported action, so enforcing this role grants nothing.', { exact: true })).toBeVisible();
  clean(state);
});

test('empty catalog can be initialised explicitly without grants or mode changes', async ({ page }) => {
  const state = await mockRoles(page, { count: 0, legacyRole: true });
  await page.goto('/roles');
  await page.getByTestId('catalog-sync').getByRole('button', { name: 'Register supported actions' }).click();
  await expect(page.getByTestId('catalog-sync')).toHaveCount(0);
  expect(state.syncs).toBe(1);
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'HR Manager' }).click();
  await expect(page.locator('.admin-permission-options button')).toHaveCount(2);
  await expect(page.locator('.admin-permission-options button[aria-pressed="true"]')).toHaveCount(0);
  await expect(modeRadio(page, 'Legacy')).toBeChecked();
  expect(state.writes).toEqual([]);
  clean(state);
});

test('Indonesian copy for mode and status labels', async ({ page }) => {
  const state = await mockRoles(page, { language: 'id', legacyRole: true, permissionNames: ['employee.view'] });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/roles');
  // Built-in role names are displayed localized ("HR Manager" -> "Manajer SDM").
  await page.locator('.admin-scope-buttons button').filter({ hasText: 'Manajer SDM' }).click();
  await expect(page.getByTestId('permission-mode')).toContainText('Mode permission');
  await expect(page.getByText('Hanya tersimpan — tidak diterapkan', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Aksi terdukung', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Synthetic data only; viewport capture for visual review (full page is unreadably tall).
  await page.screenshot({ path: '../.analysis/role-permissions/roles-id-mobile.png' });
  clean(state);
});

test('empty permission catalog and Indonesian mobile notice remain usable without overflow', async ({ page }) => {
  const state = await mockRoles(page, { language: 'id', count: 0 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/roles');
  await roleButton(page, 2).click();
  await expect(page.getByRole('note')).toContainText('tidak pernah melebihi batas role bawaannya');
  await expect(page.getByText('Belum ada permission terdaftar', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  clean(state);
});
