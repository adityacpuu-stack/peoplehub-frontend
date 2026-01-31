import { useEffect, useState } from 'react';
import {
  TrendingDown,
  Users,
  UserMinus,
  UserPlus,
  Clock,
  AlertCircle,
  Calendar,
  Building2,
  ArrowRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type TurnoverAnalytics,
} from '@/services/dashboard.service';

export function CEOTurnoverReportPage() {
  const [turnoverData, setTurnoverData] = useState<TurnoverAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const turnover = await dashboardService.getTurnoverAnalytics();
        setTurnoverData(turnover);
      } catch (err: any) {
        console.error('Failed to fetch turnover data:', err);
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

  const monthlyTurnover = turnoverData?.monthly_turnover || [];
  const exitReasons = turnoverData?.exit_reasons || [];
  const departmentTurnover = turnoverData?.department_turnover || [];
  const tenureAtExit = turnoverData?.tenure_at_exit || [];
  const recentExits = turnoverData?.recent_exits || [];
  const avgTenureAtExit = turnoverData?.avg_tenure_at_exit || 0;
  const totalExits = turnoverData?.total_exits_period || 0;
  const totalHires = turnoverData?.total_hires_period || 0;

  // Calculate average turnover rate
  const avgTurnoverRate = monthlyTurnover.length > 0
    ? (monthlyTurnover.reduce((sum, m) => sum + m.rate, 0) / monthlyTurnover.length).toFixed(1)
    : '0';

  // Colors for pie chart
  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="turnover-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#turnover-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-red-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingDown className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Turnover Analysis</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Employee exit trends & insights</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-xl text-xs md:text-sm text-white font-medium border border-white/10 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Last 12 Months
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{avgTurnoverRate}%</p>
          <p className="text-xs text-gray-500">Avg Turnover Rate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <UserMinus className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{totalExits}</p>
          <p className="text-xs text-gray-500">Total Exits (Period)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <UserPlus className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{totalHires}</p>
          <p className="text-xs text-gray-500">Total Hires (Period)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{avgTenureAtExit.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Avg Tenure at Exit (Years)</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Turnover Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Turnover Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Monthly turnover rate</p>
            </div>
          </div>
          <div className="h-56 md:h-72">
            {monthlyTurnover.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTurnover} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2 }} name="Turnover Rate" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No turnover trend data available
              </div>
            )}
          </div>
        </div>

        {/* Exit Reasons */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Exit Reasons</h3>
              <p className="text-xs text-gray-500 mt-1">Why employees leave</p>
            </div>
          </div>
          {exitReasons.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exitReasons}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {exitReasons.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {exitReasons.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs md:text-sm font-medium text-gray-700">{item.reason}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs md:text-sm font-bold text-gray-900">{item.count}</span>
                      <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              No exit reason data available
            </div>
          )}
        </div>
      </div>

      {/* Department Turnover */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Turnover by Department</h3>
          <p className="text-xs text-gray-500 mt-1">Department-level turnover analysis</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Turnover Rate</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Exits</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Hires</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Net Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departmentTurnover.length > 0 ? departmentTurnover.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-4">
                    <p className="font-semibold text-gray-900 text-sm">{dept.name}</p>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                      dept.turnoverRate <= 5 ? 'bg-green-100 text-green-700' :
                      dept.turnoverRate <= 10 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {dept.turnoverRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden sm:table-cell">
                    <span className="text-red-600 font-medium">-{dept.exits}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden md:table-cell">
                    <span className="text-green-600 font-medium">+{dept.hires}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden lg:table-cell">
                    <span className={`font-bold ${dept.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dept.netChange >= 0 ? '+' : ''}{dept.netChange}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No department turnover data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Exits */}
      {recentExits.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Recent Exits</h3>
              <p className="text-xs text-gray-500 mt-1">Latest employee departures</p>
            </div>
          </div>
          <div className="space-y-3">
            {recentExits.slice(0, 5).map((exit, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <UserMinus className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{exit.name}</p>
                  <p className="text-xs text-gray-500">{exit.position} • {exit.department}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-gray-700">{exit.reason}</p>
                  <p className="text-xs text-gray-400">{exit.exitDate} • {exit.tenure}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
