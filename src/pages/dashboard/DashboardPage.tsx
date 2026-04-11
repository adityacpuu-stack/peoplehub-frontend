import { useEffect, useState } from 'react';
import { PageSpinner } from '@/components/ui';
import { dashboardService, type DashboardOverview, type TeamDashboard, type GroupDashboard, type MyDashboard, type SuperAdminStats, type AuditLogEntry, type AuditStatistics } from '@/services/dashboard.service';
import { leaveService } from '@/services/leave.service';
import { useAuthStore } from '@/stores/auth.store';
import type { DashboardStats, LeaveRequest } from '@/types';
import { TaxDashboardPage } from './TaxDashboardPage';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { GroupCEODashboard } from './GroupCEODashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { HRDashboard } from './HRDashboard';

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
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [teamDashboard, setTeamDashboard] = useState<TeamDashboard | null>(null);
  const [groupDashboard, setGroupDashboard] = useState<GroupDashboard | null>(null);
  const [myDashboard, setMyDashboard] = useState<MyDashboard | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummaryData | null>(null);
  const [superAdminStats, setSuperAdminStats] = useState<SuperAdminStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check user roles
  const isSuperAdmin = user?.roles?.includes('Super Admin');
  const isGroupCEO = user?.roles?.includes('Group CEO');
  const isTax = user?.roles?.some(r => ['Tax Manager', 'Tax Staff'].includes(r));
  const isHR = user?.roles?.some(r => ['CEO', 'HR Manager', 'HR Staff'].includes(r)) && !isGroupCEO && !isTax;
  const isManager = user?.roles?.includes('Manager') && !isHR && !isGroupCEO && !isTax;
  const isEmployee = !isSuperAdmin && !isGroupCEO && !isTax && !isHR && !isManager;

  useEffect(() => {
    const fetchData = async () => {
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
          setSuperAdminStats(saStats);
          setRecentLogs(logs);
          setAuditStats(aStats);
        }
        // HR/Admin fetches stats and overview
        else if (isHR) {
          const [statsData, overviewData, payrollData] = await Promise.all([
            dashboardService.getStats(),
            dashboardService.getOverview(),
            dashboardService.getPayrollSummary(),
          ]);
          setStats(statsData);
          setOverview(overviewData as DashboardOverview);
          setPayrollSummary(payrollData as PayrollSummaryData);
        }

        // Manager fetches team dashboard
        if (isManager) {
          const [teamData, approvals] = await Promise.all([
            dashboardService.getTeamDashboard(),
            leaveService.getPendingApprovals(),
          ]);
          setTeamDashboard(teamData);
          setPendingApprovals(approvals);
        }

        // Employee fetches my dashboard
        if (isEmployee) {
          const myData = await dashboardService.getMyDashboard();
          setMyDashboard(myData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isHR, isManager, isSuperAdmin, isGroupCEO, isTax, isEmployee]);

  if (isLoading) {
    return <PageSpinner />;
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (isSuperAdmin) {
    return (
      <SuperAdminDashboard
        user={user}
        superAdminStats={superAdminStats}
        recentLogs={recentLogs}
        auditStats={auditStats}
        greeting={greeting}
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
      />
    );
  }

  if (isEmployee) {
    return (
      <EmployeeDashboard
        user={user}
        myDashboard={myDashboard}
        greeting={greeting}
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
      greeting={greeting}
    />
  );
}
