// Run from frontend/: node src/components/leave/localization-check.cjs
// All API traffic is synthetic; env files and external requests are disabled.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('@playwright/test');

(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    configFile: false, envDir: false,
    resolve: { alias: { '@': path.resolve('src') } }, esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom/client'] },
    server: { host: '127.0.0.1', port: 4198, strictPort: true, hmr: false }, logLevel: 'error',
  });
  await server.listen();
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    const policy = { id: 71, name: 'Annual Leave', code: 'annual', default_days: 12, min_days_per_request: 1, max_days_per_request: 12, is_active: true };
    const balances = [{ id: 1, leave_type_id: 71, year: 2026, allocated_days: '12.5', used_days: '1', pending_days: '0.5', remaining_days: '11.5', leaveType: policy }];
    const template = { id: 1, company_id: 1, name: 'Policy', description: 'Annual Leave', category: 'form', file_type: 'pdf', file_name: 'Synthetic.pdf', file_size: 1536, version: '1.0', is_active: true, company: { id: 1, name: 'Company' }, updated_at: '2026-09-01T00:00:00Z' };
    const announcement = { id: 1, company_id: 1, title: 'Approved', content: 'Annual Leave', category: 'general', priority: 'normal', visibility: 'all', target_ids: [], target_company_ids: [], is_global: false, is_pinned: false, is_published: true, expires_at: null, created_at: '2026-09-01T00:00:00Z', company: { id: 1, name: 'Company' }, permissions: { can_edit: true, can_delete: true } };
    const html = `<!doctype html><html><body><div id="root"></div><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import {MyLeavePage} from '/src/pages/manager/MyLeavePage.tsx';
      import {LeaveBalanceDialog} from '/src/components/leave/LeaveBalanceDialog.tsx';
      import {useResourceConfirmation} from '/src/pages/resources/ResourceConfirmation.tsx';
      import {leaveRequestSchema} from '/src/schemas/leave-request.schema.ts';
      import {setLocale,t} from '/src/i18n/index.ts';
      import {messages} from '/src/i18n/messages.ts';
      import {leaveResources} from '/src/i18n/leaveResources.ts';
      import {TemplatesPage} from '/src/pages/resources/TemplatesPage.tsx';
      import {AnnouncementsPage} from '/src/pages/resources/AnnouncementsPage.tsx';
      import {useAuthStore} from '/src/stores/auth.store.ts';
      // Parent owns catalog registration. Register in this isolated harness only.
      Object.assign(messages,leaveResources);
      const root=ReactDOM.createRoot(document.getElementById('root'));
      window.switchLocale=setLocale; window.schema=leaveRequestSchema;
      window.renderLeave=()=>root.render(React.createElement(MyLeavePage));
      window.renderBalances=balances=>root.render(React.createElement(LeaveBalanceDialog,{balances,onClose:()=>{}}));
      useAuthStore.setState({user:{id:901,roles:['HR Manager'],accessibleCompanyIds:[1],employee:{id:901,company_id:1}}});
      window.renderTemplates=()=>root.render(React.createElement(TemplatesPage));
      window.renderAnnouncements=()=>root.render(React.createElement(AnnouncementsPage));
      function Confirmation(){const {confirm,confirmation}=useResourceConfirmation();return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>confirm(()=>t('Hapus template "{name}"?',{name:'Policy'}))},'OPEN'),confirmation)}
      window.renderConfirmation=()=>root.render(React.createElement(Confirmation));
      window.ready=true;
    </script></body></html>`;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:4198') return route.abort();
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
      if (!url.pathname.startsWith('/api/')) return route.continue();
      let data;
      if (url.pathname.endsWith('/leaves/me/types')) data = [policy];
      else if (url.pathname.endsWith('/leaves/me/balances')) data = balances;
      else if (url.pathname.endsWith('/leaves/me')) return route.fulfill({ json: { success: true, data: [], pagination: { page: 1, total: 0, totalPages: 1, limit: 10 } } });
      else if (url.pathname.endsWith('/employees/me')) data = { id: 901, name: 'Synthetic Employee', leaveApprover: { name: 'Approved' } };
      else if (url.pathname.endsWith('/companies')) return route.fulfill({ json: { success: true, data: [{ id: 1, name: 'Company', code: 'SYN' }], pagination: { page: 1, total: 1, totalPages: 1, total_pages: 1, limit: 100 } } });
      else if (url.pathname.endsWith('/templates')) return route.fulfill({ json: { success: true, data: [template], pagination: { page: 1, total: 1, total_pages: 1, limit: 20 } } });
      else if (url.pathname.endsWith('/announcements/options')) data = { can_create: true, can_publish_global: true, companies: [{ id: 1, name: 'Company' }], roles: [], departments: [] };
      else if (url.pathname.endsWith('/announcements')) return route.fulfill({ json: { success: true, data: [announcement], pagination: { page: 1, total: 1, total_pages: 1, limit: 20 } } });
      else if (url.pathname.endsWith('/announcements/1')) data = announcement;
      else return route.abort();
      return route.fulfill({ json: { success: true, data } });
    });
    await page.goto('http://127.0.0.1:4198');
    await page.waitForFunction(() => window.ready);
    await page.evaluate(() => { window.switchLocale('en'); window.renderLeave(); });
    await page.getByRole('button', { name: 'Request Leave', exact: true }).click();
    await page.getByPlaceholder('Please provide a reason for your leave request...').fill('Annual Leave / user note remains unchanged');
    await page.locator('input[type=date]').first().fill('2026-10-15');
    await page.evaluate(() => window.switchLocale('id'));
    await page.getByRole('heading', { name: 'Ajukan Cuti', exact: true }).waitFor();
    assert.equal(await page.locator('textarea').inputValue(), 'Annual Leave / user note remains unchanged');
    assert.equal(await page.locator('input[type=date]').first().inputValue(), '2026-10-15');
    assert.equal(await page.locator('select option:checked').last().textContent(), 'Annual Leave');
    await page.evaluate(() => window.switchLocale('en'));
    await page.getByRole('heading', { name: 'Request Leave', exact: true }).waitFor();
    console.log('PASS My Leave EN/ID/EN switch preserves reason, date, and DB policy name');

    await page.evaluate(value => { window.switchLocale('id'); window.renderBalances(value); }, balances);
    await page.getByRole('heading', { name: 'Saldo cuti' }).waitFor();
    let body = await page.locator('body').innerText();
    assert.ok(body.includes('12,5') && body.includes('Annual Leave'));
    assert.equal(await page.locator('.personal-balance-available strong').textContent(), '11');
    await page.evaluate(() => window.switchLocale('en'));
    await page.getByRole('heading', { name: 'Leave balances' }).waitFor();
    body = await page.locator('body').innerText();
    assert.ok(body.includes('12.5'));
    console.log('PASS balance decimal presentation and unchanged available-day calculation');

    await page.evaluate(() => window.renderConfirmation());
    await page.getByText('OPEN', { exact: true }).click();
    await page.getByText('Delete template "Policy"?', { exact: true }).waitFor();
    await page.evaluate(() => window.switchLocale('id'));
    await page.getByText('Hapus templat "Policy"?', { exact: true }).waitFor();
    console.log('PASS open confirmation switches language and preserves document name');

    const validation = await page.evaluate(() => {
      const value = { leave_type_id: '', start_date: '', end_date: '', reason: 'a' };
      window.switchLocale('en');
      const en = window.schema.safeParse(value).error.issues.map(issue => issue.message);
      window.switchLocale('id');
      const id = window.schema.safeParse(value).error.issues.map(issue => issue.message);
      return { en, id };
    });
    assert.ok(validation.en.includes('Leave type is required'));
    assert.ok(validation.id.includes('Jenis cuti wajib diisi'));

    await page.evaluate(() => { window.switchLocale('en'); window.renderTemplates(); });
    await page.getByRole('button', { name: 'Edit Policy', exact: true }).click();
    await page.getByLabel('Template name', { exact: true }).fill('Policy draft unchanged');
    await page.evaluate(() => window.switchLocale('id'));
    await page.getByRole('heading', { name: 'Edit templat', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Nama templat', { exact: true }).inputValue(), 'Policy draft unchanged');
    assert.equal(await page.locator('textarea').inputValue(), 'Annual Leave');
    await page.evaluate(() => window.switchLocale('en'));
    assert.equal(await page.getByLabel('Template name', { exact: true }).inputValue(), 'Policy draft unchanged');
    console.log('PASS template editor keeps metadata drafts and authored descriptions across locale switches');

    await page.evaluate(() => window.renderAnnouncements());
    await page.getByRole('button', { name: 'Edit Approved', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Approved draft unchanged');
    await page.evaluate(() => window.switchLocale('id'));
    await page.getByRole('heading', { name: 'Edit pengumuman', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Judul', { exact: true }).inputValue(), 'Approved draft unchanged');
    assert.equal(await page.locator('textarea').inputValue(), 'Annual Leave');
    await page.evaluate(() => window.switchLocale('en'));
    assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Approved draft unchanged');
    console.log('PASS announcement editor keeps title and content unchanged across locale switches');
    assert.deepEqual(errors, []);
    console.log('PASS existing schema instance validates in active locale; no browser errors');
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
