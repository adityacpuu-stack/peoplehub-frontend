// Isolated source-level browser checks. No server, accounts, API, or database.
// Run from frontend: node src/pages/employees/operations-localization.test.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../../..');

const fixtures = `
const company={id:1,name:'Active',code:'TEST',is_active:true};
const employee={id:1,name:'Permanent',employee_id:'SYN-001',company_id:1,company,department:{id:1,name:'Leave'},employment_status:'active',employment_type:'permanent',gender:'male',religion:'islam',name_lower:'permanent',email:'synthetic@example.test',personal_email:'synthetic@example.test',basic_salary:1234567,join_date:'2026-01-31',date_of_birth:'2000-01-01',pay_frequency:'monthly'};
const page=data=>({data,pagination:{page:1,totalPages:1,total:data.length,limit:20}});
const contract={id:1,employee,contract_number:'SYN-CONTRACT',contract_type:'permanent',status:'active',start_date:'2026-01-31',end_date:'2026-12-31',salary:1234567,notes:'Active',created_at:'2026-01-31'};
export const companyService={getAll:async()=>page([company])};
export const employeeService={getAll:async()=>page([employee]),getById:async()=>employee,getNextEmployeeId:async()=>'SYN-001',update:async(id,payload)=>{window.mutations.push(payload);return employee},create:async payload=>{window.mutations.push(payload);return employee}};
export const departmentService={getAll:async()=>page([{id:1,name:'Leave',company_id:1}])};
export const positionService={getAll:async()=>page([])};
export const workLocationService={getOptions:async()=>[]};
export const employeeMovementService={getAll:async()=>page([{id:1,employee,employee_id:1,movement_type:'promotion',status:'pending',effective_date:'2026-01-31',previous_position_name:'Active',new_position_name:'Permanent',reason:'Leave'}]),create:async payload=>{window.mutations.push(payload)},update:async(id,payload)=>{window.mutations.push(payload)}};
export const contractService={listContracts:async()=>page([contract]),getById:async()=>contract,getGroupStatistics:async()=>({summary:{total_contracts:1,active_contracts:1,expiring_30_days:1,expiring_60_days:1,expiring_90_days:1,expired_contracts:0,by_type:{permanent:1,contract:0,probation:0}},by_company:[{company_id:1,company_name:'Active',total:1,active:1,expiring_30_days:1,by_type:{permanent:1,contract:0,probation:0}}],expiring_contracts:[contract],recent_contracts:[contract]})};
export const employeeDocumentService={getAll:async()=>page([{id:1,employee,employee_id:1,document_type:'kontrak_kerja',document_name:'Active',description:'Permanent',created_at:'2026-01-31',file_size:1536,is_verified:false}])};
export const getDocumentCategory=()=> 'hr';
export const documentService={downloadFile:async()=>{}};
export const orgChartService={getOrgChart:async()=>({tree:[{...employee,children:[{...employee,id:2,name:'Leave',children:[]}]}],stats:{totalEmployees:1234,totalDepartments:1,maxDepth:2}})};
export const hasExecutiveApprovals=()=>false;
export const canDecideApproval=row=>row.can_approve&&row.status==='pending';
export const getApprovalInbox=async()=>[{id:1,key:'leave-1',kind:'leave',label:'Leave',unit:'leave days',amount:2,employee,status:'pending',start_date:'2026-01-31',end_date:'2026-02-01',created_at:'2026-01-01',can_approve:true,reason:'Active'}];
export const decideApproval=async(...payload)=>{window.mutations.push(payload)};
export const collectPages=async fetcher=>(await fetcher(1,100)).data;
`;

(async () => {
  const result = await esbuild.build({
    absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.app.json'), write: false, bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
    stdin: { resolveDir: root, loader: 'tsx', contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {MemoryRouter,Routes,Route} from 'react-router-dom';
      import {setLocale} from '@/i18n';
      import {EmployeeFormPage} from '@/pages/employees/EmployeeFormPage';
      import {EmployeeDetailPage} from '@/pages/employees/EmployeeDetailPage';
      import {EmployeesPage} from '@/pages/employees/EmployeesPage';
      import {MovementPage} from '@/pages/movement/MovementPage';
      import {RequestsPage} from '@/pages/requests/RequestsPage';
      import {ContractsPage} from '@/pages/contracts/ContractsPage';
      import {GroupContractsPage} from '@/pages/contracts/GroupContractsPage';
      import {OrgChartPage} from '@/pages/org-chart/OrgChartPage';
      window.mutations=[];window.changeLocale=setLocale;setLocale('en');
      const pages={create:EmployeeFormPage,edit:EmployeeFormPage,detail:EmployeeDetailPage,employees:EmployeesPage,movement:MovementPage,requests:RequestsPage,contracts:ContractsPage,group:GroupContractsPage,org:OrgChartPage};
      const Component=pages[window.testPage];
      createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[window.testPage==='edit'||window.testPage==='detail'?'/1':'/']}><Routes><Route path="/:id?" element={<Component/>}/></Routes></MemoryRouter>);
    ` },
    plugins: [{ name: 'isolated-operations', setup(build) {
      build.onResolve({ filter: /^@\/services(?:\/|$)/ }, () => ({ path: 'services', namespace: 'fixture' }));
      build.onResolve({ filter: /^@\/stores\/auth.store$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: args.path === 'services' ? fixtures : `const state={user:{id:1,roles:['HR Manager'],accessibleCompanyIds:[1]}};export const useAuthStore=selector=>selector?selector(state):state;useAuthStore.getState=()=>state;` }));
      // Parent owns registration; test this catalog with the real locale engine.
      build.onLoad({ filter: /[\\/]i18n[\\/]messages.ts$/ }, () => ({ loader: 'ts', resolveDir: path.join(root, 'src/i18n'), contents: `import {common} from './common';import {operations} from './operations';export const messages={...common,...operations};` }));
      build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
    } }],
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let checks = 0;
  const page = await browser.newPage({ timezoneId: 'America/Los_Angeles' });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  async function open(name) {
    await page.goto('about:blank');
    await page.setContent('<style>.hidden{display:none}</style><div id="root"></div>');
    await page.evaluate(name => { window.testPage = name; }, name);
    await page.addScriptTag({ content: result.outputFiles[0].text });
  }
  const locale = value => page.evaluate(value => window.changeLocale(value), value);
  try {
    await open('create');
    await expect(page.getByRole('heading', { name: 'Add New Employee' })).toBeVisible();
    await page.locator('#name').fill('Active');
    await page.locator('#company_id').selectOption('1');
    await page.locator('#gender').selectOption('male');
    await locale('id');
    await expect(page.getByRole('heading', { name: 'Tambah Karyawan Baru' })).toBeVisible();
    await expect(page.locator('#name')).toHaveValue('Active');
    await expect(page.locator('#gender')).toHaveValue('male');
    await expect(page.locator('#gender option:checked')).toHaveText('Laki-laki');
    await page.getByRole('button', { name: 'Langkah Berikutnya', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Rincian Pekerjaan' })).toBeVisible();
    await locale('en');
    await expect(page.getByRole('heading', { name: 'Job Details' })).toBeVisible();
    await page.locator('#join_date').fill('2026-05-31');
    await page.getByRole('button', { name: 'Next Step', exact: true }).click();
    await expect(page.locator('#salary_status option:checked')).toContainText('Employee pays PPh21');
    await page.locator('#basic_salary').fill('1234567');
    await locale('id');
    await expect(page.locator('#salary_status option:checked')).toContainText('Karyawan membayar PPh21');
    await page.getByRole('button', { name: 'Langkah Berikutnya', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Informasi Kontak', exact: true })).toBeVisible();
    await page.locator('#personal_email').fill('draft@example.test');
    await page.locator('#email').fill('office@example.test');
    await page.getByRole('button', { name: 'Langkah Berikutnya', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Silakan Periksa' })).toBeVisible();
    await expect(page.locator('.ops-review-sections')).toContainText('31 Mei 2026');
    await expect(page.locator('.ops-review-sections')).toContainText('IDR 1.234.567');
    await locale('en');
    await expect(page.locator('.ops-review-sections')).toContainText('31 May 2026');
    await expect(page.locator('.ops-review-sections')).toContainText('IDR 1,234,567');
    await expect(page.locator('.ops-review-sections')).toContainText('draft@example.test');
    assert.deepEqual(await page.evaluate(() => window.mutations), []);
    checks++;

    await open('edit');
    await page.getByRole('button', { name: 'Resign', exact: true }).click();
    await page.locator('[name="resign_reason"]').fill('Active');
    await locale('id');
    await expect(page.getByRole('heading', { name: 'Pengunduran Diri Karyawan' })).toBeVisible();
    await expect(page.locator('[name="resign_reason"]')).toHaveValue('Active');
    await page.getByRole('button', { name: 'Konfirmasi Pengunduran Diri' }).click();
    await expect(page.getByText('Tanggal pengunduran diri wajib diisi', { exact: true })).toBeVisible();
    await locale('en');
    await expect(page.getByText('Resignation date is required', { exact: true })).toBeVisible();
    assert.deepEqual(await page.evaluate(() => window.mutations), []);
    checks++;

    await open('employees');
    await expect(page.getByRole('heading', { name: 'Employee Directory' })).toBeVisible();
    await expect(page.getByText('1 matching employees', { exact: true })).toBeVisible();
    await locale('id');
    await expect(page.getByText('1 karyawan yang cocok', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Permanent', exact: true })).toBeVisible();
    await expect(page.locator('.employee-employment')).toContainText('Aktif');
    checks++;

    await open('detail');
    await expect(page.getByRole('heading', { name: 'Permanent', exact: true })).toBeVisible();
    await locale('id');
    await expect(page.getByText('Laki-laki', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Permanent', exact: true })).toBeVisible();
    checks++;

    await open('movement');
    await expect(page.getByText('1 matching movements', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Movement', exact: true }).click();
    await page.getByPlaceholder('Reason for movement...').fill('Active');
    await locale('id');
    await expect(page.getByRole('heading', { name: 'Mutasi Baru', exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Alasan mutasi...')).toHaveValue('Active');
    await expect(page.locator('option[value="promotion"]').last()).toHaveText('Promosi');
    checks++;

    await open('requests');
    await expect(page.getByText('1 awaiting your approval', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    await page.locator('textarea').fill('Active');
    await locale('id');
    await expect(page.getByRole('heading', { name: 'Tolak Pengajuan Cuti?' })).toBeVisible();
    await expect(page.locator('textarea')).toHaveValue('Active');
    await expect(page.locator('dialog')).toContainText('2 hari cuti');
    await expect(page.locator('dialog')).toContainText('Leave'); // DB leave-type name remains data.
    checks++;

    await open('contracts');
    await expect(page.getByRole('button', { name: 'Contract details for Permanent' })).toBeVisible();
    await locale('id');
    await expect(page.locator('td[data-label="Kontrak"] strong')).toHaveText('Tetap');
    await page.getByRole('button', { name: 'Dokumen', exact: true }).click();
    await page.getByRole('button', { name: 'Unggah dokumen', exact: true }).click();
    await page.getByPlaceholder('Contoh: Kontrak kerja 2026').fill('Active');
    await locale('en');
    await expect(page.getByPlaceholder('Example: Employment contract 2026')).toHaveValue('Active');
    await expect(page.locator('option[value="kontrak_kerja"]')).toHaveText('Employment Contract');
    checks++;

    await open('group');
    await expect(page.getByRole('heading', { name: 'Contract Overview', exact: true })).toBeVisible();
    await locale('id');
    await expect(page.getByText('Tetap (PKWTT)', { exact: true })).toBeVisible();
    await expect(page.locator('.ct-group-table')).toContainText('Active');
    checks++;

    await open('org');
    await expect(page.getByRole('heading', { name: 'Organization Structure' })).toBeVisible();
    await locale('id');
    await expect(page.locator('.org-scope')).toContainText('1.234 karyawan');
    await expect(page.locator('.org-node strong').first()).toHaveText('Permanent');
    await locale('en');
    await expect(page.locator('.org-scope')).toContainText('1,234 employees');
    checks++;
    assert.deepEqual(errors, []);
    console.log('PASS: ' + checks + ' isolated EN/ID browser scenarios; drafts, enums, data boundaries, validation, counts and dialogs.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
