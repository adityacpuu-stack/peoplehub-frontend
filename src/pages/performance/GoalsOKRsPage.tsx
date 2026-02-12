import { useState, useEffect } from 'react';
import {
  Target,
  Flag,
  TrendingUp,
  Building2,
  Calendar,
  Download,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  AlertTriangle,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  not_started: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100', label: 'In Progress' },
  at_risk: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'At Risk' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100', label: 'Completed' },
  overdue: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100', label: 'Overdue' },
};

interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  status: keyof typeof STATUS_CONFIG;
}

interface Objective {
  id: string;
  title: string;
  owner: string;
  ownerDept: string;
  progress: number;
  status: keyof typeof STATUS_CONFIG;
  dueDate: string;
  keyResults: KeyResult[];
}

export function GoalsOKRsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('q1_2024');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [expandedObjectives, setExpandedObjectives] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardService.getGroupOverview();
      setData(response);
    } catch (error: any) {
      console.error('Failed to fetch OKR data:', error);
      toast.error('Failed to load goals & OKRs');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Mock company OKRs
  const companyObjectives: Objective[] = [
    {
      id: '1',
      title: 'Increase market share in Southeast Asia',
      owner: 'Leadership Team',
      ownerDept: 'Executive',
      progress: 72,
      status: 'in_progress',
      dueDate: '2024-03-31',
      keyResults: [
        { id: '1-1', title: 'Launch in 3 new countries', target: 3, current: 2, unit: 'countries', status: 'in_progress' },
        { id: '1-2', title: 'Achieve 10% market share in Indonesia', target: 10, current: 7.5, unit: '%', status: 'at_risk' },
        { id: '1-3', title: 'Establish 5 strategic partnerships', target: 5, current: 4, unit: 'partnerships', status: 'in_progress' },
      ],
    },
    {
      id: '2',
      title: 'Improve customer satisfaction and retention',
      owner: 'Customer Success',
      ownerDept: 'Operations',
      progress: 88,
      status: 'in_progress',
      dueDate: '2024-03-31',
      keyResults: [
        { id: '2-1', title: 'Achieve NPS score of 50+', target: 50, current: 48, unit: 'score', status: 'at_risk' },
        { id: '2-2', title: 'Reduce churn rate to below 5%', target: 5, current: 4.2, unit: '%', status: 'completed' },
        { id: '2-3', title: 'Resolve 95% tickets within SLA', target: 95, current: 92, unit: '%', status: 'in_progress' },
      ],
    },
    {
      id: '3',
      title: 'Build world-class engineering team',
      owner: 'VP Engineering',
      ownerDept: 'Engineering',
      progress: 65,
      status: 'at_risk',
      dueDate: '2024-03-31',
      keyResults: [
        { id: '3-1', title: 'Hire 20 senior engineers', target: 20, current: 12, unit: 'hires', status: 'at_risk' },
        { id: '3-2', title: 'Achieve 90% code coverage', target: 90, current: 85, unit: '%', status: 'in_progress' },
        { id: '3-3', title: 'Reduce deployment time by 50%', target: 50, current: 45, unit: '%', status: 'in_progress' },
      ],
    },
    {
      id: '4',
      title: 'Achieve revenue target of $10M ARR',
      owner: 'Sales Team',
      ownerDept: 'Sales',
      progress: 78,
      status: 'in_progress',
      dueDate: '2024-03-31',
      keyResults: [
        { id: '4-1', title: 'Close 50 enterprise deals', target: 50, current: 38, unit: 'deals', status: 'in_progress' },
        { id: '4-2', title: 'Increase average deal size to $50K', target: 50, current: 42, unit: 'K', status: 'at_risk' },
        { id: '4-3', title: 'Achieve 120% quota attainment', target: 120, current: 95, unit: '%', status: 'at_risk' },
      ],
    },
    {
      id: '5',
      title: 'Enhance employee engagement and culture',
      owner: 'P&C Team',
      ownerDept: 'P&C',
      progress: 92,
      status: 'completed',
      dueDate: '2024-03-31',
      keyResults: [
        { id: '5-1', title: 'Achieve eNPS of 40+', target: 40, current: 42, unit: 'score', status: 'completed' },
        { id: '5-2', title: 'Complete 100% performance reviews', target: 100, current: 100, unit: '%', status: 'completed' },
        { id: '5-3', title: 'Launch 4 culture initiatives', target: 4, current: 4, unit: 'initiatives', status: 'completed' },
      ],
    },
  ];

  // Calculate stats
  const stats = {
    totalObjectives: companyObjectives.length,
    totalKeyResults: companyObjectives.reduce((acc, obj) => acc + obj.keyResults.length, 0),
    completed: companyObjectives.filter(o => o.status === 'completed').length,
    inProgress: companyObjectives.filter(o => o.status === 'in_progress').length,
    atRisk: companyObjectives.filter(o => o.status === 'at_risk').length,
    avgProgress: Math.round(companyObjectives.reduce((acc, o) => acc + o.progress, 0) / companyObjectives.length),
  };

  // Filter objectives
  const filteredObjectives = filterStatus === 'all'
    ? companyObjectives
    : companyObjectives.filter(o => o.status === filterStatus);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500">Loading goals & OKRs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="okr-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#okr-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Goals & OKRs</h1>
                <p className="text-indigo-100 text-sm">Track objectives and key results across the organization</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-indigo-100 text-xs">Avg Progress</span>
                <p className="text-xl font-bold text-white">{stats.avgProgress}%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-indigo-100 text-xs">Objectives</span>
                <p className="text-xl font-bold text-white">{stats.totalObjectives}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-indigo-100 text-xs">Key Results</span>
                <p className="text-xl font-bold text-white">{stats.totalKeyResults}</p>
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
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
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
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">All Companies</option>
              {data?.companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="at_risk">At Risk</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>
          <button className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors">
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
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">At Risk</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Target className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Progress</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.avgProgress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* OKRs List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Company Objectives</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add Objective
          </button>
        </div>

        {filteredObjectives.map((objective) => {
          const isExpanded = expandedObjectives.includes(objective.id);
          const statusConfig = STATUS_CONFIG[objective.status];
          const StatusIcon = statusConfig.icon;

          return (
            <div key={objective.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Objective Header */}
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
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">
                            <Users className="h-3.5 w-3.5 inline mr-1" />
                            {objective.owner}
                          </span>
                          <span className="text-sm text-gray-500">
                            <Building2 className="h-3.5 w-3.5 inline mr-1" />
                            {objective.ownerDept}
                          </span>
                          <span className="text-sm text-gray-500">
                            <Calendar className="h-3.5 w-3.5 inline mr-1" />
                            Due {new Date(objective.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                          statusConfig.bg, statusConfig.color
                        )}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </span>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">{objective.keyResults.length} Key Results</span>
                        <span className="text-sm font-semibold text-gray-700">{objective.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            objective.status === 'completed' ? 'bg-green-500' :
                            objective.status === 'at_risk' ? 'bg-yellow-500' :
                            objective.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                          )}
                          style={{ width: `${objective.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Results */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <div className="space-y-4">
                    {objective.keyResults.map((kr) => {
                      const krProgress = Math.round((kr.current / kr.target) * 100);
                      const krStatusConfig = STATUS_CONFIG[kr.status];
                      const KRStatusIcon = krStatusConfig.icon;

                      return (
                        <div key={kr.id} className="bg-white rounded-xl p-4 border border-gray-200">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-start gap-3">
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', krStatusConfig.bg)}>
                                <KRStatusIcon className={cn('h-4 w-4', krStatusConfig.color)} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{kr.title}</p>
                                <p className="text-sm text-gray-500">
                                  {kr.current} / {kr.target} {kr.unit}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{krProgress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                kr.status === 'completed' ? 'bg-green-500' :
                                kr.status === 'at_risk' ? 'bg-yellow-500' :
                                kr.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                              )}
                              style={{ width: `${Math.min(krProgress, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Overview by Department */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">OKR Progress by Department</h3>
            <p className="text-sm text-gray-500">How each department is tracking their objectives</p>
          </div>
          <Building2 className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Executive', 'Engineering', 'Sales', 'Operations', 'HR'].map((dept, index) => {
            const progress = [78, 72, 85, 68, 92][index];
            return (
              <div key={dept} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke={progress >= 80 ? '#10B981' : progress >= 60 ? '#3B82F6' : '#F59E0B'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(progress / 100) * 220} 220`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">{progress}%</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700">{dept}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
