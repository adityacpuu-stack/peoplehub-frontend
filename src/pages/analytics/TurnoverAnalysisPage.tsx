import { useState, useEffect } from 'react';
import {
  UserMinus,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Download,
  AlertTriangle,
  BarChart3,
  PieChart,
  Users,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard, type TurnoverAnalytics } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

// Chart colors
const CHART_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16',
];

export function TurnoverAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [analytics, setAnalytics] = useState<TurnoverAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('this_year');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedCompany]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardService.getGroupOverview();
      setData(response);
    } catch (error: any) {
      console.error('Failed to fetch turnover data:', error);
      toast.error('Failed to load turnover analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const companyId = selectedCompany !== 'all' ? parseInt(selectedCompany) : undefined;
      const response = await dashboardService.getTurnoverAnalytics(companyId, selectedPeriod);
      setAnalytics(response);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  // Calculate metrics from analytics
  const metrics = data && analytics ? {
    totalEmployees: data.summary.total_employees,
    newHires: analytics.total_hires_period,
    terminations: analytics.total_exits_period,
    turnoverRate: data.summary.total_employees > 0
      ? ((analytics.total_exits_period / data.summary.total_employees) * 100).toFixed(1)
      : '0.0',
    retentionRate: data.summary.total_employees > 0
      ? (((data.summary.total_employees - analytics.total_exits_period) / data.summary.total_employees) * 100).toFixed(1)
      : '100.0',
    avgTenureAtExit: analytics.avg_tenure_at_exit,
  } : null;

  // Use real data from analytics
  const monthlyTurnover = analytics?.monthly_turnover || [];
  const exitReasons = analytics?.exit_reasons || [];
  const departmentTurnover = analytics?.department_turnover || [];
  const tenureAtExit = analytics?.tenure_at_exit || [];
  const recentExits = analytics?.recent_exits || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-gray-500">Loading turnover analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="turnover-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#turnover-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <UserMinus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Turnover Analysis</h1>
                <p className="text-red-100 text-sm">Track employee exits and retention metrics</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-red-100 text-xs">Turnover Rate</span>
                <p className="text-xl font-bold text-white">{metrics?.turnoverRate || 0}%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-red-100 text-xs">Retention Rate</span>
                <p className="text-xl font-bold text-white">{metrics?.retentionRate || 0}%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-red-100 text-xs">Exits (MTD)</span>
                <p className="text-xl font-bold text-white">{metrics?.terminations || 0}</p>
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
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="all">All Companies</option>
              {data?.companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <button className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">New Hires</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{metrics?.newHires || 0}</p>
                <span className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +12%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <UserMinus className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Exits</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{metrics?.terminations || 0}</p>
                <span className="flex items-center text-xs text-red-600">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  -5%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Change</p>
              <p className={cn(
                "text-2xl font-bold",
                ((metrics?.newHires || 0) - (metrics?.terminations || 0)) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {((metrics?.newHires || 0) - (metrics?.terminations || 0)) >= 0 ? '+' : ''}
                {(metrics?.newHires || 0) - (metrics?.terminations || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Tenure at Exit</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.avgTenureAtExit || 0} yrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Turnover Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monthly Turnover Trend</h3>
              <p className="text-sm text-gray-500">Hires vs exits over time</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          {monthlyTurnover.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              No turnover data available
            </div>
          ) : (
          <>
          <div className="h-48 flex items-end justify-between gap-4">
            {monthlyTurnover.map((month) => {
              const maxValue = Math.max(...monthlyTurnover.map(m => Math.max(m.hires, m.exits)), 1);
              return (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center gap-1 h-40">
                  <div
                    className="w-5 bg-green-500 rounded-t transition-all duration-500"
                    style={{ height: `${(month.hires / maxValue) * 100}%`, minHeight: month.hires > 0 ? '4px' : '0' }}
                    title={`Hires: ${month.hires}`}
                  />
                  <div
                    className="w-5 bg-red-500 rounded-t transition-all duration-500"
                    style={{ height: `${(month.exits / maxValue) * 100}%`, minHeight: month.exits > 0 ? '4px' : '0' }}
                    title={`Exits: ${month.exits}`}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 mt-2">{month.month}</span>
              </div>
            )})}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm text-gray-600">Hires</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-gray-600">Exits</span>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Exit Reasons */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Exit Reasons</h3>
              <p className="text-sm text-gray-500">Why employees leave</p>
            </div>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          {exitReasons.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No exit data available
            </div>
          ) : (
          <div className="space-y-3">
            {exitReasons.map((item, index) => (
              <div key={item.reason}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.reason}</span>
                  <span className="text-sm text-gray-500">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Department Turnover */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Department Turnover</h3>
              <p className="text-sm text-gray-500">Turnover rate by department</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          {departmentTurnover.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No department turnover data available
            </div>
          ) : (
          <div className="space-y-4">
            {departmentTurnover.map((dept) => {
              const maxRate = Math.max(...departmentTurnover.map(d => d.turnoverRate), 6);
              return (
              <div key={dept.name} className="flex items-center gap-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className={cn(
                      "h-full rounded-lg transition-all duration-500",
                      dept.turnoverRate >= 4 ? "bg-red-500" :
                      dept.turnoverRate >= 3 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${(dept.turnoverRate / maxRate) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm font-semibold text-gray-900">{dept.turnoverRate}%</span>
                </div>
                <div className={cn(
                  "w-16 text-right text-sm font-medium",
                  dept.netChange >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {dept.netChange >= 0 ? '+' : ''}{dept.netChange}
                </div>
              </div>
            )})}
          </div>
          )}
        </div>

        {/* Tenure at Exit */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tenure at Exit</h3>
              <p className="text-sm text-gray-500">How long employees stay before leaving</p>
            </div>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          {tenureAtExit.length === 0 || tenureAtExit.every(t => t.count === 0) ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No tenure at exit data available
            </div>
          ) : (
          <>
          <div className="space-y-3">
            {tenureAtExit.map((item, index) => (
              <div key={item.range} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-20">{item.range}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  >
                    {item.count > 0 && <span className="text-xs font-medium text-white ml-2">{item.count}</span>}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">{item.percentage}%</span>
              </div>
            ))}
          </div>
          {(() => {
            const earlyExitPct = tenureAtExit
              .filter(t => t.range === '< 1 year' || t.range === '1-2 years')
              .reduce((sum, t) => sum + t.percentage, 0);
            return earlyExitPct > 40 ? (
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Early Turnover Alert</p>
                  <p className="text-xs text-yellow-700">{earlyExitPct}% of exits occur within first 2 years. Consider improving onboarding and early career development programs.</p>
                </div>
              </div>
            </div>
            ) : null;
          })()}
          </>
          )}
        </div>
      </div>

      {/* Recent Exits Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Exits</h3>
          <p className="text-sm text-gray-500">Latest employee departures</p>
        </div>
        {recentExits.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            No recent exits found
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Position</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Exit Date</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Tenure</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentExits.map((exit, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold">
                        {exit.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 block">{exit.name}</span>
                        <span className="text-xs text-gray-500">{exit.company}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{exit.department}</td>
                  <td className="px-6 py-4 text-gray-600">{exit.position}</td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {exit.exitDate ? new Date(exit.exitDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">{exit.tenure}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      exit.reason === 'Resignation' ? 'bg-yellow-100 text-yellow-700' :
                      exit.reason === 'Contract End' ? 'bg-blue-100 text-blue-700' :
                      exit.reason === 'Retirement' ? 'bg-green-100 text-green-700' :
                      exit.reason === 'Termination' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {exit.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
