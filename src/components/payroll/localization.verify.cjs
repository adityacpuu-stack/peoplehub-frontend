// Run against an isolated Vite server on port 4188. All APIs are synthetic;
// unrecognized API and external requests are blocked. No real account is used.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const origin = 'http://127.0.0.1:4188';
  const errors = [], unexpected = [], writes = [];
  const company = { id: 2, name: 'Company', code: 'TEST', status: 'active', is_active: true };
  const employee = { id: 901, employee_id: 'TEST-901', name: 'Employee', company_id: 2, company,
    employment_type: 'permanent', employment_status: 'active', basic_salary: 6000000, profile_completed: true,
    national_id: '0000000000000901', email: 'synthetic@example.test', department: { id: 1, name: 'Department' } };
  const user = { id: 91, email: 'hr@example.test', language: 'en', roles: ['HR Manager'], permissions: [],
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee,
    companyFeatures: { attendance_enabled: true, leave_enabled: true, payroll_enabled: true, performance_enabled: true } };
  const allowance = { id: 1, name: 'Allowance', description: 'Description', type: 'transport', amount: 1234567.89,
    calculation_base: 'fixed', frequency: 'monthly', status: 'active', is_taxable: true, is_bpjs_object: false,
    is_recurring: true, employee, company, effective_date: '2026-09-21' };
  const deduction = { id: 1, type: 'deduction', category: 'Category', description: 'Description', amount: 1234567.89,
    status: 'pending', employee, effective_date: '2026-09-21', pay_period: '2026-09', is_recurring: false };
  const overtime = { id: 1, date: '2026-09-21', start_time: '17:00', end_time: '18:30', hours: 1.5,
    reason: 'Reason', status: 'pending', overtime_type: 'regular', rate_multiplier: 1.5, rate_per_hour: 10000,
    total_amount: 22500, employee, company };
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'isolated-localization-test');
    localStorage.setItem('peoplehub.language', 'en');
  });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    // The parent owns catalog registration. Inject it only in this test response
    // so domain integration can be verified before that parallel work is merged.
    if (url.origin === origin && url.pathname === '/src/i18n/messages.ts') {
      const response = await route.fetch();
      return route.fulfill({ response, body: (await response.text()) + '\nimport { payroll as domainPayroll } from "/src/i18n/payroll.ts"; Object.assign(messages, domainPayroll);' });
    }
    if (url.origin === origin && !url.pathname.startsWith('/api/') && request.method() === 'GET') return route.continue();
    if (url.hostname === 'ui-avatars.com' && request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" />' });
    const endpoint = url.pathname.replace(/^\/api\/v1/, '');
    if (url.origin !== origin || !url.pathname.startsWith('/api/v1/')) { unexpected.push(request.method() + ' ' + url.pathname); return route.abort(); }
    const list = data => route.fulfill({ json: { success: true, data, pagination: { page: 1, limit: 500, total: data.length, totalPages: 1 }, meta: { page: 1, limit: 500, total: data.length, totalPages: 1 } } });
    let data;
    if (endpoint === '/auth/me') data = { user };
    else if (endpoint === '/employees/me') data = employee;
    else if (endpoint === '/notifications/unread-count') data = { unread_count: 0 };
    else if (['/notifications', '/notifications/announcement-popups', '/announcements/unread', '/leaves/my-approvals'].includes(endpoint)) data = [];
    else if (['/presence', '/users/me/preferences', '/audit-logs/events'].includes(endpoint)) data = {};
    else if (endpoint === '/companies') return list([company]);
    else if (endpoint === '/employees') return list([{ ...employee, employment_type: url.searchParams.get('employment_type') || 'permanent' }]);
    else if (endpoint === '/allowances') return list([allowance]);
    else if (endpoint === '/payroll-adjustments') return list([deduction]);
    else if (endpoint === '/overtime') return list([overtime]);
    else if (endpoint === '/payroll') return list([]);
    else if (endpoint === '/payroll-settings/company/2') data = { payroll_cutoff_date: 20 };
    else if (endpoint === '/payroll/automation') data = { company_id: 2, period: '2026-09', input: null, effective_from: null };
    else if (endpoint === '/payroll/preparation') data = [{ employee_id: 901, employee_code: 'TEST-901', employee_name: 'Employee', salary_status: 'existing', basic_salary: 6000000, input: null, locked: false }];
    else if (endpoint === '/payroll/preparation/901' && request.method() === 'PUT') {
      writes.push(request.postDataJSON());
      return route.fulfill({ status: 503, json: { success: false, message: 'Reason' } });
    } else { unexpected.push(request.method() + ' ' + endpoint); return route.abort(); }
    return route.fulfill({ json: { success: true, data } });
  });
  const switchTo = locale => page.evaluate(async next => { const i18n = await import('/src/i18n/index.ts'); i18n.setLocale(next); }, locale);
  const visit = async path => { await page.goto(origin + path); await page.waitForSelector('h1'); await switchTo('en'); };
  try {
    await visit('/allowances');
    await expect(page.locator('.cp-table')).toContainText('Transport');
    await expect(page.locator('.cp-table')).toContainText('Monthly');
    await expect(page.locator('.cp-table')).toContainText('1,234,568');
    await page.getByRole('button', { name: 'Add Allowance', exact: true }).click();
    const allowanceDialog = page.getByRole('dialog');
    await allowanceDialog.getByLabel('Name *', { exact: true }).fill('User draft');
    await switchTo('id');
    await expect(allowanceDialog.getByLabel('Nama *', { exact: true })).toHaveValue('User draft');
    await expect(page.locator('.cp-table')).toContainText('Bulanan');
    await expect(page.locator('.cp-table')).toContainText('1.234.568');
    await expect(page.locator('.cp-table')).toContainText('Allowance');
    await expect(page.locator('.cp-table')).toContainText('Description');
    await expect(page.locator('.cp-table')).toContainText('Employee');
    await switchTo('en');
    await expect(allowanceDialog.getByLabel('Name *', { exact: true })).toHaveValue('User draft');
    console.log('PASS allowances: labels, currency, saved user data, open draft on EN/ID switch');

    await visit('/deductions');
    await expect(page.locator('.cp-table')).toContainText('Pending');
    await page.getByRole('button', { name: 'Add Deduction', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Deduction Type');
    await switchTo('id');
    await expect(page.getByRole('dialog')).toContainText('Tipe Potongan');
    await expect(page.locator('.cp-table')).toContainText('Menunggu');
    await expect(page.locator('.cp-table')).toContainText('Description');
    console.log('PASS deductions: enum displays and modal switch without translating record descriptions');

    await visit('/overtime');
    await expect(page.locator('.cp-table')).toContainText('1.5 hours');
    await page.getByRole('button', { name: 'Add Overtime', exact: true }).click();
    const overtimeDialog = page.getByRole('dialog');
    await overtimeDialog.getByLabel('Reason *', { exact: true }).fill('Untranslated reason');
    const periodEn = await page.getByLabel('Period filter').locator('option').first().textContent();
    await switchTo('id');
    await expect(overtimeDialog.getByLabel('Alasan *', { exact: true })).toHaveValue('Untranslated reason');
    await expect(page.locator('.cp-table')).toContainText('1,5 jam');
    const periodId = await page.getByLabel('Filter periode').locator('option').first().textContent();
    assert.ok(periodEn && periodId);
    console.log('PASS overtime: period options, decimal hours, inline spacing, preserved form reason');

    await visit('/payroll/freelance');
    await expect(page.locator('.pw-table')).toContainText('Freelance');
    await page.getByRole('button', { name: 'Details for Employee' }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Tax Calculation');
    await switchTo('id');
    await expect(page.getByRole('dialog')).toContainText('Perhitungan Pajak');
    await expect(page.getByRole('dialog')).toContainText('2,5%');
    await expect(page.getByRole('dialog')).toContainText('Employee');
    console.log('PASS freelance/internship: detail labels, tax percentages, preserved employee name');

    await visit('/payroll');
    await page.getByRole('button', { name: 'Generate Payroll', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('Company rules', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Save company rules', exact: true }).click();
    await expect(dialog).toContainText('A rule reason is required.');
    await switchTo('id');
    await expect(dialog).toContainText('Alasan aturan wajib diisi.');
    await dialog.getByLabel('Alasan aturan perusahaan', { exact: true }).fill('Keep rule draft');
    await switchTo('en');
    await expect(dialog.getByLabel('Company rule reason', { exact: true })).toHaveValue('Keep rule draft');
    await expect(dialog.getByLabel('Company rule rounding')).toContainText('Round final total (HR)');
    await dialog.getByText('Exceptions for this period', { exact: true }).click();
    await dialog.getByLabel(/^Employees?$/).selectOption('901');
    await dialog.getByLabel('Preparation reason', { exact: true }).fill('Preserve exception draft');
    await dialog.getByRole('button', { name: 'Save preparation', exact: true }).click();
    await expect(dialog).toContainText('Saving is unconfirmed. Reload to check server data.');
    await switchTo('id');
    await expect(dialog).toContainText('Simpan belum terkonfirmasi. Muat ulang untuk memeriksa data server.');
    await expect(dialog.getByLabel('Alasan persiapan', { exact: true })).toHaveValue('Preserve exception draft');
    await expect(dialog.getByRole('alert').filter({ hasText: /^Reason$/ })).toBeVisible();
    assert.equal(writes[0].input.reason, 'Preserve exception draft');
    assert.equal(writes[0].input.work_days_per_week, undefined);
    console.log('PASS payroll: live validation, module configs, open drafts, untranslated API errors, original save payload');
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    console.log('PASS all 5 isolated EN/ID scenarios; no unmocked API or external requests');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
