import {
  Users,
  Building2,
  Clock,
  Calendar,
  TrendingUp,
  UserPlus,
  UserX,
  Activity,
  ArrowRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  Calculator,
  Crown,
  Target,
  DollarSign,
  PieChart as PieChartIcon,
  Layers,
  Award,
  BarChart2,
  Star,
  Zap,
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
} from 'recharts';
import type { GroupDashboard } from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

const DEPARTMENT_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

interface Props {
  user: { employee?: { name?: string }; email?: string } | null;
  groupDashboard: GroupDashboard | null;
  greeting: () => string;
}

export function GroupCEODashboard({ user, groupDashboard, greeting }: Props) {
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
                    color: DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length],
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(groupDashboard?.department_distribution || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
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
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length] }} />
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
