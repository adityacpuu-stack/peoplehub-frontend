// Isolated browser verification: in-memory bundle, synthetic API routes, no live backend.
// Run: node src/pages/admin/localization.browser.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../../..');
const pages = [
  ['Users', 'admin/UsersPage', 'UsersPage', 'User Management'],
  ['Roles', 'admin/RolesPage', 'RolesPage', 'Roles & Permissions'],
  ['Approval', 'admin/ApprovalSettingsPage', 'ApprovalSettingsPage', 'Approval Settings'],
  ['Audit', 'admin/AuditLogsPage', 'AuditLogsPage', 'Audit trail'],
  ['AdminCompanies', 'admin/CompaniesPage', 'CompaniesPage', 'Manajemen Perusahaan'],
  ['Assignments', 'admin/CompanyAssignmentsPage', 'CompanyAssignmentsPage', 'Company Assignments'],
  ['Features', 'admin/CompanyFeaturesPage', 'CompanyFeaturesPage', 'Company Feature Settings'],
  ['Payroll', 'admin/PayrollSettingsPage', 'PayrollSettingsPage', 'Pengaturan Payroll'],
  ['Menus', 'admin/RoleDashboardConfigPage', 'RoleDashboardConfigPage', 'Menu Role Config'],
  ['System', 'admin/SystemConfigPage', 'SystemConfigPage', 'System Configuration'],
  ['Companies', 'companies/CompaniesPage', 'CompaniesPage', 'Companies'],
  ['Departments', 'departments/DepartmentsPage', 'DepartmentsPage', 'Departments'],
  ['Positions', 'positions/PositionsPage', 'PositionsPage', 'Positions'],
  ['Locations', 'work-locations/WorkLocationsPage', 'WorkLocationsPage', 'Work Locations'],
  ['Holidays', 'holiday-calendar/HolidayCalendarPage', 'HolidayCalendarPage', 'Holiday Calendar'],
];

(async () => {
  const entry = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter } from 'react-router-dom';
    import { setLocale, t } from './src/i18n';
    import { messages } from './src/i18n/messages';
    import { administration } from './src/i18n/administration';
    import { useAuthStore } from './src/stores/auth.store';
    ${pages.map(([id, file, exp]) => `import { ${exp} as ${id} } from './src/pages/${file}';`).join('\n')}
    // Parent registers the catalog separately; this test supplies it in memory only.
    Object.assign(messages, administration);
    useAuthStore.setState({user: {id: 900, email:'admin@example.test', roles:['Super Admin'], accessibleCompanyIds:[1], employee:null}, isAuthenticated:true, isLoading:false});
    const root = createRoot(document.getElementById('root'));
    const pages = {${pages.map(([id]) => id).join(',')}};
    window.__locale = setLocale;
    window.__t = t;
    window.__mount = id => root.render(React.createElement(MemoryRouter, {key:id}, React.createElement(pages[id])));
  `;
  const bundle = await esbuild.build({
    absWorkingDir: root, stdin: { contents: entry, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    alias: { '@': path.join(root, 'src') },
    define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{"VITE_API_URL":"/api/v1","DEV":false}' },
    plugins: [{ name: 'ignore-test-styles', setup(build) {
      build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'css' }));
    } }],
    outdir: 'in-memory', logLevel: 'silent',
  });
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [], writes = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    const company = { id: 1, name: 'Leave', code: 'SYN', type: 'Subsidiary', company_type: 'subsidiary', is_active: true, status: 'active', employee_count: 1, _count: { employees: 1 }, email_domain: 'example.test', attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true };
    const role = { id: 5, name: 'HR Staff', level: 5, is_system: true, description: 'Custom description', _count: { userRoles: 1, rolePermissions: 0 } };
    const user = { id: 1, email: 'member@example.test', is_active: true, created_at: '2026-01-01T00:00:00Z', roles: [role], employee: { id: 2, employee_id: 'SYN-2', name: 'Leave', personal_email: 'personal@example.test', company, position: null }, last_login_at: null };
    const audit = { id: 8, action: 'create', model: 'Employee', model_id: 2, description: 'Leave', employee_name: 'Company', user_id: 1, created_at: '2026-01-01T18:00:00Z', context: { source: 'server', outcome: 'success', status_code: 201 }, old_values: { note: 'Leave' } };
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== 'http://peoplehub.test') { external.push(req.url()); return route.abort(); }
      if (req.resourceType() === 'document') return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' });
      if (!url.pathname.startsWith('/api/v1/')) return route.abort();
      if (req.method() !== 'GET') { writes.push({ path: url.pathname, body: req.postDataJSON() }); return route.fulfill({ json: { success: true, data: user } }); }
      const p = url.pathname.replace('/api/v1', '');
      if (p === '/companies/feature-toggles/all') return route.fulfill({ json: [company] });
      if (p === '/holidays/calendar') return route.fulfill({ json: { holidays: [] } });
      let data = [];
      if (p === '/users') data = [user];
      else if (p === '/users/stats') data = { total: 1234, active: 1, inactive: 0, recentLogins: 1 };
      else if (p === '/users/m365-licenses') data = { available: true, licenses: [{ skuId: 'synthetic-sku', displayName: 'Test License', availableUnits: 2, totalUnits: 4 }] };
      else if (p === '/users/m365-user-status') data = { available: true, exists: false, licenses: [] };
      else if (p.includes('/companies')) data = [company];
      else if (p.includes('/roles')) data = [role];
      else if (p === '/audit-logs/statistics') data = { total_logs: 1, by_action: [], by_user: [], by_model: [] };
      else if (p === '/audit-logs') data = [audit];
      else if (p === '/audit-logs/8') data = audit;
      const pagination = { total: Array.isArray(data) ? data.length : 0, totalPages: 1, page: 1, limit: 20 };
      return route.fulfill({ json: { success: true, data, meta: pagination, pagination } });
    });
    await page.goto('http://peoplehub.test');
    await page.addScriptTag({ content: bundle.outputFiles.find(file => file.path.endsWith('.js')).text });
    for (const [id, , , source] of pages) {
      console.log(`Checking ${id}`);
      await page.evaluate(id => { window.__locale('en'); window.__mount(id); }, id);
      const en = await page.evaluate(source => window.__t(source), source);
      await page.getByRole('heading', { name: en, exact: true }).first().waitFor();
      await page.evaluate(() => window.__locale('id'));
      const indonesian = await page.evaluate(source => window.__t(source), source);
      await page.getByRole('heading', { name: indonesian, exact: true }).first().waitFor();
    }

    // Keep the exact form node and its unsaved value while switching twice.
    await page.evaluate(() => { window.__locale('en'); window.__mount('Users'); });
    await page.getByTitle('Edit', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    const input = dialog.getByLabel('Email', { exact: true });
    await input.fill('draft@example.test');
    await input.evaluate(node => { window.__formNode = node; });
    await page.evaluate(() => window.__locale('id'));
    await page.getByRole('dialog', { name: 'Edit Pengguna', exact: true }).waitFor();
    assert.equal(await input.inputValue(), 'draft@example.test');
    assert.equal(await input.evaluate(node => node === window.__formNode), true);
    await page.evaluate(() => window.__locale('en'));
    assert.equal(await input.inputValue(), 'draft@example.test');
    await dialog.getByRole('button', { name: 'Update', exact: true }).click();
    assert.deepEqual(writes.at(-1), { path: '/api/v1/users/1', body: { email: 'draft@example.test', role_ids: [5], is_active: true } });

    await page.getByTitle('Send Credentials', { exact: true }).click();
    await page.getByRole('dialog', { name: 'Send Credentials', exact: true }).waitFor();
    await page.getByText('Test License', { exact: false }).waitFor({ state: 'attached' });
    await page.evaluate(() => window.__locale('id'));
    await page.getByRole('dialog', { name: 'Kirim Kredensial', exact: true }).waitFor();
    assert.equal(await page.locator('#credential-license option[value="synthetic-sku"]').getAttribute('value'), 'synthetic-sku');
    assert.match(await page.locator('#credential-license').textContent(), /2\/4 tersedia/);
    assert.equal(writes.some(write => write.path.endsWith('/send-credentials')), false);

    await page.evaluate(() => { window.__locale('en'); window.__mount('Holidays'); });
    await page.getByRole('button', { name: 'Add Holiday', exact: true }).click();
    const holiday = page.getByRole('dialog');
    await holiday.locator('input[type="text"]').fill('Leave');
    await holiday.locator('input[type="date"]').fill('2026-12-25');
    await holiday.locator('#md-holiday-calendar-field-4').selectOption('religious');
    await holiday.locator('textarea').fill('Company');
    await page.evaluate(() => window.__locale('id'));
    await page.getByRole('dialog', { name: 'Tambah Hari Libur', exact: true }).waitFor();
    assert.equal(await holiday.locator('input[type="text"]').inputValue(), 'Leave');
    assert.equal(await holiday.locator('input[type="date"]').inputValue(), '2026-12-25');
    assert.equal(await holiday.locator('#md-holiday-calendar-field-4').inputValue(), 'religious');
    assert.equal(await holiday.locator('textarea').inputValue(), 'Company');
    await holiday.getByRole('button', { name: 'Tambah Hari Libur', exact: true }).click();
    assert.deepEqual(writes.at(-1), { path: '/api/v1/holidays', body: { name: 'Leave', date: '2026-12-25', type: 'religious', company_id: null, description: 'Company', is_recurring: false } });

    await page.evaluate(() => { window.__locale('en'); window.__mount('Audit'); });
    await page.getByRole('button', { name: 'Activity details 8', exact: true }).click();
    await page.getByRole('dialog').getByRole('heading', { name: 'Create', exact: true }).waitFor();
    await page.evaluate(() => window.__locale('id'));
    await page.getByRole('dialog', { name: 'Detail aktivitas #8', exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').locator('pre').textContent(), JSON.stringify({ note: 'Leave' }, null, 2));
    assert.equal(await page.getByRole('dialog').getByText('Company', { exact: true }).textContent(), 'Company');
    assert.match(await page.locator('table time').textContent(), /02 Jan 2026.*01[.:]00[.:]00/);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(`PASS: ${pages.length} pages switch EN/ID; user form node/value survives both switches; exact mocked role and holiday payloads; M365 labels/SKU unchanged; audit data and WIB preserved; no external requests.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
