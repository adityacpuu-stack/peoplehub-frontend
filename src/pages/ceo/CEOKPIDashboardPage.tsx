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
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type GroupDashboard,
} from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

export function CEOKPIDashboardPage() {
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
        setError(err.message || 'Failed to load data');
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
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
      name: 'Attendance Rate',
      current: summary.avg_attendance_rate || 0,
      target: 95,
      unit: '%',
      trend: summary.avg_attendance_rate >= 90 ? 'up' : 'down',
      color: '#10b981',
    },
    {
      name: 'Headcount Growth',
      current: summary.new_hires_this_month - summary.terminations_this_month,
      target: 10,
      unit: '',
      trend: (summary.new_hires_this_month - summary.terminations_this_month) > 0 ? 'up' : 'down',
      color: '#6366f1',
    },
    {
      name: 'Pending Approvals',
      current: summary.pending_approvals,
      target: 0,
      unit: '',
      trend: summary.pending_approvals < 10 ? 'up' : 'down',
      color: '#f59e0b',
    },
    {
      name: 'Active Companies',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="kpi-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#kpi-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Target className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">KPI Dashboard</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Key performance indicators</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-xl text-xs md:text-sm text-white font-medium border border-white/10 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
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
              <p className="text-3xl font-bold text-gray-900">{overallScore.toFixed(0)}%</p>
              <p className="text-xs text-gray-500">Overall Score</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">On Track</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.filter(k => k.target > 0 && Math.abs(k.current) >= k.target * 0.8).length}
              </p>
              <p className="text-xs text-gray-500">KPIs meeting targets</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Needs Attention</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {kpis.filter(k => k.target > 0 && Math.abs(k.current) < k.target * 0.8).length}
              </p>
              <p className="text-xs text-gray-500">KPIs below target</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${kpi.color}99, ${kpi.color})` }}
              >
                <Target className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">
              {kpi.current}{kpi.unit}
            </p>
            <p className="text-xs text-gray-500">{kpi.name}</p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">Target: {kpi.target}{kpi.unit}</span>
                <span className={kpi.target > 0 && Math.abs(kpi.current) >= kpi.target * 0.8 ? 'text-green-600' : 'text-amber-600'}>
                  {kpi.target > 0 ? `${((Math.abs(kpi.current) / kpi.target) * 100).toFixed(0)}%` : '100%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${kpi.target > 0 ? Math.min((Math.abs(kpi.current) / kpi.target) * 100, 100) : 100}%`,
                    backgroundColor: kpi.color,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI Progress Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900">KPI Progress</h3>
            <p className="text-xs text-gray-500 mt-1">Progress towards targets</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={100} />
              <Tooltip formatter={(value: number | undefined) => {
                if (value === undefined) return '';
                return `${value.toFixed(1)}%`;
              }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {progressData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Set New Goals</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Define new performance targets for your organization.</p>
          <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium transition-colors">
            Create Goal
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Award className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Review Performance</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Evaluate team and individual performance metrics.</p>
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium transition-colors">
            View Reports
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">View Analytics</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Deep dive into detailed performance analytics.</p>
          <button className="w-full px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 text-sm font-medium transition-colors">
            Open Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
