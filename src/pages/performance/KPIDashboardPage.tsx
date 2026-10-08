import { insightEnum, insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import '@/pages/ceo/executive-workspace.css';
import { useState, useEffect } from 'react';
import { Target, Building2, Users, Award, BarChart3, CheckCircle, Loader2, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import { kpiService, type KPI } from '@/services/kpi.service';
import toast from 'react-hot-toast';

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  financial: { icon: BarChart3, color: 'from-green-500 to-emerald-600', get label() { return t('Financial'); } },
  customer: { icon: Users, color: 'from-blue-500 to-indigo-600', get label() { return t('Customer'); } },
  process: { icon: Zap, color: 'from-purple-500 to-violet-600', get label() { return t('Process'); } },
  learning: { icon: Award, color: 'from-amber-500 to-orange-600', get label() { return t('Learning'); } },
  quality: { icon: CheckCircle, color: 'from-teal-500 to-cyan-600', get label() { return t('Quality'); } },
  productivity: { icon: Target, color: 'from-rose-500 to-pink-600', get label() { return t('Productivity'); } },
};

const STATUS_COLORS = {
  on_track: { bg: 'bg-green-100', text: 'text-green-700', get label() { return t('On Track'); } },
  at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', get label() { return t('At Risk'); } },
  behind: { bg: 'bg-red-100', text: 'text-red-700', get label() { return t('Behind'); } },
  no_data: { bg: 'bg-gray-100', text: 'text-gray-500', get label() { return t('No Data'); } },
};

type KPIStatus = keyof typeof STATUS_COLORS;

function getKPIStatus(kpi: KPI): KPIStatus {
  if (kpi.benchmark_value == null) return 'no_data';
  if (kpi.threshold_green != null && kpi.benchmark_value >= kpi.threshold_green) return 'on_track';
  if (kpi.threshold_yellow != null && kpi.benchmark_value >= kpi.threshold_yellow) return 'at_risk';
  if (kpi.threshold_red != null && kpi.benchmark_value <= kpi.threshold_red) return 'behind';
  return 'at_risk';
}

export function KPIDashboardPage() {
  useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [groupData, kpiResult] = await Promise.all([
        dashboardService.getGroupOverview(),
        kpiService.list({ limit: 100, is_active: true }),
      ]);
      setData(groupData);
      setKpis(kpiResult.data);
    } catch (error: any) {
      console.error('Failed to fetch KPI data:', error);
      toast.error(t("Failed to load KPI dashboard"));
    } finally {
      setIsLoading(false);
    }
  };

  // Group KPIs by category
  const kpiCategories = Object.entries(
    kpis.reduce((acc, kpi) => {
      const cat = kpi.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(kpi);
      return acc;
    }, {} as Record<string, KPI[]>)
  ).map(([category, items]) => ({
    category,
    config: CATEGORY_CONFIG[category] || { icon: Target, color: 'from-gray-500 to-gray-600', label: insightEnum(category) },
    kpis: items,
  }));

  // Calculate overall metrics from real KPI data
  const allKPIStatuses = kpis.map(getKPIStatus);
  const onTrackCount = allKPIStatuses.filter(s => s === 'on_track').length;
  const atRiskCount = allKPIStatuses.filter(s => s === 'at_risk').length;
  const behindCount = allKPIStatuses.filter(s => s === 'behind').length;
  const overallScore = kpis.length > 0 ? Math.round((onTrackCount / kpis.length) * 100) : 0;

  // Department distribution from dashboard data
  const departmentData = data?.department_distribution || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-gray-500">{t("Loading KPI dashboard...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-workflow ops-workflow ops-page executive-performance">
      {/* Header */}
      <header className="ph-page-header ops-page-heading"><div>
                <h1 className="ops-page-title">{t("KPI Dashboard")}</h1>
                <p className="text-gray-500 text-sm">{t("Track key performance indicators across the organization")}</p>
              </div><div className="ph-actions"><div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 ops-quiet-surface">
                <span className="text-gray-500 text-xs">{t("Overall Score")}</span>
                <p className="text-xl font-bold text-gray-900">{insightNumber(overallScore)}%</p>
              </div>
              <div className="px-4 py-2 ops-quiet-surface">
                <span className="text-gray-500 text-xs">{t("On Track")}</span>
                <p className="text-xl font-bold text-gray-900">{insightNumber(onTrackCount)}</p>
              </div>
              <div className="px-4 py-2 ops-quiet-surface">
                <span className="text-gray-500 text-xs">{t("At Risk")}</span>
                <p className="text-xl font-bold text-gray-900">{insightNumber(atRiskCount)}</p>
              </div>
            </div></div></header>

      <p className="executive-kpi-note">{t("Status di bawah membandingkan benchmark konfigurasi KPI dengan threshold-nya, bukan hasil penilaian karyawan per periode.")}</p>

      {/* Summary Cards */}
      <div className="ops-summary-register">
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("On Track")}</p>
              <p className="text-2xl font-bold text-green-600">{insightNumber(onTrackCount)}</p>
            </div>
          </div>
        </div>
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("At Risk")}</p>
              <p className="text-2xl font-bold text-yellow-600">{insightNumber(atRiskCount)}</p>
            </div>
          </div>
        </div>
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("Behind")}</p>
              <p className="text-2xl font-bold text-red-600">{insightNumber(behindCount)}</p>
            </div>
          </div>
        </div>
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("Total KPIs")}</p>
              <p className="text-2xl font-bold text-gray-900">{insightNumber(kpis.length)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Categories */}
      {kpiCategories.length > 0 ? (
        <div className="ops-kpi-register">
          {kpiCategories.map(({ category, config, kpis: categoryKpis }) => {
            const CategoryIcon = config.icon;
            return (
              <div key={category} className="ph-section ops-section">
                <div className="ops-kpi-category-heading">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="h-5 w-5" />
                    <h3 className="font-semibold">{config.label}{' '}{t("KPIs")}</h3>
                    <span className="ml-auto text-sm opacity-80">{insightNumber(categoryKpis.length)}{' '}{t("KPIs")}</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {categoryKpis.map((kpi) => {
                    const status = getKPIStatus(kpi);
                    const statusConfig = STATUS_COLORS[status];
                    const target = kpi.threshold_green ?? kpi.benchmark_value ?? 100;
                    const actual = kpi.benchmark_value ?? 0;
                    const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
                    const unit = kpi.unit_of_measure || '';
                    return (
                      <div key={kpi.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{kpi.name}</span>
                          <div className="flex items-center gap-2">
                            {kpi.benchmark_value != null && (
                              <span className="text-sm text-gray-500">
                                {insightNumber(actual)}{unit} / {insightNumber(target)}{unit}
                              </span>
                            )}
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              statusConfig.bg, statusConfig.text
                            )}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              status === 'on_track' ? 'bg-green-500' :
                              status === 'at_risk' ? 'bg-yellow-500' :
                              status === 'behind' ? 'bg-red-500' : 'bg-gray-300'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center ops-quiet-surface">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t("No KPIs defined yet")}</p>
          <p className="text-sm text-gray-400 mt-1">{t("KPIs can be created from the KPI management page")}</p>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution */}
        <div className="ph-section ops-section">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Department Distribution")}</h3>
              <p className="text-sm text-gray-500">{t("Employee distribution across departments")}</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          {departmentData.length > 0 ? (
            <div className="space-y-4">
              {departmentData.map((dept) => (
                <div key={dept.name} className="flex items-center gap-4">
                  <div className="w-28">
                    <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                  </div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500 bg-[var(--ph-accent)]"
                      style={{ width: `${dept.percentage}%` }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700">
                      {insightNumber(dept.employees)} ({insightNumber(dept.percentage)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">{t("No department data available")}</p>
          )}
        </div>

        {/* KPI Statistics */}
        <div className="ph-section ops-section">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("KPI by Category")}</h3>
              <p className="text-sm text-gray-500">{t("Distribution of KPIs")}</p>
            </div>
            <Star className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {kpiCategories.map(({ category, config, kpis: catKpis }) => {
              return (
                <div key={category} className="ops-record-block">
                  <div className="ops-category-count">
                    {insightNumber(catKpis.length)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{config.label}</p>
                    <p className="text-xs text-gray-500">{t(catKpis.length === 1 ? '{count} KPI' : '{count} KPIs', { count: insightNumber(catKpis.length) })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-600">
                      {insightNumber(catKpis.filter(k => getKPIStatus(k) === 'on_track').length)}/{insightNumber(catKpis.length)}
                    </p>
                    <p className="text-xs text-gray-500">{t("on track")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Company KPI Overview */}
      {data?.companies && data.companies.length > 0 && (
        <div className="ph-section ops-section">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t("Company Overview")}</h3>
            <p className="text-sm text-gray-500">{t("Performance metrics by company")}</p>
          </div>
          <div className="ph-table-scroll">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">{t("Company")}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t("Employees")}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t("Attendance Rate")}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t("New Hires")}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="ops-avatar">
                          {company.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{insightNumber(company.employees)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              company.attendance_rate >= 90 ? "bg-green-500" :
                              company.attendance_rate >= 75 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.max(company.attendance_rate, 0)}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900">
                          {company.attendance_rate >= 0 ? `${company.attendance_rate}%` : t("N/A")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{insightNumber(company.new_hires_this_month)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        company.attendance_rate >= 90 ? 'bg-green-100 text-green-700' :
                        company.attendance_rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        company.attendance_rate < 0 ? 'bg-gray-100 text-gray-500' :
                        'bg-red-100 text-red-700'
                      )}>
                        {company.attendance_rate >= 90 ? t("Excellent") :
                         company.attendance_rate >= 75 ? t("Good") :
                         company.attendance_rate < 0 ? t("N/A") : t("Needs Attention")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
