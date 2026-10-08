// Isolated browser regression: no server, credentials, environment files or real data.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const ts = require('typescript');
const { chromium } = require('@playwright/test');

async function main() {
  const root = path.resolve(__dirname, '../..');
  const catalog = {};
  // Registered catalogs these pages use (i18n/messages.ts): shared payroll/tax
  // copy and the action-permission copy (unavailable figures, gated exports).
  // Added first (lowest precedence) so they only fill keys and never change the
  // existing common/insights translations this harness already asserts.
  for (const name of ['permissions', 'shared', 'common', 'insights']) {
    const source = fs.readFileSync(path.join(root, 'i18n', `${name}.ts`), 'utf8');
    const exports = {};
    new Function('exports', ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
    assert(Object.values(exports[name]).every(pair => Array.isArray(pair) && pair.length === 2), `${name}: invalid alias`);
    Object.assign(catalog, exports[name]);
  }
  const literalKeys = new Set();
  for (const domain of ['tax', 'ceo', 'analytics', 'performance']) {
    for (const file of fs.readdirSync(path.join(root, 'pages', domain)).filter(file => /\.tsx?$/.test(file))) {
      const filename = path.join(root, 'pages', domain, file);
      const ast = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const walk = node => {
        if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && ts.isStringLiteral(node.arguments[0])) literalKeys.add(node.arguments[0].text);
        ts.forEachChild(node, walk);
      };
      walk(ast);
    }
  }
  assert.deepEqual([...literalKeys].filter(key => !catalog[key]), [], 'missing exact catalog keys');
  const pages = ['tax', 'ceo', 'analytics', 'performance'].flatMap(domain =>
    fs.readdirSync(path.join(root, 'pages', domain))
      .filter(file => file.endsWith('Page.tsx') && file !== 'CEOApprovalsPage.tsx')
      .map(file => ({ name: file.slice(0, -4), file: `./src/pages/${domain}/${file}` })));
  const fixtures = `
    const employee = { id: 1, name: 'Pending', employee_id: 'SYN-001', company_id: 1, department: {name:'Draft'}, position: {name:'Active'} };
    const payroll = { id: 1, payroll_number:'SYN-001', employee, company_id:1, period:'2025-01', status:'paid', basic_salary:10000000.25, gross_salary:11000000.25, net_salary:9876543.21, take_home_pay:9876543.21, pph21:123456.78, bpjs_kes_employee:100000.25, bpjs_kes_company:400000.50, bpjs_jkk_company:24000.25, bpjs_jkm_company:30000.50, bpjs_jht_employee:200000.25, bpjs_jht_company:370000.50, bpjs_jp_employee:100000.25, bpjs_jp_company:200000.50, bpjs_employee_total:400000.75, bpjs_company_total:1024502, taxable_income:10000000, ter_rate:0.015, ptkp_status:'TK/0' };
    const company = {id:1,name:'Companies',code:'SYN',employees:1234,active_employees:1234,attendance_rate:95.5,on_leave_today:2,new_hires_this_month:3};
    const group = {summary:{total_companies:1,total_employees:1234,total_departments:1,avg_attendance_rate:95.5,total_on_leave_today:2,pending_approvals:1,new_hires_this_month:3,terminations_this_month:1},companies:[company],headcount_trend:[{month:'Jan',headcount:1234,hires:3,exits:1}],department_distribution:[{name:'Draft',employees:1234,percentage:100}],payroll_summary:{total_monthly_payroll:11000000.25,avg_salary:11000000.25,by_company:[{company_name:'Companies',total_payroll:11000000.25,employee_count:1234}]},alerts:[{id:'attendance-1',category:'attendance',title:'Low Attendance Alert',message:'Companies has 95.5% attendance rate today',count:1},{id:'expiring-contracts',category:'contract',title:'Contracts Expiring Soon',message:'2 employee contracts expiring within 30 days',count:2}],recent_activities:[{id:1,type:'hire',action:'New employee onboarded',employee_name:'Pending',company_name:'Companies',created_at:'2025-01-31T17:30:00Z'}]};
    const workforce = {gender_distribution:[{label:'Male',value:60,count:60,color:'#333'},{label:'Female',value:40,count:40,color:'#555'}],employment_type_distribution:[{label:'Permanent',value:100,count:100,color:'#333'}],age_distribution:[{range:'25-34',count:100,percentage:100}],tenure_distribution:[{range:'1-2 years',count:100,percentage:100}],marital_status_distribution:[{label:'Single',value:100,count:100}]};
    const turnover = {monthly_turnover:[{month:'Jan',rate:1.5,hires:3,exits:1}],exit_reasons:[{reason:'Resignation',count:1,percentage:100}],department_turnover:[{name:'Draft',turnoverRate:1.5,exits:1,hires:3,netChange:2}],tenure_at_exit:[{range:'1-2 years',count:1,percentage:100}],recent_exits:[{name:'Pending',department:'Draft',position:'Active',company:'Companies',exitDate:'2025-01-31',reason:'Resignation',tenure:'1.5 years'}],avg_tenure_at_exit:1.5,total_exits_period:1,total_hires_period:3};
    const headcount = {headcount_trend:group.headcount_trend,headcount_by_company:[{name:'Companies',headcount:1234,growth:'+1.5%',hires:3}],department_headcount:group.department_distribution,quarterly_comparison:[{quarter:'Q1 2025',headcount:1234,growth:1.5}],headcount_forecast:[{month:'May',projected:1250,lower:1200,upper:1300}],current_headcount:1234,year_end_target:1500};
    export const dashboardService = {getGroupOverview:async()=>group,getWorkforceAnalytics:async()=>workforce,getTurnoverAnalytics:async()=>turnover,getHeadcountAnalytics:async()=>headcount};
    export const companyService = {getAll:async()=>({data:[company]}),getCompanies:async()=>[company]};
    export const payrollService = {getAll:async()=>{if(window.failPayroll)throw Error('synthetic failure');return {data:[{...payroll,bpjs_kes_employee:window.invalidContribution?null:payroll.bpjs_kes_employee}]}}};
    export const goalService = {list:async()=>({data:[{id:1,title:'Draft',description:'Pending',employee,category:'performance',status:'in_progress',priority:'high',progress_percentage:50,target_date:'2025-01-31',target_value:100,current_value:50,unit_of_measure:'Widgets'}],pagination:{total:1}})};
    export const kpiService = {list:async()=>({data:[{id:1,name:'Pending',description:'Draft',category:'financial',benchmark_value:95.5,threshold_green:90,threshold_yellow:75,threshold_red:50,unit_of_measure:'%'}]})};
    export const performanceService = {listReviews:async()=>({data:[{id:1,employee,period:'2025-01',status:'completed',overall_rating:4,goals_achievement:87.5,competency_score:95,comments:'Pending'}],pagination:{total:1}})};
    export const attendanceService = {getAll:async()=>({data:[]})};
    export const employeeService = {getLeadershipTeam:async()=>[{id:1,name:'Pending',position:'Active',department:'Draft',company:'Companies',email:'synthetic@example.invalid',tenure:'1 year',direct_reports:2}]};
  `;
  const result = await esbuild.build({
    absWorkingDir: path.resolve(root, '..'), bundle: true, write: false, format: 'iife', platform: 'browser',
    jsx: 'automatic', tsconfig: 'tsconfig.app.json', define: {'import.meta.env':'{}'}, logLevel:'silent',
    stdin: {resolveDir:path.resolve(root, '..'), loader:'tsx', contents:`
      import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom';
      import {setLocale} from './src/i18n'; import {messages} from './src/i18n/messages'; import {insights} from './src/i18n/insights';
      Object.assign(messages, insights); window.switchLocale=setLocale;
      ${pages.map(p => `import {${p.name}} from '${p.file}';`).join('\n')}
      const pages={${pages.map(p=>p.name).join(',')}};
      function App(){const [page,setPage]=React.useState('TaxRatesPage'); window.selectPage=setPage;const Page=pages[page];return <MemoryRouter><Page key={page}/></MemoryRouter>}
      createRoot(document.getElementById('root')).render(<App/>);
    `},
    plugins:[{name:'isolation',setup(build){
      build.onResolve({filter:/^@\/services(?:\/|$)/},args=>({path:args.path,namespace:'fixture'}));
      build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:fixtures,loader:'js'}));
      build.onResolve({filter:/^@\/stores\/auth.store$/},()=>({path:'auth',namespace:'auth'}));
      build.onLoad({filter:/.*/,namespace:'auth'},()=>({contents:`const state={user:{id:1,email:'synthetic@example.invalid',roles:['Group CEO'],employee:{id:1,name:'Pending',company_id:1,company_name:'Companies'}}};export const useAuthStore=Object.assign((selector)=>selector?selector(state):state,{getState:()=>state});`,loader:'js'}));
      build.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));
    }}],
  });
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const failures=[]; page.on('pageerror',e=>failures.push(e.message));
    await page.route('**/*',route=>route.request().url()==='https://insights.invalid/'
      ?route.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'}):route.abort());
    await page.goto('https://insights.invalid/'); await page.addScriptTag({content:result.outputFiles[0].text});
    await page.waitForFunction(()=>!!window.selectPage);
    for(const {name} of pages){
      await page.evaluate(name=>{window.switchLocale('id');window.selectPage(name)},name);
      await page.waitForTimeout(70);
      const id = await page.locator('body').innerText();
      await page.evaluate(()=>window.switchLocale('en')); await page.waitForTimeout(40);
      const en = await page.locator('body').innerText();
      assert(id.trim().length>0,`${name}: empty ID render`); assert(en.trim().length>0,`${name}: empty EN render`);
      assert.notEqual(id,en,`${name}: language switch did not update text`);
      assert.equal(failures.length,0,`${name}: ${failures.join('; ')}`);
    }
    for (const [name, expected] of [
      ['HeadcountTrendsPage', ['Mei', '+1,5%']],
      ['CEOLeadershipTeamPage', ['1 tahun', 'Pending', 'Companies']],
      ['CEOTurnoverReportPage', ['1,5 tahun', 'Pengunduran Diri']],
      ['CEOWorkforceAnalyticsPage', ['Laki-laki', 'Perempuan', '1-2 tahun']],
      ['GoalsOKRsPage', ['Sedang Berjalan', 'Tinggi', 'Widgets']],
      ['CEODashboardPage', ['Tingkat kehadiran Companies hari ini adalah 95,5%', 'Karyawan baru bergabung']],
    ]) {
      await page.evaluate(name=>{window.switchLocale('id');window.selectPage(name)},name); await page.waitForTimeout(70);
      const body=await page.locator('body').innerText();
      for(const text of expected) assert(body.includes(text),`${name}: missing localized ${text}`);
    }
    await page.evaluate(()=>window.switchLocale('en'));
    await page.evaluate(()=>window.selectPage('CompanyNPWPPage')); await page.waitForTimeout(70);
    await page.getByRole('button',{name:'Add NPWP',exact:true}).click();
    await page.getByPlaceholder('PT COMPANY NAME').fill('Draft');
    await page.evaluate(()=>window.switchLocale('id'));
    assert.equal(await page.getByPlaceholder('PT NAMA PERUSAHAAN').inputValue(),'Draft','locale switch lost draft');
    await page.getByRole('button',{name:'Batal',exact:true}).click();
    await page.evaluate(()=>{window.switchLocale('en');window.selectPage('BPJSKesehatanPage')});await page.waitForTimeout(70);
    assert((await page.locator('body').innerText()).includes('100,000.25'),'EN contribution precision');
    await page.evaluate(()=>window.switchLocale('id'));await page.waitForTimeout(30);
    const body=await page.locator('body').innerText();assert(body.includes('100.000,25'),'ID contribution precision');assert(body.includes('Pending'),'employee name was translated');
    await page.getByRole('button',{name:'Detail BPJS Pending'}).click();await page.evaluate(()=>window.switchLocale('en'));
    assert(await page.getByRole('dialog').count(),'locale switch closed modal');
    await page.evaluate(()=>{window.selectPage('TaxRatesPage');window.invalidContribution=true});await page.waitForTimeout(30);
    await page.evaluate(()=>window.selectPage('BPJSKesehatanPage'));await page.waitForTimeout(70);
    assert((await page.locator('body').innerText()).includes('saved payroll value is unavailable or invalid'),'localized saved-value error');
    await page.evaluate(()=>window.switchLocale('id'));await page.waitForTimeout(30);
    assert((await page.locator('body').innerText()).includes('Nilai payroll tersimpan tidak tersedia'),'error did not switch language');
    assert.equal(failures.length,0,failures.join('; '));
    console.log(JSON.stringify({passed:true,pages:pages.length,literalKeys:literalKeys.size,checks:['ID/EN renders','enum/chart/tenure/alert labels','draft preserved','modal preserved','employee data unchanged','saved contribution precision','live error translation'],network:'blocked; synthetic services only'}));
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
