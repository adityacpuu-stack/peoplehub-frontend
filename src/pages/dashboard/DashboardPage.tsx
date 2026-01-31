import { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  Clock,
  Calendar,
  TrendingUp,
  UserPlus,
  Activity,
  ArrowRight,
  BarChart3,
  FileText,
  Shield,
  Server,
  UserCog,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  Zap,
  Calculator,
  UsersRound,
  UserCheck,
  UserX,
  CalendarCheck,
  Star,
  Eye,
  Crown,
  Target,
  DollarSign,
  PieChart as PieChartIcon,
  Layers,
  Award,
  BarChart2,
  Receipt,
  Percent,
  FileSpreadsheet,
  Landmark,
  CircleDollarSign,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { PageSpinner, Badge } from '@/components/ui';
import { dashboardService, type TeamDashboard, type GroupDashboard, type MyDashboard } from '@/services/dashboard.service';
import { leaveService } from '@/services/leave.service';
import { useAuthStore } from '@/stores/auth.store';
import type { DashboardStats, LeaveRequest } from '@/types';
import { formatNumber } from '@/lib/utils';
import { TaxDashboardPage } from './TaxDashboardPage';

// Chart colors for department distribution
const DEPARTMENT_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#ef4444'];

// Mock data for Super Admin dashboard
const loginActivityData = [
  { name: 'Mon', logins: 45, failed: 3 },
  { name: 'Tue', logins: 52, failed: 2 },
  { name: 'Wed', logins: 48, failed: 5 },
  { name: 'Thu', logins: 61, failed: 1 },
  { name: 'Fri', logins: 55, failed: 4 },
  { name: 'Sat', logins: 20, failed: 0 },
  { name: 'Sun', logins: 15, failed: 1 },
];

const systemHealthData = [
  { name: 'API', status: 'healthy', uptime: 99.9 },
  { name: 'Database', status: 'healthy', uptime: 99.8 },
  { name: 'Storage', status: 'healthy', uptime: 100 },
  { name: 'Cache', status: 'warning', uptime: 98.5 },
];

const recentAuditLogs = [
  { action: 'User Login', user: 'admin@example.com', time: '2 mins ago', status: 'success' },
  { action: 'Employee Created', user: 'hr.manager@example.com', time: '15 mins ago', status: 'success' },
  { action: 'Role Updated', user: 'admin@example.com', time: '1 hour ago', status: 'success' },
  { action: 'Login Failed', user: 'unknown@example.com', time: '2 hours ago', status: 'failed' },
  { action: 'Settings Changed', user: 'admin@example.com', time: '3 hours ago', status: 'success' },
];


// Dashboard overview type for HR
interface DashboardOverview {
  employee: {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
    by_department: Array<{ department: string; count: number }>;
    by_employment_type: Array<{ type: string; count: number }>;
    gender_distribution: Array<{ gender: string; count: number }>;
  };
  attendance: {
    today: {
      total_expected: number;
      checked_in: number;
      checked_out: number;
      late: number;
      absent: number;
      on_leave: number;
    };
    this_week: {
      late_count: number;
      absent_count: number;
    };
    this_month: {
      total_work_days: number;
      avg_attendance_rate: number;
    };
  };
  leave: {
    pending_requests: number;
    approved_this_month: number;
    rejected_this_month: number;
    on_leave_today: number;
    upcoming_leaves: Array<{
      employee_name: string;
      leave_type: string;
      start_date: string;
      end_date: string;
    }>;
    by_type: Array<{ type: string; count: number }>;
  };
  alerts: Array<{
    id: string;
    type: string;
    category: string;
    title: string;
    message: string;
    count: number;
    action_url: string;
  }>;
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [teamDashboard, setTeamDashboard] = useState<TeamDashboard | null>(null);
  const [groupDashboard, setGroupDashboard] = useState<GroupDashboard | null>(null);
  const [myDashboard, setMyDashboard] = useState<MyDashboard | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
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
        // HR/Admin fetches stats and overview
        else if (isHR || isSuperAdmin) {
          const promises: Promise<any>[] = [dashboardService.getStats()];

          if (isHR) {
            promises.push(dashboardService.getOverview());
          }

          const results = await Promise.all(promises);
          setStats(results[0]);

          if (isHR && results[1]) {
            setOverview(results[1] as DashboardOverview);
          }
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

  const attendanceToday = stats?.attendance_today || {
    present: 0,
    absent: 0,
    late: 0,
    on_leave: 0,
  };

  const totalAttendance = attendanceToday.present + attendanceToday.absent + attendanceToday.late + attendanceToday.on_leave;
  const attendanceRate = totalAttendance > 0 ? Math.round((attendanceToday.present / totalAttendance) * 100) : 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Render Super Admin Dashboard
  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        {/* Header Banner with Gradient - Super Admin Style */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-zinc-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 md:px-8 py-8 md:py-10 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="admin-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#admin-grid)" />
              </svg>
            </div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                    <Server className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-slate-300 text-sm mt-1">System Overview & Administration</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                    <Shield className="h-4 w-4 text-purple-300" />
                    Super Admin
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur-xl rounded-xl text-sm text-green-300 font-medium border border-green-500/20">
                    <CheckCircle className="h-4 w-4" />
                    All Systems Operational
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                    <Clock className="h-4 w-4" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Total Users */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Total</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">172</p>
            <p className="text-sm text-gray-500">System Users</p>
          </div>

          {/* Companies */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Active</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">5</p>
            <p className="text-sm text-gray-500">Companies</p>
          </div>

          {/* Total Employees */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">All</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(stats?.total_employees || 265)}</p>
            <p className="text-sm text-gray-500">Total Employees</p>
          </div>

          {/* Audit Logs Today */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <History className="h-5 w-5 text-white" />
              </div>
              <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
                Today
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">48</p>
            <p className="text-sm text-gray-500">Audit Entries</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Login Activity Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Login Activity</h3>
                <p className="text-xs text-gray-500 mt-1">Successful vs failed login attempts</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-md">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loginActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="logins" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Successful" />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">System Health</h3>
                <p className="text-xs text-gray-500 mt-1">Service status overview</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <Cpu className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              {systemHealthData.map((service) => (
                <div
                  key={service.name}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    service.status === 'healthy' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {service.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.uptime}% uptime</p>
                    </div>
                  </div>
                  <Badge variant={service.status === 'healthy' ? 'success' : 'warning'}>
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Audit Logs */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                <p className="text-xs text-gray-500 mt-1">Latest system audit logs</p>
              </div>
              <Link to="/audit-logs" className="text-sm text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentAuditLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      log.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {log.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{log.action}</p>
                      <p className="text-xs text-gray-500">{log.user}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{log.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                <p className="text-xs text-gray-500 mt-1">Admin shortcuts</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/users"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-slate-50 border border-gray-100 hover:border-slate-200 transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <UserCog className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-slate-700">Manage Users</span>
              </Link>
              <Link
                to="/roles"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-purple-700">Roles</span>
              </Link>
              <Link
                to="/payroll-settings"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-emerald-700">Payroll Settings</span>
              </Link>
              <Link
                to="/audit-logs"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <History className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-amber-700">Audit Logs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Group CEO Dashboard
  if (isGroupCEO) {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    // Use real data from groupDashboard, with fallbacks
    const summary = groupDashboard?.summary || {
      total_companies: 0,
      total_employees: 0,
      total_departments: 0,
      avg_attendance_rate: 0,
      total_on_leave_today: 0,
      pending_approvals: 0,
      new_hires_this_month: 0,
      terminations_this_month: 0,
    };
    const headcountTrendData = groupDashboard?.headcount_trend || [];
    const companiesData = groupDashboard?.companies || [];
    const payrollData = groupDashboard?.payroll_summary || { total_monthly_payroll: 0, avg_salary: 0, by_company: [] };
    const recentActivitiesData = groupDashboard?.recent_activities || [];
    const alertsData = groupDashboard?.alerts || [];

    return (
      <div className="space-y-6">
        {/* Header Banner - Executive Gold Theme */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 md:px-8 py-8 md:py-10 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="ceo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ceo-grid)" />
              </svg>
            </div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                    <Crown className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-amber-100 text-sm mt-1">Executive Dashboard - Group Overview</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                    <Crown className="h-4 w-4 text-yellow-300" />
                    Group CEO
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                    <Building2 className="h-4 w-4" />
                    {summary.total_companies} Companies
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                    <Users className="h-4 w-4" />
                    {formatNumber(summary.total_employees)} Employees
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/20">
                    <Clock className="h-4 w-4" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500">TOTAL</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total_companies}</p>
            <p className="text-xs text-gray-500">Companies</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500">GROUP</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.total_employees)}</p>
            <p className="text-xs text-gray-500">Total Employees</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-600">AVG</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.avg_attendance_rate}%</p>
            <p className="text-xs text-gray-500">Attendance Rate</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-600">NEW</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.new_hires_this_month}</p>
            <p className="text-xs text-gray-500">Hires This Month</p>
          </div>
        </div>

        {/* Second Row - Financial & HR Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500">MONTHLY</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(payrollData.total_monthly_payroll)}</p>
            <p className="text-xs text-gray-500">Total Payroll</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500">AVG</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(payrollData.avg_salary)}</p>
            <p className="text-xs text-gray-500">Avg Salary</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-amber-600">PENDING</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.pending_approvals}</p>
            <p className="text-xs text-gray-500">Approvals</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-teal-600">TODAY</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total_on_leave_today}</p>
            <p className="text-xs text-gray-500">On Leave</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Headcount Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Group Headcount Trend</h3>
                <p className="text-xs text-gray-500 mt-1">6-month employee movement overview</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <BarChart2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={headcountTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area type="monotone" dataKey="headcount" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorHeadcount)" name="Headcount" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600">New Hires: {headcountTrendData.reduce((sum, d) => sum + d.hires, 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-600">Exits: {headcountTrendData.reduce((sum, d) => sum + d.exits, 0)}</span>
              </div>
            </div>
          </div>

          {/* Department Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Workforce Distribution</h3>
                <p className="text-xs text-gray-500 mt-1">By department</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                <PieChartIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(groupDashboard?.department_distribution || []).map((d, i) => ({
                      name: d.name,
                      value: d.employees,
                      color: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'][i % 6]
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(groupDashboard?.department_distribution || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {(groupDashboard?.department_distribution || []).slice(0, 5).map((dept, index) => (
                <div key={dept.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'][index % 6] }} />
                    <span className="text-gray-600">{dept.name}</span>
                  </div>
                  <span className="text-gray-500">{dept.employees}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Company Performance Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Company Performance Overview</h3>
              <p className="text-xs text-gray-500 mt-1">Key metrics across all subsidiaries</p>
            </div>
            <Link to="/companies" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employees</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Attendance</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">On Leave</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">New Hires</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companiesData.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {company.name.split(' ')[1]?.[0] || company.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{company.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-gray-900">{company.employees}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {company.attendance_rate < 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                          N/A
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          company.attendance_rate >= 93 ? 'bg-green-100 text-green-700' :
                          company.attendance_rate >= 90 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {company.attendance_rate}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                        {company.on_leave_today} on leave
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                        <TrendingUp className="h-3 w-3" />
                        +{company.new_hires_this_month}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {company.attendance_rate < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                          <Clock className="h-3 w-3" /> No Attendance
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          company.attendance_rate >= 93 ? 'bg-green-100 text-green-700' :
                          company.attendance_rate < 90 ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {company.attendance_rate >= 93 ? (
                            <><CheckCircle className="h-3 w-3" /> Excellent</>
                          ) : company.attendance_rate < 90 ? (
                            <><AlertTriangle className="h-3 w-3" /> Needs Attention</>
                          ) : (
                            <><Clock className="h-3 w-3" /> Good</>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Alerts & Notifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Alerts</h3>
                <p className="text-xs text-gray-500 mt-1">Items requiring attention</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {alertsData.length}
              </span>
            </div>
            <div className="space-y-3">
              {alertsData.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">No alerts at this time</div>
              ) : alertsData.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border ${
                    alert.type === 'error' ? 'bg-red-50 border-red-100' :
                    alert.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                    alert.type === 'success' ? 'bg-green-50 border-green-100' :
                    'bg-blue-50 border-blue-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'error' ? 'bg-red-100' :
                      alert.type === 'warning' ? 'bg-amber-100' :
                      alert.type === 'success' ? 'bg-green-100' :
                      'bg-blue-100'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        alert.type === 'error' ? 'text-red-600' :
                        alert.type === 'warning' ? 'text-amber-600' :
                        alert.type === 'success' ? 'text-green-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{alert.title}</p>
                      <p className="text-xs text-gray-500">{alert.category}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
                <p className="text-xs text-gray-500 mt-1">Latest updates across all companies</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              {recentActivitiesData.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">No recent activities</div>
              ) : recentActivitiesData.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      activity.type === 'hire' ? 'bg-green-100' :
                      activity.type === 'exit' ? 'bg-red-100' :
                      activity.type === 'promotion' ? 'bg-purple-100' :
                      activity.type === 'leave' ? 'bg-blue-100' :
                      'bg-amber-100'
                    }`}>
                      {activity.type === 'hire' ? <UserPlus className="h-4 w-4 text-green-600" /> :
                       activity.type === 'exit' ? <UserX className="h-4 w-4 text-red-600" /> :
                       activity.type === 'promotion' ? <Award className="h-4 w-4 text-purple-600" /> :
                       activity.type === 'leave' ? <Calendar className="h-4 w-4 text-blue-600" /> :
                       <Star className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.employee_name} • {activity.company_name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link
              to="/companies"
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-amber-700">Companies</span>
            </Link>
            <Link
              to="/employees"
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700">Employees</span>
            </Link>
            <Link
              to="/org-chart"
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-purple-700">Org Chart</span>
            </Link>
            <Link
              to="/payroll"
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-green-700">Payroll</span>
            </Link>
            <Link
              to="/performance"
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-rose-700">Performance</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Tax Dashboard
  if (isTax) {
    return <TaxDashboardPage />;
  }

  // Render Manager Dashboard
  if (isManager) {
    const attendanceEnabled = user?.companyFeatures?.attendance_enabled ?? false;
    const leaveEnabled = user?.companyFeatures?.leave_enabled ?? true;

    const teamMembers = teamDashboard?.team_members || [];
    const teamStats = {
      total: teamDashboard?.team_size || 0,
      present: teamMembers.filter(m => m.status_today === 'present').length,
      onLeave: teamDashboard?.on_leave_today || 0,
      late: teamMembers.filter(m => m.status_today === 'late').length,
      pendingLeaves: teamDashboard?.pending_leave_requests || 0,
    };

    const getStatusBadge = (status: string) => {
      const styles: Record<string, string> = {
        present: 'bg-green-100 text-green-700',
        late: 'bg-amber-100 text-amber-700',
        wfh: 'bg-blue-100 text-blue-700',
        leave: 'bg-purple-100 text-purple-700',
        on_leave: 'bg-purple-100 text-purple-700',
        absent: 'bg-red-100 text-red-700',
        not_checked_in: 'bg-gray-100 text-gray-700',
      };
      const labels: Record<string, string> = {
        present: 'Present',
        late: 'Late',
        wfh: 'WFH',
        leave: 'On Leave',
        on_leave: 'On Leave',
        absent: 'Absent',
        not_checked_in: 'Not Checked In',
      };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
          {labels[status] || status}
        </span>
      );
    };

    return (
      <div className="space-y-6">
        {/* Header Banner - Manager Style */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 md:px-8 py-8 md:py-10 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="manager-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#manager-grid)" />
              </svg>
            </div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                    <UsersRound className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-indigo-100 text-sm mt-1">Here's your team overview for today</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                    <UsersRound className="h-4 w-4" />
                    {teamStats.total} Team Members
                  </span>
                  {pendingApprovals.length > 0 && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-xl rounded-xl text-sm text-amber-100 font-medium border border-amber-500/20">
                      <FileText className="h-4 w-4" />
                      {pendingApprovals.length} Pending Approval
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                    <Clock className="h-4 w-4" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Stats Cards */}
        <div className={`grid grid-cols-2 ${attendanceEnabled ? 'md:grid-cols-5' : leaveEnabled ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <UsersRound className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{teamStats.total}</p>
            <p className="text-xs text-gray-500">Team Members</p>
          </div>
          {attendanceEnabled && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-green-600">Present</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{teamStats.present}</p>
                <p className="text-xs text-gray-500">In Office</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-amber-600">Late</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{teamStats.late}</p>
                <p className="text-xs text-gray-500">Late Today</p>
              </div>
            </>
          )}
          {leaveEnabled && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600">Pending</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{teamStats.pendingLeaves}</p>
                <p className="text-xs text-gray-500">Leave Requests</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-purple-600">Leave</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{teamStats.onLeave}</p>
                <p className="text-xs text-gray-500">On Leave Today</p>
              </div>
            </>
          )}
        </div>

        {/* Main Content Row */}
        <div className={`grid ${leaveEnabled ? 'lg:grid-cols-3' : ''} gap-6`}>
          {/* Team Members */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
                <p className="text-xs text-gray-500 mt-1">Your direct reports</p>
              </div>
              <Link to="/my-team" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <UsersRound className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No team members found</p>
                </div>
              ) : (
                teamMembers.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.position || member.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {attendanceEnabled && member.check_in_time && (
                        <span className="text-xs text-gray-500">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {member.check_in_time}
                        </span>
                      )}
                      {attendanceEnabled && getStatusBadge(member.status_today)}
                      {member.pending_leaves > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {member.pending_leaves} pending
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Approvals */}
          {leaveEnabled && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Pending Approvals</h3>
                <p className="text-xs text-gray-500 mt-1">Requests awaiting your action</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {pendingApprovals.length}
              </span>
            </div>
            <div className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending approvals</p>
                </div>
              ) : (
                pendingApprovals.slice(0, 3).map((approval) => (
                  <div
                    key={approval.id}
                    className="p-3 rounded-xl border bg-purple-50 border-purple-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-900">{approval.employee?.name || 'Unknown'}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-200 text-purple-700">
                        {approval.leaveType?.name || 'Leave'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {approval.total_days} day(s) - {approval.reason || 'No reason provided'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(approval.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(approval.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))
              )}
            </div>
            {pendingApprovals.length > 0 && (
              <Link
                to="/leave-approval"
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-blue-700 transition-all"
              >
                Review All Approvals
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          )}
        </div>

      </div>
    );
  }

  // Render Employee Dashboard
  if (isEmployee) {
    // Use real data from API or fallback to empty arrays
    const attendanceHistory = myDashboard?.attendance_history || [];
    const leaveBalance = myDashboard?.leave_balance || [];
    const recentRequests = myDashboard?.recent_requests || [];
    const announcements = myDashboard?.announcements || [];
    const attendance = myDashboard?.attendance;
    const pendingRequestsCount = myDashboard?.pending_requests || { leave: 0, overtime: 0 };

    const totalLeaveRemaining = leaveBalance.reduce((sum, b) => sum + b.remaining, 0);

    const getStatusBadge = (status: string) => {
      const styles: Record<string, string> = {
        present: 'bg-green-100 text-green-700',
        late: 'bg-amber-100 text-amber-700',
        on_leave: 'bg-purple-100 text-purple-700',
        absent: 'bg-red-100 text-red-700',
        pending: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
      };
      const labels: Record<string, string> = {
        present: 'Present',
        late: 'Late',
        on_leave: 'On Leave',
        absent: 'Absent',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
      };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
          {labels[status]}
        </span>
      );
    };

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Header Banner - Employee Style */}
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-xl md:rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 md:px-8 py-5 md:py-10 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="employee-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#employee-grid)" />
              </svg>
            </div>

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                    <Users className="h-5 w-5 md:h-7 md:w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-3xl font-bold text-white">
                      {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-cyan-100 text-xs md:text-sm mt-0.5 md:mt-1">Welcome to your personal dashboard</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3 md:mt-4">
                  <span className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 bg-white/20 backdrop-blur-xl rounded-lg md:rounded-xl text-xs md:text-sm text-white font-medium border border-white/10">
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    {totalLeaveRemaining} Days Leave
                  </span>
                  {attendance && (
                    <span className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 backdrop-blur-xl rounded-lg md:rounded-xl text-xs md:text-sm font-medium border ${
                      attendance.today_status === 'checked_in' || attendance.today_status === 'checked_out' ? 'bg-green-500/20 text-green-100 border-green-500/20' :
                      attendance.today_status === 'on_leave' ? 'bg-purple-500/20 text-purple-100 border-purple-500/20' :
                      'bg-white/20 text-white border-white/10'
                    }`}>
                      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">
                        {attendance.today_status === 'checked_in' || attendance.today_status === 'checked_out'
                          ? `Checked in at ${attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}`
                          : attendance.today_status === 'on_leave' ? 'On Leave' : 'Not checked in yet'}
                      </span>
                      <span className="sm:hidden">
                        {attendance.today_status === 'checked_in' || attendance.today_status === 'checked_out'
                          ? `In: ${attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}`
                          : attendance.today_status === 'on_leave' ? 'On Leave' : 'Not checked in'}
                      </span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 bg-white/20 backdrop-blur-xl rounded-lg md:rounded-xl text-xs md:text-sm text-white font-medium border border-white/10">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-semibold text-gray-500">This Month</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{attendance?.this_month.present_days || 0}</p>
            <p className="text-[10px] md:text-xs text-gray-500">Days Present</p>
          </div>
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-semibold text-gray-500">This Month</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{attendance?.this_month.late_days || 0}</p>
            <p className="text-[10px] md:text-xs text-gray-500">Days Late</p>
          </div>
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-semibold text-gray-500">Leave Balance</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{totalLeaveRemaining}</p>
            <p className="text-[10px] md:text-xs text-gray-500">Days Available</p>
          </div>
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-semibold text-gray-500">Pending</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{pendingRequestsCount.leave + pendingRequestsCount.overtime}</p>
            <p className="text-[10px] md:text-xs text-gray-500">Requests</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Leave Balance */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                Leave Balance
              </h3>
              <Link to="/my-leave" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Link>
            </div>
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              {leaveBalance.length > 0 ? leaveBalance.map((leave, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <span className="text-xs md:text-sm font-medium text-gray-700">{leave.type}</span>
                    <span className="text-xs md:text-sm text-gray-500">{leave.remaining} / {leave.total}</span>
                  </div>
                  <div className="w-full h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${leave.total > 0 ? (leave.remaining / leave.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">No leave balance data</p>
              )}
            </div>
          </div>

          {/* Recent Requests */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                Recent Requests
              </h3>
              <Link to="/requests" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentRequests.length > 0 ? recentRequests.map((request) => (
                <div key={`${request.type}-${request.id}`} className="px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-900 truncate">{request.detail}</p>
                      <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">{request.date}</p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-6">No recent requests</p>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                Announcements
              </h3>
              <Link to="/employee/announcements" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {announcements.length > 0 ? announcements.map((announcement) => (
                <div key={announcement.id} className="px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {announcement.is_new && (
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                        )}
                        <p className="text-xs md:text-sm font-medium text-gray-900 truncate">{announcement.title}</p>
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">{new Date(announcement.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ${
                      announcement.category === 'policy' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {announcement.category}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-6">No announcements</p>
              )}
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              Recent Attendance
            </h3>
            <Link to="/attendance" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Link>
          </div>
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {attendanceHistory.length > 0 ? attendanceHistory.map((record, index) => (
              <div key={index} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  {getStatusBadge(record.status)}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>In: <span className="text-gray-700 font-medium">{record.check_in || '-'}</span></span>
                  <span>Out: <span className="text-gray-700 font-medium">{record.check_out || '-'}</span></span>
                  <span>Hours: <span className="text-gray-700 font-medium">{record.hours > 0 ? `${record.hours}h` : '-'}</span></span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-6">No attendance records</p>
            )}
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Check In</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Check Out</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendanceHistory.length > 0 ? attendanceHistory.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.check_in || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.check_out || '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.hours > 0 ? `${record.hours}h` : '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 text-center">No attendance records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
            <Zap className="h-4 w-4 md:h-5 md:w-5 text-cyan-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-4 gap-2 md:gap-4">
            <Link
              to="/my-leave"
              className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg md:rounded-xl border border-cyan-100 hover:border-cyan-300 hover:shadow-md transition-all group active:scale-95"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-cyan-700 text-center">Request Leave</span>
            </Link>
            <Link
              to="/attendance"
              className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl border border-green-100 hover:border-green-300 hover:shadow-md transition-all group active:scale-95"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-green-700 text-center">Attendance</span>
            </Link>
            <Link
              to="/profile"
              className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg md:rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group active:scale-95"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-purple-700 text-center">Profile</span>
            </Link>
            <Link
              to="/employee/announcements"
              className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg md:rounded-xl border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all group active:scale-95"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Activity className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-orange-700 text-center">News</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render HR/P&C Dashboard (original)

  // Compute department data from overview
  const departmentData = overview?.employee?.by_department
    ? overview.employee.by_department.map((dept, index) => ({
        id: `dept-${index}`,
        name: dept.department,
        value: dept.count,
        color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
      }))
    : [];

  const totalDeptEmployees = departmentData.reduce((sum, d) => sum + d.value, 0);
  const departmentDataPercent = departmentData.map(d => ({
    ...d,
    percent: totalDeptEmployees > 0 ? Math.round((d.value / totalDeptEmployees) * 100) : 0,
  }));

  // Compute attendance data from overview
  const attendanceOverview = overview?.attendance?.today;

  return (
    <div className="space-y-6">
      {/* Header Banner with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dashboard-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dashboard-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                  </h1>
                  <p className="text-blue-100 text-sm mt-1">Here's your workforce overview for today</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <Users className="h-4 w-4" />
                  {formatNumber(stats?.total_employees || 0)} Employees
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <Building2 className="h-4 w-4" />
                  {formatNumber(stats?.departments_count || 0)} Departments
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <Clock className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - White with Gradient Icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Employees */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(stats?.total_employees || 0)}</p>
          <p className="text-sm text-gray-500">Total Employees</p>
        </div>

        {/* Departments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(stats?.departments_count || 0)}</p>
          <p className="text-sm text-gray-500">Departments</p>
        </div>

        {/* New Hires */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              This Month
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(stats?.new_hires_this_month || 0)}</p>
          <p className="text-sm text-gray-500">New Hires</p>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
              Today
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{attendanceRate}%</p>
          <p className="text-sm text-gray-500">Attendance Rate</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Today's Attendance Overview</h3>
              <p className="text-xs text-gray-500 mt-1">Real-time attendance breakdown</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </div>
          {attendanceOverview ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Checked In', value: attendanceOverview.checked_in, fill: '#22c55e' },
                    { name: 'Late', value: attendanceOverview.late, fill: '#f59e0b' },
                    { name: 'On Leave', value: attendanceOverview.on_leave, fill: '#3b82f6' },
                    { name: 'Absent', value: attendanceOverview.absent, fill: '#ef4444' },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) => [`${value ?? 0} employees`, 'Count']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {[
                      { name: 'Checked In', value: attendanceOverview.checked_in, fill: '#22c55e' },
                      { name: 'Late', value: attendanceOverview.late, fill: '#f59e0b' },
                      { name: 'On Leave', value: attendanceOverview.on_leave, fill: '#3b82f6' },
                      { name: 'Absent', value: attendanceOverview.absent, fill: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Present', value: attendanceToday.present, fill: '#22c55e' },
                    { name: 'Late', value: attendanceToday.late, fill: '#f59e0b' },
                    { name: 'On Leave', value: attendanceToday.on_leave, fill: '#3b82f6' },
                    { name: 'Absent', value: attendanceToday.absent, fill: '#ef4444' },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) => [`${value ?? 0} employees`, 'Count']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {[
                      { name: 'Present', value: attendanceToday.present, fill: '#22c55e' },
                      { name: 'Late', value: attendanceToday.late, fill: '#f59e0b' },
                      { name: 'On Leave', value: attendanceToday.on_leave, fill: '#3b82f6' },
                      { name: 'Absent', value: attendanceToday.absent, fill: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Department Distribution</h3>
              <p className="text-xs text-gray-500 mt-1">Employee by department</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </div>
          {departmentDataPercent.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentDataPercent}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {departmentDataPercent.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value ?? 0} employees`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                {departmentDataPercent.map((dept) => (
                  <div key={dept.id} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
                    <span className="text-gray-600 truncate" title={dept.name}>{dept.name}</span>
                    <span className="text-gray-400 ml-auto">{dept.percent}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              <p className="text-sm">No department data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Attendance Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Today's Attendance</h3>
              <p className="text-xs text-gray-500 mt-1">Real-time attendance status</p>
            </div>
            <Link to="/attendance" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-700">Checked In</span>
              </div>
              <span className="font-bold text-green-600">{attendanceOverview?.checked_in ?? attendanceToday.present}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-gray-700">Absent</span>
              </div>
              <span className="font-bold text-red-600">{attendanceOverview?.absent ?? attendanceToday.absent}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-gray-700">Late</span>
              </div>
              <span className="font-bold text-amber-600">{attendanceOverview?.late ?? attendanceToday.late}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-gray-700">On Leave</span>
              </div>
              <span className="font-bold text-blue-600">{attendanceOverview?.on_leave ?? attendanceToday.on_leave}</span>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pending Approvals</h3>
              <p className="text-xs text-gray-500 mt-1">Requests awaiting action</p>
            </div>
            <Link to="/leave" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Leave Requests</p>
                  <p className="text-xs text-gray-500">Awaiting approval</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-600">{overview?.leave?.pending_requests ?? stats?.pending_requests?.leave ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Overtime</p>
                  <p className="text-xs text-gray-500">Awaiting approval</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats?.pending_requests?.overtime ?? 0}</span>
            </div>
            {overview?.leave?.approved_this_month !== undefined && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Approved This Month</p>
                    <p className="text-xs text-gray-500">Leave requests</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">{overview.leave.approved_this_month}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              <p className="text-xs text-gray-500 mt-1">Frequently used features</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-md">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/employees/create"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700">Add Employee</span>
            </Link>
            <Link
              to="/attendance"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-700">Attendance</span>
            </Link>
            <Link
              to="/leave"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-purple-700">Leave</span>
            </Link>
            <Link
              to="/departments"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-amber-700">Departments</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
