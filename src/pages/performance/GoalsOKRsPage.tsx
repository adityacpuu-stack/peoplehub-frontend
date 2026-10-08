import { insightEnum, insightNumber } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import '@/pages/ceo/executive-workspace.css';
import { useState, useEffect } from 'react';
import { Target, Flag, Building2, Calendar, Users, CheckCircle2, Circle, Clock, Loader2, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { goalService, type Goal } from '@/services/goal.service';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  draft: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100', get label() { return t('Draft'); } },
  active: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100', get label() { return t('Active'); } },
  in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100', get label() { return t('In Progress'); } },
  deferred: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100', get label() { return t('Deferred'); } },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100', get label() { return t('Completed'); } },
  cancelled: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100', get label() { return t('Cancelled'); } },
};

interface Objective {
  id: string;
  title: string;
  description: string | null;
  owner: string;
  ownerDept: string;
  progress: number;
  status: string;
  dueDate: string;
  category: string;
  priority: string;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
}

export function GoalsOKRsPage() {
  useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [totalGoals, setTotalGoals] = useState(0);
  const [expandedObjectives, setExpandedObjectives] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCategory]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const query: Record<string, any> = { limit: 100 };
      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterCategory !== 'all') query.category = filterCategory;
      const result = await goalService.list(query);
      setGoals(result.data || []);
      setTotalGoals(result.pagination?.total || result.data?.length || 0);
    } catch (error: any) {
      console.error('Failed to fetch goals:', error);
      toast.error(t("Failed to load goals"));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Transform goals to objectives for display
  const objectives: Objective[] = goals.map(g => ({
    id: g.id.toString(),
    title: g.title,
    description: g.description,
    owner: g.employee?.name || t('Unassigned'),
    ownerDept: g.employee?.department?.name || insightEnum(g.category),
    progress: g.progress_percentage,
    status: g.status,
    dueDate: g.target_date || '',
    category: g.category,
    priority: g.priority,
    targetValue: g.target_value,
    currentValue: g.current_value,
    unit: g.unit_of_measure,
  }));

  // Calculate stats
  const stats = {
    totalObjectives: totalGoals,
    completed: goals.filter(g => g.status === 'completed').length,
    inProgress: goals.filter(g => g.status === 'active' || g.status === 'in_progress').length,
    deferred: goals.filter(g => g.status === 'deferred' || g.status === 'cancelled').length,
    avgProgress: goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress_percentage, 0) / goals.length) : 0,
  };

  // Group by category for department progress
  const categoryMap = new Map<string, { total: number; sumProgress: number }>();
  goals.forEach(g => {
    const cat = g.employee?.department?.name || insightEnum(g.category) || t('Other');
    const existing = categoryMap.get(cat) || { total: 0, sumProgress: 0 };
    existing.total++;
    existing.sumProgress += g.progress_percentage;
    categoryMap.set(cat, existing);
  });
  const categoryProgress = Array.from(categoryMap.entries())
    .map(([name, { total, sumProgress }]) => ({
      name,
      progress: Math.round(sumProgress / total),
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500">{t("Loading goals...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-workflow ops-workflow ops-page executive-performance">
      {/* Header */}
      <header className="ph-page-header ops-page-heading"><div>
                <h1 className="ops-page-title">{t("Goals & OKRs")}</h1>
                <p className="text-gray-500 text-sm">{t("Track objectives and key results across the organization")}</p>
              </div><div className="ph-actions"><div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 ops-quiet-surface">
                <span className="text-gray-500 text-xs">{t("Avg Progress")}</span>
                <p className="text-xl font-bold text-gray-900">{insightNumber(stats.avgProgress)}%</p>
              </div>
              <div className="px-4 py-2 ops-quiet-surface">
                <span className="text-gray-500 text-xs">{t("Total Goals")}</span>
                <p className="text-xl font-bold text-gray-900">{insightNumber(stats.totalObjectives)}</p>
              </div>
            </div></div></header>

      {/* Filters */}
      <div className=" ops-quiet-surface">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">{t("All Status")}</option>
              <option value="completed">{t("Completed")}</option>
              <option value="active">{t("Active")}</option>
              <option value="in_progress">{t("In Progress")}</option>
              <option value="draft">{t("Draft")}</option>
              <option value="deferred">{t("Deferred")}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">{t("All Categories")}</option>
              <option value="performance">{t("Performance")}</option>
              <option value="development">{t("Development")}</option>
              <option value="behavioral">{t("Behavioral")}</option>
              <option value="strategic">{t("Strategic")}</option>
              <option value="team">{t("Team")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("Completed")}</p>
              <p className="text-2xl font-bold text-green-600">{insightNumber(stats.completed)}</p>
            </div>
          </div>
        </div>
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("In Progress")}</p>
              <p className="text-2xl font-bold text-blue-600">{insightNumber(stats.inProgress)}</p>
            </div>
          </div>
        </div>
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("Deferred")}</p>
              <p className="text-2xl font-bold text-yellow-600">{insightNumber(stats.deferred)}</p>
            </div>
          </div>
        </div>
        <div className=" ops-quiet-surface">
          <div className="flex items-center gap-3">

            <div>
              <p className="text-sm text-gray-500">{t("Avg Progress")}</p>
              <p className="text-2xl font-bold text-indigo-600">{insightNumber(stats.avgProgress)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("Goals")}</h2>

        {objectives.length === 0 ? (
          <div className="ph-section ops-section">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("No goals found")}</h3>
            <p className="text-gray-500">{t("Try changing the filters or create a new goal.")}</p>
          </div>
        ) : (
          objectives.map((objective) => {
            const isExpanded = expandedObjectives.includes(objective.id);
            const statusConfig = STATUS_CONFIG[objective.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;

            return (
              <div key={objective.id} className="ph-section ops-section">
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleObjective(objective.id)}
                >
                  <div className="flex items-start gap-4">
                    <button className="mt-1 text-gray-400 hover:text-gray-600">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{objective.title}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-sm text-gray-500">
                              <Users className="h-3.5 w-3.5 inline mr-1" />
                              {objective.owner}
                            </span>
                            <span className="text-sm text-gray-500">
                              <Building2 className="h-3.5 w-3.5 inline mr-1" />
                              {objective.ownerDept}
                            </span>
                            {objective.dueDate && (
                              <span className="text-sm text-gray-500">
                                <Calendar className="h-3.5 w-3.5 inline mr-1" />{t("Due")} {new Date(objective.dueDate).toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              objective.priority === 'high' || objective.priority === 'critical' ? 'bg-red-50 text-red-600' :
                              objective.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {insightEnum(objective.priority)}
                            </span>
                          </div>
                        </div>
                        <span className={cn(
                          'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                          statusConfig.bg, statusConfig.color
                        )}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-500">
                            {objective.targetValue != null && objective.currentValue != null
                              ? `${insightNumber(objective.currentValue)} / ${insightNumber(objective.targetValue)} ${objective.unit || ''}`
                              : t("Progress")}
                          </span>
                          <span className="text-sm font-semibold text-gray-700">{insightNumber(objective.progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              objective.status === 'completed' ? 'bg-green-500' :
                              objective.status === 'deferred' || objective.status === 'cancelled' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            )}
                            style={{ width: `${objective.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && objective.description && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5">
                    <div className=" ops-quiet-surface">
                      <p className="text-sm text-gray-600">{objective.description}</p>
                      {objective.targetValue != null && (
                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                          <span>{t("Target:")} {insightNumber(objective.targetValue)} {objective.unit || ''}</span>
                          <span>{t("Current:")} {insightNumber(objective.currentValue ?? 0)} {objective.unit || ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Progress by Category/Department */}
      {categoryProgress.length > 0 && (
        <div className="ph-section ops-section">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t("Goal Progress by Department")}</h3>
              <p className="text-sm text-gray-500">{t("Average progress across departments")}</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categoryProgress.map((cat) => (
              <div key={cat.name} className="ops-record-block">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="35" fill="none"
                      stroke={cat.progress >= 80 ? '#10B981' : cat.progress >= 60 ? '#3B82F6' : '#F59E0B'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(cat.progress / 100) * 220} 220`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">{insightNumber(cat.progress)}%</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700">{cat.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
