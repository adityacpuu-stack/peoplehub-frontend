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
  ChevronRight,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

// Chart colors
const CHART_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16',
];

const STATUS_COLORS = {
  on_track: { bg: 'bg-green-100', text: 'text-green-700', label: 'On Track' },
  at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'At Risk' },
  behind: { bg: 'bg-red-100', text: 'text-red-700', label: 'Behind' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' },
};

export function KPIDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('q1_2024');
  const [selectedCompany, setSelectedCompany] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardService.getGroupOverview();
      setData(response);
    } catch (error: any) {
      console.error('Failed to fetch KPI data:', error);
      toast.error('Failed to load KPI dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Mock KPI categories
  const kpiCategories = [
    {
      name: 'Financial',
      icon: BarChart3,
      color: 'from-green-500 to-emerald-600',
      kpis: [
        { name: 'Revenue Growth', target: 25, actual: 22, unit: '%', status: 'at_risk' as const },
        { name: 'Profit Margin', target: 15, actual: 16.5, unit: '%', status: 'on_track' as const },
        { name: 'Cost Reduction', target: 10, actual: 8, unit: '%', status: 'at_risk' as const },
      ],
    },
    {
      name: 'Customer',
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
      kpis: [
        { name: 'Customer Satisfaction', target: 90, actual: 92, unit: '%', status: 'on_track' as const },
        { name: 'Net Promoter Score', target: 50, actual: 48, unit: '', status: 'at_risk' as const },
        { name: 'Customer Retention', target: 85, actual: 88, unit: '%', status: 'on_track' as const },
      ],
    },
    {
      name: 'Operations',
      icon: Zap,
      color: 'from-purple-500 to-violet-600',
      kpis: [
        { name: 'Process Efficiency', target: 95, actual: 93, unit: '%', status: 'at_risk' as const },
        { name: 'Quality Score', target: 98, actual: 97.5, unit: '%', status: 'on_track' as const },
        { name: 'Delivery On-Time', target: 90, actual: 91, unit: '%', status: 'on_track' as const },
      ],
    },
    {
      name: 'People',
      icon: Award,
      color: 'from-amber-500 to-orange-600',
      kpis: [
        { name: 'Employee Engagement', target: 80, actual: 78, unit: '%', status: 'at_risk' as const },
        { name: 'Training Completion', target: 100, actual: 85, unit: '%', status: 'behind' as const },
        { name: 'Retention Rate', target: 90, actual: 92, unit: '%', status: 'on_track' as const },
      ],
    },
  ];

  // Calculate overall metrics
  const allKPIs = kpiCategories.flatMap(cat => cat.kpis);
  const onTrackCount = allKPIs.filter(k => k.status === 'on_track').length;
  const atRiskCount = allKPIs.filter(k => k.status === 'at_risk').length;
  const behindCount = allKPIs.filter(k => k.status === 'behind').length;
  const overallScore = Math.round((onTrackCount / allKPIs.length) * 100);

  // Mock department KPI performance
  const departmentPerformance = [
    { name: 'Engineering', score: 92, trend: 5, status: 'on_track' as const },
    { name: 'Sales', score: 78, trend: -3, status: 'at_risk' as const },
    { name: 'Marketing', score: 85, trend: 2, status: 'on_track' as const },
    { name: 'Operations', score: 88, trend: 4, status: 'on_track' as const },
    { name: 'Finance', score: 95, trend: 1, status: 'on_track' as const },
    { name: 'HR', score: 72, trend: -5, status: 'behind' as const },
  ];

  // Mock top performers
  const topPerformers = [
    { name: 'Sarah Chen', department: 'Engineering', score: 98, avatar: 'SC' },
    { name: 'Michael Lee', department: 'Sales', score: 96, avatar: 'ML' },
    { name: 'Emma Wilson', department: 'Marketing', score: 95, avatar: 'EW' },
    { name: 'David Kim', department: 'Finance', score: 94, avatar: 'DK' },
    { name: 'Lisa Park', department: 'Operations', score: 93, avatar: 'LP' },
  ];

  // Mock quarterly trend
  const quarterlyTrend = [
    { quarter: 'Q1 2023', score: 78 },
    { quarter: 'Q2 2023', score: 82 },
    { quarter: 'Q3 2023', score: 80 },
    { quarter: 'Q4 2023', score: 85 },
    { quarter: 'Q1 2024', score: 88 },
  ];

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
              <p className="text-2xl font-bold text-gray-900">{allKPIs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kpiCategories.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <div key={category.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={cn("px-5 py-4 bg-gradient-to-r text-white", category.color)}>
                <div className="flex items-center gap-3">
                  <CategoryIcon className="h-5 w-5" />
                  <h3 className="font-semibold">{category.name} KPIs</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {category.kpis.map((kpi) => {
                  const progress = Math.min((kpi.actual / kpi.target) * 100, 100);
                  const statusConfig = STATUS_COLORS[kpi.status];
                  return (
                    <div key={kpi.name}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{kpi.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {kpi.actual}{kpi.unit} / {kpi.target}{kpi.unit}
                          </span>
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
                            kpi.status === 'on_track' ? 'bg-green-500' :
                            kpi.status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500'
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

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Department Performance</h3>
              <p className="text-sm text-gray-500">KPI achievement by department</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {departmentPerformance.map((dept) => {
              const statusConfig = STATUS_COLORS[dept.status];
              return (
                <div key={dept.name} className="flex items-center gap-4">
                  <div className="w-28">
                    <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                  </div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-lg transition-all duration-500",
                        dept.status === 'on_track' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                        dept.status === 'at_risk' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                        'bg-gradient-to-r from-red-400 to-red-500'
                      )}
                      style={{ width: `${dept.score}%` }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700">
                      {dept.score}%
                    </span>
                  </div>
                  <div className={cn(
                    "w-16 flex items-center justify-end gap-1 text-sm font-medium",
                    dept.trend >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {dept.trend >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {dept.trend >= 0 ? '+' : ''}{dept.trend}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
              <p className="text-sm text-gray-500">Highest KPI achievers</p>
            </div>
            <Star className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {topPerformers.map((person, index) => (
              <div key={person.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                  index === 0 ? "bg-yellow-500" :
                  index === 1 ? "bg-gray-400" :
                  index === 2 ? "bg-amber-600" : "bg-purple-500"
                )}>
                  {index < 3 ? index + 1 : person.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{person.name}</p>
                  <p className="text-xs text-gray-500">{person.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-600">{person.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quarterly Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">KPI Score Trend</h3>
            <p className="text-sm text-gray-500">Overall performance over quarters</p>
          </div>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <div className="h-48 flex items-end justify-between gap-8">
          {quarterlyTrend.map((q, index) => (
            <div key={q.quarter} className="flex-1 flex flex-col items-center">
              <div className="w-full relative" style={{ height: `${q.score}%` }}>
                <div className={cn(
                  "absolute inset-0 rounded-t-lg transition-all duration-500",
                  index === quarterlyTrend.length - 1
                    ? "bg-gradient-to-t from-purple-600 to-purple-400"
                    : "bg-gradient-to-t from-gray-300 to-gray-200"
                )} />
                <div className={cn(
                  "absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold",
                  index === quarterlyTrend.length - 1 ? "text-purple-600" : "text-gray-600"
                )}>
                  {q.score}%
                </div>
              </div>
              <span className="text-xs font-medium text-gray-500 mt-3">{q.quarter}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
