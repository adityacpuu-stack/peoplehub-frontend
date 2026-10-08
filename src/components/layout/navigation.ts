import { t } from '@/i18n';
import { LayoutDashboard, Users, Clock, Calendar, DollarSign, UserCog, ClipboardList, Database, ArrowLeftRight, Network, Shield, Server, FileKey, History, Building, FileText, FolderOpen, FileSignature, Megaphone, FileStack, Calculator, Timer, CalendarCheck, CalendarDays, UsersRound, Crown, Target, TrendingUp, PieChart, Layers, BarChart3, Receipt, Percent, FileSpreadsheet, Wallet, Coins, BadgeDollarSign, UserCheck, MinusCircle, MapPin, Settings, Bell } from 'lucide-react';
import type { User } from '@/types';
import { getSidebarConfig, isMenuVisible } from '@/pages/admin/RoleDashboardConfigPage';
import { canAction, canOpenPath } from '@/lib/actions';

export interface MenuItem {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: string[];
  badge?: number;
}

export interface DropdownMenu {
  icon: typeof LayoutDashboard;
  label: string;
  roles?: string[];
  items: { path: string; label: string; icon?: typeof LayoutDashboard }[];
}

// ==========================================
// SUPER ADMIN MENU (Technical/System Focus)
// ==========================================
const superAdminMenu = {
  dashboard: {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'System Overview',
  },
  items: [
    {
      path: '/users',
      icon: UserCog,
      label: 'User Management',
    },
    {
      path: '/roles',
      icon: Shield,
      label: 'Roles & Permissions',
    },
    {
      path: '/companies',
      icon: Building,
      label: 'Companies',
    },
    {
      path: '/company-assignments',
      icon: UserCog,
      label: 'Company Assignments',
    },
    {
      path: '/system-config',
      icon: Settings,
      label: 'System Config',
    },
    {
      path: '/work-locations',
      icon: MapPin,
      label: 'Work Locations',
    },
    {
      path: '/payroll-settings',
      icon: Calculator,
      label: 'Payroll Settings',
    },
    {
      path: '/approval-settings',
      icon: UserCheck,
      label: 'Approval Settings',
    },
    {
      path: '/audit-logs',
      icon: History,
      label: 'Audit Logs',
    },
  ],
  systemDropdown: {
    icon: Server,
    label: 'System Settings',
    items: [
        { path: '/settings/general', label: 'General Settings' },
        { path: '/settings/attendance', label: 'Attendance Settings' },
        { path: '/settings/payroll', label: 'Payroll Schedule' },
        { path: '/settings/notifications', label: 'Notification Settings' },
    ],
  },
  securityDropdown: {
    icon: FileKey,
    label: 'Security',
    items: [
      { path: '/security/api-keys', label: 'API Keys' },
      { path: '/security/sessions', label: 'Account Security' },
      { path: '/security/login-history', label: 'Login History' },
    ],
  },
};

// ==========================================
// HR/P&C MENU (HR Operations Focus)
// ==========================================
const hrDashboardItem: MenuItem = {
  path: '/dashboard',
  icon: LayoutDashboard,
  label: 'Dashboard',
};

// Operations section
const operationsItems: MenuItem[] = [
  {
    path: '/employees',
    icon: Users,
    label: 'Employees',
    roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager'],
  },
  {
    path: '/attendance',
    icon: Clock,
    label: 'Attendance',
    roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager'],
  },
  {
    path: '/requests',
    icon: ClipboardList,
    label: 'My Approval',
    roles: ['Group CEO', 'CEO', 'HR Manager', 'Manager'],
  },
  {
    path: '/movement',
    icon: ArrowLeftRight,
    label: 'Movement',
    roles: ['Group CEO', 'CEO', 'HR Manager'],
  },
  {
    path: '/org-chart',
    icon: Network,
    label: 'Org Chart',
    roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff'],
  },
];

// Leave dropdown
const leaveDropdown: DropdownMenu = {
  icon: Calendar,
  label: 'Leave Management',
  roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager', 'Employee'],
  items: [
    { path: '/leave', label: 'Leave Requests' },
    { path: '/leave/policy', label: 'Leave Policy' },
    { path: '/leave/entitlements', label: 'Entitlements' },
    { path: '/leave/analytics', label: 'Analytics' },
  ],
};

// Payroll dropdown
const payrollDropdown: DropdownMenu = {
  icon: DollarSign,
  label: 'Payroll',
  roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Finance Manager'],
  items: [
    { path: '/payroll', label: 'Regular Employees' },
    { path: '/payroll/freelance', label: 'Freelance & Internship' },
  ],
};

// Compensation dropdown
const compensationDropdown: DropdownMenu = {
  icon: BadgeDollarSign,
  label: 'Compensation',
  roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Finance Manager'],
  items: [
    { path: '/overtime', label: 'Overtime', icon: Timer },
    { path: '/allowances', label: 'Allowances', icon: Coins },
    { path: '/deductions', label: 'Deductions', icon: MinusCircle },
  ],
};

// Master Data dropdown
const masterDataDropdown: DropdownMenu = {
  icon: Database,
  label: 'Master Data',
  roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff'],
  items: [
    { path: '/companies', label: 'Companies', icon: Building },
    { path: '/departments', label: 'Departments' },
    { path: '/positions', label: 'Positions' },
    { path: '/work-locations', label: 'Work Locations', icon: MapPin },
    { path: '/holiday-calendar', label: 'Holiday Calendar', icon: CalendarDays },
  ],
};

// Documents dropdown
const documentsDropdown: DropdownMenu = {
  icon: FileText,
  label: 'Documents',
  roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff'],
  items: [
    { path: '/contracts', label: 'Contracts', icon: FileSignature },
  ],
};

// Resources dropdown
const resourcesDropdown: DropdownMenu = {
  icon: FolderOpen,
  label: 'Resources',
  roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff'],
  items: [
    { path: '/templates', label: 'Templates', icon: FileStack },
  ],
};

// ==========================================
// MANAGER MENU (Team Management Focus)
// ==========================================
const managerDashboardItem: MenuItem = {
  path: '/dashboard',
  icon: LayoutDashboard,
  label: 'Dashboard',
};

// Manager menu items - badge is set dynamically in component
const getManagerMenuItems = (pendingLeaveCount: number): MenuItem[] => [
  {
    path: '/my-team',
    icon: UsersRound,
    label: 'My Team',
  },
  {
    path: '/team-attendance',
    icon: Clock,
    label: 'Attendance',
  },
  {
    path: '/team-overtime',
    icon: Timer,
    label: 'Overtime',
  },
  {
    path: '/leave-approval',
    icon: CalendarCheck,
    label: 'Leave Approval',
    badge: pendingLeaveCount > 0 ? pendingLeaveCount : undefined,
  },
];

// Manager Resources dropdown
const managerResourcesDropdown: DropdownMenu = {
  icon: FolderOpen,
  label: 'Resources',
  items: [
    { path: '/templates', label: 'Templates', icon: FileStack },
  ],
};

// ==========================================
// EMPLOYEE MENU (Self-Service Focus)
// ==========================================
const employeeDashboardItem: MenuItem = {
  path: '/dashboard',
  icon: LayoutDashboard,
  label: 'Dashboard',
};

const employeeMenuItems: MenuItem[] = [];

// Employee Resources dropdown
const employeeResourcesDropdown: DropdownMenu = {
  icon: FolderOpen,
  label: 'Resources',
  items: [
    { path: '/templates', label: 'Templates', icon: FileStack },
  ],
};

// ==========================================
// GROUP CEO MENU (Executive Overview Focus)
// ==========================================
const groupCEODashboardItem: MenuItem = {
  path: '/dashboard',
  icon: Crown,
  label: 'Executive Dashboard',
};

const groupCEOOverviewItems: MenuItem[] = [
  {
    path: '/companies',
    icon: Building,
    label: 'Companies',
  },
  {
    path: '/employees',
    icon: Users,
    label: 'All Employees',
  },
  {
    path: '/org-chart',
    icon: Layers,
    label: 'Organization',
  },
];

const groupCEOOperationsItems: MenuItem[] = [
  {
    path: '/attendance',
    icon: Clock,
    label: 'Attendance',
  },
  {
    path: '/requests',
    icon: ClipboardList,
    label: 'My Approval',
  },
];

// Group CEO Analytics dropdown
const groupCEOAnalyticsDropdown: DropdownMenu = {
  icon: BarChart3,
  label: 'Analytics',
  items: [
    { path: '/analytics/workforce', label: 'Workforce Analytics' },
    { path: '/analytics/attendance', label: 'Attendance Reports' },
    { path: '/analytics/turnover', label: 'Turnover Analysis' },
    { path: '/analytics/headcount', label: 'Headcount Trends' },
  ],
};

// Group CEO Payroll dropdown
const groupCEOPayrollDropdown: DropdownMenu = {
  icon: DollarSign,
  label: 'Payroll',
  items: [
    { path: '/payroll', label: 'Regular Employees' },
    { path: '/payroll/freelance', label: 'Freelance & Internship' },
    { path: '/ceo/payroll-report', label: 'Payroll Report' },
  ],
};

// Group CEO Performance dropdown
const groupCEOPerformanceDropdown: DropdownMenu = {
  icon: Target,
  label: 'Performance',
  items: [
    { path: '/performance', label: 'Performance Review' },
    { path: '/performance/kpi', label: 'KPI Dashboard' },
    { path: '/performance/goals', label: 'Goals & OKRs' },
  ],
};

// Group CEO Resources dropdown
const groupCEOResourcesDropdown: DropdownMenu = {
  icon: FolderOpen,
  label: 'Resources',
  items: [
    { path: '/templates', label: 'Templates', icon: FileStack },
  ],
};

// Group CEO Contracts dropdown
const groupCEOContractsDropdown: DropdownMenu = {
  icon: FileSignature,
  label: 'Contracts',
  items: [
    { path: '/contracts/overview', label: 'Contract Overview', icon: BarChart3 },
    { path: '/contracts', label: 'Manage Contracts', icon: FileSignature },
  ],
};

// ==========================================
// CEO MENU (Strategic Executive Focus)
// ==========================================
const ceoDashboardItem: MenuItem = {
  path: '/dashboard',
  icon: Crown,
  label: 'Executive Dashboard',
};

// CEO Strategic Items
const ceoStrategicItems: MenuItem[] = [
  {
    path: '/ceo/company-performance',
    icon: TrendingUp,
    label: 'Company Performance',
  },
  {
    path: '/ceo/workforce-analytics',
    icon: PieChart,
    label: 'Workforce Analytics',
  },
  {
    path: '/ceo/financial-overview',
    icon: DollarSign,
    label: 'Financial Overview',
  },
  {
    path: '/org-chart',
    icon: Layers,
    label: 'Organization',
  },
];

// CEO Executive Reports dropdown
const ceoReportsDropdown: DropdownMenu = {
  icon: BarChart3,
  label: 'Executive Reports',
  items: [
    { path: '/ceo/reports/headcount', label: 'Headcount Report' },
    { path: '/ceo/reports/turnover', label: 'Turnover Analysis' },
    { path: '/ceo/reports/cost', label: 'Cost Analysis' },
    { path: '/ceo/reports/department', label: 'Department Performance' },
    { path: '/ceo/payroll-report', label: 'Payroll Report' },
  ],
};

// CEO KPI dropdown (hidden for now)
// const ceoKPIDropdown: DropdownMenu = {
//   icon: Target,
//   label: 'KPI & Goals',
//   items: [
//     { path: '/ceo/kpi/dashboard', label: 'KPI Dashboard' },
//     { path: '/ceo/kpi/company-goals', label: 'Company Goals' },
//     { path: '/ceo/kpi/okr', label: 'OKR Tracking' },
//   ],
// };

// CEO Approvals - badge is set dynamically in component
const getCeoApprovalsItems = (pendingCount: number): MenuItem[] => [
  {
    path: '/requests',
    icon: ClipboardList,
    label: 'My Approval',
    badge: pendingCount > 0 ? pendingCount : undefined,
  },
];

// CEO People dropdown
const ceoPeopleDropdown: DropdownMenu = {
  icon: Users,
  label: 'People',
  items: [
    { path: '/ceo/leadership-team', label: 'Leadership Team' },
    // { path: '/ceo/succession-planning', label: 'Succession Planning' },
    // { path: '/ceo/performance-summary', label: 'Performance Summary' },
    // { path: '/ceo/talent-overview', label: 'Talent Overview' },
  ],
};

// Shared across primary and supplemental roles; inserted once under Resources.
const announcementsItem: MenuItem = {
  path: '/announcements',
  icon: Megaphone,
  label: 'Announcements',
};

// ==========================================
// TAX MENU (Tax & Compliance Focus)
// ==========================================
const taxDashboardItem: MenuItem = {
  path: '/dashboard',
  icon: Receipt,
  label: 'Tax Dashboard',
};

const taxMenuItems: MenuItem[] = [
  {
    path: '/employees',
    icon: Users,
    label: 'Employees',
  },
  {
    path: '/payroll',
    icon: Wallet,
    label: 'Payroll Data',
  },
];

// Tax PPh dropdown
const taxPPhDropdown: DropdownMenu = {
  icon: Percent,
  label: 'PPh Management',
  items: [
    { path: '/tax/pph21', label: 'PPh 21' },
    { path: '/tax/pph-calculation', label: 'Tax Calculation' },
    { path: '/tax/pph-history', label: 'Payment History' },
  ],
};

// Tax BPJS dropdown
const taxBPJSDropdown: DropdownMenu = {
  icon: Shield,
  label: 'BPJS',
  items: [
    { path: '/tax/bpjs-kesehatan', label: 'BPJS Kesehatan' },
    { path: '/tax/bpjs-ketenagakerjaan', label: 'BPJS Ketenagakerjaan' },
    { path: '/tax/bpjs-reports', label: 'BPJS Reports' },
  ],
};

// Tax Reports dropdown
const taxReportsDropdown: DropdownMenu = {
  icon: FileSpreadsheet,
  label: 'Tax Reports',
  items: [
    { path: '/tax/espt', label: 'e-SPT' },
    { path: '/tax/ebupot', label: 'e-Bupot' },
    { path: '/tax/monthly-reports', label: 'Monthly Reports' },
    { path: '/tax/annual-reports', label: 'Annual Reports' },
  ],
};

// Tax Settings dropdown
const taxSettingsDropdown: DropdownMenu = {
  icon: Calculator,
  label: 'Tax Settings',
  items: [
    { path: '/tax/rates', label: 'Tax Rates' },
    { path: '/tax/ptkp', label: 'PTKP Settings' },
    { path: '/tax/company-npwp', label: 'Company NPWP' },
  ],
};


export interface NavigationSection {
  label?: string;
  entries: (MenuItem | DropdownMenu)[];
  variant?: 'default' | 'admin' | 'ceo' | 'tax';
}
export function getNavigation(user: User | null, counts = { ceo: 0, manager: 0 }) {
  const userRoles = user?.roles || ['Employee'];
  const isSuperAdmin = userRoles.includes('Super Admin');
  const isGroupCEO = !isSuperAdmin && userRoles.includes('Group CEO');
  const isCEO = !isSuperAdmin && userRoles.includes('CEO') && !isGroupCEO;
  const isTax = !isSuperAdmin && userRoles.some(r => ['Tax Manager', 'Tax Staff'].includes(r));
  const isHR = !isSuperAdmin && userRoles.some(r => ['HR Manager', 'HR Staff'].includes(r)) && !isGroupCEO && !isCEO && !isTax;
  const isFinance = userRoles.includes('Finance Manager') && !isSuperAdmin && !isGroupCEO && !isCEO && !isTax && !isHR;
  const isManager = !isSuperAdmin && userRoles.includes('Manager') && !isHR && !isGroupCEO && !isCEO && !isTax && !isFinance;
  const isEmployee = !isSuperAdmin && !isGroupCEO && !isCEO && !isTax && !isHR && !isManager && !isFinance;

  // Company feature toggles
  const companyFeatures = user?.companyFeatures;
  const attendanceEnabled = companyFeatures?.attendance_enabled ?? true;
  const leaveEnabled = companyFeatures?.leave_enabled ?? true;
  const payrollEnabled = companyFeatures?.payroll_enabled ?? true;


  const hasAccess = (roles?: string[]) => !roles || roles.some(role => userRoles.includes(role));
  const ceoApprovalsItems = getCeoApprovalsItems(counts.ceo);
  const managerMenuItems = getManagerMenuItems(counts.manager);
  // Sidebar role config for menu visibility
  const configRole = userRoles.includes('HR Manager') ? 'HR Manager'
    : userRoles.includes('HR Staff') ? 'HR Staff'
    : isManager ? 'Manager'
    : isEmployee ? 'Employee'
    : null;
  const sidebarConfig = configRole ? getSidebarConfig() : null;
  const canShow = (path: string): boolean => {
    if (!sidebarConfig || !configRole) return true;
    return isMenuVisible(sidebarConfig, configRole, path);
  };

  // Filter items for non-super admin roles and company features
  const filteredOperationsItems = operationsItems.filter((item) => {
    // Check role access
    if (!hasAccess(item.roles)) return false;

    // Check company feature toggles
    if (item.path === '/attendance' && !attendanceEnabled) return false;

    // Check sidebar config
    if (!canShow(item.path)) return false;

    return true;
  });

  // Filtered dropdowns for HR role
  const filteredLeaveDropdown = { ...leaveDropdown, items: leaveDropdown.items.filter(i => canShow(i.path)) };
  const filteredPayrollDropdown = { ...payrollDropdown, items: payrollDropdown.items.filter(i => canShow(i.path)) };
  const filteredCompensationDropdown = { ...compensationDropdown, items: compensationDropdown.items.filter(i => canShow(i.path)) };
  const filteredDocumentsDropdown = { ...documentsDropdown, items: documentsDropdown.items.filter(i => canShow(i.path)) };
  const filteredResourcesDropdown = { ...resourcesDropdown, items: resourcesDropdown.items.filter(i => canShow(i.path)) };
  const filteredMasterDataDropdown = { ...masterDataDropdown, items: masterDataDropdown.items.filter(i => canShow(i.path)) };

  // Filtered for Manager
  const filteredManagerMenuItems = managerMenuItems.filter(item => {
    if (item.path === '/team-attendance' && !attendanceEnabled) return false;
    if (item.path === '/team-overtime' && !attendanceEnabled) return false;
    if (item.path === '/leave-approval' && !leaveEnabled) return false;
    if (item.path === '/my-leave' && !leaveEnabled) return false;
    return canShow(item.path);
  });
  const filteredManagerResourcesDropdown = { ...managerResourcesDropdown, items: managerResourcesDropdown.items.filter(i => canShow(i.path)) };

  // Filtered for Employee
  const filteredEmployeeMenuItems = employeeMenuItems.filter(item => {
    if (item.path === '/attendance' && !attendanceEnabled) return false;
    if (item.path === '/my-leave' && !leaveEnabled) return false;
    return canShow(item.path);
  });
  const filteredEmployeeResourcesDropdown = { ...employeeResourcesDropdown, items: employeeResourcesDropdown.items.filter(i => canShow(i.path)) };


  const sections: NavigationSection[] = [];
  // Covered operational destinations also need the server-resolved action
  // (lib/actions.ts); empty groups/sections disappear. Personal links are never covered.
  const add = (label: string | undefined, entries: (MenuItem | DropdownMenu)[], variant?: NavigationSection['variant']) => {
    const populated = entries
      .map(entry => 'items' in entry ? { ...entry, items: entry.items.filter(item => canOpenPath(user, item.path)) } : entry)
      .filter(entry => 'items' in entry ? entry.items.length > 0 : canOpenPath(user, entry.path));
    if (populated.length) sections.push({ label, entries: populated, variant });
  };
  if (user?.employee) add('Personal', [
    ...(attendanceEnabled ? [{ path: '/my-attendance', label: 'My Attendance', icon: Clock }] : []),
    ...(leaveEnabled ? [{ path: '/my-leave', label: 'My Leave', icon: Calendar }] : []),
    { path: '/documents', label: 'My Documents', icon: FileText },
  ]);
  if (isSuperAdmin) {
    add(undefined, [superAdminMenu.dashboard], 'admin');
    add('User & Access', superAdminMenu.items.filter(item => ['/users', '/roles', '/company-assignments'].includes(item.path)), 'admin');
    add('Configuration', superAdminMenu.items.filter(item => ['/system-config', '/approval-settings', '/payroll-settings'].includes(item.path)), 'admin');
    add('Monitoring', superAdminMenu.items.filter(item => item.path === '/audit-logs'), 'admin');
    add('System', [superAdminMenu.systemDropdown, superAdminMenu.securityDropdown], 'admin');
  } else if (isGroupCEO) {
    add(undefined, [groupCEODashboardItem], 'ceo');
    add('Group Overview', groupCEOOverviewItems.filter(item => !masterDataDropdown.items.some(master => master.path === item.path)), 'ceo');
    add('Operations', [...groupCEOOperationsItems.map(item => item.path === '/requests' ? { ...item, badge: counts.ceo > 0 ? counts.ceo : undefined } : item), groupCEOAnalyticsDropdown], 'ceo');
    add('Financial', [groupCEOPayrollDropdown], 'ceo');
    add('People', [groupCEOPerformanceDropdown], 'ceo');
    add('Contracts', [groupCEOContractsDropdown], 'ceo');
    add('Resources', [groupCEOResourcesDropdown], 'ceo');
  } else if (isCEO) {
    add(undefined, [ceoDashboardItem], 'ceo');
    add('Strategic', ceoStrategicItems, 'ceo');
    add('Insights & Reports', [ceoReportsDropdown], 'ceo');
    add('Approvals', ceoApprovalsItems, 'ceo');
    add('People', [ceoPeopleDropdown], 'ceo');
  } else if (isTax) {
    add(undefined, [taxDashboardItem], 'tax');
    add('Data', taxMenuItems, 'tax');
    add('Tax Management', [taxPPhDropdown, taxBPJSDropdown], 'tax');
    add('Reports', [taxReportsDropdown], 'tax');
    add('Settings', [taxSettingsDropdown], 'tax');
  } else if (isManager) {
    add(undefined, [managerDashboardItem]);
    add('Team Management', filteredManagerMenuItems);
    add('Resources', [filteredManagerResourcesDropdown]);
  } else if (isEmployee) {
    add(undefined, [employeeDashboardItem]);
    add('Self Service', filteredEmployeeMenuItems);
    add('Resources', [filteredEmployeeResourcesDropdown]);
  } else {
    add(undefined, [hrDashboardItem]);
    add('Operations', filteredOperationsItems);
    if (hasAccess(leaveDropdown.roles) && leaveEnabled) add('Leave Management', filteredLeaveDropdown.items.map(item => ({ ...item, icon: item.icon || leaveDropdown.icon })));
    if (hasAccess(payrollDropdown.roles) && payrollEnabled) add('Payroll', filteredPayrollDropdown.items.map(item => ({ ...item, icon: item.icon || payrollDropdown.icon })));
    if (hasAccess(compensationDropdown.roles)) add('Compensation', filteredCompensationDropdown.items.map(item => ({ ...item, icon: item.icon || compensationDropdown.icon })));
    if (hasAccess(documentsDropdown.roles)) add('Documents', [filteredDocumentsDropdown]);
    if (hasAccess(resourcesDropdown.roles)) add('Resources', [filteredResourcesDropdown]);
  }
  if (isSuperAdmin || (!isCEO && hasAccess(masterDataDropdown.roles))) add(undefined, [filteredMasterDataDropdown]);
  if (canShow('/templates') && !sections.some(section => section.entries.some(entry =>
    'items' in entry ? entry.items.some(item => item.path === '/templates') : entry.path === '/templates'))) {
    add('Resources', [{ path: '/templates', label: 'Templates', icon: FileStack }]);
  }
  const flatten = (...groups: (MenuItem | DropdownMenu)[]): MenuItem[] => groups.flatMap(group =>
    'items' in group ? group.items.map(item => ({ ...item, icon: item.icon || group.icon })) : [group]);
  const hrLinks = flatten(...operationsItems.filter(item => hasAccess(item.roles)),
    ...[leaveDropdown, payrollDropdown, compensationDropdown, documentsDropdown, resourcesDropdown, masterDataDropdown].filter(group => hasAccess(group.roles)));
  const taxLinks = flatten(...taxMenuItems, taxPPhDropdown, taxBPJSDropdown, taxReportsDropdown, taxSettingsDropdown);
  const seenPaths = new Set(['/dashboard', '/my-leave', '/my-attendance', '/documents', ...sections.flatMap(section => flatten(...section.entries)).map(item => item.path)]);
  const candidateGroups: Array<{ label: string; roles: string[]; links: MenuItem[] }> = [
    { label: 'HR Operations', roles: ['HR Manager', 'HR Staff'], links: hrLinks },
    { label: 'Tax & Finance', roles: ['Tax Manager', 'Tax Staff', 'Finance Manager'], links: [
      ...taxLinks,
      ...(userRoles.includes('Finance Manager') ? flatten(payrollDropdown, { path: '/payroll-settings', label: 'Payroll Settings', icon: Calculator }) : []),
    ] },
    { label: 'Team Management', roles: ['Manager'], links: flatten(...managerMenuItems, managerResourcesDropdown) },
  ];
  const supplementalGroups = candidateGroups.flatMap(group => {
    const assigned = group.roles.filter(role => userRoles.includes(role));
    if (!assigned.length) return [];
    const items = group.links.filter(item => {
      if (seenPaths.has(item.path)) return false;
      if (isCEO && masterDataDropdown.items.some(master => master.path === item.path)) return false;
      if (!attendanceEnabled && ['/attendance', '/team-attendance', '/team-overtime', '/overtime'].includes(item.path)) return false;
      if (!leaveEnabled && (item.path.startsWith('/leave') || item.path === '/requests')) return false;
      if (!payrollEnabled && (item.path === '/payroll' || item.path.startsWith('/payroll/') || item.path.startsWith('/tax/'))) return false;
      if (!assigned.some(role => isMenuVisible(getSidebarConfig(), role, item.path))) return false;
      seenPaths.add(item.path);
      return true;
    });
    return items.length ? [{ ...group, items }] : [];
  });

  supplementalGroups.forEach(group => add(group.label, group.items));
  // Preserve the same additive menu visibility as supplemental HR/Manager roles,
  // while keeping the shared announcement link in Resources for every role.
  const announcementsConfig = getSidebarConfig();
  const announcementsVisible = userRoles.some(role =>
    isMenuVisible(announcementsConfig, role === 'User' ? 'Employee' : role, '/announcements'));
  if (announcementsVisible) {
    const resourcesSection = sections.find(section => section.label === 'Resources');
    const resourcesMenu = resourcesSection?.entries.find(entry => 'items' in entry && entry.label === 'Resources');
    if (resourcesSection && resourcesMenu && 'items' in resourcesMenu) {
      resourcesSection.entries = resourcesSection.entries.map(entry => entry === resourcesMenu
        ? { ...resourcesMenu, items: [...resourcesMenu.items, announcementsItem] } : entry);
    } else if (resourcesSection) {
      resourcesSection.entries.push(announcementsItem);
    } else {
      add('Resources', [announcementsItem]);
    }
  }
  // Keep Resources/Documents captions once after applying role/config rules.
  for (const section of sections) {
    if (section.label === 'Resources' || section.label === 'Documents' || ((isCEO || isGroupCEO) && ['People', 'Contracts'].includes(section.label || ''))) section.entries = section.entries.flatMap(entry =>
      'items' in entry && entry.label === section.label
        ? entry.items.map(item => ({ ...item, icon: item.icon || entry.icon }))
        : [entry]);
  }
  // Employee and HR workspaces start with Dashboard before their other destinations.
  if (isEmployee || isHR || isManager || isCEO || isGroupCEO || isSuperAdmin) {
    const homeIndex = sections.findIndex(section => section.entries.some(entry => !('items' in entry) && entry.path === '/dashboard'));
    if (homeIndex > 0) sections.unshift(...sections.splice(homeIndex, 1));
  }
  const links = sections.flatMap(section => flatten(...section.entries).map(item => ({ ...item, section: section.label || 'Dashboard' })));
  const accountLinks = [
    { path: '/settings', label: 'Profil & Pengaturan', icon: Settings, section: 'Akun' },
    { path: '/notifications', label: 'Notifikasi', icon: Bell, section: 'Akun' },
  ];
  const searchable = [...links, ...accountLinks].filter((item, i, all) => all.findIndex(other => other.path === item.path) === i);
  // A result opens /employees/:id: require both list access and the existing detail-role guard.
  // Finance/Tax alone can list employees but cannot open another employee's detail.
  const employeeRoles = ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager'];
  const canSearchEmployees = userRoles.some(role => employeeRoles.includes(role)) && canShow('/employees')
    && canAction(user, 'employee.view')
    && (isSuperAdmin || (user?.accessibleCompanyIds?.length ?? 0) > 0);
  // Localize only the final view model, after role rules and source-label comparisons.
  // Keep the source label as the stable identity for expansion state.
  const localizedSections = sections.map(section => ({ ...section, sourceLabel: section.label,
    label: section.label ? t(section.label) : section.label,
    entries: section.entries.map((entry): (MenuItem | DropdownMenu) & { sourceLabel: string } => {
      if ('items' in entry) return { ...entry, sourceLabel: entry.label, label: t(entry.label),
        items: entry.items.map(item => ({ ...item, label: t(item.label) })) };
      return { ...entry, sourceLabel: entry.label, label: t(entry.label) };
    }),
  }));
  return { sections: localizedSections, links: searchable.map(item => ({ ...item, sourceLabel: item.label, label: t(item.label), section: t(item.section) })), canSearchEmployees, isSuperAdmin, isGroupCEO, isCEO, isTax, isEmployee, isHR, isManager };
}
