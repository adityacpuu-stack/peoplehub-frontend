import { t, useLocale } from '@/i18n';
import { useEffect, useState, lazy, Suspense } from 'react';
import { PageSpinner } from '@/components/ui';
import { dashboardService, type DashboardOverview, type TeamDashboard, type GroupDashboard, type MyDashboard, type SuperAdminStats, type AuditLogEntry, type AuditStatistics } from '@/services/dashboard.service';
import { leaveService } from '@/services/leave.service';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import type { DashboardStats, LeaveRequest } from '@/types';
const TaxDashboardPage = lazy(() => import('./TaxDashboardPage').then(m => ({ default: m.TaxDashboardPage })));
const SuperAdminDashboard = lazy(() => import('./SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const GroupCEODashboard = lazy(() => import('./GroupCEODashboard').then(m => ({ default: m.GroupCEODashboard })));
const ManagerDashboard = lazy(() => import('./ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const EmployeeDashboard = lazy(() => import('./EmployeeDashboard').then(m => ({ default: m.EmployeeDashboard })));
const HRDashboard = lazy(() => import('./HRDashboard').then(m => ({ default: m.HRDashboard })));
const FinanceDashboard = lazy(() => import('./FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const ItDashboard = lazy(() => import('@/pages/it/ItDashboard').then(m => ({ default: m.ItDashboard })));

// Payroll summary type for HR dashboard
interface PayrollSummaryData {
  current_period: {
    period: string;
    status: string;
    total_employees: number;
    total_gross: number;
    total_deductions: number;
    total_net: number;
  } | null;
  pending_adjustments: number;
  pending_overtime: number;
}

export function DashboardPage() {
  return <Suspense fallback={<PageSpinner />}><DashboardContent /></Suspense>;
}

function DashboardContent() {
  useLocale();
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const leaveEnabled = user?.companyFeatures?.leave_enabled ?? true;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [teamDashboard, setTeamDashboard] = useState<TeamDashboard | null>(null);
  const [groupDashboard, setGroupDashboard] = useState<GroupDashboard | null>(null);
  const [myDashboard, setMyDashboard] = useState<MyDashboard | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummaryData | null>(null);
  const [payrollUnavailable, setPayrollUnavailable] = useState(false);
  const [superAdminStats, setSuperAdminStats] = useState<SuperAdminStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [retry, setRetry] = useState(0);

  // Check user roles
  const isSuperAdmin = user?.roles?.includes('Super Admin');
  const isGroupCEO = !isSuperAdmin && user?.roles?.includes('Group CEO');
  const isTax = !isSuperAdmin && !isGroupCEO && user?.roles?.some(r => ['Tax Manager', 'Tax Staff'].includes(r));
  const isHR = !isSuperAdmin && user?.roles?.some(r => ['CEO', 'HR Manager', 'HR Staff'].includes(r)) && !isGroupCEO && !isTax;
  const isFinance = !isSuperAdmin && !isGroupCEO && !isTax && !isHR && user?.roles?.includes('Finance Manager');
  const isManager = !isSuperAdmin && user?.roles?.includes('Manager') && !isHR && !isGroupCEO && !isTax && !isFinance;
  const isEmployee = !isSuperAdmin && !isGroupCEO && !isTax && !isHR && !isManager && !isFinance;
  // IT Admin alone or with Employee: IT workspace dashboard (no other role takes precedence here).
  const isIT = isEmployee && !!user?.roles?.includes('IT Admin');

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      setDashboardError(false);
      try {
        // Group CEO fetches group dashboard
        if (isGroupCEO) {
          const groupData = await dashboardService.getGroupOverview();
          setGroupDashboard(groupData);
        }
        // Tax users don't need API calls - they use mock data
        else if (isTax) {
          // Tax Dashboard uses mock data, no API call needed
        }
        // Super Admin fetches its own stats + audit data
        else if (isSuperAdmin) {
          const [saStats, logs, aStats] = await Promise.all([
            dashboardService.getSuperAdminStats(),
            dashboardService.getRecentAuditLogs(10),
            dashboardService.getAuditStatistics(),
          ]);
          if (!cancelled) {
            setSuperAdminStats(saStats);
            setRecentLogs(logs);
            setAuditStats(aStats);
          }
        }
        // HR/Admin fetches stats and overview
        else if (isHR) {
          // Payroll totals are optional: request them only with payroll.view and
          // never let a denial collapse the workforce/leave sections.
          const payrollAllowed = canAction(user, 'payroll.view');
          const [statsData, overviewData, payrollData] = await Promise.all([
            dashboardService.getStats(),
            dashboardService.getOverview(),
            payrollAllowed
              ? dashboardService.getPayrollSummary().catch((error: unknown) => {
                if ((error as { response?: { status?: number } }).response?.status === 403) return null;
                throw error;
              })
              : Promise.resolve(null),
          ]);
          if (!cancelled) {
            setStats(statsData);
            setOverview(overviewData as DashboardOverview);
            setPayrollSummary(payrollData as PayrollSummaryData | null);
            setPayrollUnavailable(payrollData == null);
          }
        }

        // Manager fetches team dashboard
        if (isManager) {
          const [teamData, approvals] = await Promise.all([
            dashboardService.getTeamDashboard(),
            leaveEnabled ? leaveService.getMyApprovals() : Promise.resolve([]),
          ]);
          if (!cancelled) {
            setTeamDashboard(teamData);
            setPendingApprovals(approvals.filter(leave => leave.status === 'pending' && leave.can_approve === true));
          }
        }

        // Employee fetches my dashboard (the IT dashboard loads its own data)
        if (isEmployee && !isIT && employeeId) {
          const myData = await dashboardService.getMyDashboard();
          if (!cancelled) setMyDashboard(myData);
        }
      } catch (error) {
        if (!cancelled && (isEmployee || isHR || isManager || isSuperAdmin)) setDashboardError(true);
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [isHR, isManager, isSuperAdmin, isGroupCEO, isTax, isEmployee, isIT, isFinance, retry, employeeId, user?.id, leaveEnabled]);

  if (isLoading) {
    return <PageSpinner />;
  }

  const greeting = () => {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date()));
    if (hour < 12) return t('Good Morning');
    if (hour < 17) return t('Good Afternoon');
    return t('Good Evening');
  };

  if (isSuperAdmin) {
    return (
      <SuperAdminDashboard
        user={user}
        superAdminStats={superAdminStats}
        recentLogs={recentLogs}
        auditStats={auditStats}
        greeting={greeting}
        failed={dashboardError}
        onRetry={() => setRetry(value => value + 1)}
      />
    );
  }

  if (isGroupCEO) {
    return (
      <GroupCEODashboard
        user={user}
        groupDashboard={groupDashboard}
        greeting={greeting}
      />
    );
  }

  if (isTax) {
    return <TaxDashboardPage />;
  }

  if (isManager) {
    return (
      <ManagerDashboard
        user={user}
        teamDashboard={teamDashboard}
        pendingApprovals={pendingApprovals}
        greeting={greeting}
        failed={dashboardError}
        onRetry={() => setRetry(value => value + 1)}
      />
    );
  }

  if (isFinance) return <FinanceDashboard />;

  if (isIT) return <ItDashboard user={user} greeting={greeting} />;

  if (isEmployee) {
    return (
      <EmployeeDashboard
        user={user}
        myDashboard={myDashboard}
        greeting={greeting}
        failed={dashboardError}
        onRetry={() => setRetry(value => value + 1)}
      />
    );
  }

  // Default: HR/P&C Dashboard
  return (
    <HRDashboard
      user={user}
      stats={stats}
      overview={overview}
      payrollSummary={payrollSummary}
      payrollUnavailable={payrollUnavailable}
      greeting={greeting}
      failed={dashboardError}
      onRetry={() => setRetry(value => value + 1)}
    />
  );
}
