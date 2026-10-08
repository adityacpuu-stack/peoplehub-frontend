import { insightEnum, insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Users, BarChart2, Calendar, AlertCircle, TrendingUp, Briefcase, Heart } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type WorkforceAnalytics,
  type GroupDashboard,
} from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber } from '@/lib/utils';

export function CEOWorkforceAnalyticsPage() {
  useLocale();
  const { user } = useAuthStore();
  const [workforceData, setWorkforceData] = useState<WorkforceAnalytics | null>(null);
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
        const [workforce, group] = await Promise.all([
          dashboardService.getWorkforceAnalytics(companyId),
          dashboardService.getGroupOverview(companyId),
        ]);

        setWorkforceData(workforce);
        setGroupData(group);
      } catch (err: any) {
        console.error('Failed to fetch workforce analytics:', err);
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
    total_employees: 0,
    total_companies: 0,
    total_departments: 0,
  };

  const genderDistribution = workforceData?.gender_distribution || [];
  const employmentTypeDistribution = workforceData?.employment_type_distribution || [];
  const ageDistribution = workforceData?.age_distribution || [];
  const tenureDistribution = workforceData?.tenure_distribution || [];
  const maritalStatusDistribution = workforceData?.marital_status_distribution || [];

  // Calculate total from distributions
  const totalGender = genderDistribution.reduce((acc, item) => acc + item.count, 0);
  const totalEmploymentType = employmentTypeDistribution.reduce((acc, item) => acc + item.count, 0);

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Workforce Analytics")}</h1><p className="text-xs md:text-sm mt-1">{t("Demographics & composition analysis")}</p></div>
<div className="report-header-context"><div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border whitespace-nowrap">
                <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {formatNumber(summary.total_employees)}{' '}{t("Employees")} </span></div></div>
</ReportHeader>{/* Quick Stats */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{formatNumber(summary.total_employees)}</p><p className="report-metric-label">{t("Total Workforce")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(genderDistribution.find(g => g.label === 'Male')?.count || 0)}</p><p className="report-metric-label">{t("Male Employees")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(genderDistribution.find(g => g.label === 'Female')?.count || 0)}</p><p className="report-metric-label">{t("Female Employees")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(employmentTypeDistribution.find(e => e.label === 'Permanent' || e.label === 'Full-time')?.count || 0)}</p><p className="report-metric-label">{t("Permanent Staff")}</p></div></ReportSummary>{/* Charts Row 1 */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Gender Distribution")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Workforce by gender")}</p>
            </div>
          </div>{genderDistribution.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie nameKey="label"
                      data={genderDistribution.map(item => ({ ...item, label: insightEnum(item.label) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => t('{count} employees', { count: insightNumber(Number(value)) })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {genderDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-gray-700">{insightEnum(item.label)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{insightNumber(item.count)}</span>
                      <span className="text-xs text-gray-500 ml-1">({insightNumber(item.value)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">{t("No gender data available")} </div>
          )}</ReportSection>

        {/* Employment Type */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Employment Type")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Workforce composition")}</p>
            </div>
          </div>{employmentTypeDistribution.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie nameKey="label"
                      data={employmentTypeDistribution.map(item => ({ ...item, label: insightEnum(item.label) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {employmentTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => t('{count} employees', { count: insightNumber(Number(value)) })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {employmentTypeDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-gray-700">{insightEnum(item.label)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{insightNumber(item.count)}</span>
                      <span className="text-xs text-gray-500 ml-1">({insightNumber(item.value)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">{t("No employment type data available")} </div>
          )}</ReportSection>
      </div>{/* Charts Row 2 */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Age Distribution")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Workforce by age groups")}</p>
            </div>
          </div><div className="h-56 md:h-64">
            {ageDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tickFormatter={insightNumber} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t("Employees")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No age data available")} </div>
            )}
          </div></ReportSection>

        {/* Tenure Distribution */}
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Tenure Distribution")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Years of service")}</p>
            </div>
          </div><div className="h-56 md:h-64">
            {tenureDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tenureDistribution.map(item => ({ ...item, range: insightEnum(item.range) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tickFormatter={insightNumber} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name={t("Employees")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">{t("No tenure data available")} </div>
            )}
          </div></ReportSection>
      </div>{/* Marital Status */}{maritalStatusDistribution.length > 0 && (
        <ReportSection><div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Marital Status")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Workforce by marital status")}</p>
            </div>
          </div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {maritalStatusDistribution.map((item, index) => (
              <section key={index} className="report-inline-note"><div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <span className="text-sm font-medium text-gray-700">{insightEnum(item.label)}</span>
                </div><p className="text-2xl font-bold text-gray-900">{insightNumber(item.count)}</p><p className="text-xs text-gray-500">{insightNumber(item.value)}{' '}{t("% of workforce")}</p></section>
            ))}
          </div></ReportSection>
      )}</ReportPage>
  );
}
