import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSection, ReportSummary } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import {
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { PageSpinner, PreviewBanner } from '@/components/ui';
import {
  dashboardService,
  type GroupDashboard,
} from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

export function CEOKPIDashboardPage() {
  useLocale();
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const group = await dashboardService.getGroupOverview();
        setGroupData(group);
      } catch (err: any) {
        console.error('Failed to fetch KPI data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
    avg_attendance_rate: 0,
    new_hires_this_month: 0,
    terminations_this_month: 0,
    pending_approvals: 0,
  };

  // Mock KPI data based on real metrics
  const kpis = [
    {
      name: t('Attendance Rate'),
      current: summary.avg_attendance_rate || 0,
      target: 95,
      unit: '%',
      trend: summary.avg_attendance_rate >= 90 ? 'up' : 'down',
      color: '#10b981',
    },
    {
      name: t('Headcount Growth'),
      current: summary.new_hires_this_month - summary.terminations_this_month,
      target: 10,
      unit: '',
      trend: (summary.new_hires_this_month - summary.terminations_this_month) > 0 ? 'up' : 'down',
      color: '#6366f1',
    },
    {
      name: t('Pending Approvals'),
      current: summary.pending_approvals,
      target: 0,
      unit: '',
      trend: summary.pending_approvals < 10 ? 'up' : 'down',
      color: '#f59e0b',
    },
    {
      name: t('Active Companies'),
      current: summary.total_companies,
      target: summary.total_companies,
      unit: '',
      trend: 'up',
      color: '#8b5cf6',
    },
  ];

  // Progress data for radial chart
  const progressData = kpis.map((kpi, _index) => ({
    name: kpi.name,
    value: kpi.target > 0 ? Math.min((Math.abs(kpi.current) / kpi.target) * 100, 100) : 100,
    fill: kpi.color,
  }));

  // Performance summary
  const overallScore = kpis.reduce((acc, kpi) => {
    if (kpi.target > 0) {
      return acc + Math.min((Math.abs(kpi.current) / kpi.target) * 100, 100);
    }
    return acc + 100;
  }, 0) / kpis.length;

  return (
    <ReportPage><PreviewBanner message={t("KPI dashboard menggunakan period dan trend data mock. Real integration with performance + payroll metrics belum tersedia.")} />{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("KPI Dashboard")}</h1><p className="text-xs md:text-sm mt-1">{t("Key performance indicators")}</p></div>
<div className="report-header-context"><div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium border whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString(intlLocale(), { month: 'short', year: 'numeric' })}
              </span></div></div>
</ReportHeader>{/* Overall Score */}<ReportSection><div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="100%"
                barSize={12}
                data={[{ value: overallScore, fill: overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444' }]}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background={{ fill: '#f3f4f6' }}
                  dataKey="value"
                  cornerRadius={6}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="relative -mt-20 text-center">
              <p className="text-3xl font-bold text-gray-900">{insightFixed(overallScore, 0)}%</p>
              <p className="text-xs text-gray-500">{t("Overall Score")}</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-md border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">{t("On Track")}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {insightNumber(kpis.filter(k => k.target > 0 && Math.abs(k.current) >= k.target * 0.8).length)}
              </p>
              <p className="text-xs text-gray-500">{t("KPIs meeting targets")}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-md border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">{t("Needs Attention")}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {insightNumber(kpis.filter(k => k.target > 0 && Math.abs(k.current) < k.target * 0.8).length)}
              </p>
              <p className="text-xs text-gray-500">{t("KPIs below target")}</p>
            </div>
          </div>
        </div></ReportSection>{/* KPI Cards */}<ReportSummary>{kpis.map((kpi, index) => (
          <div key={index} className="report-metric"><div  className="report-metric-context"><span className={`inline-flex items-center gap-1 text-xs font-semibold ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                {kpi.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </span></div><p className="report-metric-value">{insightNumber(kpi.current)}{kpi.unit}</p><p className="report-metric-label">{kpi.name}</p><div className="mt-2">
              <div  className="report-metric-context"><span className="text-gray-400">{t("Target:")} {insightNumber(kpi.target)}{kpi.unit}</span><span className={kpi.target > 0 && Math.abs(kpi.current) >= kpi.target * 0.8 ? "text-green-600" : "text-amber-600"}>
                  {kpi.target > 0 ? `${insightFixed(((Math.abs(kpi.current) / kpi.target) * 100), 0)}%` : '100%'}
                </span></div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${kpi.target > 0 ? Math.min((Math.abs(kpi.current) / kpi.target) * 100, 100) : 100}%`,
                    backgroundColor: kpi.color,
                  }}
                />
              </div>
            </div></div>
        ))}</ReportSummary>{/* KPI Progress Chart */}<ReportSection><div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900">{t("KPI Progress")}</h3>
            <p className="text-xs text-gray-500 mt-1">{t("Progress towards targets")}</p>
          </div>
        </div><div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={100} />
              <Tooltip formatter={(value: number | undefined) => {
                if (value === undefined) return '';
                return `${insightFixed(value, 1)}%`;
              }} />
              <Bar name={t('Progress')} dataKey="value" radius={[0, 4, 4, 0]}>
                {progressData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div></ReportSection>{/* Quick Actions */}<div className="grid md:grid-cols-3 gap-4">
        <section  className="report-inline-note"><div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-md flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">{t("Set New Goals")}</h3>
          </div><p className="text-sm text-gray-600 mb-4">{t("Define new performance targets for your organization.")}</p><button disabled title={t("Belum tersedia — preview UI")} className="ph-button ph-button-primary w-full px-4 py-2 rounded-md text-sm font-medium transition-colors">{t("Create Goal")} </button></section>

        <section  className="report-inline-note"><div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-md flex items-center justify-center">
              <Award className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">{t("Review Performance")}</h3>
          </div><p className="text-sm text-gray-600 mb-4">{t("Evaluate team and individual performance metrics.")}</p><button disabled title={t("Belum tersedia — preview UI")} className="ph-button ph-button-primary w-full px-4 py-2 rounded-md text-sm font-medium transition-colors">{t("View Reports")} </button></section>

        <section  className="report-inline-note"><div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500 rounded-md flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">{t("View Analytics")}</h3>
          </div><p className="text-sm text-gray-600 mb-4">{t("Deep dive into detailed performance analytics.")}</p><button disabled title={t("Belum tersedia — preview UI")} className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium transition-colors">{t("Open Analytics")} </button></section>
      </div></ReportPage>
  );
}
