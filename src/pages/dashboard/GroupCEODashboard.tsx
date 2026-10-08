import { t, useLocale, intlLocale } from '@/i18n';
import { ReportSummary, ReportPage, ReportHeader, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { Users, Building2, Clock, Calendar, TrendingUp, UserPlus, UserX, Activity, ArrowRight, CheckCircle, AlertTriangle, Crown, Target, DollarSign, PieChart as PieChartIcon, Layers, Award, BarChart2, Star, Zap } from 'lucide-react';
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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (value: string) => {
  const month = MONTHS.indexOf(value);
  return month < 0 ? value : new Intl.DateTimeFormat(intlLocale(), { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month, 1)));
};

interface Props {
  user: { employee?: { name?: string }; email?: string } | null;
  groupDashboard: GroupDashboard | null;
  greeting: () => string;
}

export function GroupCEODashboard({ user, groupDashboard, greeting }: Props) {
  useLocale();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
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
  // null = payroll totals withheld (no payroll.view) or not loaded: show unavailable, never a zero total.
  const payrollData = groupDashboard?.payroll_summary ?? null;
  const recentActivitiesData = groupDashboard?.recent_activities || [];
  const alertsData = groupDashboard?.alerts || [];

  return (
    <ReportPage>{/* Header Banner - Executive Gold Theme */}<ReportHeader>
<div className="report-heading"><h1 className="text-2xl md:text-3xl font-bold">
                    {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                  </h1><p className="text-sm mt-1">{t("Executive Dashboard - Group Overview")}</p></div>
<div className="report-header-context"><div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
                  <Crown className="h-4 w-4 text-yellow-300" />{t("Group CEO")} </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
                  <Building2 className="h-4 w-4" />
                  {(summary.total_companies).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}{' '}{t("Companies")} </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
                  <Users className="h-4 w-4" />
                  {formatNumber(summary.total_employees)}{' '}{t("Employees")} </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
                  <Clock className="h-4 w-4" />
                  {new Date().toLocaleDateString(intlLocale(), { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div></div>
</ReportHeader>{/* Key Metrics Cards */}<ReportSummary><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-gray-500">{t("TOTAL")}</span></div><p className="report-metric-value">{(summary.total_companies).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</p><p className="report-metric-label">{t("Companies")}</p></div><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-gray-500">{t("GROUP")}</span></div><p className="report-metric-value">{formatNumber(summary.total_employees)}</p><p className="report-metric-label">{t("Total Employees")}</p></div><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-green-600">{t("AVG")}</span></div><p className="report-metric-value">{(summary.avg_attendance_rate).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}%</p><p className="report-metric-label">{t("Attendance Rate")}</p></div><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-green-600">{t("NEW")}</span></div><p className="report-metric-value">{(summary.new_hires_this_month).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</p><p className="report-metric-label">{t("Hires This Month")}</p></div></ReportSummary>{/* Second Row - Financial & HR Metrics */}<ReportSummary><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-gray-500">{t("MONTHLY")}</span></div><p className="report-metric-value">{payrollData ? formatCurrency(payrollData.total_monthly_payroll) : t("Unavailable")}</p><p className="report-metric-label">{t("Total Payroll")}</p></div><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-gray-500">{t("AVG")}</span></div><p className="report-metric-value">{payrollData ? formatCurrency(payrollData.avg_salary) : t("Unavailable")}</p><p className="report-metric-label">{t("Avg Salary")}</p></div><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-amber-600">{t("PENDING")}</span></div><p className="report-metric-value">{(summary.pending_approvals).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</p><p className="report-metric-label">{t("Approvals")}</p></div><div className="report-metric"><div className="report-metric-context"><span className="text-xs font-semibold text-teal-600">{t("TODAY")}</span></div><p className="report-metric-value">{(summary.total_on_leave_today).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</p><p className="report-metric-label">{t("On Leave")}</p></div></ReportSummary>{/* Charts Row */}<div className="grid lg:grid-cols-3 gap-6">
        {/* Headcount Trend */}
        <ReportSection  className="lg:col-span-2"><div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t("Group Headcount Trend")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("6-month employee movement overview")}</p>
            </div>
            <div className="w-10 h-10 rounded-md flex items-center justify-center report-avatar">
              <BarChart2 className="h-5 w-5 text-[#65716b]" />
            </div>
          </div><div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={headcountTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>

                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tickFormatter={value => Number(value).toLocaleString(intlLocale())} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  labelFormatter={label => monthLabel(String(label))}
                  formatter={value => typeof value === 'number' ? value.toLocaleString(intlLocale(), { maximumFractionDigits: 20 }) : value}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Area type="monotone" dataKey="headcount" stroke="#f59e0b" strokeWidth={2} fill="#187451" fillOpacity={0.12} name={t("Headcount")} />
              </AreaChart>
            </ResponsiveContainer>
          </div><div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600">{t("New Hires:")} {(headcountTrendData.reduce((sum, d) => sum + d.hires, 0)).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">{t("Exits:")} {(headcountTrendData.reduce((sum, d) => sum + d.exits, 0)).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</span>
            </div>
          </div></ReportSection>

        {/* Department Distribution */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t("Workforce Distribution")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("By department")}</p>
            </div>
            <div className="w-10 h-10 rounded-md flex items-center justify-center report-avatar">
              <PieChartIcon className="h-5 w-5 text-[#65716b]" />
            </div>
          </div><div className="h-40">
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
                <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString(intlLocale(), { maximumFractionDigits: 20 }) : value} />
              </PieChart>
            </ResponsiveContainer>
          </div><div className="space-y-2 mt-2">
            {(groupDashboard?.department_distribution || []).slice(0, 5).map((dept, index) => (
              <div key={dept.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length] }} />
                  <span className="text-gray-600">{dept.name}</span>
                </div>
                <span className="text-gray-500">{(dept.employees).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</span>
              </div>
            ))}
          </div></ReportSection>
      </div>{/* Company Performance Table */}<ReportSection  className="overflow-hidden"><section  className="report-inline-note"><div>
            <h3 className="text-lg font-bold text-gray-900">{t("Company Performance Overview")}</h3>
            <p className="text-xs text-gray-500 mt-1">{t("Key metrics across all subsidiaries")}</p>
          </div><Link to="/companies" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">{t("View All")} <ArrowRight className="h-4 w-4" />
          </Link></section><div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">{t("Company")}</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500">{t("Employees")}</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500">{t("Attendance")}</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500">{t("On Leave")}</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500">{t("New Hires")}</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500">{t("Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companiesData.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm report-avatar">
                        {company.name.split(' ')[1]?.[0] || company.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{company.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-gray-900">{(company.employees).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {company.attendance_rate < 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">{t("N/A")} </span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        company.attendance_rate >= 93 ? "bg-green-100 text-green-700" :
                        company.attendance_rate >= 90 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {(company.attendance_rate).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}%
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                      {(company.on_leave_today).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}{' '}{t("on leave")} </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                      <TrendingUp className="h-3 w-3" />
                      +{(company.new_hires_this_month).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {company.attendance_rate < 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                        <Clock className="h-3 w-3" />{t("No Attendance")} </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        company.attendance_rate >= 93 ? "bg-green-100 text-green-700" :
                        company.attendance_rate < 90 ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {company.attendance_rate >= 93 ? (
                          <><CheckCircle className="h-3 w-3" />{t("Excellent")}</>
                        ) : company.attendance_rate < 90 ? (
                          <><AlertTriangle className="h-3 w-3" />{t("Needs Attention")}</>
                        ) : (
                          <><Clock className="h-3 w-3" />{t("Good")}</>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div></ReportSection>{/* Bottom Row */}<div className="grid lg:grid-cols-3 gap-6">
        {/* Alerts & Notifications */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t("Alerts")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Items requiring attention")}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              {(alertsData.length).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}
            </span>
          </div><div className="space-y-3">
            {alertsData.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">{t("No alerts at this time")}</div>
            ) : alertsData.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border ${
                  alert.type === "error" ? "bg-red-50 border-red-100" :
                  alert.type === "warning" ? "bg-amber-50 border-amber-100" :
                  alert.type === "success" ? "bg-green-50 border-green-100" :
                  "bg-blue-50 border-blue-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.type === "error" ? "bg-red-100" :
                    alert.type === "warning" ? "bg-amber-100" :
                    alert.type === "success" ? "bg-green-100" :
                    "bg-blue-100"
                  }`}>
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.type === "error" ? "text-red-600" :
                      alert.type === "warning" ? "text-amber-600" :
                      alert.type === "success" ? "text-green-600" :
                      "text-blue-600"
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
          </div></ReportSection>

        {/* Recent Activities */}
        <ReportSection  className="lg:col-span-2"><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t("Recent Activities")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Latest updates across all companies")}</p>
            </div>
            <div className="w-10 h-10 rounded-md flex items-center justify-center report-avatar">
              <Activity className="h-5 w-5 text-[#65716b]" />
            </div>
          </div><div className="space-y-3">
            {recentActivitiesData.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">{t("No recent activities")}</div>
            ) : recentActivitiesData.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-md bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activity.type === "hire" ? "bg-green-100" :
                    activity.type === "exit" ? "bg-red-100" :
                    activity.type === "promotion" ? "bg-purple-100" :
                    activity.type === "leave" ? "bg-blue-100" :
                    "bg-amber-100"
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
                <span className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleDateString(intlLocale())}</span>
              </div>
            ))}
          </div></ReportSection>
      </div>{/* Quick Actions */}<ReportSection><h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-600" />{t("Quick Actions")} </h3><div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            to="/companies"
            className="flex flex-col items-center gap-3 p-4 rounded-md border border-amber-100 hover:border-amber-300 transition-all group bg-[#f5f6f7] text-[#24302b]"
          >
            <div className="w-12 h-12 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform report-avatar">
              <Building2 className="h-6 w-6 text-[#65716b]" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-amber-700">{t("Companies")}</span>
          </Link>
          <Link
            to="/employees"
            className="flex flex-col items-center gap-3 p-4 rounded-md border border-blue-100 hover:border-blue-300 transition-all group bg-[#f5f6f7] text-[#24302b]"
          >
            <div className="w-12 h-12 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform report-avatar">
              <Users className="h-6 w-6 text-[#65716b]" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700">{t("Employees")}</span>
          </Link>
          <Link
            to="/org-chart"
            className="flex flex-col items-center gap-3 p-4 rounded-md border border-purple-100 hover:border-purple-300 transition-all group bg-[#f5f6f7] text-[#24302b]"
          >
            <div className="w-12 h-12 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform report-avatar">
              <Layers className="h-6 w-6 text-[#65716b]" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-purple-700">{t("Org Chart")}</span>
          </Link>
          <Link
            to="/payroll"
            className="flex flex-col items-center gap-3 p-4 rounded-md border border-green-100 hover:border-green-300 transition-all group bg-[#f5f6f7] text-[#24302b]"
          >
            <div className="w-12 h-12 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform report-avatar">
              <DollarSign className="h-6 w-6 text-[#65716b]" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-green-700">{t("Payroll")}</span>
          </Link>
          <Link
            to="/performance"
            className="flex flex-col items-center gap-3 p-4 rounded-md border border-rose-100 hover:border-rose-300 transition-all group bg-[#f5f6f7] text-[#24302b]"
          >
            <div className="w-12 h-12 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform report-avatar">
              <Target className="h-6 w-6 text-[#65716b]" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-rose-700">{t("Performance")}</span>
          </Link>
        </div></ReportSection></ReportPage>
  );
}
