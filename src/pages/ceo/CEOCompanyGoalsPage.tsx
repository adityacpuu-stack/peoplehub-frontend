import { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Building2,
} from 'lucide-react';

// Mock data for company goals
const mockGoals = [
  {
    id: 1,
    title: 'Increase Employee Retention',
    description: 'Reduce employee turnover rate to below 10% annually',
    category: 'People',
    status: 'on_track',
    progress: 75,
    target: 10,
    current: 8.5,
    unit: '%',
    dueDate: '2024-12-31',
    owner: 'P&C Department',
    priority: 'high',
  },
  {
    id: 2,
    title: 'Expand Workforce',
    description: 'Grow total headcount to 500 employees across all companies',
    category: 'Growth',
    status: 'at_risk',
    progress: 60,
    target: 500,
    current: 300,
    unit: ' employees',
    dueDate: '2024-12-31',
    owner: 'Executive Team',
    priority: 'high',
  },
  {
    id: 3,
    title: 'Improve Attendance Rate',
    description: 'Achieve 95% average attendance rate across all departments',
    category: 'Operations',
    status: 'on_track',
    progress: 92,
    target: 95,
    current: 87.4,
    unit: '%',
    dueDate: '2024-06-30',
    owner: 'Operations',
    priority: 'medium',
  },
  {
    id: 4,
    title: 'Digital Transformation',
    description: 'Implement automated HR systems across all companies',
    category: 'Technology',
    status: 'completed',
    progress: 100,
    target: 100,
    current: 100,
    unit: '%',
    dueDate: '2024-03-31',
    owner: 'IT Department',
    priority: 'high',
  },
  {
    id: 5,
    title: 'Training & Development',
    description: 'Ensure 80% of employees complete required training',
    category: 'People',
    status: 'on_track',
    progress: 68,
    target: 80,
    current: 54.4,
    unit: '%',
    dueDate: '2024-09-30',
    owner: 'Learning & Development',
    priority: 'medium',
  },
];

const categoryColors: Record<string, string> = {
  People: '#8b5cf6',
  Growth: '#10b981',
  Operations: '#f59e0b',
  Technology: '#6366f1',
  Finance: '#ef4444',
};

const categoryIcons: Record<string, React.ElementType> = {
  People: Users,
  Growth: TrendingUp,
  Operations: Building2,
  Technology: Target,
  Finance: DollarSign,
};

export function CEOCompanyGoalsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [_selectedGoal, setSelectedGoal] = useState<typeof mockGoals[0] | null>(null);

  const filteredGoals = filter === 'all'
    ? mockGoals
    : mockGoals.filter(g => g.status === filter);

  const stats = {
    total: mockGoals.length,
    completed: mockGoals.filter(g => g.status === 'completed').length,
    onTrack: mockGoals.filter(g => g.status === 'on_track').length,
    atRisk: mockGoals.filter(g => g.status === 'at_risk').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'on_track': return 'bg-blue-100 text-blue-700';
      case 'at_risk': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'on_track': return 'On Track';
      case 'at_risk': return 'At Risk';
      default: return status;
    }
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
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10 transition-colors">
              <Plus className="h-4 w-4" />
              Add Goal
            </button>
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
          <p className="text-xs text-gray-500">On Track</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.atRisk}</p>
          <p className="text-xs text-gray-500">At Risk</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Goals
        </button>
        <button
          onClick={() => setFilter('on_track')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'on_track' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          On Track
        </button>
        <button
          onClick={() => setFilter('at_risk')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'at_risk' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          At Risk
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.map((goal) => {
          const CategoryIcon = categoryIcons[goal.category] || Target;
          return (
            <div
              key={goal.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedGoal(goal)}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${categoryColors[goal.category]}15` }}
                >
                  <CategoryIcon className="h-6 w-6" style={{ color: categoryColors[goal.category] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900">{goal.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(goal.status)}`}>
                        {getStatusLabel(goal.status)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                        goal.priority === 'high' ? 'bg-red-50 text-red-600' :
                        goal.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(goal.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{goal.owner}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Target className="h-4 w-4" />
                      <span>{goal.current}{goal.unit} / {goal.target}{goal.unit}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium text-gray-700">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: goal.status === 'completed' ? '#10b981' :
                            goal.status === 'on_track' ? '#6366f1' : '#ef4444',
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

      {filteredGoals.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals found</h3>
          <p className="text-gray-500">Try changing the filter or create a new goal.</p>
        </div>
      )}
    </div>
  );
}
