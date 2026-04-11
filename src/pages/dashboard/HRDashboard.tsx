import {
  Users,
  Building2,
  Clock,
  Calendar,
  UserPlus,
  ArrowRight,
  BarChart3,
  FileText,
  CheckCircle,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
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
import type { DashboardOverview } from '@/services/dashboard.service';
import type { DashboardStats } from '@/types';
import { formatNumber } from '@/lib/utils';

const DEPARTMENT_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#ef4444'];

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

interface Props {
  user: { employee?: { name?: string }; email?: string } | null;
  stats: DashboardStats | null;
  overview: DashboardOverview | null;
  payrollSummary: PayrollSummaryData | null;
  greeting: () => string;
}

export function HRDashboard({ user, stats, overview, payrollSummary, greeting }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toString();
  };

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

  // Compute payroll data for display
  const payrollPeriod = payrollSummary?.current_period;
  const payrollChartData = payrollPeriod ? [
    { name: 'Gross Salary', value: payrollPeriod.total_gross, fill: '#3b82f6' },
    { name: 'Deductions', value: payrollPeriod.total_deductions, fill: '#ef4444' },
    { name: 'Net Salary', value: payrollPeriod.total_net, fill: '#22c55e' },
  ] : [];

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

        {/* Monthly Payroll */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
              This Month
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {payrollPeriod ? formatCompactCurrency(payrollPeriod.total_net) : '-'}
          </p>
          <p className="text-sm text-gray-500">Net Payroll</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Payroll Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Payroll Overview</h3>
              <p className="text-xs text-gray-500 mt-1">
                {payrollPeriod ? `Period: ${payrollPeriod.period} • ${payrollPeriod.total_employees} employees` : 'Current month breakdown'}
              </p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <Wallet className="h-5 w-5 text-white" />
            </div>
          </div>
          {payrollPeriod ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={payrollChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    tickFormatter={(value) => formatCompactCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) => [formatCurrency(value as number), 'Amount']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {payrollChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <Wallet className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No payroll data for current period</p>
              <p className="text-xs mt-1">Payroll data will appear once processed</p>
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
        {/* Payroll Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Payroll Summary</h3>
              <p className="text-xs text-gray-500 mt-1">{payrollPeriod?.period || 'Current period'}</p>
            </div>
            <Link to="/payroll" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-gray-700">Gross Salary</span>
              </div>
              <span className="font-bold text-blue-600 text-sm">
                {payrollPeriod ? formatCurrency(payrollPeriod.total_gross) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-gray-700">Total Deductions</span>
              </div>
              <span className="font-bold text-red-600 text-sm">
                {payrollPeriod ? formatCurrency(payrollPeriod.total_deductions) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-700">Net Salary</span>
              </div>
              <span className="font-bold text-green-600 text-sm">
                {payrollPeriod ? formatCurrency(payrollPeriod.total_net) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-sm font-medium text-gray-700">Employees</span>
              </div>
              <span className="font-bold text-purple-600">
                {payrollPeriod?.total_employees ?? '-'}
              </span>
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
