import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, cost: string | null, language = 'en', pages = 1) {
  const employee = { id: 901, employee_id: 'TEST-901', name: 'Saved Result Employee', company_id: 2,
    employment_type: 'permanent', employment_status: 'active', profile_completed: true,
    national_id: '0000000000000901', email: 'staff@example.test',
    company: { id: 2, name: 'Synthetic Company', code: 'TEST' } };
  const user = { id: 91, email: 'finance@example.test', language, roles: ['Finance Manager'], permissions: [],
    accessibleCompanyIds: [2], is_active: true, force_password_change: false, employee,
    companyFeatures: { payroll_enabled: true, attendance_enabled: true, leave_enabled: true, performance_enabled: true } };
  const record = { id: 701, employee_id: 901, company_id: 2, employee, period: '2026-10', status: 'paid',
    payroll_number: 'SAVED-701', basic_salary: '9000000', gross_salary: '12345000',
    net_salary: '9999999', take_home_pay: '7654321', thp: '8888888', pph21: '543210',
    bpjs_employee_total: '500000', bpjs_company_total: '800000', total_deductions: '321000',
    total_cost_company: cost, total_cost_to_company: cost,
    presentation: { version:1, basis:'generation', take_home_pay:7654321,
      company_cost:cost === null ? null : Number(cost), taxable_base:12345000,
      funding:{pph21:'withheld',tax_allowance_mode:'none',bpjs_employee:'employee'},
      position:{total:0,business:0,tax_allowance:0},
      earnings:{items:[{key:'basic_salary',amount:9000000}],total:9000000},
      deductions:{pph21:543210,bpjs_employee:500000,system:321000,total:1364210},
      company_borne:{pph21:0,bpjs_employee:0,bpjs_company:800000} } };
  const unexpected: string[] = [];
  await page.addInitScript(() => {
    localStorage.clear(); localStorage.setItem('token', 'isolated-synthetic');
    localStorage.setItem('sidebar-storage', JSON.stringify({state:{isOpen:false,isCollapsed:false},version:0}));
  });
  const origin = process.env.E2E_LOCAL_BUILT === '1' ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177';
  await page.route('**/*', async route => {
    const req=route.request(),url=new URL(req.url());
    if(url.origin===origin&&!['xhr','fetch'].includes(req.resourceType())&&!url.pathname.startsWith('/api/')) return route.continue();
    if(req.resourceType()==='image') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'});
    const endpoint=url.pathname.replace(/^\/api\/v1/,'');
    if(['/presence','/audit-logs/events'].includes(endpoint)&&req.method()==='POST') return route.fulfill({status:204});
    if(url.origin!==origin||req.method()!=='GET'){unexpected.push(`${req.method()} ${url.href}`);return route.abort();}
    let data: unknown;
    if(endpoint==='/auth/me') data={user};
    else if(endpoint==='/employees/me') data=employee;
    else if(endpoint==='/notifications/unread-count') data={unread_count:0};
    else if(['/notifications/announcement-popups','/leaves/pending-approvals','/overtime/pending-approvals'].includes(endpoint)) data=[];
    else if(['/presence','/users/me/preferences'].includes(endpoint)) data={};
    else if(endpoint==='/dashboard/group') data={summary:{total_employees:1,total_companies:1},companies:[]};
    else if(endpoint==='/payroll') {
      const current=Number(url.searchParams.get('page') || 1);
      return route.fulfill({json:{success:true,data:current<=pages?[{...record,id:700+current,
        presentation:{...record.presentation,earnings:null}}]:[],
        pagination:{page:current,limit:1,total:pages,totalPages:pages}}});
    }
    else if(endpoint==='/companies') return route.fulfill({json:{success:true,data:[employee.company],pagination:{page:1,limit:1000,total:1,totalPages:1}}});
    else if(endpoint==='/payroll/701') data=record;
    else{unexpected.push(`${req.method()} ${endpoint}`);return route.abort();}
    return route.fulfill({json:{success:true,data}});
  });
  return unexpected;
}

for (const cost of ['123456', '0', null]) {
  test(`financial report uses saved company cost ${cost}, never synthesizes it`, async ({page}) => {
    const unexpected=await setup(page,cost);
    await page.goto('/ceo/financial-overview');
    const card=page.getByText('Total Cost',{exact:true}).locator('xpath=../..');
    await expect(card).toBeVisible();
    if(cost===null) await expect(card).toContainText(/unavailable|not available|not recorded|—|-/i);
    else await expect(card).toContainText(cost==='0'?/IDR\s*0|Rp\s*0/:/123[.,]456/);
    await expect(card).not.toContainText(/9[.,]497[.,]531|9 million|9M/);
    expect(unexpected).toEqual([]);
    if(cost==='123456') await page.screenshot({path:'../.analysis/payroll-saved-financial.png',fullPage:true});
  });
}

test('payroll detail displays saved company cost and THP without a calculation request', async({page})=>{
  const unexpected=await setup(page,'123456');
  await page.goto('/payroll');
  await page.getByRole('tab',{name:/^Paid/}).click();
  await page.getByTitle(/View Detail/i).click();
  await expect(page.getByRole('heading',{name:'Saved Result Employee',exact:true})).toBeVisible();
  await expect(page.getByTestId('payroll-detail-company-cost')).toContainText(/123[.,]456/);
  await expect(page.getByRole('region',{name:'Payroll summary',exact:true})).toContainText(/7[.,]654[.,]321/);
  await expect(page.getByRole('region',{name:'Payroll summary',exact:true})
    .getByText('Total Deductions',{exact:true}).locator('..')).toContainText(/1[.,]364[.,]210/);
  expect(unexpected).toEqual([]);
  await page.screenshot({path:'../.analysis/payroll-saved-detail.png',fullPage:true});
});

test('financial report includes saved costs from every server page',async({page})=>{
  const unexpected=await setup(page,'123456','en',2);
  await page.goto('/ceo/financial-overview');
  const card=page.getByText('Total Cost',{exact:true}).locator('xpath=../..');
  await expect(card).toContainText(/246[.,]912/);
  expect(unexpected).toEqual([]);
});
