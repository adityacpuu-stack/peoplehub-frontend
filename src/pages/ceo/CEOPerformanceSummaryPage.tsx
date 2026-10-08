import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
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
  useLocale();
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
          const dept = r.employee?.department?.name || '';
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
          <p className="text-gray-500 text-sm">{t("Loading performance data...")}</p>
        </div>
      </div>
    );
  }

  const completionRate = reviewStats.total > 0
    ? Math.round((reviewStats.completed / reviewStats.total) * 100)
    : 0;

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Performance Summary")}</h1><p className="text-xs md:text-sm mt-1">{t("Organization-wide performance overview")}</p></div>
<div className="report-header-context"><span className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border">
              <Calendar className="h-4 w-4" />
              {new Date().getFullYear()}{' '}{t("Review Cycle")} </span></div>
</ReportHeader>{/* Stats */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightFixed(reviewStats.avgRating, 1)}</p><p className="report-metric-label">{t("Avg Rating (out of 5)")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(completionRate)}%</p><p className="report-metric-label">{t("Review Completion")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(reviewStats.topPerformers)}</p><p className="report-metric-label">{t("Top Performers")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(reviewStats.needsImprovement)}</p><p className="report-metric-label">{t("Needs Development")}</p></div></ReportSummary>{/* Charts Row */}<div className="grid lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <ReportSection><h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">{t("Rating Distribution")}</h3><div className="h-56 md:h-64">
            {reviewStats.ratings.some(r => r.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reviewStats.ratings.filter(r => r.count > 0).map(item => ({ ...item, label: t(item.label) }))}
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
                  <Tooltip formatter={(value) => t('{count} employees', { count: insightNumber(Number(value)) })} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">{t("No rating data available")} </div>
            )}
          </div></ReportSection>

        {/* Performance by Department */}
        <ReportSection><h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">{t("Avg Score by Department")}</h3><div className="h-56 md:h-64">
            {reviewStats.byDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reviewStats.byDepartment.map(item => ({ ...item, name: item.name || t('Unknown') }))} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis tickFormatter={insightNumber} type="number" domain={[0, 5]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={60} />
                  <Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value} />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[0, 4, 4, 0]} name={t("Avg Score")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">{t("No department data available")} </div>
            )}
          </div></ReportSection>
      </div>{/* Rating Breakdown */}<ReportSection><h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">{t("Detailed Rating Breakdown")}</h3><div className="space-y-4">
          {reviewStats.ratings.map((rating, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-32 md:w-40 text-sm font-medium text-gray-700">{t(rating.label)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ width: `${rating.percentage}%`, backgroundColor: rating.color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-20 text-right">
                    {insightNumber(rating.count)} ({insightNumber(rating.percentage)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div></ReportSection></ReportPage>
  );
}
