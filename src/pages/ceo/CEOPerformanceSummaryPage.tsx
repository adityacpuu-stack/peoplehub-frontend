import { useEffect, useState } from 'react';
import {
  Award,
  TrendingUp,
  Star,
  AlertCircle,
  Calendar,
  CheckCircle,
  Loader2,
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
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import { performanceService } from '@/services/performance.service';

const RATING_COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#8b5cf6'];
const RATING_LABELS = ['Needs Improvement', 'Below Expectations', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'];

export function CEOPerformanceSummaryPage() {
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    completed: 0,
    avgRating: 0,
    ratings: [] as { label: string; count: number; percentage: number; color: string }[],
    byDepartment: [] as { name: string; avgScore: number; total: number }[],
    topPerformers: 0,
    needsImprovement: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [group, reviewResult] = await Promise.all([
          dashboardService.getGroupOverview(),
          performanceService.listReviews({ limit: 500 }),
        ]);
        setGroupData(group);

        const reviews = reviewResult.data || [];
        const completedReviews = reviews.filter(r => r.status === 'completed' && r.overall_rating);

        // Calculate rating distribution
        const ratingCounts = [0, 0, 0, 0, 0];
        completedReviews.forEach(r => {
          if (r.overall_rating && r.overall_rating >= 1 && r.overall_rating <= 5) {
            ratingCounts[r.overall_rating - 1]++;
          }
        });

        const totalCompleted = completedReviews.length || 1;
        const ratings = RATING_LABELS.map((label, i) => ({
          label,
          count: ratingCounts[i],
          percentage: Math.round((ratingCounts[i] / totalCompleted) * 100),
          color: RATING_COLORS[i],
        }));

        // Calculate by department
        const deptMap = new Map<string, { total: number; sumRating: number }>();
        completedReviews.forEach(r => {
          const dept = r.employee?.department?.name || 'Unknown';
          const existing = deptMap.get(dept) || { total: 0, sumRating: 0 };
          existing.total++;
          existing.sumRating += r.overall_rating || 0;
          deptMap.set(dept, existing);
        });

        const byDepartment = Array.from(deptMap.entries())
          .map(([name, { total, sumRating }]) => ({
            name,
            avgScore: Math.round((sumRating / total) * 10) / 10,
            total,
          }))
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 8);

        const avgRating = completedReviews.length > 0
          ? Math.round((completedReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / completedReviews.length) * 10) / 10
          : 0;

        setReviewStats({
          total: reviews.length,
          completed: completedReviews.length,
          avgRating,
          ratings,
          byDepartment,
          topPerformers: completedReviews.filter(r => (r.overall_rating || 0) >= 4).length,
          needsImprovement: completedReviews.filter(r => (r.overall_rating || 0) <= 2).length,
        });
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const completionRate = reviewStats.total > 0
    ? Math.round((reviewStats.completed / reviewStats.total) * 100)
    : 0;

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
          <p className="text-xl md:text-2xl font-bold text-gray-900">{reviewStats.avgRating.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Avg Rating (out of 5)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{completionRate}%</p>
          <p className="text-xs text-gray-500">Review Completion</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{reviewStats.topPerformers}</p>
          <p className="text-xs text-gray-500">Top Performers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{reviewStats.needsImprovement}</p>
          <p className="text-xs text-gray-500">Needs Development</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Rating Distribution</h3>
          <div className="h-56 md:h-64">
            {reviewStats.ratings.some(r => r.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reviewStats.ratings.filter(r => r.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="label"
                  >
                    {reviewStats.ratings.filter(r => r.count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} employees`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No rating data available
              </div>
            )}
          </div>
        </div>

        {/* Performance by Department */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Avg Score by Department</h3>
          <div className="h-56 md:h-64">
            {reviewStats.byDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reviewStats.byDepartment} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={60} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[0, 4, 4, 0]} name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No department data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Detailed Rating Breakdown</h3>
        <div className="space-y-4">
          {reviewStats.ratings.map((rating, index) => (
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
