import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Crown,
  Target,
  DollarSign,
  PieChart as PieChartIcon,
  Calendar,
  Award,
  Building2,
  ArrowUpRight,
  Zap,
  AlertCircle,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type GroupDashboard,
  type WorkforceAnalytics,
  type HeadcountAnalytics,
  type DashboardAlert,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

export function CEODashboardPage() {
  const { user } = useAuthStore();
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [workforceData, setWorkforceData] = useState<WorkforceAnalytics | null>(null);
  const [_headcountData, setHeadcountData] = useState<HeadcountAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userCompanyId = user?.employee?.company_id || undefined;
  const isGroupCEO = user?.roles?.includes('Group CEO') || user?.roles?.includes('Super Admin');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const companyId = isGroupCEO ? undefined : userCompanyId;
        const [group, workforce, headcount] = await Promise.all([
          dashboardService.getGroupOverview(companyId),
          dashboardService.getWorkforceAnalytics(companyId),
          dashboardService.getHeadcountAnalytics(companyId),
        ]);

        setGroupData(group);
        setWorkforceData(workforce);
        setHeadcountData(headcount);
      } catch (err: any) {
        console.error('Failed to fetch CEO dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userCompanyId, isGroupCEO]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate strategic KPIs from real data
  const summary = groupData?.summary || {
    total_companies: 0,
    total_employees: 0,
    total_departments: 0,
    avg_attendance_rate: 0,
    total_on_leave_today: 0,
    pending_approvals: 0,
    new_hires_this_month: 0,
    terminations_this_month: 0,
  };

  // Prepare headcount trend data for chart
  const headcountTrend = groupData?.headcount_trend || [];

  // Prepare workforce composition from real data
  const workforceComposition = workforceData?.employment_type_distribution || [];

  // Map alerts from real data
  const alerts = groupData?.alerts || [];

  const formatCurrency = (value: number, inBillions = false) => {
    if (inBillions) {
      return `Rp ${value.toFixed(1)}B`;
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const companyName = (user as { companies?: { name: string }[] } | null)?.companies?.map(c => c.name).join(' & ') || 'Your Companies';

  // Company overview from real data
  const companies = groupData?.companies || [];

  // Payroll summary from real data
  const payrollSummary = groupData?.payroll_summary;

  // Recent activities from real data
  const recentActivities = groupData?.recent_activities || [];

  // Department distribution from real data
  const departmentDistribution = groupData?.department_distribution || [];

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ceo-exec-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ceo-exec-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Crown className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">Executive Dashboard - {companyName}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-xl rounded-xl text-sm text-amber-300 font-medium border border-amber-500/30">
                  <Crown className="h-4 w-4" />
                  Chief Executive Officer
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                  <Calendar className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/leave-management"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10 transition-colors flex items-center gap-2"
              >
                <Zap className="h-4 w-4 text-amber-400" />
                {summary.pending_approvals} Pending
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="inline-flex items-center gap-1 text-green-600 text-sm font-semibold">
              <ArrowUpRight className="h-4 w-4" />
              +{summary.new_hires_this_month}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.total_employees)}</p>
          <p className="text-xs text-gray-500">Total Employees</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.total_companies}</p>
          <p className="text-xs text-gray-500">Companies</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            {summary.avg_attendance_rate > 0 && (
              <span className="inline-flex items-center gap-1 text-green-600 text-sm font-semibold">
                <CheckCircle className="h-4 w-4" />
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {summary.avg_attendance_rate > 0 ? `${summary.avg_attendance_rate.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Avg Attendance Rate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <Clock className="h-6 w-6 text-white" />
            </div>
            {summary.pending_approvals > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 text-sm font-semibold">
                <AlertCircle className="h-4 w-4" />
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.pending_approvals}</p>
          <p className="text-xs text-gray-500">Pending Approvals</p>
        </div>
      </div>

      {/* Headcount Trend Chart + Strategic Alerts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Headcount Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Headcount Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Monthly headcount, hires & exits</p>
            </div>
            <Link to="/ceo/headcount-analytics" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              Details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="h-72">
            {headcountTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={headcountTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="headcount" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2 }} name="Headcount" />
                  <Line type="monotone" dataKey="hires" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', strokeWidth: 2 }} name="Hires" />
                  <Line type="monotone" dataKey="exits" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', strokeWidth: 2 }} name="Exits" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No headcount data available
              </div>
            )}
          </div>
        </div>

        {/* Strategic Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Alerts</h3>
              <p className="text-xs text-gray-500 mt-1">Items requiring attention</p>
            </div>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {alerts.length > 0 ? alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                  alert.type === 'success' ? 'bg-green-50 border-green-200' :
                  alert.type === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {alert.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  ) : alert.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : alert.type === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                    {alert.action_url && (
                      <Link to={alert.action_url} className={`mt-2 text-xs font-medium inline-block ${
                        alert.type === 'warning' ? 'text-amber-700' :
                        alert.type === 'success' ? 'text-green-700' :
                        alert.type === 'error' ? 'text-red-700' :
                        'text-blue-700'
                      }`}>
                        View Details →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No alerts at this time</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Company Overview + Payroll Summary */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Company Overview Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Company Overview</h3>
              <p className="text-xs text-gray-500 mt-1">All companies performance</p>
            </div>
            <Link to="/ceo/companies" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employees</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Attendance</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">On Leave</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">New Hires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.length > 0 ? companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{company.name}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-medium text-gray-900">{company.employees}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                        {company.active_employees}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {company.attendance_enabled ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                          company.attendance_rate >= 90 ? 'bg-green-100 text-green-700' :
                          company.attendance_rate >= 75 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {company.attendance_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-600">{company.on_leave_today}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {company.new_hires_this_month > 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <ArrowUpRight className="h-4 w-4" />
                          {company.new_hires_this_month}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No company data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payroll Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Payroll Summary</h3>
              <p className="text-xs text-gray-500 mt-1">Monthly payroll overview</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </div>
          {payrollSummary ? (
            <>
              <div className="mb-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-600 font-medium mb-1">Total Monthly Payroll</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(payrollSummary.total_monthly_payroll)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg: {formatCurrency(payrollSummary.avg_salary)}/employee</p>
              </div>
              <div className="space-y-3">
                {payrollSummary.by_company.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{item.company_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900">{formatCurrency(item.total_payroll)}</span>
                      <p className="text-xs text-gray-400">{item.employee_count} emp</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No payroll data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row - Recent Activities, Department Distribution, Workforce */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
              <p className="text-xs text-gray-500 mt-1">Latest workforce changes</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
              {recentActivities.length}
            </span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'hire' ? 'bg-green-100' :
                    activity.type === 'exit' ? 'bg-red-100' :
                    activity.type === 'promotion' ? 'bg-purple-100' :
                    activity.type === 'leave' ? 'bg-amber-100' :
                    'bg-blue-100'
                  }`}>
                    {activity.type === 'hire' ? <Users className="h-4 w-4 text-green-600" /> :
                     activity.type === 'exit' ? <TrendingDown className="h-4 w-4 text-red-600" /> :
                     activity.type === 'promotion' ? <Award className="h-4 w-4 text-purple-600" /> :
                     activity.type === 'leave' ? <Calendar className="h-4 w-4 text-amber-600" /> :
                     <ArrowRight className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{activity.employee_name}</p>
                    <p className="text-xs text-gray-600">{activity.action}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.company_name}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Department Distribution</h3>
              <p className="text-xs text-gray-500 mt-1">Employees by department</p>
            </div>
            <Link to="/ceo/workforce-analytics" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {departmentDistribution.length > 0 ? departmentDistribution.map((dept, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    <span className="text-xs text-gray-500">{dept.employees} ({dept.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No department data</p>
              </div>
            )}
          </div>
        </div>

        {/* Workforce Composition */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Employment Types</h3>
              <p className="text-xs text-gray-500 mt-1">Workforce composition</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <PieChartIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          {workforceComposition.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workforceComposition}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {workforceComposition.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {workforceComposition.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.count} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No workforce data</p>
            </div>
          )}
        </div>
      </div>

      {/* Workforce Demographics */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Workforce Demographics</h3>
            <p className="text-xs text-gray-500 mt-1">Gender and age distribution</p>
          </div>
          <Link to="/ceo/workforce-analytics" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            View Analytics <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {/* Gender Distribution Chart */}
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-gray-700 mb-2">Gender</p>
            {workforceData?.gender_distribution && workforceData.gender_distribution.length > 0 ? (
              <>
                <div className="h-32 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workforceData.gender_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {workforceData.gender_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1">
                  {workforceData.gender_distribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.label}: {item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                No data
              </div>
            )}
          </div>

          {/* Key Metrics from Real Data */}
          <div className="md:col-span-3 grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-medium text-indigo-600">New Hires</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.new_hires_this_month}</p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-xs font-medium text-red-600">Terminations</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.terminations_this_month}</p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-600">On Leave Today</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.total_on_leave_today}</p>
              <p className="text-xs text-gray-500 mt-1">Across all companies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
