import { useEffect, useState } from 'react';
import {
  Award,
  TrendingUp,
  Star,
  AlertCircle,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

// Mock performance data
const mockPerformanceData = {
  ratings: [
    { label: 'Exceptional', count: 45, percentage: 15, color: '#8b5cf6' },
    { label: 'Outstanding', count: 90, percentage: 30, color: '#10b981' },
    { label: 'Meets Expectations', count: 120, percentage: 40, color: '#6366f1' },
    { label: 'Needs Improvement', count: 35, percentage: 12, color: '#f59e0b' },
    { label: 'Unsatisfactory', count: 10, percentage: 3, color: '#ef4444' },
  ],
  byDepartment: [
    { name: 'Engineering', avgScore: 4.2, total: 80 },
    { name: 'Sales', avgScore: 4.0, total: 45 },
    { name: 'Marketing', avgScore: 3.9, total: 30 },
    { name: 'Finance', avgScore: 4.1, total: 25 },
    { name: 'HR', avgScore: 4.3, total: 20 },
    { name: 'Operations', avgScore: 3.8, total: 50 },
  ],
  completionRate: 85,
  averageScore: 4.0,
  topPerformers: 45,
  needsImprovement: 35,
};

export function CEOPerformanceSummaryPage() {
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const group = await dashboardService.getGroupOverview();
        setGroupData(group);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <PageSpinner />;
  }

  const _totalEmployees = groupData?.summary?.total_employees || 300;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="perf-summary-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#perf-summary-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Award className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Performance Summary</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Organization-wide performance overview</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
              <Calendar className="h-4 w-4" />
              {new Date().getFullYear()} Review Cycle
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Star className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{mockPerformanceData.averageScore.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Avg Rating (out of 5)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{mockPerformanceData.completionRate}%</p>
          <p className="text-xs text-gray-500">Review Completion</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{mockPerformanceData.topPerformers}</p>
          <p className="text-xs text-gray-500">Top Performers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{mockPerformanceData.needsImprovement}</p>
          <p className="text-xs text-gray-500">Needs Development</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Rating Distribution</h3>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockPerformanceData.ratings}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="label"
                >
                  {mockPerformanceData.ratings.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} employees`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance by Department */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Avg Score by Department</h3>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockPerformanceData.byDepartment} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={60} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#6366f1" radius={[0, 4, 4, 0]} name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Detailed Rating Breakdown</h3>
        <div className="space-y-4">
          {mockPerformanceData.ratings.map((rating, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-32 md:w-40 text-sm font-medium text-gray-700">{rating.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ width: `${rating.percentage}%`, backgroundColor: rating.color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-20 text-right">
                    {rating.count} ({rating.percentage}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
