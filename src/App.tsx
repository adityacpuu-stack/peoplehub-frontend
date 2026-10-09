import { t, useLocale } from '@/i18n';
import { useEffect, useLayoutEffect, useRef, useState, lazy, Suspense } from 'react';
import * as Sentry from '@sentry/react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams, type Location } from 'react-router-dom';
import { ApplicationToaster } from '@/components/ui/ApplicationToaster';
import { useAuthStore } from '@/stores/auth.store';
import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { PersonalRoute } from '@/components/auth/PersonalRoute';
import { canAction } from '@/lib/actions';
import { FullPageSpinner } from '@/components/ui';
import { ProfileCompletionModal, PasswordChangeModal } from '@/components/profile';

// Eager imports — small pages loaded early (login flow + 403).
import { LoginPage, ForgotPasswordPage, ResetPasswordPage, ForbiddenPage } from '@/pages';

function TemplatesRedirect() {
  useLocale();
  const { search, hash } = useLocation();
  return <Navigate replace to={{ pathname: '/templates', search, hash }} />;
}

function ApprovalsRedirect() {
  useLocale();
  const { search, hash } = useLocation();
  return <Navigate replace to={{ pathname: '/requests', search, hash }} />;
}

function AnnouncementsRedirect() {
  useLocale();
  const { search, hash } = useLocation();
  return <Navigate replace to={{ pathname: '/announcements', search, hash }} />;
}

// Helper: convert named-export module → default-export shape for React.lazy.
// Returns `ComponentType<any>` so prop types propagate from JSX usage rather
// than being constrained to `unknown`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyNamed = (loader: () => Promise<Record<string, any>>, name: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lazy(() => loader().then((m) => ({ default: m[name] as React.ComponentType<any> })));

// Dashboard
const DashboardPage = lazyNamed(() => import('@/pages/dashboard/DashboardPage'), 'DashboardPage');
const MyAttendancePage = lazyNamed(() => import('@/pages/employee/MyAttendancePage'), 'MyAttendancePage');

// CEO bundle (18 pages — heavy, lazy load all)
const CEODashboardPage = lazyNamed(() => import('@/pages/ceo/CEODashboardPage' as never), 'CEODashboardPage');
const CEOCompanyPerformancePage = lazyNamed(() => import('@/pages/ceo/CEOCompanyPerformancePage' as never), 'CEOCompanyPerformancePage');
const CEOWorkforceAnalyticsPage = lazyNamed(() => import('@/pages/ceo/CEOWorkforceAnalyticsPage' as never), 'CEOWorkforceAnalyticsPage');
const CEOFinancialOverviewPage = lazyNamed(() => import('@/pages/ceo/CEOFinancialOverviewPage' as never), 'CEOFinancialOverviewPage');
const CEOHeadcountReportPage = lazyNamed(() => import('@/pages/ceo/CEOHeadcountReportPage' as never), 'CEOHeadcountReportPage');
const CEOTurnoverReportPage = lazyNamed(() => import('@/pages/ceo/CEOTurnoverReportPage' as never), 'CEOTurnoverReportPage');
const CEOCostReportPage = lazyNamed(() => import('@/pages/ceo/CEOCostReportPage' as never), 'CEOCostReportPage');
const CEODepartmentReportPage = lazyNamed(() => import('@/pages/ceo/CEODepartmentReportPage' as never), 'CEODepartmentReportPage');
const CEOKPIDashboardPage = lazyNamed(() => import('@/pages/ceo/CEOKPIDashboardPage' as never), 'CEOKPIDashboardPage');
const CEOCompanyGoalsPage = lazyNamed(() => import('@/pages/ceo/CEOCompanyGoalsPage' as never), 'CEOCompanyGoalsPage');
const CEOOKRTrackingPage = lazyNamed(() => import('@/pages/ceo/CEOOKRTrackingPage' as never), 'CEOOKRTrackingPage');
const CEOBudgetRequestsPage = lazyNamed(() => import('@/pages/ceo/CEOBudgetRequestsPage' as never), 'CEOBudgetRequestsPage');
const CEOLeadershipTeamPage = lazyNamed(() => import('@/pages/ceo/CEOLeadershipTeamPage' as never), 'CEOLeadershipTeamPage');
const CEOSuccessionPlanningPage = lazyNamed(() => import('@/pages/ceo/CEOSuccessionPlanningPage' as never), 'CEOSuccessionPlanningPage');
const CEOPerformanceSummaryPage = lazyNamed(() => import('@/pages/ceo/CEOPerformanceSummaryPage' as never), 'CEOPerformanceSummaryPage');
const CEOTalentOverviewPage = lazyNamed(() => import('@/pages/ceo/CEOTalentOverviewPage' as never), 'CEOTalentOverviewPage');
const CEOPayrollReportPage = lazyNamed(() => import('@/pages/ceo/CEOPayrollReportPage' as never), 'CEOPayrollReportPage');

// Employees / Org
const EmployeesPage = lazyNamed(() => import('@/pages/employees/EmployeesPage'), 'EmployeesPage');
const EmployeeDetailPage = lazyNamed(() => import('@/pages/employees/EmployeeDetailPage' as never), 'EmployeeDetailPage');
const EmployeeFormPage = lazyNamed(() => import('@/pages/employees/EmployeeFormPage' as never), 'EmployeeFormPage');
const DepartmentsPage = lazyNamed(() => import('@/pages/departments/DepartmentsPage' as never), 'DepartmentsPage');
const WorkLocationsPage = lazyNamed(() => import('@/pages/work-locations/WorkLocationsPage' as never), 'WorkLocationsPage');
const PositionsPage = lazyNamed(() => import('@/pages/positions/PositionsPage' as never), 'PositionsPage');
const OrgChartPage = lazyNamed(() => import('@/pages/org-chart/OrgChartPage' as never), 'OrgChartPage');
const MovementPage = lazyNamed(() => import('@/pages/movement/MovementPage' as never), 'MovementPage');

// Contracts / Performance
const ContractsPage = lazyNamed(() => import('@/pages/contracts/ContractsPage' as never), 'ContractsPage');
const GroupContractsPage = lazyNamed(() => import('@/pages/contracts/GroupContractsPage' as never), 'GroupContractsPage');
const PerformancePage = lazyNamed(() => import('@/pages/performance/PerformancePage' as never), 'PerformancePage');
const KPIDashboardPage = lazyNamed(() => import('@/pages/performance/KPIDashboardPage' as never), 'KPIDashboardPage');
const GoalsOKRsPage = lazyNamed(() => import('@/pages/performance/GoalsOKRsPage' as never), 'GoalsOKRsPage');

// Self-service / Misc
const AccountSettingsPage = lazyNamed(() => import('@/pages/settings/AccountSettingsPage' as never), 'AccountSettingsPage');
const NotificationsPage = lazyNamed(() => import('@/pages/notifications/NotificationsPage' as never), 'NotificationsPage');
const RequestsPage = lazyNamed(() => import('@/pages/requests/RequestsPage' as never), 'RequestsPage');
const ItAccountsPage = lazyNamed(() => import('@/pages/it/ItAccountsPage' as never), 'ItAccountsPage');
const ItApprovalSettingsPage = lazyNamed(() => import('@/pages/it/ItApprovalSettingsPage' as never), 'ItApprovalSettingsPage');

// HR Operations (Attendance / Leave / Overtime / Payroll)
const AttendancePage = lazyNamed(() => import('@/pages/attendance/AttendancePage'), 'AttendancePage');
const PayrollPage = lazyNamed(() => import('@/pages/payroll/PayrollPage' as never), 'PayrollPage');
const FreelanceInternshipPayrollPage = lazyNamed(() => import('@/pages/payroll/FreelanceInternshipPayrollPage' as never), 'FreelanceInternshipPayrollPage');
const HolidayCalendarPage = lazyNamed(() => import('@/pages/holiday-calendar/HolidayCalendarPage' as never), 'HolidayCalendarPage');
const OvertimePage = lazyNamed(() => import('@/pages/overtime/OvertimePage' as never), 'OvertimePage');
const AllowancesPage = lazyNamed(() => import('@/pages/allowances/AllowancesPage' as never), 'AllowancesPage');
const DeductionsPage = lazyNamed(() => import('@/pages/deductions/DeductionsPage' as never), 'DeductionsPage');
const LeaveRequestsPage = lazyNamed(() => import('@/pages/leave/LeaveRequestsPage' as never), 'LeaveRequestsPage');
const LeavePolicyPage = lazyNamed(() => import('@/pages/leave/LeavePolicyPage'), 'LeavePolicyPage');
const LeaveEntitlementsPage = lazyNamed(() => import('@/pages/leave/LeaveEntitlementsPage' as never), 'LeaveEntitlementsPage');
const LeaveAnalyticsPage = lazyNamed(() => import('@/pages/leave/LeaveAnalyticsPage' as never), 'LeaveAnalyticsPage');

// Manager
const MyTeamPage = lazyNamed(() => import('@/pages/manager/MyTeamPage' as never), 'MyTeamPage');
const TeamAttendancePage = lazyNamed(() => import('@/pages/manager/TeamAttendancePage' as never), 'TeamAttendancePage');
const TeamOvertimePage = lazyNamed(() => import('@/pages/manager/TeamOvertimePage' as never), 'TeamOvertimePage');
const LeaveApprovalPage = lazyNamed(() => import('@/pages/manager/LeaveApprovalPage' as never), 'LeaveApprovalPage');
const MyLeavePage = lazyNamed(() => import('@/pages/manager/MyLeavePage' as never), 'MyLeavePage');
const ManagerDocumentsPage = lazyNamed(() => import('@/pages/manager/ManagerDocumentsPage' as never), 'ManagerDocumentsPage');

// Employee self-service
const EmployeeDocumentsPage = lazyNamed(() => import('@/pages/employee/EmployeeDocumentsPage' as never), 'EmployeeDocumentsPage');

// Resources
const TemplatesPage = lazyNamed(() => import('@/pages/resources/TemplatesPage' as never), 'TemplatesPage');
const AnnouncementsPage = lazyNamed(() => import('@/pages/resources/AnnouncementsPage' as never), 'AnnouncementsPage');

// Analytics
const WorkforceAnalyticsPage = lazyNamed(() => import('@/pages/analytics/WorkforceAnalyticsPage' as never), 'WorkforceAnalyticsPage');
const AttendanceReportsPage = lazyNamed(() => import('@/pages/analytics/AttendanceReportsPage' as never), 'AttendanceReportsPage');
const TurnoverAnalysisPage = lazyNamed(() => import('@/pages/analytics/TurnoverAnalysisPage' as never), 'TurnoverAnalysisPage');
const HeadcountTrendsPage = lazyNamed(() => import('@/pages/analytics/HeadcountTrendsPage' as never), 'HeadcountTrendsPage');

// Companies
const CompaniesPage = lazyNamed(() => import('@/pages/companies/CompaniesPage' as never), 'CompaniesPage');
// AdminCompaniesPage is an alias of admin/CompaniesPage in pages/index.ts.
const AdminCompaniesPage = lazyNamed(() => import('@/pages/admin/CompaniesPage' as never), 'CompaniesPage');

// Admin
const UsersPage = lazyNamed(() => import('@/pages/admin/UsersPage' as never), 'UsersPage');
const RolesPage = lazyNamed(() => import('@/pages/admin/RolesPage' as never), 'RolesPage');
const AuditLogsPage = lazyNamed(() => import('@/pages/admin/AuditLogsPage' as never), 'AuditLogsPage');
const CompanyAssignmentsPage = lazyNamed(() => import('@/pages/admin/CompanyAssignmentsPage' as never), 'CompanyAssignmentsPage');
const PayrollSettingsPage = lazyNamed(() => import('@/pages/admin/PayrollSettingsPage' as never), 'PayrollSettingsPage');
const ApprovalSettingsPage = lazyNamed(() => import('@/pages/admin/ApprovalSettingsPage' as never), 'ApprovalSettingsPage');
const CompanyFeaturesPage = lazyNamed(() => import('@/pages/admin/CompanyFeaturesPage' as never), 'CompanyFeaturesPage');
const RoleDashboardConfigPage = lazyNamed(() => import('@/pages/admin/RoleDashboardConfigPage' as never), 'RoleDashboardConfigPage');
const SystemConfigPage = lazyNamed(() => import('@/pages/admin/SystemConfigPage' as never), 'SystemConfigPage');

// Tax
const PPh21Page = lazyNamed(() => import('@/pages/tax/PPh21Page' as never), 'PPh21Page');
const TaxCalculationPage = lazyNamed(() => import('@/pages/tax/TaxCalculationPage' as never), 'TaxCalculationPage');
const PaymentHistoryPage = lazyNamed(() => import('@/pages/tax/PaymentHistoryPage' as never), 'PaymentHistoryPage');
const BPJSKesehatanPage = lazyNamed(() => import('@/pages/tax/BPJSKesehatanPage' as never), 'BPJSKesehatanPage');
const BPJSKetenagakerjaanPage = lazyNamed(() => import('@/pages/tax/BPJSKetenagakerjaanPage' as never), 'BPJSKetenagakerjaanPage');
const BPJSReportsPage = lazyNamed(() => import('@/pages/tax/BPJSReportsPage' as never), 'BPJSReportsPage');
const ESPTPage = lazyNamed(() => import('@/pages/tax/ESPTPage' as never), 'ESPTPage');
const EBupotPage = lazyNamed(() => import('@/pages/tax/EBupotPage' as never), 'EBupotPage');
const MonthlyReportsPage = lazyNamed(() => import('@/pages/tax/MonthlyReportsPage' as never), 'MonthlyReportsPage');
const AnnualReportsPage = lazyNamed(() => import('@/pages/tax/AnnualReportsPage' as never), 'AnnualReportsPage');
const TaxRatesPage = lazyNamed(() => import('@/pages/tax/TaxRatesPage' as never), 'TaxRatesPage');
const PTKPSettingsPage = lazyNamed(() => import('@/pages/tax/PTKPSettingsPage' as never), 'PTKPSettingsPage');
const CompanyNPWPPage = lazyNamed(() => import('@/pages/tax/CompanyNPWPPage' as never), 'CompanyNPWPPage');

// Route ceilings mirror the backend role guards (literal arrays so route
// inventories can read them); covered actions narrow them further.
const managerUpRoles = ['Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff', 'Tax Staff', 'Manager'];
const hrStaffUpRoles = ['Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'];
const payrollReadRoles = ['Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff', 'Tax Staff'];
const employeeDetailRoles = ['Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Manager'];
const employeeEditRoles = ['CEO', 'HR Manager', 'HR Staff'];

// Own employee record stays self-service; another record needs the detail
// endpoint's role ceiling (Finance/Tax alone cannot open it) AND employee.view.
function EmployeeDetailRoute() {
  useLocale();
  const { id } = useParams();
  const ownId = useAuthStore(state => state.user?.employee?.id);
  return <RoleRoute allowedRoles={employeeDetailRoles} actions={['employee.view']} allowWhen={ownId != null && String(ownId) === id}><EmployeeDetailPage /></RoleRoute>;
}

// The edit form must also be able to read the record (employee.view).
function EmployeeEditRoute() {
  useLocale();
  const user = useAuthStore(state => state.user);
  return canAction(user, 'employee.view') ? <EmployeeFormPage /> : <Navigate to="/403" replace />;
}

// Role-based Companies Page Wrapper
function CompaniesPageWrapper() {
  useLocale();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes('Super Admin');
  return isSuperAdmin ? <AdminCompaniesPage /> : <CompaniesPage />;
}

// Role-based Dashboard Wrapper - CEO/Group CEO gets CEO Dashboard, others get regular Dashboard
function DashboardPageWrapper() {
  useLocale();
  const { user } = useAuthStore();
  const isCEO = !user?.roles?.includes('Super Admin') && user?.roles?.some((role) => ['CEO', 'Group CEO'].includes(role));
  return isCEO ? <CEODashboardPage /> : <DashboardPage />;
}

// Keep the current page mounted underneath account dialogs, including its filters and draft state.
function ApplicationRoutes() {
  useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const previousPage = useRef<Location | null>(null);
  const path = location.pathname.replace(/\/$/, '');
  const settingsTabs = ['profile', 'general', 'attendance', 'payroll', 'notifications', 'security'] as const;
  const settingsTab = path === '/security/sessions' ? 'security'
    : settingsTabs.find(tab => path === '/settings/' + tab);
  const settingsOpen = path === '/settings' || settingsTab !== undefined;
  const profileOpen = path === '/profile';
  const accountOpen = settingsOpen || profileOpen;
  useLayoutEffect(() => {
    if (!accountOpen) previousPage.current = location;
  }, [location, accountOpen]);
  // Keep server-resolved roles/effectiveActions current: at most one /auth/me
  // per minute on navigation and per 15s on tab focus (deduplicated in the store).
  const refreshUserIfStale = useAuthStore(state => state.refreshUserIfStale);
  useEffect(() => { void refreshUserIfStale(60_000); }, [location.pathname, refreshUserIfStale]);
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') void refreshUserIfStale(15_000); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [refreshUserIfStale]);
  // Native dialogs must not cover mandatory password/profile onboarding.
  const onboardingRequired = user?.force_password_change === true ||
    (user?.employee && (user.employee.profile_completed === false || !user.employee.national_id));
  const closeAccount = () => {
    if (previousPage.current) navigate(-1);
    else navigate('/dashboard', { replace: true });
  };
  return <>
      <Suspense fallback={<FullPageSpinner />}>
      <Routes location={accountOpen ? previousPage.current ?? location : location}>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPageWrapper />} />

          {/* CEO Routes - Keep /ceo-dashboard as alias for backwards compatibility */}
          <Route path="/ceo-dashboard" element={<Navigate to="/dashboard" replace />} />
          {/* All /ceo/* routes gated to CEO, Group CEO, HR Manager (Super Admin bypasses).
              Defense in depth — backend RBAC remains the source of truth. */}
          <Route path="/ceo/company-performance" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOCompanyPerformancePage /></RoleRoute>} />
          <Route path="/ceo/workforce-analytics" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOWorkforceAnalyticsPage /></RoleRoute>} />
          <Route path="/ceo/financial-overview" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'Finance Manager']} actions={['payroll.view']}><CEOFinancialOverviewPage /></RoleRoute>} />
          <Route path="/ceo/reports/headcount" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOHeadcountReportPage /></RoleRoute>} />
          <Route path="/ceo/reports/turnover" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOTurnoverReportPage /></RoleRoute>} />
          <Route path="/ceo/reports/cost" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'Finance Manager']}><CEOCostReportPage /></RoleRoute>} />
          <Route path="/ceo/reports/department" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEODepartmentReportPage /></RoleRoute>} />
          <Route path="/ceo/kpi/dashboard" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOKPIDashboardPage /></RoleRoute>} />
          <Route path="/ceo/kpi/company-goals" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOCompanyGoalsPage /></RoleRoute>} />
          <Route path="/ceo/kpi/okr" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOOKRTrackingPage /></RoleRoute>} />
          <Route path="/ceo/approvals" element={<RoleRoute allowedRoles={['CEO', 'Group CEO']}><ApprovalsRedirect /></RoleRoute>} />
          <Route path="/ceo/budget-requests" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'Finance Manager']}><CEOBudgetRequestsPage /></RoleRoute>} />
          <Route path="/ceo/leadership-team" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOLeadershipTeamPage /></RoleRoute>} />
          <Route path="/ceo/succession-planning" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOSuccessionPlanningPage /></RoleRoute>} />
          <Route path="/ceo/performance-summary" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOPerformanceSummaryPage /></RoleRoute>} />
          <Route path="/ceo/talent-overview" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><CEOTalentOverviewPage /></RoleRoute>} />
          <Route path="/ceo/announcements" element={<AnnouncementsRedirect />} />
          <Route path="/ceo/payroll-report" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'Finance Manager', 'HR Manager']} actions={['payroll.view']}><CEOPayrollReportPage /></RoleRoute>} />

          <Route path="/employees" element={<RoleRoute allowedRoles={managerUpRoles} actions={['employee.view']}><EmployeesPage /></RoleRoute>} />
          <Route path="/employees/create" element={<RoleRoute allowedRoles={hrStaffUpRoles} actions={['employee.create']}><EmployeeFormPage /></RoleRoute>} />
          <Route path="/employees/:id" element={<EmployeeDetailRoute />} />
          {/* The form reads GET /employees/:id (detail ceiling + employee.view) and saves PUT (HR Staff+ + employee.update). */}
          <Route path="/employees/:id/edit" element={<RoleRoute allowedRoles={employeeEditRoles} actions={['employee.update']}><EmployeeEditRoute /></RoleRoute>} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/work-locations" element={<WorkLocationsPage />} />

          {/* Admin pages — gated to admin-level roles */}
          <Route path="/users" element={<RoleRoute allowedRoles={['HR Manager']}><UsersPage /></RoleRoute>} />
          <Route path="/roles" element={<RoleRoute allowedRoles={[]}><RolesPage /></RoleRoute>} />
          <Route path="/companies" element={<CompaniesPageWrapper />} />
          <Route path="/company-assignments" element={<RoleRoute allowedRoles={[]}><CompanyAssignmentsPage /></RoleRoute>} />
          <Route path="/company-features" element={<RoleRoute allowedRoles={[]}><CompanyFeaturesPage /></RoleRoute>} />
          <Route path="/role-dashboard-config" element={<RoleRoute allowedRoles={[]}><RoleDashboardConfigPage /></RoleRoute>} />
          <Route path="/system-config" element={<RoleRoute allowedRoles={[]}><SystemConfigPage /></RoleRoute>} />
          <Route path="/audit-logs" element={<RoleRoute allowedRoles={['HR Manager']}><AuditLogsPage /></RoleRoute>} />
          <Route path="/payroll-settings" element={<RoleRoute allowedRoles={['HR Manager', 'Finance Manager']}><PayrollSettingsPage /></RoleRoute>} />
          <Route path="/approval-settings" element={<RoleRoute allowedRoles={['HR Manager']}><ApprovalSettingsPage /></RoleRoute>} />

          {/* System Settings → redirect to SettingsPage with appropriate tab */}
          <Route path="/settings/general" element={null} />
          <Route path="/settings/attendance" element={null} />
          <Route path="/settings/payroll" element={null} />
          <Route path="/settings/security" element={null} />
          <Route path="/settings/notifications" element={null} />
          <Route path="/settings/integrations" element={<PlaceholderPage title={t("Integrations")} icon="plug" />} />
          <Route path="/settings/backup" element={<PlaceholderPage title={t("Backup & Restore")} icon="database" />} />

          {/* Security → redirect to SettingsPage security tab */}
          <Route path="/security/api-keys" element={<PlaceholderPage title={t("API Keys")} icon="key" />} />
          <Route path="/security/sessions" element={null} />
          <Route path="/security/login-history" element={<PlaceholderPage title={t("Login History")} icon="history" />} />

          {/* Attendance */}
          <Route path="/attendance" element={<AttendancePage />} />

          {/* Manager pages — Manager and up; /my-leave is self-service so unrestricted */}
          <Route path="/my-team" element={<RoleRoute allowedRoles={['Manager', 'HR Manager', 'HR Staff', 'CEO', 'Group CEO']}><MyTeamPage /></RoleRoute>} />
          <Route path="/team-attendance" element={<RoleRoute allowedRoles={['Manager', 'HR Manager', 'HR Staff', 'CEO', 'Group CEO']}><TeamAttendancePage /></RoleRoute>} />
          <Route path="/team-overtime" element={<RoleRoute allowedRoles={['Manager', 'HR Manager', 'HR Staff', 'CEO', 'Group CEO']}><TeamOvertimePage /></RoleRoute>} />
          <Route path="/leave-approval" element={<RoleRoute allowedRoles={['Manager', 'HR Manager', 'HR Staff', 'CEO', 'Group CEO']}><LeaveApprovalPage /></RoleRoute>} />
          <Route path="/my-leave" element={<PersonalRoute feature="leave_enabled"><MyLeavePage /></PersonalRoute>} />
          <Route path="/my-attendance" element={<PersonalRoute feature="attendance_enabled"><MyAttendancePage /></PersonalRoute>} />
          <Route path="/documents" element={<PersonalRoute><EmployeeDocumentsPage /></PersonalRoute>} />
          <Route path="/manager/templates" element={<TemplatesRedirect />} />
          <Route path="/manager/announcements" element={<AnnouncementsRedirect />} />
          <Route path="/manager/documents" element={<RoleRoute allowedRoles={['Manager', 'HR Manager', 'HR Staff']}><ManagerDocumentsPage /></RoleRoute>} />

          {/* Employee pages */}
          <Route path="/employee/templates" element={<TemplatesRedirect />} />
          <Route path="/employee/announcements" element={<AnnouncementsRedirect />} />
          <Route path="/employee/documents" element={<EmployeeDocumentsPage />} />

          {/* Analytics (Group CEO + HR Manager) */}
          <Route path="/analytics/workforce" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><WorkforceAnalyticsPage /></RoleRoute>} />
          <Route path="/analytics/attendance" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><AttendanceReportsPage /></RoleRoute>} />
          <Route path="/analytics/turnover" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><TurnoverAnalysisPage /></RoleRoute>} />
          <Route path="/analytics/headcount" element={<RoleRoute allowedRoles={['CEO', 'Group CEO', 'HR Manager']}><HeadcountTrendsPage /></RoleRoute>} />

          {/* Leave Management */}
          <Route path="/leave" element={<RoleRoute allowedRoles={managerUpRoles} actions={['leave.view_all']}><LeaveRequestsPage /></RoleRoute>} />
          <Route path="/leave/policy" element={<RoleRoute allowedRoles={managerUpRoles} actions={['leave.view_all', 'leave.manage_type']}><LeavePolicyPage /></RoleRoute>} />
          <Route path="/leave/entitlements" element={<RoleRoute allowedRoles={managerUpRoles} actions={['leave.view_all']}><LeaveEntitlementsPage /></RoleRoute>} />
          <Route path="/leave/analytics" element={<RoleRoute allowedRoles={managerUpRoles} actions={['leave.view_all']}><LeaveAnalyticsPage /></RoleRoute>} />

          {/* Payroll */}
          <Route path="/payroll" element={<RoleRoute allowedRoles={payrollReadRoles} actions={['payroll.view']}><PayrollPage /></RoleRoute>} />
          <Route path="/payroll/summary" element={<RoleRoute allowedRoles={['Group CEO']}><Navigate to="/ceo/payroll-report" replace /></RoleRoute>} />
          <Route path="/payroll/freelance" element={<RoleRoute allowedRoles={payrollReadRoles} actions={['payroll.view']}><FreelanceInternshipPayrollPage /></RoleRoute>} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/overview" element={<GroupContractsPage />} />

          {/* Resources */}
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/resources/templates" element={<TemplatesRedirect />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/resources/announcements" element={<AnnouncementsRedirect />} />
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/holiday-calendar" element={<HolidayCalendarPage />} />
          <Route path="/overtime" element={<OvertimePage />} />
          <Route path="/allowances" element={<AllowancesPage />} />
          <Route path="/deductions" element={<DeductionsPage />} />
          <Route path="/settings" element={null} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={null} />
          <Route path="/settings/profile" element={null} />
          <Route path="/requests" element={<RequestsPage />} />
          {/* IT workspace: exact IT Admin role (Super Admin bypasses); the API enforces scope independently. */}
          <Route path="/it/accounts" element={<RoleRoute allowedRoles={['IT Admin']}><ItAccountsPage /></RoleRoute>} />
          <Route path="/it/approval-settings" element={<RoleRoute allowedRoles={['IT Admin']}><ItApprovalSettingsPage /></RoleRoute>} />
          <Route path="/movement" element={<MovementPage />} />
          <Route path="/org-chart" element={<OrgChartPage />} />

          {/* Performance */}
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/performance/kpi" element={<KPIDashboardPage />} />
          <Route path="/performance/goals" element={<GoalsOKRsPage />} />

          {/* Tax — Tax Manager/Staff, Finance Manager, HR Manager. Super Admin bypasses. */}
          {(() => {
            const taxRoles = ['Tax Manager', 'Tax Staff', 'Finance Manager', 'HR Manager'];
            return (
              <>
                <Route path="/tax/pph21" element={<RoleRoute allowedRoles={taxRoles}><PPh21Page /></RoleRoute>} />
                <Route path="/tax/pph-calculation" element={<RoleRoute allowedRoles={taxRoles}><TaxCalculationPage /></RoleRoute>} />
                <Route path="/tax/pph-history" element={<RoleRoute allowedRoles={taxRoles}><PaymentHistoryPage /></RoleRoute>} />
                <Route path="/tax/bpjs-kesehatan" element={<RoleRoute allowedRoles={taxRoles}><BPJSKesehatanPage /></RoleRoute>} />
                <Route path="/tax/bpjs-ketenagakerjaan" element={<RoleRoute allowedRoles={taxRoles}><BPJSKetenagakerjaanPage /></RoleRoute>} />
                <Route path="/tax/bpjs-reports" element={<RoleRoute allowedRoles={taxRoles}><BPJSReportsPage /></RoleRoute>} />
                <Route path="/tax/espt" element={<RoleRoute allowedRoles={taxRoles}><ESPTPage /></RoleRoute>} />
                <Route path="/tax/ebupot" element={<RoleRoute allowedRoles={taxRoles}><EBupotPage /></RoleRoute>} />
                <Route path="/tax/monthly-reports" element={<RoleRoute allowedRoles={taxRoles}><MonthlyReportsPage /></RoleRoute>} />
                <Route path="/tax/annual-reports" element={<RoleRoute allowedRoles={taxRoles}><AnnualReportsPage /></RoleRoute>} />
                <Route path="/tax/rates" element={<RoleRoute allowedRoles={taxRoles}><TaxRatesPage /></RoleRoute>} />
                <Route path="/tax/ptkp" element={<RoleRoute allowedRoles={taxRoles}><PTKPSettingsPage /></RoleRoute>} />
                <Route path="/tax/company-npwp" element={<RoleRoute allowedRoles={taxRoles}><CompanyNPWPPage /></RoleRoute>} />
              </>
            );
          })()}
        </Route>

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
      {accountOpen && user && !onboardingRequired && <ProtectedRoute>
        <Suspense fallback={null}>
          <AccountSettingsPage active={settingsTab ?? 'profile'} onClose={closeAccount} />
        </Suspense>
      </ProtectedRoute>}
  </>;
}

function App() {
  useLocale();
  const { checkAuth, isLoading, user, isAuthenticated, refreshUser } = useAuthStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set Sentry user context
  useEffect(() => {
    if (isAuthenticated && user) {
      Sentry.setUser({
        id: String(user.id),
        email: user.email,
        username: user.employee?.name || user.email,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [isAuthenticated, user]);

  // Check if password change modal should be shown (first priority)
  // Then check if profile completion modal should be shown
  useEffect(() => {
    if (isAuthenticated && user) {
      // First check: force password change
      if (user.force_password_change === true) {
        setShowPasswordModal(true);
        setShowProfileModal(false);
      }
      // Second check: profile completion - show if profile_completed is false OR national_id (NIK) is empty
      else if (user.employee && (user.employee.profile_completed === false || !user.employee.national_id)) {
        setShowPasswordModal(false);
        setShowProfileModal(true);
      } else {
        setShowPasswordModal(false);
        setShowProfileModal(false);
      }
    } else {
      setShowPasswordModal(false);
      setShowProfileModal(false);
    }
  }, [isAuthenticated, user]);

  const handlePasswordChangeComplete = async () => {
    // Refresh user data to get updated force_password_change status
    await refreshUser();
    setShowPasswordModal(false);
    // Profile modal will be triggered by the useEffect if needed
  };

  const handleProfileComplete = async () => {
    // Refresh user data to get updated profile_completed status
    await refreshUser();
    setShowProfileModal(false);
  };

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return (
    <BrowserRouter>
      <ApplicationRoutes />

      {/* Toast notifications */}
      <ApplicationToaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Password Change Modal - shown when user needs to change password (first login) */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onComplete={handlePasswordChangeComplete}
      />

      {/* Profile Completion Modal - shown when user's profile is not completed */}
      <ProfileCompletionModal
        isOpen={showProfileModal}
        onComplete={handleProfileComplete}
      />
    </BrowserRouter>
  );
}

// Placeholder component for pages not yet implemented
function PlaceholderPage({ title, icon }: { title: string; icon?: string }) {
  useLocale();
  const getIcon = () => {
    switch (icon) {
      case 'settings':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'bell':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case 'plug':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'database':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        );
      case 'key':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        );
      case 'monitor':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'history':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'template':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'megaphone':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        );
      case 'team':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'clock':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'timer':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v2m0 0a9 9 0 019 9m-9-9a9 9 0 00-9 9" />
          </svg>
        );
      case 'calendar-check':
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l2 2 4-4" />
          </svg>
        );
      default:
        return (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
    }
  };

  return (
    <div className="ph-workflow ph-placeholder">
      <div className="text-[var(--ph-muted)] mb-5 [&_svg]:w-5 [&_svg]:h-5">
        {getIcon()}
      </div>
      <h1 className="text-[var(--ph-ink)]">{title}</h1>
      <p className="mt-2 text-gray-500">{t("This page is under construction.")}</p>
      <div className="mt-6 inline-flex items-center gap-2 text-[var(--ph-muted)]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm">{t("Coming Soon")}</span>
      </div>
    </div>
  );
}

export default Sentry.withProfiler(App);
