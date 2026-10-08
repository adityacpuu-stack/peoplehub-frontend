import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Building2, AlertCircle, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type GroupDashboard,
  type TurnoverAnalytics,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

export function CEODepartmentReportPage() {
  useLocale();
  const { user } = useAuthStore();
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [turnoverData, setTurnoverData] = useState<TurnoverAnalytics | null>(null);
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
        const [group, turnover] = await Promise.all([
          dashboardService.getGroupOverview(companyId),
          dashboardService.getTurnoverAnalytics(companyId),
        ]);

        setGroupData(group);
        setTurnoverData(turnover);
      } catch (err: any) {
        console.error('Failed to fetch department data:', err);
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

  const departmentDistribution = groupData?.department_distribution || [];
  const departmentTurnover = turnoverData?.department_turnover || [];
  const summary = groupData?.summary || {
    total_departments: 0,
    total_employees: 0,
    avg_attendance_rate: 0,
  };

  // Find largest department
  const largestDept = departmentDistribution.length > 0
    ? departmentDistribution.reduce((a, b) => a.employees > b.employees ? a : b)
    : null;

  // Average headcount per department
  const avgHeadcount = summary.total_departments > 0
    ? Math.round(summary.total_employees / summary.total_departments)
    : 0;

  // Colors
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#14b8a6'];

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Department Performance")}</h1><p className="text-xs md:text-sm mt-1">{t("Departmental insights & metrics")}</p></div>
<div className="report-header-context"><div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString(intlLocale(), { month: 'short', year: 'numeric' })}
              </span></div></div>
</ReportHeader>{/* KPIs */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(summary.total_departments)}</p><p className="report-metric-label">{t("Total Departments")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(avgHeadcount)}</p><p className="report-metric-label">{t("Avg Headcount/Dept")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{summary.avg_attendance_rate > 0 ? `${insightFixed(summary.avg_attendance_rate, 1)}%` : t("N/A")}</p><p className="report-metric-label">{t("Avg Attendance")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{largestDept?.name || t('N/A')}</p><p className="report-metric-label">{t("Largest Department")}</p></div></ReportSummary>{/* Charts Row */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Department Size Distribution */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Department Size")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Employees by department")}</p>
            </div>
          </div><div className="h-56 md:h-72">
            {departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentDistribution.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis tickFormatter={insightNumber} type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    width={60}
                  />
                  <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="employees" fill="#6366f1" radius={[0, 4, 4, 0]} name={t("Employees")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No department data available")} </div>
            )}
          </div></ReportSection>

        {/* Department Distribution Pie */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Workforce Distribution")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("By department percentage")}</p>
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
      </div>{/* Department Turnover */}{departmentTurnover.length > 0 && (
        <ReportSection  className="overflow-hidden"><section  className="report-inline-note"><h3 className="text-base md:text-lg font-bold text-gray-900">{t("Department Turnover")}</h3><p className="text-xs text-gray-500 mt-1">{t("Turnover rate by department")}</p></section><div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500">{t("Department")}</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500">{t("Turnover")}</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">{t("Exits")}</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">{t("Hires")}</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">{t("Net")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departmentTurnover.map((dept, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                        >
                          <Building2 className="h-4 w-4" style={{ color: COLORS[index % COLORS.length] }} />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{dept.name}</p>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                        dept.turnoverRate <= 5 ? "bg-green-100 text-green-700" :
                        dept.turnoverRate <= 10 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {insightFixed(dept.turnoverRate, 1)}%
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center hidden sm:table-cell">
                      <span className="text-red-600 font-medium">-{insightNumber(dept.exits)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center hidden md:table-cell">
                      <span className="text-green-600 font-medium">+{insightNumber(dept.hires)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center hidden lg:table-cell">
                      <span className={`font-bold ${dept.netChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {dept.netChange >= 0 ? '+' : ''}{insightNumber(dept.netChange)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div></ReportSection>
      )}{/* Department List */}<ReportSection><div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900">{t("All Departments")}</h3>
            <p className="text-xs text-gray-500 mt-1">{t("Size distribution")}</p>
          </div>
        </div><div className="space-y-3">
          {departmentDistribution.map((dept, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${COLORS[index % COLORS.length]}15` }}
              >
                <Building2 className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                  <span className="text-xs text-gray-500">{insightNumber(dept.employees)}{' '}{t("employees (")}{' '}{insightFixed(dept.percentage, 1)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(dept.percentage, 100)}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div></ReportSection></ReportPage>
  );
}
