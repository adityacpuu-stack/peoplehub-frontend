import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, roles = ['CEO']) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const unexpected: string[] = [], errors: string[] = [];
  const state = { fail: '', delay: 0, empty: false };
  const employee = { id: 901, name: 'Synthetic Approver', employee_id: 'TEST-901', company_id: 1, profile_completed: true, national_id: '0000000000000901' };
  const person = { id: 902, name: 'Synthetic Staff', employee_id: 'TEST-902', department: { id: 1, name: 'Test Department' } };
  const leave = { id: 41, employee_id: 902, employee: person, leave_type_id: 1, leaveType: { id: 1, name: 'Annual Leave' },
    start_date: '2026-10-01', end_date: '2026-10-02', total_days: '2', status: 'pending', can_approve: true,
    reason: 'Synthetic leave', created_at: '2026-09-28T01:00:00Z' };
  const blocked = { ...leave, id: 42, employee: { ...person, name: 'Other Approver Assigned' }, can_approve: false };
  // Identical IDs across modules must not collide or hit the wrong decision endpoint.
  const overtime = { id: 41, employee: person, date: '2026-10-01', hours: '3', status: 'pending',
    reason: 'Synthetic overtime', created_at: '2026-09-28T02:00:00Z' };
  const history = { ...leave, id: 43, status: 'approved', approved_at: '2026-09-28T03:00:00Z' };
  await page.addInitScript(() => localStorage.setItem('token', 'isolated-shared-approvals'));
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const path = url.pathname.replace(/^\/api\/v1/, ''), method = req.method();
    if (['localhost','127.0.0.1'].includes(url.hostname) && !url.pathname.startsWith('/api/') && !['xhr','fetch'].includes(req.resourceType())) return route.continue();
    if (!url.pathname.startsWith('/api/')) return route.abort();
    // Client audit beacon (telemetry), not an application request under test.
    if (path === '/audit-logs/events' && method === 'POST') return route.fulfill({ status: 204 });
    calls.push({ path, method, body: req.postData() ? req.postDataJSON() : null });
    const json = (data: unknown) => route.fulfill({ json: { success: true, data } });
    if (state.fail === `${method} ${path}`) return route.fulfill({ status: 503, json: { success: false, error: { message: 'Synthetic failure' } } });
    // Assertions are English; the app defaults to Indonesian without an account language.
    if (path === '/auth/me') return json({ user: { id: 91, email: 'approver@example.test', roles, employee, language: 'en',
      permissions: [], is_active: true, force_password_change: false, accessibleCompanyIds: [1],
      companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } } });
    if (path === '/notifications/unread-count') return json({ unread_count: 0 });
    if (path === '/employees/me') return json(employee);
    if (['/notifications/announcement-popups','/presence'].includes(path)) return json([]);
    if (path === '/leaves/my-approvals') return json(state.empty ? [] : [leave, blocked, history]);
    if (path === '/leaves/pending-approvals') return json(state.empty ? [] : [leave, blocked].filter(r => r.status === 'pending'));
    if (path === '/overtime/pending-approvals') return json(state.empty || overtime.status !== 'pending' ? [] : [overtime]);
    if (method === 'POST' && /^\/(leaves|overtime)\/41\/(approve|reject)$/.test(path)) {
      if (state.delay) await new Promise(r => setTimeout(r, state.delay));
      const row = path.startsWith('/leaves') ? leave : overtime;
      row.status = path.endsWith('approve') ? 'approved' : 'rejected';
      return json(row);
    }
    unexpected.push(`${method} ${path}`);return route.abort();
  });
  return { calls, state, unexpected, errors };
}

for (const roles of [['CEO'], ['Group CEO'], ['CEO','HR Manager'], ['HR Manager'], ['HR Staff'], ['Manager']]) {
  test(`shared approval page preserves source scope: ${roles.join('+')}`, async ({ page }) => {
    const s = await setup(page, roles), executive = roles.includes('CEO') || roles.includes('Group CEO');
    await page.goto('/requests');await expect(page.getByRole('heading', { name: 'My Approval', exact: true })).toBeVisible();
    await expect(page.locator('[data-request-record]')).toHaveCount(executive ? 3 : 2);
    await expect(page.locator('[data-request-record]').filter({ hasText: 'Other Approver Assigned' }).getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
    expect(s.calls.some(c => c.path === '/leaves/my-approvals')).toBe(!executive || roles.includes('Manager'));
    expect(s.calls.some(c => c.path === '/overtime/pending-approvals')).toBe(executive);
    if (executive) {
      await expect(page.locator('aside a[href="/requests"]')).toHaveCount(1);
      await expect(page.locator('aside a[href="/ceo/approvals"]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Activity', exact: true })).toHaveCount(0);
    } else {
      await page.getByRole('button', { name: 'Activity', exact: true }).click();
      await page.getByLabel('Activity type', { exact: true }).selectOption('approved');
      await expect(page.locator('.request-activity li')).toHaveCount(1);
    }
    expect(s.unexpected).toEqual([]);expect(s.errors).toEqual([]);
  });
}

test('legacy executive bookmark redirects preserving query/hash; search and mobile filters work', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/ceo/approvals?tab=approvals#inbox');await expect(page).toHaveURL(/\/requests\?tab=approvals#inbox$/);
  await page.getByLabel('Request type', { exact: true }).selectOption('overtime');
  await expect(page.locator('[data-request-record]')).toHaveCount(1);
  await expect(page.locator('[data-request-record]')).toContainText('3');
  await page.getByLabel('Search requests', { exact: true }).fill('missing');
  await expect(page.getByText('No requests in this view')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('[data-request-record]')).toHaveCount(3);
  for (const width of [1440,390,320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `../.analysis/shared-approvals/page-${width}.png`, fullPage: true });
  }
  expect(s.unexpected).toEqual([]);expect(s.errors).toEqual([]);
});

test('same-ID leave and overtime decisions use their own endpoints and update badge', async ({ page }) => {
  const s = await setup(page);
  await page.goto('/requests');
  await expect(page.locator('aside a[href="/requests"]')).toContainText('2');
  const leave = page.locator('[data-request-record]').filter({ hasText: 'Annual Leave' }).filter({ hasText: 'Synthetic Staff' });
  await leave.getByRole('button', { name: 'Approve', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Approve Leave Request?' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(s.calls.filter(c => c.path.endsWith('/approve'))).toHaveLength(0);
  await leave.getByRole('button', { name: 'Approve', exact: true }).click();
  await dialog.getByLabel('Comment (Optional)').fill('  Confirmed  ');
  s.state.delay = 500;await dialog.getByRole('button', { name: 'Yes, Approve' }).click();
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(dialog).toHaveCount(0);
  expect(s.calls.filter(c => c.path === '/leaves/41/approve' && c.method === 'POST').map(c => c.body)).toEqual([{ approval_notes: 'Confirmed' }]);
  await expect(page.locator('aside a[href="/requests"]')).toContainText('1');
  const ot = page.locator('[data-request-record]').filter({ hasText: 'Synthetic overtime' });
  await ot.getByRole('button', { name: 'Reject', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Reject Overtime Request?' });
  await page.setViewportSize({ width: 390, height: 900 });
  await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: '../.analysis/shared-approvals/reject-overtime-390.png', fullPage: true });
  await dialog.getByLabel('Rejection Reason').fill('   ');await expect(dialog.getByRole('button', { name: 'Yes, Reject' })).toBeDisabled();
  await dialog.getByLabel('Rejection Reason').fill('  Duplicate request  ');
  s.state.fail = 'POST /overtime/41/reject';await dialog.getByRole('button', { name: 'Yes, Reject' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Synthetic failure');await expect(dialog.getByLabel('Rejection Reason')).toHaveValue('  Duplicate request  ');
  s.state.fail = '';await dialog.getByRole('button', { name: 'Yes, Reject' }).click();await expect(dialog).toHaveCount(0);
  expect(s.calls.filter(c => c.path === '/overtime/41/reject').at(-1)?.body).toEqual({ rejection_reason: 'Duplicate request' });
  expect(s.calls.some(c => c.path === '/leaves/41/reject')).toBe(false);
  expect(s.unexpected).toEqual([]);expect(s.errors).toEqual([]);
});

test('failed executive source shows retry instead of a partial success or false empty queue', async ({ page }) => {
  const s = await setup(page);s.state.fail = 'GET /overtime/pending-approvals';
  await page.goto('/requests');await expect(page.getByRole('button', { name: 'Retry requests' })).toBeVisible();
  await expect(page.locator('[data-request-record]')).toHaveCount(0);
  s.state.fail = '';await page.getByRole('button', { name: 'Retry requests' }).click();await expect(page.locator('[data-request-record]')).toHaveCount(3);
  s.state.empty = true;await page.getByRole('button', { name: 'Refresh', exact: true }).click();await expect(page.getByText('No requests in this view')).toBeVisible();
  expect(s.unexpected).toEqual([]);expect(s.errors).toEqual([]);
});

test('legacy executive route retains its role restriction', async ({ page }) => {
  const s = await setup(page, ['Employee']);
  await page.goto('/ceo/approvals');
  await expect(page).toHaveURL(/\/403$/);
  expect(s.calls.some(c => c.path.includes('/pending-approvals'))).toBe(false);
  expect(s.unexpected).toEqual([]);expect(s.errors).toEqual([]);
});
