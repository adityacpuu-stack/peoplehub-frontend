// Run from frontend: node src/pages/dashboard/account-localization.check.cjs
// Entirely synthetic: no app server, environment files, real accounts or API access.
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const source = `
import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom';
import {setLocale,t} from '@/i18n'; import {messages} from '@/i18n/messages'; import {account} from '@/i18n/account';
import {ProfilePage} from '@/pages/profile/ProfilePage'; import {SettingsPage} from '@/pages/settings/SettingsPage';
import {PasswordChangeModal} from '@/components/profile/PasswordChangeModal'; import {ProfileCompletionModal} from '@/components/profile/ProfileCompletionModal';
import {EmployeeDashboard} from '@/pages/dashboard/EmployeeDashboard'; import {ManagerDashboard} from '@/pages/dashboard/ManagerDashboard';
import {HRDashboard} from '@/pages/dashboard/HRDashboard'; import {TaxDashboardPage} from '@/pages/dashboard/TaxDashboardPage';
import {GroupCEODashboard} from '@/pages/dashboard/GroupCEODashboard'; import {FinanceDashboard} from '@/pages/dashboard/FinanceDashboard';
import {SuperAdminDashboard} from '@/pages/dashboard/SuperAdminDashboard'; import {NotificationsPage} from '@/pages/notifications/NotificationsPage';
import {useAuthStore} from '@/stores/auth.store'; import {profileService} from '@/services/profile.service'; import {settingsService} from '@/services/settings.service';
import {dashboardService} from '@/services/dashboard.service';
import {useReportConfirmation} from '@/pages/dashboard/useReportConfirmation';
function ConfirmationCheck(){const flow=useReportConfirmation();return <><button onClick={()=>flow.confirm(t('Hapus assignment ini?'))}>Open check</button>{flow.dialog}</>}
Object.assign(messages,{...account,...messages});setLocale('id');
const employee={id:119,name:'Approved',employee_id:'TEST-119',email:'work@example.test',profile_completed:true,company_id:7,company:{id:7,name:'Pending'},department:{name:'New'},position:{name:'Saved'},gender:'female',employment_status:'active',employment_type:'permanent',phone:'081234567890',mobile_number:'081234567890',address:'Example',last_education:'s1',graduation_year:2020,children_count:0,number_of_dependents:0};
const user={id:91,email:'synthetic@example.test',employee,roles:['HR Manager'],permissions:[],accessibleCompanyIds:[3],companyFeatures:{attendance_enabled:true,leave_enabled:true}};
useAuthStore.setState({user,isAuthenticated:true,isLoading:false,token:'synthetic-only'});
window.saved=[];profileService.getMyProfile=async()=>employee;profileService.updateMyProfile=async payload=>{window.saved.push(payload);return {...employee,...payload}};
settingsService.getCompanies=async()=>[{id:3,name:'Pending',code:'TEST'}];settingsService.getNotificationPreferences=async()=>({email_leave_request:true,email_leave_approval:false});
settingsService.getPayrollSettings=async()=>({company_id:3,payroll_cutoff_date:20,payment_date:28,prorate_method:'working_days'});
settingsService.updatePayrollSettings=async(id,payload)=>{window.saved.push({id,...payload});return{company_id:3,payroll_cutoff_date:20,payment_date:28,prorate_method:'working_days',...payload}};
const finance={current_period:{period:'2026-09',total_employees:1234,total_gross:10000000,total_deductions:1000000,total_net:9000000,status:'paid'},pending_adjustments:2,pending_overtime:3};dashboardService.getPayrollSummary=async()=>finance;
const own={attendance:{today_status:'checked_out',check_out_time:'2026-09-28T10:00:00Z',this_month:{present_days:20,late_days:1,leave_days:0}},pending_requests:{leave:2,overtime:3},recent_requests:[{id:1,type:'leave',detail:'Approved',date:'2026-09-28',status:'pending'}],attendance_history:[],announcements:[{id:1,title:'Pending',category:'New',date:'2026-09-28',is_new:true}]};
const team={team_size:1234,present_today:1200,on_leave_today:2,team_members:[{id:1,name:'Approved',employee_id:'TEST',status_today:'on_leave'}]};
const stats={active_employees:1234,new_hires_this_month:2,departments_count:3,pending_requests:{leave:2,overtime:3}};const overview={employee:{by_department:[{department:'New',count:1234}]},leave:{pending_requests:2,on_leave_today:1,upcoming_leaves:[]}};
const root=createRoot(document.getElementById('root'));const ref={current:null};const noop=()=>{};
window.lang=setLocale;window.pick=mode=>{let child;const props={navigationRef:ref,onBusyChange:noop};
if(mode==='profile')child=<ProfilePage {...props}/>;
if(mode==='security'||mode==='payroll'||mode==='notifications')child=<SettingsPage {...props} defaultTab={mode}/>;
if(mode==='password')child=<PasswordChangeModal isOpen onComplete={noop}/>;
if(mode==='completion')child=<ProfileCompletionModal isOpen onComplete={noop}/>;
if(mode==='employee')child=<EmployeeDashboard user={user} myDashboard={own} greeting={()=>t('Good Morning')} onRetry={noop}/>;
if(mode==='manager')child=<ManagerDashboard user={user} teamDashboard={team} pendingApprovals={[{id:1,employee:{name:'Approved'},leaveType:{name:'Pending'},total_days:2,start_date:'2026-09-28',end_date:'2026-09-29'}]} greeting={()=>t('Good Morning')} onRetry={noop}/>;
if(mode==='hr')child=<HRDashboard user={user} stats={stats} overview={overview} payrollSummary={finance} greeting={()=>t('Good Morning')} onRetry={noop}/>;
if(mode==='finance')child=<FinanceDashboard/>;
if(mode==='tax')child=<TaxDashboardPage/>;
if(mode==='group')child=<GroupCEODashboard user={user} groupDashboard={null} greeting={()=>t('Good Morning')}/>;
if(mode==='admin')child=<SuperAdminDashboard user={user} superAdminStats={{total_users:1234,total_companies:2,total_employees:1000,audit_entries_today:9}} recentLogs={[]} auditStats={{daily_activity:[],by_action:[]}} greeting={()=>t('Good Morning')} onRetry={noop}/>;
if(mode==='inbox')child=<NotificationsPage/>;
if(mode==='confirm')child=<ConfirmationCheck/>;
root.render(<MemoryRouter>{child}</MemoryRouter>);};window.pick('profile');
`;

(async () => {
  const built = await esbuild.build({
    stdin: { contents: source, loader: 'tsx', resolveDir: process.cwd() },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    alias: { '@': process.cwd() + '/src' },
    define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"test"' },
    plugins: [{ name: 'skip-css', setup(build) { build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' })); } }],
    logLevel: 'silent',
  });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'account.test') return route.abort();
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script src="/app.js"></script>' });
      if (url.pathname === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: built.outputFiles[0].text });
      const json = data => route.fulfill({ json: { success: true, data } });
      if (url.pathname === '/health') return route.fulfill({ json: { services: { api: { status: 'healthy' }, database: { status: 'healthy' }, storage: { status: 'disabled' }, cache: { status: 'healthy' } } } });
      if (url.pathname === '/api/v1/presence') return json([]);
      if (url.pathname === '/api/v1/notifications') return route.fulfill({ json: { success: true, data: [], unread_count: 0, pagination: { total: 1234, page: 1, total_pages: 62, limit: 20 } } });
      return route.abort();
    });
    await page.goto('http://account.test');
    await page.getByRole('button', { name: 'Edit profil', exact: true }).click();
    await page.locator('#profile-phone').fill('invalid');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await page.getByText('Format telepon tidak valid (cth. +6281234567890 atau 081234567890)', { exact: true }).waitFor();
    await page.evaluate(() => { window.phoneNode = document.querySelector('#profile-phone'); window.lang('en'); });
    await page.getByText('Invalid phone format (e.g. +6281234567890 or 081234567890)', { exact: true }).waitFor();
    assert.equal(await page.locator('#profile-phone').inputValue(), 'invalid');
    assert.equal(await page.evaluate(() => window.phoneNode === document.querySelector('#profile-phone')), true);
    await page.getByRole('heading', { name: 'Approved', exact: true }).waitFor();
    await page.locator('#profile-phone').fill('089876543210');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Edit profile', exact: true }).waitFor();
    const payload = await page.evaluate(() => window.saved[0]);
    assert.equal(payload.phone, '089876543210'); assert.equal(payload.last_education, 's1'); assert.equal(payload.name, undefined);
    console.log('PASS profile: live validation translation, same DOM input/draft, original data and protected payload');

    await page.evaluate(() => { window.lang('id'); window.pick('security'); });
    await page.locator('#currentPassword').fill('OldPassword1'); await page.locator('#newPassword').fill('short'); await page.locator('#confirmation').fill('short');
    await page.getByRole('button', { name: 'Perbarui kata sandi', exact: true }).click();
    await page.locator('[role="alert"]').waitFor(); await page.evaluate(() => window.lang('en'));
    assert.equal(await page.locator('#newPassword').inputValue(), 'short');
    assert.match(await page.locator('[role="alert"]').innerText(), /Use at least 8 characters/);
    console.log('PASS security: dynamic labels and stored error change with draft retained');

    await page.evaluate(() => { window.lang('id'); window.pick('payroll'); });
    await page.locator('#setting-payroll_cutoff_date').fill('21');
    await page.evaluate(() => { window.cutoffNode = document.querySelector('#setting-payroll_cutoff_date'); window.lang('en'); });
    await page.getByText('Working days', { exact: true }).waitFor();
    assert.equal(await page.locator('#setting-payroll_cutoff_date').inputValue(), '21');
    assert.equal(await page.evaluate(() => window.cutoffNode === document.querySelector('#setting-payroll_cutoff_date')), true);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('No changes yet.', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.saved[1]), { id: 3, payroll_cutoff_date: 21 });
    console.log('PASS payroll settings: module labels, hints, same input, numeric payload unchanged');

    await page.evaluate(() => { window.lang('id'); window.pick('password'); });
    await page.getByRole('button', { name: 'Ubah Password', exact: true }).click();
    await page.getByText('Password saat ini wajib diisi', { exact: true }).waitFor(); await page.evaluate(() => window.lang('en'));
    await page.getByText('Current password is required', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Show Current Password', exact: true }).waitFor();
    console.log('PASS password modal: stored validation and dynamic visibility tooltip');

    await page.evaluate(() => { window.lang('id'); window.pick('completion'); });
    await page.locator('#onboarding-place_of_birth').waitFor(); await page.getByRole('button', { name: 'Lanjut', exact: true }).click();
    await page.getByText('Tempat Lahir wajib diisi', { exact: true }).waitFor();
    await page.locator('#onboarding-place_of_birth').fill('Synthetic city'); await page.evaluate(() => window.lang('en'));
    await page.getByText('Date of Birth is required', { exact: true }).waitFor();
    assert.equal(await page.locator('#onboarding-place_of_birth').inputValue(), 'Synthetic city');
    assert.equal(await page.locator('#onboarding-gender').inputValue(), 'female');
    await page.getByRole('option', { name: 'Female', exact: true }).waitFor({ state: 'attached' });
    console.log('PASS onboarding: step config, field labels, parameterized validation, draft and gender value');

    for (const [mode, id, en] of [
      ['employee', 'Hari kerja Anda', 'Your workday'], ['manager', 'Anggota tim', 'Team members'],
      ['hr', 'Ringkasan penggajian', 'Payroll summary'], ['finance', 'Dasbor Keuangan', 'Finance Dashboard'],
      ['tax', 'Dasbor Pajak & Kepatuhan', 'Tax & Compliance Dashboard'], ['group', 'Tren Jumlah Karyawan Grup', 'Group Headcount Trend'],
      ['admin', 'Kesehatan Sistem', 'System Health'],
    ]) {
      await page.evaluate(mode => { window.lang('id'); window.pick(mode); }, mode);
      await page.getByText(id, { exact: true }).first().waitFor();
      if (mode === 'employee') await page.getByText('Check-out pukul 17.00 WIB', { exact: true }).waitFor();
      if (mode === 'manager') {
        await page.getByText('1.234', { exact: true }).waitFor();
        await page.getByText('Approved', { exact: true }).first().waitFor();
        assert.match(await page.locator('.manager-approval-list').innerText(), /Pending.*2 hari/);
      }
      if (mode === 'hr') await page.getByText('New', { exact: true }).waitFor();
      await page.evaluate(() => window.lang('en'));
      await page.getByText(en, { exact: true }).first().waitFor();
      if (mode === 'employee') await page.getByText('Checked out at 17:00 WIB', { exact: true }).waitFor();
      if (mode === 'manager') await page.getByText('1,234', { exact: true }).waitFor();
      if (mode === 'finance') await page.getByText('Total gross', { exact: true }).waitFor();
      if (mode === 'tax') await page.getByText('Payment overdue', { exact: true }).waitFor();
      console.log('PASS ' + mode + ' dashboard: bilingual runtime render');
    }
    await page.evaluate(() => { window.lang('id'); window.pick('inbox'); });
    await page.getByText('1.234 notifikasi · Halaman 1 dari 62', { exact: true }).waitFor();
    await page.evaluate(() => window.lang('en'));
    await page.getByText('1,234 notifications · Page 1 of 62', { exact: true }).waitFor();
    console.log('PASS notification pagination: translated template and locale-aware counts');
    await page.evaluate(() => { window.lang('id'); window.pick('confirm'); });
    await page.getByRole('button', { name: 'Open check', exact: true }).click();
    await page.getByText('Hapus assignment ini?', { exact: true }).waitFor();
    await page.evaluate(() => window.lang('en'));
    await page.getByText('Delete this assignment?', { exact: true }).waitFor();
    console.log('PASS open confirmation: stored application message follows locale');
    assert.deepEqual(errors, []);
    console.log('PASS zero browser exceptions; all network mocked or blocked; synthetic services only');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
