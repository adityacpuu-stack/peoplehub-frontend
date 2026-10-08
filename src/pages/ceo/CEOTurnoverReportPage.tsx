import { insightTenure, insightEnum, insightNumber, insightFixed, insightMonth, insightDate } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { UserMinus, AlertCircle, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type TurnoverAnalytics,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';

export function CEOTurnoverReportPage() {
  useLocale();
  const { user } = useAuthStore();
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
        const turnover = await dashboardService.getTurnoverAnalytics(companyId);
        setTurnoverData(turnover);
      } catch (err: any) {
        console.error('Failed to fetch turnover data:', err);
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

  const monthlyTurnover = turnoverData?.monthly_turnover || [];
  const exitReasons = turnoverData?.exit_reasons || [];
  const departmentTurnover = turnoverData?.department_turnover || [];
  const _tenureAtExit = turnoverData?.tenure_at_exit || [];
  const recentExits = turnoverData?.recent_exits || [];
  const avgTenureAtExit = turnoverData?.avg_tenure_at_exit || 0;
  const totalExits = turnoverData?.total_exits_period || 0;
  const totalHires = turnoverData?.total_hires_period || 0;

  // Calculate average turnover rate
  const avgTurnoverRate = monthlyTurnover.length > 0
    ? (monthlyTurnover.reduce((sum, m) => sum + m.rate, 0) / monthlyTurnover.length).toFixed(1)
    : '0';

  // Colors for pie chart
  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ec4899'];

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Turnover Analysis")}</h1><p className="text-xs md:text-sm mt-1">{t("Employee exit trends & insights")}</p></div>
<div className="report-header-context"><div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />{t("Last 12 Months")} </span></div></div>
</ReportHeader>{/* KPIs */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightFixed(Number(avgTurnoverRate), 1)}%</p><p className="report-metric-label">{t("Avg Turnover Rate")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(totalExits)}</p><p className="report-metric-label">{t("Total Exits (Period)")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(totalHires)}</p><p className="report-metric-label">{t("Total Hires (Period)")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightFixed(avgTenureAtExit, 1)}</p><p className="report-metric-label">{t("Avg Tenure at Exit (Years)")}</p></div></ReportSummary>{/* Charts Row */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Turnover Trend */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Turnover Trend")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Monthly turnover rate")}</p>
            </div>
          </div><div className="h-56 md:h-72">
            {monthlyTurnover.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTurnover.map(item => ({ ...item, month: insightMonth(item.month) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number | undefined) => {
                      if (value === undefined) return '';
                      return `${value}%`;
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2 }} name={t("Turnover Rate")} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No turnover trend data available")} </div>
            )}
          </div></ReportSection>

        {/* Exit Reasons */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Exit Reasons")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Why employees leave")}</p>
            </div>
          </div>{exitReasons.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie nameKey="reason"
                      data={exitReasons.map(item => ({ ...item, reason: insightEnum(item.reason) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {exitReasons.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {exitReasons.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs md:text-sm font-medium text-gray-700">{insightEnum(item.reason)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs md:text-sm font-bold text-gray-900">{insightNumber(item.count)}</span>
                      <span className="text-xs text-gray-500 ml-1">({insightNumber(item.percentage)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">{t("No exit reason data available")} </div>
          )}</ReportSection>
      </div>{/* Department Turnover */}<ReportSection  className="overflow-hidden"><section  className="report-inline-note"><h3 className="text-base md:text-lg font-bold text-gray-900">{t("Turnover by Department")}</h3><p className="text-xs text-gray-500 mt-1">{t("Department-level turnover analysis")}</p></section><div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500">{t("Department")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500">{t("Turnover Rate")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">{t("Exits")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">{t("Hires")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">{t("Net Change")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departmentTurnover.length > 0 ? departmentTurnover.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-4">
                    <p className="font-semibold text-gray-900 text-sm">{dept.name}</p>
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
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t("No department turnover data available")} </td>
                </tr>
              )}
            </tbody>
          </table></div></ReportSection>{/* Recent Exits */}{recentExits.length > 0 && (
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Recent Exits")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Latest employee departures")}</p>
            </div>
          </div><div className="space-y-3">
            {recentExits.slice(0, 5).map((exit, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <UserMinus className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{exit.name}</p>
                  <p className="text-xs text-gray-500">{exit.position} • {exit.department}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-gray-700">{insightEnum(exit.reason)}</p>
                  <p className="text-xs text-gray-400">{insightDate(exit.exitDate)} • {insightTenure(exit.tenure)}</p>
                </div>
              </div>
            ))}
          </div></ReportSection>
      )}</ReportPage>
  );
}
