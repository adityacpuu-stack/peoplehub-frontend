import { insightTenure, insightEnum, insightNumber, insightMonth } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSection, ReportSummary } from '@/pages/dashboard/ReportingLayout';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Building2, Calendar, Download, AlertTriangle, BarChart3, PieChart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard, type TurnoverAnalytics } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

// Chart colors
const CHART_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16',
];

export function TurnoverAnalysisPage() {
  useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [analytics, setAnalytics] = useState<TurnoverAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('this_year');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedCompany]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardService.getGroupOverview();
      setData(response);
    } catch (error: any) {
      console.error('Failed to fetch turnover data:', error);
      toast.error(t("Failed to load turnover analysis"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const companyId = selectedCompany !== 'all' ? parseInt(selectedCompany) : undefined;
      const response = await dashboardService.getTurnoverAnalytics(companyId, selectedPeriod);
      setAnalytics(response);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  // Calculate metrics from analytics
  const metrics = data && analytics ? {
    totalEmployees: data.summary.total_employees,
    newHires: analytics.total_hires_period,
    terminations: analytics.total_exits_period,
    turnoverRate: data.summary.total_employees > 0
      ? ((analytics.total_exits_period / data.summary.total_employees) * 100).toFixed(1)
      : '0.0',
    retentionRate: data.summary.total_employees > 0
      ? (((data.summary.total_employees - analytics.total_exits_period) / data.summary.total_employees) * 100).toFixed(1)
      : '100.0',
    avgTenureAtExit: analytics.avg_tenure_at_exit,
  } : null;

  // Use real data from analytics
  const monthlyTurnover = analytics?.monthly_turnover || [];
  const exitReasons = analytics?.exit_reasons || [];
  const departmentTurnover = analytics?.department_turnover || [];
  const tenureAtExit = analytics?.tenure_at_exit || [];
  const recentExits = analytics?.recent_exits || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-gray-500">{t("Loading turnover analysis...")}</p>
        </div>
      </div>
    );
  }

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Turnover Analysis")}</h1><p className="text-red-100 text-sm">{t("Track employee exits and retention metrics")}</p></div>
<div className="report-header-context"><div className="flex flex-wrap items-center gap-3">
              <ReportSection><span className="text-red-100 text-xs">{t("Turnover Rate")}</span><p className="text-xl font-bold">{metrics?.turnoverRate || 0}%</p></ReportSection>
              <ReportSection><span className="text-red-100 text-xs">{t("Retention Rate")}</span><p className="text-xl font-bold">{metrics?.retentionRate || 0}%</p></ReportSection>
              <ReportSection><span className="text-red-100 text-xs">{t("Exits (MTD)")}</span><p className="text-xl font-bold">{insightNumber(metrics?.terminations || 0)}</p></ReportSection>
            </div></div>
</ReportHeader>{/* Filters */}<ReportSection><div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="this_month">{t("This Month")}</option>
              <option value="last_month">{t("Last Month")}</option>
              <option value="this_quarter">{t("This Quarter")}</option>
              <option value="this_year">{t("This Year")}</option>
              <option value="last_year">{t("Last Year")}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="all">{t("All Companies")}</option>
              {data?.companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <button disabled title={t("Belum tersedia — preview UI")} className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors">
            <Download className="h-4 w-4" />{t("Export Report")} </button>
        </div></ReportSection>{/* Quick Stats */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("New Hires")}</p>
              <div  className="report-metric-context"><p className="report-metric-value">{insightNumber(metrics?.newHires || 0)}</p><span className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +12%
                </span></div>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("Exits")}</p>
              <div  className="report-metric-context"><p className="report-metric-value">{insightNumber(metrics?.terminations || 0)}</p><span className="flex items-center text-xs text-red-600">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  -5%
                </span></div>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("Net Change")}</p>
              <p className="report-metric-value">{((metrics?.newHires || 0) - (metrics?.terminations || 0)) >= 0 ? '+' : ''}{insightNumber((metrics?.newHires || 0) - (metrics?.terminations || 0))}</p>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("Avg Tenure at Exit")}</p>
              <p className="report-metric-value">{insightNumber(metrics?.avgTenureAtExit || 0)}{' '}{t("yrs")}</p>
            </div></div></div></ReportSummary>{/* Charts Row */}<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Turnover Trend */}
        <ReportSection><div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Monthly Turnover Trend")}</h3>
              <p className="text-sm text-gray-500">{t("Hires vs exits over time")}</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>{monthlyTurnover.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">{t("No turnover data available")} </div>
          ) : (
          <>
          <div className="h-48 flex items-end justify-between gap-4">
            {monthlyTurnover.map((month) => {
              const maxValue = Math.max(...monthlyTurnover.map(m => Math.max(m.hires, m.exits)), 1);
              return (
              <div key={insightMonth(month.month)} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center gap-1 h-40">
                  <div
                    className="w-5 bg-green-500 rounded-t transition-all duration-500"
                    style={{ height: `${(month.hires / maxValue) * 100}%`, minHeight: month.hires > 0 ? '4px' : '0' }}
                    title={t('Hires: {count}', { count: insightNumber(month.hires) })}
                  />
                  <div
                    className="w-5 bg-red-500 rounded-t transition-all duration-500"
                    style={{ height: `${(month.exits / maxValue) * 100}%`, minHeight: month.exits > 0 ? '4px' : '0' }}
                    title={t('Exits: {count}', { count: insightNumber(month.exits) })}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 mt-2">{insightMonth(month.month)}</span>
              </div>
            )})}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm text-gray-600">{t("Hires")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-gray-600">{t("Exits")}</span>
            </div>
          </div>
          </>
          )}</ReportSection>

        {/* Exit Reasons */}
        <ReportSection><div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Exit Reasons")}</h3>
              <p className="text-sm text-gray-500">{t("Why employees leave")}</p>
            </div>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>{exitReasons.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">{t("No exit data available")} </div>
          ) : (
          <div className="space-y-3">
            {exitReasons.map((item, index) => (
              <div key={insightEnum(item.reason)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{insightEnum(item.reason)}</span>
                  <span className="text-sm text-gray-500">{insightNumber(item.count)} ({insightNumber(item.percentage)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          )}</ReportSection>

        {/* Department Turnover */}
        <ReportSection><div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Department Turnover")}</h3>
              <p className="text-sm text-gray-500">{t("Turnover rate by department")}</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>{departmentTurnover.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">{t("No department turnover data available")} </div>
          ) : (
          <div className="space-y-4">
            {departmentTurnover.map((dept) => {
              const maxRate = Math.max(...departmentTurnover.map(d => d.turnoverRate), 6);
              return (
              <div key={dept.name} className="flex items-center gap-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className={cn(
                      "h-full rounded-lg transition-all duration-500",
                      dept.turnoverRate >= 4 ? "bg-red-500" :
                      dept.turnoverRate >= 3 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${(dept.turnoverRate / maxRate) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm font-semibold text-gray-900">{insightNumber(dept.turnoverRate)}%</span>
                </div>
                <div className={cn(
                  "w-16 text-right text-sm font-medium",
                  dept.netChange >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {dept.netChange >= 0 ? '+' : ''}{insightNumber(dept.netChange)}
                </div>
              </div>
            )})}
          </div>
          )}</ReportSection>

        {/* Tenure at Exit */}
        <ReportSection><div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Tenure at Exit")}</h3>
              <p className="text-sm text-gray-500">{t("How long employees stay before leaving")}</p>
            </div>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>{tenureAtExit.length === 0 || tenureAtExit.every(t => t.count === 0) ? (
            <div className="flex items-center justify-center h-40 text-gray-500">{t("No tenure at exit data available")} </div>
          ) : (
          <>
          <div className="space-y-3">
            {tenureAtExit.map((item, index) => (
              <div key={insightEnum(item.range)} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-20">{insightEnum(item.range)}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  >
                    {item.count > 0 && <span className="text-xs font-medium text-white ml-2">{insightNumber(item.count)}</span>}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">{insightNumber(item.percentage)}%</span>
              </div>
            ))}
          </div>
          {(() => {
            const earlyExitPct = tenureAtExit
              .filter(t => t.range === '< 1 year' || t.range === '1-2 years')
              .reduce((sum, t) => sum + t.percentage, 0);
            return earlyExitPct > 40 ? (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">{t("Early Turnover Alert")}</p>
                  <p className="text-xs text-yellow-700">{insightNumber(earlyExitPct)}{' '}{t("% of exits occur within first 2 years. Consider improving onboarding and early career development programs.")}</p>
                </div>
              </div>
            </div>
            ) : null;
          })()}
          </>
          )}</ReportSection>
      </div>{/* Recent Exits Table */}<ReportSection  className="overflow-hidden"><div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t("Recent Exits")}</h3>
          <p className="text-sm text-gray-500">{t("Latest employee departures")}</p>
        </div>{recentExits.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">{t("No recent exits found")} </div>
        ) : (
        <div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">{t("Employee")}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">{t("Department")}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">{t("Position")}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t("Exit Date")}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t("Tenure")}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t("Reason")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentExits.map((exit, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold report-avatar">
                        {exit.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 block">{exit.name}</span>
                        <span className="text-xs text-gray-500">{exit.company}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{exit.department}</td>
                  <td className="px-6 py-4 text-gray-600">{exit.position}</td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {exit.exitDate ? new Date(exit.exitDate).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : t("N/A")}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">{insightTenure(exit.tenure)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      exit.reason === "Resignation" ? "bg-yellow-100 text-yellow-700" :
                      exit.reason === "Contract End" ? "bg-blue-100 text-blue-700" :
                      exit.reason === "Retirement" ? "bg-green-100 text-green-700" :
                      exit.reason === "Termination" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {insightEnum(exit.reason)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}</ReportSection></ReportPage>
  );
}
