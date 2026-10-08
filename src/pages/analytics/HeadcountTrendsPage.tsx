import { insightPercent, insightNumber, insightFixed, insightMonth } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSection, ReportSummary } from '@/pages/dashboard/ReportingLayout';
import { useState, useEffect } from 'react';
import { TrendingUp, Building2, Calendar, Download, BarChart3, Target, ArrowUpRight, ArrowDownRight, Loader2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard, type HeadcountAnalytics } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

// Chart colors
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function HeadcountTrendsPage() {
  useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [analytics, setAnalytics] = useState<HeadcountAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('12_months');
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
      console.error('Failed to fetch headcount data:', error);
      toast.error(t("Failed to load headcount trends"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const companyId = selectedCompany !== 'all' ? parseInt(selectedCompany) : undefined;
      const response = await dashboardService.getHeadcountAnalytics(companyId, selectedPeriod);
      setAnalytics(response);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  // Use real data from analytics
  const headcountTrend = analytics?.headcount_trend || [];
  const quarterlyComparison = analytics?.quarterly_comparison || [];
  const headcountByCompany = analytics?.headcount_by_company || [];
  const departmentHeadcount = analytics?.department_headcount || [];
  const headcountForecast = analytics?.headcount_forecast || [];
  const yearEndTarget = analytics?.year_end_target || 0;

  // Calculate metrics
  const currentHeadcount = analytics?.current_headcount || data?.summary?.total_employees || 0;
  const previousHeadcount = headcountTrend[0]?.headcount || currentHeadcount;
  const headcountGrowth = previousHeadcount > 0
    ? (((currentHeadcount - previousHeadcount) / previousHeadcount) * 100).toFixed(1)
    : '0.0';
  const totalHires = headcountTrend.reduce((sum, m) => sum + m.hires, 0);
  const totalExits = headcountTrend.reduce((sum, m) => sum + m.exits, 0);
  const netGrowth = totalHires - totalExits;

  // Find max value for chart scaling
  const maxHeadcount = Math.max(...headcountTrend.map(h => h.headcount), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500">{t("Loading headcount trends...")}</p>
        </div>
      </div>
    );
  }

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Headcount Trends")}</h1><p className="text-sm">{t("Track workforce growth and projections")}</p></div>
<div className="report-header-context"><div className="flex flex-wrap items-center gap-3">
              <ReportSection><span className="text-xs">{t("Current")}</span><p className="text-xl font-bold">{insightNumber(currentHeadcount)}</p></ReportSection>
              <ReportSection><span className="text-xs">{t("Growth")}</span><p className="text-xl font-bold flex items-center">
                  {parseFloat(headcountGrowth) >= 0 ? '+' : ''}{insightFixed(Number(headcountGrowth), 1)}%
                  {parseFloat(headcountGrowth) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 ml-1" />
                  )}
                </p></ReportSection>
              <ReportSection><span className="text-xs">{t("Net Change")}</span><p className="text-xl font-bold">{netGrowth >= 0 ? '+' : ''}{insightNumber(netGrowth)}</p></ReportSection>
            </div></div>
</ReportHeader>{/* Filters */}<ReportSection><div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="6_months">{t("Last 6 Months")}</option>
              <option value="12_months">{t("Last 12 Months")}</option>
              <option value="2_years">{t("Last 2 Years")}</option>
              <option value="all_time">{t("All Time")}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">{t("All Companies")}</option>
              {data?.companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <button disabled title={t("Belum tersedia — preview UI")} className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors">
            <Download className="h-4 w-4" />{t("Export Report")} </button>
        </div></ReportSection>{/* Quick Stats */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("Total Headcount")}</p>
              <p className="report-metric-value">{insightNumber(currentHeadcount)}</p>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("Total Hires")}</p>
              <p className="report-metric-value">{insightNumber(totalHires)}</p>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("Total Exits")}</p>
              <p className="report-metric-value">{insightNumber(totalExits)}</p>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-label">{t("Year End Target")}</p>
              <p className="report-metric-value">{insightNumber(yearEndTarget || currentHeadcount)}</p>
            </div></div></div></ReportSummary>{/* Main Chart */}<ReportSection><div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t("Headcount Over Time")}</h3>
            <p className="text-sm text-gray-500">{t("Monthly workforce size with hires and exits")}</p>
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>{headcountTrend.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">{t("No headcount trend data available")} </div>
        ) : (
        <>
        {/* Line Chart Representation */}
        <div className="relative h-64">
          {/* Y-axis */}
          <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-400">
            <span>{insightNumber(maxHeadcount)}</span>
            <span>{insightNumber(Math.round(maxHeadcount * 0.75))}</span>
            <span>{insightNumber(Math.round(maxHeadcount * 0.5))}</span>
            <span>{insightNumber(Math.round(maxHeadcount * 0.25))}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-14 h-full flex items-end">
            <svg className="w-full h-56" viewBox={`0 0 ${headcountTrend.length * 60} 200`} preserveAspectRatio="none">
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={200 - ratio * 200}
                  x2={headcountTrend.length * 60}
                  y2={200 - ratio * 200}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
              ))}

              {/* Area fill */}
              <path
                d={`M 0 200 ${headcountTrend.map((point, i) =>
                  `L ${i * 60 + 30} ${200 - (point.headcount / maxHeadcount) * 180}`
                ).join(' ')} L ${(headcountTrend.length - 1) * 60 + 30} 200 Z`}
                fill="#187451" fillOpacity={0.12}
                opacity="0.2"
              />

              {/* Line */}
              <path
                d={`M ${30} ${200 - (headcountTrend[0].headcount / maxHeadcount) * 180} ${headcountTrend.slice(1).map((point, i) =>
                  `L ${(i + 1) * 60 + 30} ${200 - (point.headcount / maxHeadcount) * 180}`
                ).join(' ')}`}
                stroke="#6366F1"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots */}
              {headcountTrend.map((point, i) => (
                <circle
                  key={i}
                  cx={i * 60 + 30}
                  cy={200 - (point.headcount / maxHeadcount) * 180}
                  r="5"
                  fill="#6366F1"
                  stroke="white"
                  strokeWidth="2"
                />
              ))}


            </svg>
          </div>

          {/* X-axis labels */}
          <div className="ml-14 flex justify-between mt-2">
            {headcountTrend.map((point) => (
              <span key={insightMonth(point.month)} className="text-xs text-gray-500 w-12 text-center">
                {insightMonth(point.month)}
              </span>
            ))}
          </div>
        </div>

        {/* Legend and summary */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full" />
              <span className="text-sm text-gray-600">{t("Headcount")}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{t("Start:")} <span className="font-semibold text-gray-700">{insightNumber(previousHeadcount)}</span></span>
            <span className="text-gray-500">{t("Current:")} <span className="font-semibold text-gray-700">{insightNumber(currentHeadcount)}</span></span>
            <span className={cn(
              "font-semibold",
              parseFloat(headcountGrowth) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {parseFloat(headcountGrowth) >= 0 ? '+' : ''}{insightFixed(Number(headcountGrowth), 1)}%
            </span>
          </div>
        </div>
        </>
        )}</ReportSection>{/* Two Column Layout */}<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <ReportSection><div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Department Distribution")}</h3>
              <p className="text-sm text-gray-500">{t("Headcount by department")}</p>
            </div>
            <Briefcase className="h-5 w-5 text-gray-400" />
          </div>{departmentHeadcount.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">{t("No department data available")} </div>
          ) : (
          <div className="space-y-3">
            {departmentHeadcount.map((dept, index) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                  <span className="text-sm text-gray-500">{insightNumber(dept.employees)} ({insightNumber(dept.percentage)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${dept.percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          )}</ReportSection>

        {/* Quarterly Comparison */}
        <ReportSection><div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Quarterly Comparison")}</h3>
              <p className="text-sm text-gray-500">{t("Quarter-over-quarter growth")}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>{quarterlyComparison.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">{t("No quarterly data available")} </div>
          ) : (
          <div className="space-y-4">
            {(() => {
              const maxQ = Math.max(...quarterlyComparison.map(q => q.headcount), 1);
              return quarterlyComparison.map((q, index) => (
              <div key={q.quarter} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 w-20">{q.quarter}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                    style={{
                      width: `${(q.headcount / maxQ) * 100}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  >
                    <span className="text-xs font-bold text-white">{insightNumber(q.headcount)}</span>
                  </div>
                </div>
                <span className={cn(
                  "text-sm font-medium w-14 text-right",
                  q.growth >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {q.growth >= 0 ? '+' : ''}{insightNumber(q.growth)}%
                </span>
              </div>
            ));
            })()}
          </div>
          )}</ReportSection>

        {/* Company Headcount */}
        {headcountByCompany.length > 0 && (
          <ReportSection><div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t("Company Headcount")}</h3>
                <p className="text-sm text-gray-500">{t("Distribution across companies")}</p>
              </div>
              <Building2 className="h-5 w-5 text-gray-400" />
            </div><div className="space-y-4">
              {headcountByCompany.map((company, index) => (
                <div key={company.name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  >
                    {company.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{company.name}</p>
                    <p className="text-xs text-gray-500">+{insightNumber(company.hires)}{' '}{t("new this month")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{insightNumber(company.headcount)}</p>
                    <p className={cn(
                      "text-xs font-medium",
                      parseFloat(company.growth) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {parseFloat(company.growth) >= 0 ? '+' : ''}{insightPercent(company.growth)}%
                    </p>
                  </div>
                </div>
              ))}
            </div></ReportSection>
        )}

        {/* Forecast */}
        <ReportSection><div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Headcount Forecast")}</h3>
              <p className="text-sm text-gray-500">{t("Projected growth for next 6 months")}</p>
            </div>
            <Target className="h-5 w-5 text-gray-400" />
          </div>{headcountForecast.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">{t("No forecast data available")} </div>
          ) : (
          <>
          <div className="space-y-3">
            {(() => {
              const minVal = Math.min(...headcountForecast.map(f => f.lower));
              const maxVal = Math.max(...headcountForecast.map(f => f.upper));
              const range = maxVal - minVal || 1;
              return headcountForecast.map((f) => (
              <div key={insightMonth(f.month)} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 w-12">{insightMonth(f.month)}</span>
                <div className="flex-1 relative h-6">
                  {/* Range bar */}
                  <div
                    className="absolute h-2 bg-indigo-100 rounded-full top-2"
                    style={{
                      left: `${((f.lower - minVal) / range) * 100}%`,
                      width: `${((f.upper - f.lower) / range) * 100}%`,
                    }}
                  />
                  {/* Projected point */}
                  <div
                    className="absolute w-3 h-3 bg-indigo-600 rounded-full top-1.5 transform -translate-x-1/2"
                    style={{ left: `${((f.projected - minVal) / range) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-indigo-600 w-12 text-right">{insightNumber(f.projected)}</span>
              </div>
            ));
            })()}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 bg-indigo-100 rounded-full" />
                <span>{t("Confidence Range")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                <span>{t("Projected")}</span>
              </div>
            </div>
          </div>
          </>
          )}</ReportSection>
      </div>{/* Progress to Target */}{yearEndTarget > 0 && (
      <ReportSection><div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t("Progress to Year-End Target")}</h3>
            <p className="text-sm text-gray-500">{t("Current:")} {insightNumber(currentHeadcount)}{' '}{t("/ Target:")} {insightNumber(yearEndTarget)}</p>
          </div>
          <span className="text-2xl font-bold text-indigo-600">{insightNumber(Math.round((currentHeadcount / yearEndTarget) * 100))}%</span>
        </div><div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-[#f5f6f7] text-[#24302b]"
            style={{ width: `${Math.min((currentHeadcount / yearEndTarget) * 100, 100)}%` }}
          />
        </div><div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0</span>
          <span>{insightNumber(Math.round(yearEndTarget * 0.25))}</span>
          <span>{insightNumber(Math.round(yearEndTarget * 0.5))}</span>
          <span>{insightNumber(Math.round(yearEndTarget * 0.75))}</span>
          <span>{insightNumber(yearEndTarget)}</span>
        </div></ReportSection>
      )}</ReportPage>
  );
}
