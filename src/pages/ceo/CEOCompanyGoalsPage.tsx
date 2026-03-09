import { useEffect, useState } from 'react';
import {
  Target,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
  Users,
  Award,
  Loader2,
} from 'lucide-react';
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
      case 'completed': return 'Completed';
      case 'active': return 'Active';
      case 'in_progress': return 'In Progress';
      case 'deferred': return 'Deferred';
      case 'cancelled': return 'Cancelled';
      case 'draft': return 'Draft';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="goals-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#goals-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Award className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Company Goals</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Strategic objectives & targets</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Target className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Goals</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.onTrack}</p>
          <p className="text-xs text-gray-500">Active / In Progress</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.atRisk}</p>
          <p className="text-xs text-gray-500">Deferred / Cancelled</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All Goals', color: 'indigo' },
          { key: 'active', label: 'Active', color: 'blue' },
          { key: 'in_progress', label: 'In Progress', color: 'blue' },
          { key: 'completed', label: 'Completed', color: 'green' },
          { key: 'draft', label: 'Draft', color: 'gray' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filter === key ? `bg-${color}-600 text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={filter === key ? {
              backgroundColor: color === 'indigo' ? '#4f46e5' : color === 'blue' ? '#2563eb' : color === 'green' ? '#16a34a' : '#4b5563'
            } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Goals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-gray-500 text-sm">Loading goals...</p>
          </div>
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals found</h3>
          <p className="text-gray-500">Try changing the filter or create a new goal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const CategoryIcon = categoryIcons[goal.category] || Target;
            const color = categoryColors[goal.category] || '#6b7280';
            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
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
                          goal.priority === 'high' || goal.priority === 'critical' ? 'bg-red-50 text-red-600' :
                          goal.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
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
                          <span>Due: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                          <span>{goal.current_value}{goal.unit_of_measure || ''} / {goal.target_value}{goal.unit_of_measure || ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium text-gray-700">{goal.progress_percentage}%</span>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
