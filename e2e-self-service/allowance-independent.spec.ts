import { test, expect, type Page } from '@playwright/test';

// Reviewer-owned UI checks. All application requests are synthetic and fail closed.
const audits = new WeakMap<Page, { unexpected: string[]; errors: string[] }>();
test.afterEach(async ({page}) => {
  expect(audits.get(page)?.unexpected).toEqual([]);
  expect(audits.get(page)?.errors).toEqual([]);
});
async function open(page: Page, path = '/allowances', role = 'HR Manager') {
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  const employee = {id:901,name:'Synthetic Staff',employee_id:'AL-901',company_id:2,employment_status:'active',profile_completed:true,national_id:'0000000000000901',company:{id:2,name:'Synthetic Company',code:'AL'}};
  const user = {id:91,email:'reviewer@example.test',roles:[role],permissions:[],accessibleCompanyIds:[2],is_active:true,force_password_change:false,employee,language:'id',companyFeatures:{attendance_enabled:true,leave_enabled:true,payroll_enabled:true,performance_enabled:true}};
  const common = {employee_id:901,company_id:2,employee,type:'bonus',is_taxable:true,is_bpjs_object:false,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z',payment_state:'none',payrollLinks:[]};
  const contract = {...common,id:101,name:'OL Transport',type:'transport',is_contract:true,lifecycle:'contract',status:'approved',amount:'1000000',effective_date:'2026-09-21T00:00:00Z',end_date:null,locked:true};
  const pending = {...contract,id:102,name:'Pending OL',status:'pending',locked:false,amount:'1234.50'};
  const monthly = {...common,id:201,name:'Sales target',is_contract:false,lifecycle:'monthly',status:'draft',amount:'1234.50',payroll_period:'2026-10',performance_start:'2026-09-01',performance_end:'2026-09-30',reference:'Original reference',notes:'Original note'};
  const legacy = {...common,id:301,name:'Legacy allowance',is_contract:false,lifecycle:'review',status:'active',amount:'250000'};
  const state = {unexpected:[] as string[],errors:[] as string[],writes:[] as {path:string;body:any}[],reads:[] as string[],submitFailure:false,listFailure:false};
  audits.set(page,state);
  page.on('pageerror',error=>state.errors.push(error.message));
  await page.addInitScript(()=>{localStorage.setItem('token','isolated-allowance-review');localStorage.setItem('peoplehub.language','id');localStorage.setItem('sidebar-storage',JSON.stringify({state:{isOpen:false,isCollapsed:false},version:0}));});
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.origin===origin&&!['xhr','fetch'].includes(req.resourceType())&&!url.pathname.startsWith('/api/'))return route.continue();
    if(url.hostname==='ui-avatars.com'&&req.resourceType()==='image')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'});
    if(url.origin!==origin||!url.pathname.startsWith('/api/v1/')){state.unexpected.push(`${method} ${url.origin}${url.pathname}`);return route.abort();}
    const endpoint=url.pathname.replace('/api/v1','');
    const json=(data:unknown)=>route.fulfill({json:{success:true,data}});
    if(method==='POST'&&endpoint==='/audit-logs/events')return route.fulfill({status:204});
    if(endpoint==='/auth/me')return json({user});
    if(endpoint==='/employees/me')return json(employee);
    if(endpoint==='/notifications/unread-count')return json({unread_count:0});
    if(['/notifications/announcement-popups','/leaves/pending-approvals','/overtime/pending-approvals'].includes(endpoint))return json([]);
    if(['/presence','/users/me/preferences','/users/me/language'].includes(endpoint))return json({});
    if(['/companies','/employees'].includes(endpoint))return route.fulfill({json:{success:true,data:endpoint==='/companies'?[employee.company]:[employee],meta:{page:1,limit:100,total:1,totalPages:1}}});
    if(method==='GET'&&endpoint==='/allowances'){
      state.reads.push(url.search);
      if(state.listFailure)return route.fulfill({status:503,json:{success:false,error:{message:'Synthetic read failure'}}});
      const lifecycle=url.searchParams.get('lifecycle');
      const data=lifecycle==='contract'?[contract,pending]:lifecycle==='review'?[legacy]:url.searchParams.get('payroll_period')==='2026-10'?[monthly]:[];
      return route.fulfill({json:{data,pagination:{page:1,limit:20,total:data.length,totalPages:1},summary:lifecycle==='monthly'&&data.length?[{status:'draft',count:1,amount:'1234.50'}]:[]}});
    }
    if(method==='GET'&&endpoint.endsWith('/history'))return route.fulfill({json:{lifecycle:'monthly',rows:[monthly]}});
    if(['POST','PUT','PATCH'].includes(method)&&endpoint.startsWith('/allowances')){
      state.writes.push({path:endpoint,body:req.postDataJSON()});
      if(endpoint==='/allowances/monthly/submit')return route.fulfill({json:state.submitFailure?{updated:0,failed:1,errors:['Synthetic submission rejected']}:{updated:1,failed:0,errors:[]}});
      return route.fulfill({json:{...monthly,...req.postDataJSON()}});
    }
    state.unexpected.push(`${method} ${endpoint}`);return route.abort();
  });
  await page.goto(path);
  await expect(page.getByRole('tab',{name:'Tunjangan Kontrak / OL'})).toBeVisible();
  return state;
}

test('two tabs preserve OL and monthly history; next month has no carried amount',async({page})=>{
  const state=await open(page);
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByText('OL Transport',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Insentif Bulanan'}).click();
  await page.getByLabel('Periode payroll',{exact:true}).fill('2026-10');
  await expect(page.getByText('Sales target',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Riwayat Synthetic Staff'}).click();
  await expect(page.getByRole('dialog')).toContainText('Oktober 2026');
  await page.getByRole('button',{name:'Tutup dialog'}).click();
  await page.getByLabel('Periode payroll',{exact:true}).fill('2026-11');
  await expect(page.getByText('Sales target',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Belum ada pengajuan periode ini',{exact:true})).toBeVisible();
  expect(state.writes).toEqual([]);
});

test('editing existing decimal amount keeps its value exactly',async({page})=>{
  const state=await open(page,'/allowances?tab=monthly&period=2026-10');
  await page.getByRole('button',{name:'Edit · Synthetic Staff',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Simpan',exact:true}).click();
  await expect.poll(()=>state.writes.length).toBe(1);
  expect(state.writes[0].body.amount).toBe(1234.50);
});

test('clearing monthly optional fields sends explicit nulls',async({page})=>{
  const state=await open(page,'/allowances?tab=monthly&period=2026-10');
  await page.getByRole('button',{name:'Edit · Synthetic Staff',exact:true}).click();
  const dialog=page.getByRole('dialog');
  for(const label of ['Awal periode kinerja','Akhir periode kinerja','Referensi','Catatan'])await dialog.getByLabel(label,{exact:true}).fill('');
  await dialog.getByRole('button',{name:'Simpan',exact:true}).click();
  await expect.poll(()=>state.writes.length).toBe(1);
  expect(state.writes[0].body).toMatchObject({performance_start:null,performance_end:null,reference:null,notes:null});
});

test('single-row submit reports failure, never false success from bulk 200 response',async({page})=>{
  const state=await open(page,'/allowances?tab=monthly&period=2026-10');state.submitFailure=true;
  await page.getByRole('button',{name:'Ajukan · Synthetic Staff',exact:true}).click();
  await expect(page.getByText('Synthetic submission rejected',{exact:false})).toBeVisible();
  await expect(page.getByText('Insentif diajukan',{exact:true})).toHaveCount(0);
});

test('HR Staff can enter incentives but cannot approve pending OL',async({page})=>{
  await open(page,'/allowances','HR Staff');
  await expect(page.getByText('Pending OL',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/^Setujui ·/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Tambah tunjangan OL',exact:true})).toBeVisible();
});

test('ordinary tab navigation has no cancellation error; genuine read failure clears rows and retries',async({page})=>{
  const state=await open(page);
  await expect(page.getByText('OL Transport',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Insentif Bulanan'}).click();
  await page.getByLabel('Periode payroll',{exact:true}).fill('2026-10');
  await expect(page.getByText('Sales target',{exact:true})).toBeVisible();
  await expect(page.getByText('canceled',{exact:true})).toHaveCount(0);
  state.listFailure=true;
  await page.getByLabel('Periode payroll',{exact:true}).fill('2026-11');
  await expect(page.getByText('Data belum dapat dimuat',{exact:true})).toBeVisible();
  await expect(page.getByText('Sales target',{exact:true})).toHaveCount(0);
  state.listFailure=false;
  await page.getByRole('button',{name:'Coba lagi',exact:true}).click();
  await expect(page.getByText('Belum ada pengajuan periode ini',{exact:true})).toBeVisible();
});

for(const width of [1440,390,320])test(`allowance tabs and monthly dialog fit ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await open(page,'/allowances?tab=monthly&period=2026-10');
  await expect(page.getByText('Sales target',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(width===1440){
    const money=page.locator('.al-panel .cp-table tbody tr').first().locator('.cp-money');
    expect((await money.boundingBox())!.width).toBeGreaterThanOrEqual(90);
    const status=page.locator('.al-panel .cp-table tbody tr').first().locator('.cp-status');
    expect((await status.boundingBox())!.height).toBeLessThan(50);
  }
  await page.screenshot({path:`../.analysis/allowance-ui-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Tambah insentif',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:`../.analysis/allowance-dialog-${width}.png`,fullPage:true});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});
