import { insightEnum, insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useEffect, useState } from 'react';
import { Target, Calendar, ChevronRight, TrendingUp, Users, Award, Loader2 } from 'lucide-react';
import { goalService, type Goal, type GoalListResponse } from '@/services/goal.service';

const categoryColors: Record<string, string> = {
  performance: '#8b5cf6',
  development: '#10b981',
  behavioral: '#f59e0b',
  strategic: '#6366f1',
  team: '#ef4444',
};

const categoryIcons: Record<string, React.ElementType> = {
  performance: Target,
  development: TrendingUp,
  behavioral: Users,
  strategic: Award,
  team: Users,
};

export function CEOCompanyGoalsPage() {
  useLocale();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pagination, setPagination] = useState<GoalListResponse['pagination'] | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const query: Record<string, any> = { limit: 50 };
      if (filter !== 'all') query.status = filter;
      const result = await goalService.list(query);
      setGoals(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [filter]);

  const stats = {
    total: pagination?.total || goals.length,
    completed: goals.filter(g => g.status === 'completed').length,
    onTrack: goals.filter(g => g.status === 'active' || g.status === 'in_progress').length,
    atRisk: goals.filter(g => g.status === 'deferred' || g.status === 'cancelled').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'active':
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'deferred':
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('Completed');
      case 'active': return t('Active');
      case 'in_progress': return t('In Progress');
      case 'deferred': return t('Deferred');
      case 'cancelled': return t('Cancelled');
      case 'draft': return t('Draft');
      default: return status;
    }
  };

  const getProgressColor = (status: string) => {
    if (status === 'completed') return '#10b981';
    if (status === 'active' || status === 'in_progress') return '#6366f1';
    if (status === 'deferred' || status === 'cancelled') return '#ef4444';
    return '#9ca3af';
  };

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Company Goals")}</h1><p className="text-xs md:text-sm mt-1">{t("Strategic objectives & targets")}</p></div>

</ReportHeader>{/* Stats */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(stats.total)}</p><p className="report-metric-label">{t("Total Goals")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(stats.completed)}</p><p className="report-metric-label">{t("Completed")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(stats.onTrack)}</p><p className="report-metric-label">{t("Active / In Progress")}</p></div><div className="report-metric"><div  className="report-metric-context"></div><p className="report-metric-value">{insightNumber(stats.atRisk)}</p><p className="report-metric-label">{t("Deferred / Cancelled")}</p></div></ReportSummary>{/* Filter */}<div  className="ph-table-scroll flex items-center gap-2 overflow-x-auto pb-2">{[
          { key: 'all', get label() { return t('All Goals'); }, color: 'indigo' },
          { key: 'active', get label() { return t('Active'); }, color: 'blue' },
          { key: 'in_progress', get label() { return t('In Progress'); }, color: 'blue' },
          { key: 'completed', get label() { return t('Completed'); }, color: 'green' },
          { key: 'draft', get label() { return t('Draft'); }, color: 'gray' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filter === key ? `bg-${color}-600 text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            style={filter === key ? {
              backgroundColor: color === 'indigo' ? '#4f46e5' : color === 'blue' ? '#2563eb' : color === 'green' ? '#16a34a' : '#4b5563'
            } : undefined}
          >
            {label}
          </button>
        ))}</div>{/* Goals List */}{isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-gray-500 text-sm">{t("Loading goals...")}</p>
          </div>
        </div>
      ) : goals.length === 0 ? (
        <ReportSection><Target className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">{t("No goals found")}</h3><p className="text-gray-500">{t("Try changing the filter or create a new goal.")}</p></ReportSection>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const CategoryIcon = categoryIcons[goal.category] || Target;
            const color = categoryColors[goal.category] || '#6b7280';
            return (
              <ReportSection key={goal.id}><div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <CategoryIcon className="h-6 w-6" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{goal.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(goal.status)}`}>
                          {getStatusLabel(goal.status)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                          goal.priority === "high" || goal.priority === "critical" ? "bg-red-50 text-red-600" :
                          goal.priority === "medium" ? "bg-amber-50 text-amber-600" :
                          "bg-gray-50 text-gray-600"
                        }`}>
                          {insightEnum(goal.priority)}
                        </span>
                      </div>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                    )}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-sm">
                      {goal.target_date && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{t("Due:")} {new Date(goal.target_date).toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                      {goal.employee && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>{goal.employee.name}</span>
                        </div>
                      )}
                      {goal.target_value != null && goal.current_value != null && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Target className="h-4 w-4" />
                          <span>{insightNumber(goal.current_value)}{goal.unit_of_measure || ''} / {insightNumber(goal.target_value)}{goal.unit_of_measure || ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{t("Progress")}</span>
                        <span className="font-medium text-gray-700">{insightNumber(goal.progress_percentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${goal.progress_percentage}%`,
                            backgroundColor: getProgressColor(goal.status),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 hidden md:block" />
                </div></ReportSection>
            );
          })}
        </div>
      )}</ReportPage>
  );
}
