import { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Download,
  Users,
  Award,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import { kpiService, type KPI } from '@/services/kpi.service';
import toast from 'react-hot-toast';

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  financial: { icon: BarChart3, color: 'from-green-500 to-emerald-600', label: 'Financial' },
  customer: { icon: Users, color: 'from-blue-500 to-indigo-600', label: 'Customer' },
  process: { icon: Zap, color: 'from-purple-500 to-violet-600', label: 'Process' },
  learning: { icon: Award, color: 'from-amber-500 to-orange-600', label: 'Learning' },
  quality: { icon: CheckCircle, color: 'from-teal-500 to-cyan-600', label: 'Quality' },
  productivity: { icon: Target, color: 'from-rose-500 to-pink-600', label: 'Productivity' },
};

const STATUS_COLORS = {
  on_track: { bg: 'bg-green-100', text: 'text-green-700', label: 'On Track' },
  at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'At Risk' },
  behind: { bg: 'bg-red-100', text: 'text-red-700', label: 'Behind' },
  no_data: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'No Data' },
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
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('q1_2024');
  const [selectedCompany, setSelectedCompany] = useState('all');

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
      toast.error('Failed to load KPI dashboard');
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
    config: CATEGORY_CONFIG[category] || { icon: Target, color: 'from-gray-500 to-gray-600', label: category.charAt(0).toUpperCase() + category.slice(1) },
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
          <p className="text-gray-500">Loading KPI dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="kpi-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#kpi-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">KPI Dashboard</h1>
                <p className="text-purple-100 text-sm">Track key performance indicators across the organization</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-purple-100 text-xs">Overall Score</span>
                <p className="text-xl font-bold text-white">{overallScore}%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-purple-100 text-xs">On Track</span>
                <p className="text-xl font-bold text-white">{onTrackCount}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-purple-100 text-xs">At Risk</span>
                <p className="text-xl font-bold text-white">{atRiskCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            >
              <option value="q1_2024">Q1 2024</option>
              <option value="q4_2023">Q4 2023</option>
              <option value="q3_2023">Q3 2023</option>
              <option value="2024">Full Year 2024</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            >
              <option value="all">All Companies</option>
              {data?.companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <button className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">On Track</p>
              <p className="text-2xl font-bold text-green-600">{onTrackCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">At Risk</p>
              <p className="text-2xl font-bold text-yellow-600">{atRiskCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Behind</p>
              <p className="text-2xl font-bold text-red-600">{behindCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total KPIs</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Categories */}
      {kpiCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kpiCategories.map(({ category, config, kpis: categoryKpis }) => {
            const CategoryIcon = config.icon;
            return (
              <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className={cn("px-5 py-4 bg-gradient-to-r text-white", config.color)}>
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="h-5 w-5" />
                    <h3 className="font-semibold">{config.label} KPIs</h3>
                    <span className="ml-auto text-sm opacity-80">{categoryKpis.length} KPIs</span>
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
                                {actual}{unit} / {target}{unit}
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
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No KPIs defined yet</p>
          <p className="text-sm text-gray-400 mt-1">KPIs can be created from the KPI management page</p>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Department Distribution</h3>
              <p className="text-sm text-gray-500">Employee distribution across departments</p>
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
                      className="h-full rounded-lg transition-all duration-500 bg-gradient-to-r from-purple-400 to-purple-500"
                      style={{ width: `${dept.percentage}%` }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700">
                      {dept.employees} ({dept.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No department data available</p>
          )}
        </div>

        {/* KPI Statistics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">KPI by Category</h3>
              <p className="text-sm text-gray-500">Distribution of KPIs</p>
            </div>
            <Star className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {kpiCategories.map(({ category, config, kpis: catKpis }, index) => {
              const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500'];
              return (
                <div key={category} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                    colors[index % colors.length]
                  )}>
                    {catKpis.length}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{config.label}</p>
                    <p className="text-xs text-gray-500">{catKpis.length} KPI{catKpis.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-600">
                      {catKpis.filter(k => getKPIStatus(k) === 'on_track').length}/{catKpis.length}
                    </p>
                    <p className="text-xs text-gray-500">on track</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Company KPI Overview */}
      {data?.companies && data.companies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Company Overview</h3>
            <p className="text-sm text-gray-500">Performance metrics by company</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Employees</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Attendance Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">New Hires</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {company.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{company.employees}</td>
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
                          {company.attendance_rate >= 0 ? `${company.attendance_rate}%` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{company.new_hires_this_month}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        company.attendance_rate >= 90 ? 'bg-green-100 text-green-700' :
                        company.attendance_rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        company.attendance_rate < 0 ? 'bg-gray-100 text-gray-500' :
                        'bg-red-100 text-red-700'
                      )}>
                        {company.attendance_rate >= 90 ? 'Excellent' :
                         company.attendance_rate >= 75 ? 'Good' :
                         company.attendance_rate < 0 ? 'N/A' : 'Needs Attention'}
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
