import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { FullPageSpinner } from '@/components/ui';
import { ProfileCompletionModal, PasswordChangeModal } from '@/components/profile';
import {
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  DashboardPage,
  CEODashboardPage,
  CEOCompanyPerformancePage,
  CEOWorkforceAnalyticsPage,
  CEOFinancialOverviewPage,
  CEOHeadcountReportPage,
  CEOTurnoverReportPage,
  CEOCostReportPage,
  CEODepartmentReportPage,
  CEOKPIDashboardPage,
  CEOCompanyGoalsPage,
  CEOOKRTrackingPage,
  CEOApprovalsPage,
  CEOBudgetRequestsPage,
  CEOLeadershipTeamPage,
  CEOSuccessionPlanningPage,
  CEOPerformanceSummaryPage,
  CEOTalentOverviewPage,
  CEOAnnouncementsPage,
  CEOPayrollReportPage,
  EmployeesPage,
  EmployeeDetailPage,
  EmployeeFormPage,
  DepartmentsPage,
  WorkLocationsPage,
  PositionsPage,
  ContractsPage,
  GroupContractsPage,
  PerformancePage,
  MovementPage,
  ProfilePage,
  SettingsPage,
  AttendancePage,
  RequestsPage,
  OrgChartPage,
  CompaniesPage,
  PayrollPage,
  FreelanceInternshipPayrollPage,
  UsersPage,
  RolesPage,
  AdminCompaniesPage,
  AuditLogsPage,
  CompanyAssignmentsPage,
  PayrollSettingsPage,
  ApprovalSettingsPage,
  CompanyFeaturesPage,
  TemplatesPage,
  AnnouncementsPage,
  MyTeamPage,
  TeamAttendancePage,
  TeamOvertimePage,
  LeaveApprovalPage,
  MyLeavePage,
  TeamTemplatesPage,
  TeamAnnouncementsPage,
  EmployeeTemplatesPage,
  EmployeeAnnouncementsPage,
  EmployeeDocumentsPage,
  ManagerDocumentsPage,
  HolidayCalendarPage,
  OvertimePage,
  AllowancesPage,
  DeductionsPage,
  LeaveRequestsPage,
  LeavePolicyPage,
  LeaveEntitlementsPage,
  LeaveAnalyticsPage,
  WorkforceAnalyticsPage,
  AttendanceReportsPage,
  TurnoverAnalysisPage,
  HeadcountTrendsPage,
  KPIDashboardPage,
  GoalsOKRsPage,
  PPh21Page,
  TaxCalculationPage,
  PaymentHistoryPage,
  BPJSKesehatanPage,
  BPJSKetenagakerjaanPage,
  BPJSReportsPage,
  ESPTPage,
  EBupotPage,
  MonthlyReportsPage,
  AnnualReportsPage,
  TaxRatesPage,
  PTKPSettingsPage,
  CompanyNPWPPage,
} from '@/pages';

// Role-based Companies Page Wrapper
function CompaniesPageWrapper() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes('Super Admin');
  return isSuperAdmin ? <AdminCompaniesPage /> : <CompaniesPage />;
}

// Role-based Dashboard Wrapper - CEO/Group CEO gets CEO Dashboard, others get regular Dashboard
function DashboardPageWrapper() {
  const { user } = useAuthStore();
  const isCEO = user?.roles?.some((role) => ['CEO', 'Group CEO'].includes(role));
  return isCEO ? <CEODashboardPage /> : <DashboardPage />;
}

function App() {
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
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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
          <Route path="/ceo/company-performance" element={<CEOCompanyPerformancePage />} />
          <Route path="/ceo/workforce-analytics" element={<CEOWorkforceAnalyticsPage />} />
          <Route path="/ceo/financial-overview" element={<CEOFinancialOverviewPage />} />
          <Route path="/ceo/reports/headcount" element={<CEOHeadcountReportPage />} />
          <Route path="/ceo/reports/turnover" element={<CEOTurnoverReportPage />} />
          <Route path="/ceo/reports/cost" element={<CEOCostReportPage />} />
          <Route path="/ceo/reports/department" element={<CEODepartmentReportPage />} />
          <Route path="/ceo/kpi/dashboard" element={<CEOKPIDashboardPage />} />
          <Route path="/ceo/kpi/company-goals" element={<CEOCompanyGoalsPage />} />
          <Route path="/ceo/kpi/okr" element={<CEOOKRTrackingPage />} />
          <Route path="/ceo/approvals" element={<CEOApprovalsPage />} />
          <Route path="/ceo/budget-requests" element={<CEOBudgetRequestsPage />} />
          <Route path="/ceo/leadership-team" element={<CEOLeadershipTeamPage />} />
          <Route path="/ceo/succession-planning" element={<CEOSuccessionPlanningPage />} />
          <Route path="/ceo/performance-summary" element={<CEOPerformanceSummaryPage />} />
          <Route path="/ceo/talent-overview" element={<CEOTalentOverviewPage />} />
          <Route path="/ceo/announcements" element={<CEOAnnouncementsPage />} />
          <Route path="/ceo/payroll-report" element={<CEOPayrollReportPage />} />

          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/create" element={<EmployeeFormPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/work-locations" element={<WorkLocationsPage />} />

          {/* Admin pages */}
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/companies" element={<CompaniesPageWrapper />} />
          <Route path="/company-assignments" element={<CompanyAssignmentsPage />} />
          <Route path="/company-features" element={<CompanyFeaturesPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/payroll-settings" element={<PayrollSettingsPage />} />
          <Route path="/approval-settings" element={<ApprovalSettingsPage />} />

          {/* System Settings (Super Admin) */}
          <Route path="/settings/general" element={<PlaceholderPage title="General Settings" icon="settings" />} />
          <Route path="/settings/notifications" element={<PlaceholderPage title="Notification Settings" icon="bell" />} />
          <Route path="/settings/integrations" element={<PlaceholderPage title="Integrations" icon="plug" />} />
          <Route path="/settings/backup" element={<PlaceholderPage title="Backup & Restore" icon="database" />} />

          {/* Security (Super Admin) */}
          <Route path="/security/api-keys" element={<PlaceholderPage title="API Keys" icon="key" />} />
          <Route path="/security/sessions" element={<PlaceholderPage title="Active Sessions" icon="monitor" />} />
          <Route path="/security/login-history" element={<PlaceholderPage title="Login History" icon="history" />} />

          {/* Attendance */}
          <Route path="/attendance" element={<AttendancePage />} />

          {/* Manager pages */}
          <Route path="/my-team" element={<MyTeamPage />} />
          <Route path="/team-attendance" element={<TeamAttendancePage />} />
          <Route path="/team-overtime" element={<TeamOvertimePage />} />
          <Route path="/leave-approval" element={<LeaveApprovalPage />} />
          <Route path="/my-leave" element={<MyLeavePage />} />
          <Route path="/manager/templates" element={<TeamTemplatesPage />} />
          <Route path="/manager/announcements" element={<TeamAnnouncementsPage />} />
          <Route path="/manager/documents" element={<ManagerDocumentsPage />} />

          {/* Employee pages */}
          <Route path="/employee/templates" element={<EmployeeTemplatesPage />} />
          <Route path="/employee/announcements" element={<EmployeeAnnouncementsPage />} />
          <Route path="/employee/documents" element={<EmployeeDocumentsPage />} />

          {/* Analytics (Group CEO) */}
          <Route path="/analytics/workforce" element={<WorkforceAnalyticsPage />} />
          <Route path="/analytics/attendance" element={<AttendanceReportsPage />} />
          <Route path="/analytics/turnover" element={<TurnoverAnalysisPage />} />
          <Route path="/analytics/headcount" element={<HeadcountTrendsPage />} />

          {/* Leave Management */}
          <Route path="/leave" element={<LeaveRequestsPage />} />
          <Route path="/leave/policy" element={<LeavePolicyPage />} />
          <Route path="/leave/entitlements" element={<LeaveEntitlementsPage />} />
          <Route path="/leave/analytics" element={<LeaveAnalyticsPage />} />

          {/* Payroll */}
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/payroll/freelance" element={<FreelanceInternshipPayrollPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/overview" element={<GroupContractsPage />} />

          {/* Resources */}
          <Route path="/resources/templates" element={<TemplatesPage />} />
          <Route path="/resources/announcements" element={<AnnouncementsPage />} />
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/holiday-calendar" element={<HolidayCalendarPage />} />
          <Route path="/overtime" element={<OvertimePage />} />
          <Route path="/allowances" element={<AllowancesPage />} />
          <Route path="/deductions" element={<DeductionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/movement" element={<MovementPage />} />
          <Route path="/org-chart" element={<OrgChartPage />} />

          {/* Performance */}
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/performance/kpi" element={<KPIDashboardPage />} />
          <Route path="/performance/goals" element={<GoalsOKRsPage />} />

          {/* Tax */}
          <Route path="/tax/pph21" element={<PPh21Page />} />
          <Route path="/tax/pph-calculation" element={<TaxCalculationPage />} />
          <Route path="/tax/pph-history" element={<PaymentHistoryPage />} />
          <Route path="/tax/bpjs-kesehatan" element={<BPJSKesehatanPage />} />
          <Route path="/tax/bpjs-ketenagakerjaan" element={<BPJSKetenagakerjaanPage />} />
          <Route path="/tax/bpjs-reports" element={<BPJSReportsPage />} />
          <Route path="/tax/espt" element={<ESPTPage />} />
          <Route path="/tax/ebupot" element={<EBupotPage />} />
          <Route path="/tax/monthly-reports" element={<MonthlyReportsPage />} />
          <Route path="/tax/annual-reports" element={<AnnualReportsPage />} />
          <Route path="/tax/rates" element={<TaxRatesPage />} />
          <Route path="/tax/ptkp" element={<PTKPSettingsPage />} />
          <Route path="/tax/company-npwp" element={<CompanyNPWPPage />} />
        </Route>

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Toast notifications */}
      <Toaster
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
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-6 shadow-inner">
        {getIcon()}
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-500">This page is under construction.</p>
      <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm text-amber-700 font-medium">Coming Soon</span>
      </div>
    </div>
  );
}

export default Sentry.withProfiler(App);
