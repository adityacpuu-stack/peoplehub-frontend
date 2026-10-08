import { insightPercent, insightNumber, insightFixed, insightMonth } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Building2, ArrowUpRight, ArrowDownRight, AlertCircle, Calendar } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type HeadcountAnalytics,
  type GroupDashboard,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

export function CEOHeadcountReportPage() {
  useLocale();
  const { user } = useAuthStore();
  const [headcountData, setHeadcountData] = useState<HeadcountAnalytics | null>(null);
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
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
        const [headcount, group] = await Promise.all([
          dashboardService.getHeadcountAnalytics(companyId),
          dashboardService.getGroupOverview(),
        ]);

        setHeadcountData(headcount);
        setGroupData(group);
      } catch (err: any) {
        console.error('Failed to fetch headcount data:', err);
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

  const headcountTrend = headcountData?.headcount_trend || [];
  const quarterlyComparison = headcountData?.quarterly_comparison || [];
  const headcountByCompany = headcountData?.headcount_by_company || [];
  const departmentHeadcount = headcountData?.department_headcount || [];
  const headcountForecast = headcountData?.headcount_forecast || [];
  const currentHeadcount = headcountData?.current_headcount || groupData?.summary?.total_employees || 0;
  const yearEndTarget = headcountData?.year_end_target || 0;

  const summary = groupData?.summary || {
    new_hires_this_month: 0,
    terminations_this_month: 0,
    total_companies: 0,
  };

  const netGrowth = summary.new_hires_this_month - summary.terminations_this_month;

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Headcount Report")}</h1><p className="text-xs md:text-sm mt-1">{t("Workforce size & trends")}</p></div>
<div className="report-header-context"><div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString(intlLocale(), { month: 'short', year: 'numeric' })}
              </span></div></div>
</ReportHeader>{/* KPIs */}<ReportSummary><div className="report-metric"><div  className="report-metric-context">{netGrowth !== 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${netGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                {netGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {insightNumber(Math.abs(netGrowth))}
              </span>
            )}</div><p className="report-metric-value">{formatNumber(currentHeadcount)}</p><p className="report-metric-label">{t("Current Headcount")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">+{insightNumber(summary.new_hires_this_month)}</p><p className="report-metric-label">{t("New Hires (This Month)")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">-{insightNumber(summary.terminations_this_month)}</p><p className="report-metric-label">{t("Exits (This Month)")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatNumber(yearEndTarget || currentHeadcount)}</p><p className="report-metric-label">{t("Year-End Target")}</p></div></ReportSummary>{/* Charts Row */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Headcount Trend */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Headcount Trend")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Monthly headcount over time")}</p>
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
                  <Area type="monotone" dataKey="headcount" stroke="#6366f1" strokeWidth={3} fill="#187451" fillOpacity={0.12} name={t("Headcount")} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No headcount trend data available")} </div>
            )}
          </div></ReportSection>

        {/* Hires vs Exits */}
        <ReportSection><div className="flex items-start justify-between mb-4">
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
          </div></ReportSection>
      </div>{/* Headcount by Company */}<ReportSection  className="overflow-hidden"><section  className="report-inline-note"><h3 className="text-base md:text-lg font-bold text-gray-900">{t("Headcount by Company")}</h3><p className="text-xs text-gray-500 mt-1">{t("Distribution across companies")}</p></section><div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500">{t("Company")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500">{t("Headcount")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">{t("Growth")}</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">{t("New Hires")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {headcountByCompany.length > 0 ? headcountByCompany.map((company, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center report-avatar">
                        <Building2 className="h-4 w-4 text-[#65716b]" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{company.name}</p>
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center">
                    <span className="font-bold text-gray-900">{insightNumber(company.headcount)}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                      company.growth.startsWith("+") ? "bg-green-100 text-green-700" :
                      company.growth.startsWith("-") ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {insightPercent(company.growth)}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden md:table-cell">
                    <span className="text-green-600 font-medium">+{insightNumber(company.hires)}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">{t("No company headcount data available")} </td>
                </tr>
              )}
            </tbody>
          </table></div></ReportSection>{/* Department Distribution */}{departmentHeadcount.length > 0 && (
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Department Distribution")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Headcount by department")}</p>
            </div>
          </div><div className="space-y-3">
            {departmentHeadcount.slice(0, 8).map((dept, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    <span className="text-xs text-gray-500">{insightNumber(dept.employees)} ({insightFixed(dept.percentage, 1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all bg-[#187451]"
                      style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div></ReportSection>
      )}</ReportPage>
  );
}
