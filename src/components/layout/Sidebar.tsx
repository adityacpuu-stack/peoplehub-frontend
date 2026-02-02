import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useAuthStore } from '@/stores/auth.store';
import { leaveService } from '@/services/leave.service';
import { overtimeService } from '@/services/overtime.service';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronDown,
  UserCog,
  ClipboardList,
  LogOut,
  Database,
  ArrowLeftRight,
  Network,
  Shield,
  Server,
  FileKey,
  History,
  Building,
  FileText,
  FolderOpen,
  FileSignature,
  Megaphone,
  FileStack,
  Calculator,
  Timer,
  CalendarCheck,
  CalendarDays,
  UsersRound,
  Crown,
  Target,
  TrendingUp,
  PieChart,
  Layers,
  BarChart3,
  Receipt,
  Percent,
  FileSpreadsheet,
  Wallet,
  Coins,
  BadgeDollarSign,
  UserCheck,
} from 'lucide-react';

interface MenuItem {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: string[];
  badge?: number;
}

interface DropdownMenu {
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
      path: '/company-features',
      icon: Server,
      label: 'Company Features',
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
      { path: '/settings/notifications', label: 'Notification Settings' },
      { path: '/settings/integrations', label: 'Integrations' },
      { path: '/settings/backup', label: 'Backup & Restore' },
    ],
  },
  securityDropdown: {
    icon: FileKey,
    label: 'Security',
    items: [
      { path: '/security/api-keys', label: 'API Keys' },
      { path: '/security/sessions', label: 'Active Sessions' },
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
    roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager', 'Employee'],
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
    roles: ['Group CEO', 'CEO', 'HR Manager', 'HR Staff'],
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
  roles: ['Group CEO', 'CEO', 'HR Manager', 'Finance Manager'],
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
    { path: '/resources/templates', label: 'Templates', icon: FileStack },
    { path: '/resources/announcements', label: 'Announcements', icon: Megaphone },
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
  {
    path: '/my-leave',
    icon: Calendar,
    label: 'My Leave',
  },
  {
    path: '/manager/documents',
    icon: FileText,
    label: 'My Documents',
  },
];

// Manager Resources dropdown (different routes from HR)
const managerResourcesDropdown: DropdownMenu = {
  icon: FolderOpen,
  label: 'Resources',
  items: [
    { path: '/manager/templates', label: 'Templates', icon: FileStack },
    { path: '/manager/announcements', label: 'Announcements', icon: Megaphone },
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

const employeeMenuItems: MenuItem[] = [
  {
    path: '/attendance',
    icon: Clock,
    label: 'My Attendance',
  },
  {
    path: '/my-leave',
    icon: Calendar,
    label: 'My Leave',
  },
  {
    path: '/employee/documents',
    icon: FileText,
    label: 'My Documents',
  },
];

// Employee Resources dropdown
const employeeResourcesDropdown: DropdownMenu = {
  icon: FolderOpen,
  label: 'Resources',
  items: [
    { path: '/employee/templates', label: 'Templates', icon: FileStack },
    { path: '/employee/announcements', label: 'Announcements', icon: Megaphone },
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
    { path: '/payroll/summary', label: 'Group Summary' },
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
    { path: '/resources/templates', label: 'Templates', icon: FileStack },
    { path: '/resources/announcements', label: 'Announcements', icon: Megaphone },
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
    path: '/ceo/approvals',
    icon: ClipboardList,
    label: 'Pending Approvals',
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

// CEO Announcements
const ceoAnnouncementsItem: MenuItem = {
  path: '/ceo/announcements',
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

export function Sidebar() {
  const location = useLocation();
  const { isCollapsed, toggleCollapse, isOpen, setOpen } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [managerPendingLeaveCount, setManagerPendingLeaveCount] = useState(0);

  const userRoles = user?.roles || ['Employee'];
  const isSuperAdmin = userRoles.includes('Super Admin');
  const isGroupCEO = userRoles.includes('Group CEO');
  const isCEO = userRoles.includes('CEO') && !isGroupCEO;
  const isTax = userRoles.some(r => ['Tax Manager', 'Tax Staff'].includes(r));
  const isHR = userRoles.some(r => ['HR Manager', 'HR Staff'].includes(r)) && !isGroupCEO && !isCEO && !isTax;
  const isManager = userRoles.includes('Manager') && !isHR && !isGroupCEO && !isCEO && !isTax;
  const isEmployee = !isSuperAdmin && !isGroupCEO && !isCEO && !isTax && !isHR && !isManager;

  // Company feature toggles
  const companyFeatures = user?.companyFeatures;
  const attendanceEnabled = companyFeatures?.attendance_enabled ?? true;
  const leaveEnabled = companyFeatures?.leave_enabled ?? true;
  const payrollEnabled = companyFeatures?.payroll_enabled ?? true;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, setOpen]);

  // Fetch pending approvals count for CEO/Group CEO
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!isGroupCEO && !isCEO) return;
      try {
        const [leaves, overtimes] = await Promise.all([
          leaveService.getPendingApprovals().catch(() => []),
          overtimeService.getPendingApprovals().catch(() => []),
        ]);
        setPendingApprovalsCount(leaves.length + overtimes.length);
      } catch {
        setPendingApprovalsCount(0);
      }
    };
    fetchPendingCount();
  }, [isGroupCEO, isCEO]);

  // Fetch pending leave approvals count for Manager
  useEffect(() => {
    const fetchManagerPendingCount = async () => {
      if (!isManager) return;
      try {
        const leaves = await leaveService.getPendingApprovals().catch(() => []);
        setManagerPendingLeaveCount(leaves.length);
      } catch {
        setManagerPendingLeaveCount(0);
      }
    };
    fetchManagerPendingCount();
  }, [isManager]);

  // Get CEO approvals items with dynamic badge
  const ceoApprovalsItems = useMemo(
    () => getCeoApprovalsItems(pendingApprovalsCount),
    [pendingApprovalsCount]
  );

  // Get Manager menu items with dynamic badge
  const managerMenuItems = useMemo(
    () => getManagerMenuItems(managerPendingLeaveCount),
    [managerPendingLeaveCount]
  );

  const hasAccess = (roles?: string[]) => {
    if (!roles) return true;
    return roles.some((role) => userRoles.includes(role));
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const isDropdownActive = (items: { path: string }[]) => {
    return items.some((item) => location.pathname.startsWith(item.path));
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isDropdownOpen = (label: string) => openDropdowns.includes(label);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Filter items for non-super admin roles and company features
  const filteredOperationsItems = operationsItems.filter((item) => {
    // Check role access
    if (!hasAccess(item.roles)) return false;

    // Check company feature toggles
    if (item.path === '/attendance' && !attendanceEnabled) return false;

    return true;
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
        // Width based on collapsed state
        isCollapsed ? 'w-20' : 'w-[280px]',
        // Mobile: hidden by default, show when isOpen
        '-translate-x-full lg:translate-x-0',
        isOpen && 'translate-x-0'
      )}
    >
      {/* Close button for mobile */}
      <button
        onClick={() => setOpen(false)}
        className="absolute top-4 right-4 z-50 lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Toggle Button - positioned below header (desktop only) */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-[76px] z-50 hidden lg:flex w-6 h-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm hover:shadow transition-all"
      >
        <ChevronLeft
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-300',
            isCollapsed && 'rotate-180'
          )}
        />
      </button>

      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-6 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center">
          {isCollapsed ? (
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg",
              isSuperAdmin
                ? "bg-gradient-to-br from-slate-600 to-zinc-700"
                : isGroupCEO
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : isCEO
                ? "bg-gradient-to-br from-indigo-600 to-purple-700"
                : isTax
                ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                : "bg-gradient-to-br from-blue-500 to-indigo-600"
            )}>
              {isSuperAdmin ? 'S' : isGroupCEO ? 'G' : isCEO ? 'C' : isTax ? 'T' : 'P'}
            </div>
          ) : (
            <img
              src="/images/logo/logo-black.png"
              alt="P&C"
              className="h-16 w-auto transition-all duration-300"
            />
          )}
        </Link>
      </div>

      {/* User Profile Card */}
      {!isCollapsed && user && (
        <div className="px-4 py-4 border-b border-gray-200/80">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border",
            isSuperAdmin
              ? "bg-gradient-to-r from-slate-50 to-zinc-50 border-slate-200"
              : isGroupCEO
              ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
              : isCEO
              ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
              : isTax
              ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
          )}>
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg ring-2",
              isSuperAdmin
                ? "bg-gradient-to-br from-slate-600 to-zinc-700 ring-slate-300"
                : isGroupCEO
                ? "bg-gradient-to-br from-amber-500 to-orange-600 ring-amber-300"
                : isCEO
                ? "bg-gradient-to-br from-indigo-600 to-purple-700 ring-indigo-300"
                : isTax
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-300"
                : "bg-gradient-to-br from-blue-500 to-indigo-600 ring-blue-200"
            )}>
              {user.employee?.name?.[0] || user.email?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.employee?.name || user.email?.split('@')[0]}
              </p>
              <p className={cn(
                "text-xs truncate",
                isSuperAdmin ? "text-slate-600 font-medium" : isGroupCEO ? "text-amber-600 font-medium" : isCEO ? "text-indigo-600 font-medium" : isTax ? "text-emerald-600 font-medium" : "text-gray-500"
              )}>
                {user.roles?.[0] || 'Employee'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {isCollapsed && user && (
        <div className="px-2 py-4 flex justify-center border-b border-gray-200/80">
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg ring-2",
            isSuperAdmin
              ? "bg-gradient-to-br from-slate-600 to-zinc-700 ring-slate-300"
              : isGroupCEO
              ? "bg-gradient-to-br from-amber-500 to-orange-600 ring-amber-300"
              : isCEO
              ? "bg-gradient-to-br from-indigo-600 to-purple-700 ring-indigo-300"
              : isTax
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-300"
              : "bg-gradient-to-br from-blue-500 to-indigo-600 ring-blue-200"
          )}>
            {user.employee?.name?.[0] || user.email?.[0] || 'U'}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>

        {/* ==================== SUPER ADMIN MENU ==================== */}
        {isSuperAdmin ? (
          <>
            {/* System Overview */}
            <NavItem
              item={superAdminMenu.dashboard}
              isActive={isActive(superAdminMenu.dashboard.path)}
              isCollapsed={isCollapsed}
              variant="admin"
            />

            {/* User & Access */}
            {!isCollapsed && <NavLabel>User & Access</NavLabel>}
            {superAdminMenu.items.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
                variant="admin"
              />
            ))}

            {/* System */}
            {!isCollapsed && <NavLabel>System</NavLabel>}
            <NavDropdown
              dropdown={superAdminMenu.systemDropdown}
              isOpen={isDropdownOpen(superAdminMenu.systemDropdown.label) || isDropdownActive(superAdminMenu.systemDropdown.items)}
              isActive={isDropdownActive(superAdminMenu.systemDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(superAdminMenu.systemDropdown.label)}
              currentPath={location.pathname}
              variant="admin"
            />
            <NavDropdown
              dropdown={superAdminMenu.securityDropdown}
              isOpen={isDropdownOpen(superAdminMenu.securityDropdown.label) || isDropdownActive(superAdminMenu.securityDropdown.items)}
              isActive={isDropdownActive(superAdminMenu.securityDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(superAdminMenu.securityDropdown.label)}
              currentPath={location.pathname}
              variant="admin"
            />
          </>
        ) : isGroupCEO ? (
          <>
            {/* ==================== GROUP CEO MENU ==================== */}
            {/* Executive Dashboard */}
            <NavItem
              item={groupCEODashboardItem}
              isActive={isActive(groupCEODashboardItem.path)}
              isCollapsed={isCollapsed}
              variant="ceo"
            />

            {/* Group Overview */}
            {!isCollapsed && <NavLabel>Group Overview</NavLabel>}
            {groupCEOOverviewItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
                variant="ceo"
              />
            ))}

            {/* Operations */}
            {!isCollapsed && <NavLabel>Operations</NavLabel>}
            {groupCEOOperationsItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
                variant="ceo"
              />
            ))}

            {/* Analytics Dropdown */}
            <NavDropdown
              dropdown={groupCEOAnalyticsDropdown}
              isOpen={isDropdownOpen(groupCEOAnalyticsDropdown.label) || isDropdownActive(groupCEOAnalyticsDropdown.items)}
              isActive={isDropdownActive(groupCEOAnalyticsDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(groupCEOAnalyticsDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            />

            {/* Financial */}
            {!isCollapsed && <NavLabel>Financial</NavLabel>}
            <NavDropdown
              dropdown={groupCEOPayrollDropdown}
              isOpen={isDropdownOpen(groupCEOPayrollDropdown.label) || isDropdownActive(groupCEOPayrollDropdown.items)}
              isActive={isDropdownActive(groupCEOPayrollDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(groupCEOPayrollDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            />

            {/* People */}
            {!isCollapsed && <NavLabel>People</NavLabel>}
            <NavDropdown
              dropdown={groupCEOPerformanceDropdown}
              isOpen={isDropdownOpen(groupCEOPerformanceDropdown.label) || isDropdownActive(groupCEOPerformanceDropdown.items)}
              isActive={isDropdownActive(groupCEOPerformanceDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(groupCEOPerformanceDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            />

            {/* Contracts */}
            {!isCollapsed && <NavLabel>Contracts</NavLabel>}
            <NavDropdown
              dropdown={groupCEOContractsDropdown}
              isOpen={isDropdownOpen(groupCEOContractsDropdown.label) || isDropdownActive(groupCEOContractsDropdown.items)}
              isActive={isDropdownActive(groupCEOContractsDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(groupCEOContractsDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            />

            {/* Resources */}
            {!isCollapsed && <NavLabel>Resources</NavLabel>}
            <NavDropdown
              dropdown={groupCEOResourcesDropdown}
              isOpen={isDropdownOpen(groupCEOResourcesDropdown.label) || isDropdownActive(groupCEOResourcesDropdown.items)}
              isActive={isDropdownActive(groupCEOResourcesDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(groupCEOResourcesDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            />
          </>
        ) : isCEO ? (
          <>
            {/* ==================== CEO MENU (STRATEGIC) ==================== */}
            {/* Executive Dashboard */}
            <NavItem
              item={ceoDashboardItem}
              isActive={isActive(ceoDashboardItem.path)}
              isCollapsed={isCollapsed}
              variant="ceo"
            />

            {/* Strategic Overview */}
            {!isCollapsed && <NavLabel>Strategic</NavLabel>}
            {ceoStrategicItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
                variant="ceo"
              />
            ))}

            {/* Insights & Reports */}
            {!isCollapsed && <NavLabel>Insights & Reports</NavLabel>}
            <NavDropdown
              dropdown={ceoReportsDropdown}
              isOpen={isDropdownOpen(ceoReportsDropdown.label) || isDropdownActive(ceoReportsDropdown.items)}
              isActive={isDropdownActive(ceoReportsDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(ceoReportsDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            />
            {/* KPI & Goals dropdown hidden for now */}
            {/* <NavDropdown
              dropdown={ceoKPIDropdown}
              isOpen={isDropdownOpen(ceoKPIDropdown.label) || isDropdownActive(ceoKPIDropdown.items)}
              isActive={isDropdownActive(ceoKPIDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(ceoKPIDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            /> */}

            {/* Approvals */}
            {!isCollapsed && <NavLabel>Approvals</NavLabel>}
            {ceoApprovalsItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
                variant="ceo"
              />
            ))}

            {/* People */}
            {!isCollapsed && <NavLabel>People</NavLabel>}
            <NavDropdown
              dropdown={ceoPeopleDropdown}
              isOpen={isDropdownOpen(ceoPeopleDropdown.label) || isDropdownActive(ceoPeopleDropdown.items)}
              isActive={isDropdownActive(ceoPeopleDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(ceoPeopleDropdown.label)}
              currentPath={location.pathname}
              variant="ceo"
            />

            {/* Communication */}
            {!isCollapsed && <NavLabel>Communication</NavLabel>}
            <NavItem
              item={ceoAnnouncementsItem}
              isActive={isActive(ceoAnnouncementsItem.path)}
              isCollapsed={isCollapsed}
              variant="ceo"
            />
          </>
        ) : isTax ? (
          <>
            {/* ==================== TAX MENU ==================== */}
            {/* Tax Dashboard */}
            <NavItem
              item={taxDashboardItem}
              isActive={isActive(taxDashboardItem.path)}
              isCollapsed={isCollapsed}
              variant="tax"
            />

            {/* Data */}
            {!isCollapsed && <NavLabel>Data</NavLabel>}
            {taxMenuItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
                variant="tax"
              />
            ))}

            {/* Tax Management */}
            {!isCollapsed && <NavLabel>Tax Management</NavLabel>}
            <NavDropdown
              dropdown={taxPPhDropdown}
              isOpen={isDropdownOpen(taxPPhDropdown.label) || isDropdownActive(taxPPhDropdown.items)}
              isActive={isDropdownActive(taxPPhDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(taxPPhDropdown.label)}
              currentPath={location.pathname}
              variant="tax"
            />
            <NavDropdown
              dropdown={taxBPJSDropdown}
              isOpen={isDropdownOpen(taxBPJSDropdown.label) || isDropdownActive(taxBPJSDropdown.items)}
              isActive={isDropdownActive(taxBPJSDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(taxBPJSDropdown.label)}
              currentPath={location.pathname}
              variant="tax"
            />

            {/* Reports */}
            {!isCollapsed && <NavLabel>Reports</NavLabel>}
            <NavDropdown
              dropdown={taxReportsDropdown}
              isOpen={isDropdownOpen(taxReportsDropdown.label) || isDropdownActive(taxReportsDropdown.items)}
              isActive={isDropdownActive(taxReportsDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(taxReportsDropdown.label)}
              currentPath={location.pathname}
              variant="tax"
            />

            {/* Settings */}
            {!isCollapsed && <NavLabel>Settings</NavLabel>}
            <NavDropdown
              dropdown={taxSettingsDropdown}
              isOpen={isDropdownOpen(taxSettingsDropdown.label) || isDropdownActive(taxSettingsDropdown.items)}
              isActive={isDropdownActive(taxSettingsDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(taxSettingsDropdown.label)}
              currentPath={location.pathname}
              variant="tax"
            />
          </>
        ) : isManager ? (
          <>
            {/* ==================== MANAGER MENU ==================== */}
            {/* Dashboard */}
            <NavItem
              item={managerDashboardItem}
              isActive={isActive(managerDashboardItem.path)}
              isCollapsed={isCollapsed}
            />

            {/* Team Management */}
            {!isCollapsed && <NavLabel>Team Management</NavLabel>}
            {managerMenuItems.filter((item) => {
              if (item.path === '/team-attendance' && !attendanceEnabled) return false;
              if (item.path === '/team-overtime' && !attendanceEnabled) return false;
              if (item.path === '/leave-approval' && !leaveEnabled) return false;
              if (item.path === '/my-leave' && !leaveEnabled) return false;
              return true;
            }).map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
              />
            ))}

            {/* Resources Section for Manager */}
            {!isCollapsed && <NavLabel>Resources</NavLabel>}
            <NavDropdown
              dropdown={managerResourcesDropdown}
              isOpen={isDropdownOpen(managerResourcesDropdown.label + '-manager') || isDropdownActive(managerResourcesDropdown.items)}
              isActive={isDropdownActive(managerResourcesDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(managerResourcesDropdown.label + '-manager')}
              currentPath={location.pathname}
            />
          </>
        ) : isEmployee ? (
          <>
            {/* ==================== EMPLOYEE MENU ==================== */}
            {/* Dashboard */}
            <NavItem
              item={employeeDashboardItem}
              isActive={isActive(employeeDashboardItem.path)}
              isCollapsed={isCollapsed}
            />

            {/* Self Service */}
            {!isCollapsed && <NavLabel>Self Service</NavLabel>}
            {employeeMenuItems.filter((item) => {
              if (item.path === '/attendance' && !attendanceEnabled) return false;
              if (item.path === '/my-leave' && !leaveEnabled) return false;
              return true;
            }).map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
              />
            ))}

            {/* Resources Section for Employee */}
            {!isCollapsed && <NavLabel>Resources</NavLabel>}
            <NavDropdown
              dropdown={employeeResourcesDropdown}
              isOpen={isDropdownOpen(employeeResourcesDropdown.label + '-employee') || isDropdownActive(employeeResourcesDropdown.items)}
              isActive={isDropdownActive(employeeResourcesDropdown.items)}
              isCollapsed={isCollapsed}
              onToggle={() => toggleDropdown(employeeResourcesDropdown.label + '-employee')}
              currentPath={location.pathname}
            />
          </>
        ) : (
          <>
            {/* ==================== HR/P&C MENU ==================== */}
            {/* Dashboard */}
            <NavItem
              item={hrDashboardItem}
              isActive={isActive(hrDashboardItem.path)}
              isCollapsed={isCollapsed}
            />

            {/* Operations Section */}
            {!isCollapsed && <NavLabel>Operations</NavLabel>}

            {filteredOperationsItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
              />
            ))}

            {/* Leave Management Dropdown */}
            {hasAccess(leaveDropdown.roles) && leaveEnabled && (
              <NavDropdown
                dropdown={leaveDropdown}
                isOpen={isDropdownOpen(leaveDropdown.label) || isDropdownActive(leaveDropdown.items)}
                isActive={isDropdownActive(leaveDropdown.items)}
                isCollapsed={isCollapsed}
                onToggle={() => toggleDropdown(leaveDropdown.label)}
                currentPath={location.pathname}
              />
            )}

            {/* Payroll Dropdown */}
            {hasAccess(payrollDropdown.roles) && payrollEnabled && (
              <NavDropdown
                dropdown={payrollDropdown}
                isOpen={isDropdownOpen(payrollDropdown.label) || isDropdownActive(payrollDropdown.items)}
                isActive={isDropdownActive(payrollDropdown.items)}
                isCollapsed={isCollapsed}
                onToggle={() => toggleDropdown(payrollDropdown.label)}
                currentPath={location.pathname}
              />
            )}

            {/* Compensation Dropdown */}
            {hasAccess(compensationDropdown.roles) && (
              <NavDropdown
                dropdown={compensationDropdown}
                isOpen={isDropdownOpen(compensationDropdown.label) || isDropdownActive(compensationDropdown.items)}
                isActive={isDropdownActive(compensationDropdown.items)}
                isCollapsed={isCollapsed}
                onToggle={() => toggleDropdown(compensationDropdown.label)}
                currentPath={location.pathname}
              />
            )}

            {/* Documents Section */}
            {hasAccess(documentsDropdown.roles) && (
              <>
                {!isCollapsed && <NavLabel>Documents</NavLabel>}
                <NavDropdown
                  dropdown={documentsDropdown}
                  isOpen={isDropdownOpen(documentsDropdown.label) || isDropdownActive(documentsDropdown.items)}
                  isActive={isDropdownActive(documentsDropdown.items)}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleDropdown(documentsDropdown.label)}
                  currentPath={location.pathname}
                />
              </>
            )}

            {/* Resources Section */}
            {hasAccess(resourcesDropdown.roles) && (
              <>
                {!isCollapsed && <NavLabel>Resources</NavLabel>}
                <NavDropdown
                  dropdown={resourcesDropdown}
                  isOpen={isDropdownOpen(resourcesDropdown.label) || isDropdownActive(resourcesDropdown.items)}
                  isActive={isDropdownActive(resourcesDropdown.items)}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleDropdown(resourcesDropdown.label)}
                  currentPath={location.pathname}
                />
              </>
            )}

            {/* Master Data Section */}
            {hasAccess(masterDataDropdown.roles) && (
              <>
                {!isCollapsed && <NavLabel>Master Data</NavLabel>}
                <NavDropdown
                  dropdown={masterDataDropdown}
                  isOpen={isDropdownOpen(masterDataDropdown.label) || isDropdownActive(masterDataDropdown.items)}
                  isActive={isDropdownActive(masterDataDropdown.items)}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleDropdown(masterDataDropdown.label)}
                  currentPath={location.pathname}
                />
              </>
            )}

          </>
        )}
      </nav>

      {/* Logout Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/80 bg-white">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

// Navigation Label Component
function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block px-3 pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
      {children}
    </span>
  );
}

// Navigation Item Component
function NavItem({
  item,
  isActive,
  isCollapsed,
  variant = 'default',
}: {
  item: MenuItem;
  isActive: boolean;
  isCollapsed: boolean;
  variant?: 'default' | 'admin' | 'ceo' | 'tax';
}) {
  const Icon = item.icon;

  const activeClass = variant === 'admin'
    ? 'bg-gradient-to-r from-slate-600 to-zinc-700 text-white shadow-lg shadow-slate-500/30'
    : variant === 'ceo'
    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
    : variant === 'tax'
    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30';

  const hoverClass = variant === 'admin'
    ? 'text-gray-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-zinc-50 hover:text-slate-700 hover:translate-x-1'
    : variant === 'ceo'
    ? 'text-gray-600 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 hover:translate-x-1'
    : variant === 'tax'
    ? 'text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-700 hover:translate-x-1'
    : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:translate-x-1';

  const iconHoverClass = variant === 'admin'
    ? 'text-gray-500 group-hover:text-slate-600'
    : variant === 'ceo'
    ? 'text-gray-500 group-hover:text-amber-600'
    : variant === 'tax'
    ? 'text-gray-500 group-hover:text-emerald-600'
    : 'text-gray-500 group-hover:text-blue-600';

  return (
    <Link
      to={item.path}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl text-sm font-medium transition-all duration-200',
        isActive ? activeClass : hoverClass,
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : iconHoverClass)} />
      {!isCollapsed && <span>{item.label}</span>}
      {!isCollapsed && item.badge && (
        <span
          className={cn(
            'ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold rounded-full',
            isActive
              ? variant === 'ceo' ? 'bg-white text-amber-600' : variant === 'tax' ? 'bg-white text-emerald-600' : 'bg-white text-blue-600'
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/30'
          )}
        >
          {item.badge}
        </span>
      )}
      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
          {item.label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      )}
    </Link>
  );
}

// Navigation Dropdown Component
function NavDropdown({
  dropdown,
  isOpen,
  isActive,
  isCollapsed,
  onToggle,
  currentPath,
  variant = 'default',
}: {
  dropdown: DropdownMenu;
  isOpen: boolean;
  isActive: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  currentPath: string;
  variant?: 'default' | 'admin' | 'ceo' | 'tax';
}) {
  const Icon = dropdown.icon;

  const activeClass = variant === 'admin'
    ? 'bg-gradient-to-r from-slate-600 to-zinc-700 text-white shadow-lg shadow-slate-500/30'
    : variant === 'ceo'
    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
    : variant === 'tax'
    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30';

  const hoverClass = variant === 'admin'
    ? 'text-gray-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-zinc-50 hover:text-slate-700'
    : variant === 'ceo'
    ? 'text-gray-600 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700'
    : variant === 'tax'
    ? 'text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-700'
    : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700';

  const iconHoverClass = variant === 'admin'
    ? 'text-gray-500 group-hover:text-slate-600'
    : variant === 'ceo'
    ? 'text-gray-500 group-hover:text-amber-600'
    : variant === 'tax'
    ? 'text-gray-500 group-hover:text-emerald-600'
    : 'text-gray-500 group-hover:text-blue-600';

  const submenuActiveClass = variant === 'admin'
    ? 'bg-slate-100 text-slate-700 font-semibold'
    : variant === 'ceo'
    ? 'bg-amber-100 text-amber-700 font-semibold'
    : variant === 'tax'
    ? 'bg-emerald-100 text-emerald-700 font-semibold'
    : 'bg-blue-50 text-blue-700 font-semibold';

  const submenuHoverClass = variant === 'admin'
    ? 'text-gray-600 hover:bg-slate-50 hover:text-slate-600 hover:pl-4'
    : variant === 'ceo'
    ? 'text-gray-600 hover:bg-amber-50 hover:text-amber-600 hover:pl-4'
    : variant === 'tax'
    ? 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:pl-4'
    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:pl-4';

  return (
    <div className="my-0.5">
      <button
        onClick={onToggle}
        title={isCollapsed ? dropdown.label : undefined}
        className={cn(
          'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive ? activeClass : hoverClass,
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : iconHoverClass)} />
        {!isCollapsed && (
          <>
            <span>{dropdown.label}</span>
            <ChevronDown
              className={cn(
                'ml-auto h-4 w-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            {dropdown.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </div>
        )}
      </button>

      {/* Submenu */}
      {isOpen && !isCollapsed && (
        <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
          {dropdown.items.map((item) => {
            const isItemActive = currentPath.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'block px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                  isItemActive ? submenuActiveClass : submenuHoverClass
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
