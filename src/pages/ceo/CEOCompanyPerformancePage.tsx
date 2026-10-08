import { insightNumber, insightFixed, insightMonth } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportSummary, ReportPage, ReportHeader, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Building2, ArrowUpRight, ArrowDownRight, AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type GroupDashboard,
  type WorkforceAnalytics,
  type HeadcountAnalytics,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

export function CEOCompanyPerformancePage() {
  useLocale();
  const { user } = useAuthStore();
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [_workforceData, setWorkforceData] = useState<WorkforceAnalytics | null>(null);
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
        console.error('Failed to fetch company performance data:', err);
        setError('Failed to load data');
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Failed to load data")}</h3>
          <p className="text-gray-600 mb-4">{t(error)}</p>
          <button onClick={() => window.location.reload()} className="ph-button ph-button-primary px-4 py-2 rounded-lg">{t("Retry")} </button>
        </div>
      </div>
    );
  }

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

  const companies = groupData?.companies || [];
  const headcountTrend = groupData?.headcount_trend || [];
  const departmentDistribution = groupData?.department_distribution || [];

  // Calculate performance metrics
  const netGrowth = summary.new_hires_this_month - summary.terminations_this_month;
  const growthRate = summary.total_employees > 0
    ? ((netGrowth / summary.total_employees) * 100).toFixed(1)
    : '0';

  // Colors for charts
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Company Performance")}</h1><p className="text-xs md:text-sm mt-1">{t("Overview of all company metrics")}</p></div>
<div className="report-header-context"><div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString(intlLocale(), { month: 'short', year: 'numeric' })}
              </span></div></div>
</ReportHeader>{/* Performance KPIs */}<ReportSummary><div className="report-metric"><div className="report-metric-context"></div><p className="report-metric-value">{insightNumber(summary.total_companies)}</p><p className="report-metric-label">{t("Total Companies")}</p></div><div className="report-metric"><div className="report-metric-context">{netGrowth !== 0 && (
              <span className={`inline-flex items-center gap-1 text-xs md:text-sm font-semibold ${netGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                {netGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {insightFixed(Number(growthRate), 1)}%
              </span>
            )}</div><p className="report-metric-value">{formatNumber(summary.total_employees)}</p><p className="report-metric-label">{t("Total Workforce")}</p></div><div className="report-metric"><div className="report-metric-context">{summary.avg_attendance_rate >= 90 && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}</div><p className="report-metric-value">{summary.avg_attendance_rate > 0 ? `${insightFixed(summary.avg_attendance_rate, 1)}%` : t("N/A")}</p><p className="report-metric-label">{t("Avg Attendance")}</p></div><div className="report-metric"><div className="report-metric-context"></div><p className="report-metric-value">{insightNumber(summary.total_departments)}</p><p className="report-metric-label">{t("Departments")}</p></div></ReportSummary>{/* Charts Row */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Headcount Trend */}
        <ReportSection><div className="flex items-start justify-between mb-4 md:mb-6">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Headcount Trend")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Monthly workforce changes")}</p>
            </div>
          </div><div className="h-56 md:h-72">
            {headcountTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={headcountTrend.map(item => ({ ...item, month: insightMonth(item.month) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>

                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tickFormatter={insightNumber} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area name={t('Headcount')} type="monotone" dataKey="headcount" stroke="#6366f1" strokeWidth={3} fill="#187451" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No headcount data available")} </div>
            )}
          </div></ReportSection>

        {/* Department Distribution */}
        <ReportSection><div className="flex items-start justify-between mb-4 md:mb-6">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Department Distribution")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Workforce by department")}</p>
            </div>
          </div><div className="h-56 md:h-72">
            {departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentDistribution.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="employees"
                    nameKey="name"
                  >
                    {departmentDistribution.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => t('{count} employees', { count: insightNumber(Number(value)) })} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No department data available")} </div>
            )}
          </div></ReportSection>
      </div>{/* Company Performance Table */}<ReportSection  className="overflow-hidden"><section  className="report-inline-note"><h3 className="text-base md:text-lg font-bold text-gray-900">{t("Company Performance")}</h3><p className="text-xs text-gray-500 mt-1">{t("Individual company metrics")}</p></section><div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500">{t("Company")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500">{t("Employees")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">{t("Active")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500">{t("Attendance")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">{t("On Leave")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">{t("New Hires")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.length > 0 ? companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center report-avatar">
                        <Building2 className="h-4 w-4 text-[#65716b]" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{company.name}</p>
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center">
                    <span className="font-medium text-gray-900">{insightNumber(company.employees)}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                      {insightNumber(company.active_employees)}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center">
                    {company.attendance_enabled ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                        company.attendance_rate >= 90 ? "bg-green-100 text-green-700" :
                        company.attendance_rate >= 75 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {insightFixed(company.attendance_rate, 1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">{t("N/A")}</span>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden sm:table-cell">
                    <span className="text-gray-600">{insightNumber(company.on_leave_today)}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden md:table-cell">
                    {company.new_hires_this_month > 0 ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <ArrowUpRight className="h-4 w-4" />
                        {insightNumber(company.new_hires_this_month)}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t("No company data available")} </td>
                </tr>
              )}
            </tbody>
          </table></div></ReportSection>{/* Hires vs Exits */}<ReportSection><div className="flex items-start justify-between mb-4 md:mb-6">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Hires vs Exits")}</h3>
            <p className="text-xs text-gray-500 mt-1">{t("Monthly workforce changes")}</p>
          </div>
        </div><div className="h-56 md:h-72">
          {headcountTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountTrend.map(item => ({ ...item, month: insightMonth(item.month) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tickFormatter={insightNumber} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="hires" fill="#10b981" name={t("Hires")} radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits" fill="#ef4444" name={t("Exits")} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">{t("No data available")} </div>
          )}
        </div></ReportSection></ReportPage>
  );
}
