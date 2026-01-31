import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  Target,
  Clock,
  AlertCircle,
  Calendar,
  BarChart2,
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
import {
  dashboardService,
  type GroupDashboard,
  type TurnoverAnalytics,
} from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

export function CEODepartmentReportPage() {
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [turnoverData, setTurnoverData] = useState<TurnoverAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [group, turnover] = await Promise.all([
          dashboardService.getGroupOverview(),
          dashboardService.getTurnoverAnalytics(),
        ]);

        setGroupData(group);
        setTurnoverData(turnover);
      } catch (err: any) {
        console.error('Failed to fetch department data:', err);
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

  const departmentDistribution = groupData?.department_distribution || [];
  const departmentTurnover = turnoverData?.department_turnover || [];
  const summary = groupData?.summary || {
    total_departments: 0,
    total_employees: 0,
    avg_attendance_rate: 0,
  };

  // Find largest department
  const largestDept = departmentDistribution.length > 0
    ? departmentDistribution.reduce((a, b) => a.employees > b.employees ? a : b)
    : null;

  // Average headcount per department
  const avgHeadcount = summary.total_departments > 0
    ? Math.round(summary.total_employees / summary.total_departments)
    : 0;

  // Colors
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#14b8a6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dept-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dept-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Department Performance</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Departmental insights & metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-xl text-xs md:text-sm text-white font-medium border border-white/10 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.total_departments}</p>
          <p className="text-xs text-gray-500">Total Departments</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{avgHeadcount}</p>
          <p className="text-xs text-gray-500">Avg Headcount/Dept</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <Target className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">
            {summary.avg_attendance_rate > 0 ? `${summary.avg_attendance_rate.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Avg Attendance</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{largestDept?.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">Largest Department</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Department Size Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Department Size</h3>
              <p className="text-xs text-gray-500 mt-1">Employees by department</p>
            </div>
          </div>
          <div className="h-56 md:h-72">
            {departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentDistribution.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="employees" fill="#6366f1" radius={[0, 4, 4, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No department data available
              </div>
            )}
          </div>
        </div>

        {/* Department Distribution Pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Workforce Distribution</h3>
              <p className="text-xs text-gray-500 mt-1">By department percentage</p>
            </div>
          </div>
          <div className="h-56 md:h-72">
            {departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentDistribution.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="employees"
                    nameKey="name"
                  >
                    {departmentDistribution.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} employees`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No department data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Turnover */}
      {departmentTurnover.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-base md:text-lg font-bold text-gray-900">Department Turnover</h3>
            <p className="text-xs text-gray-500 mt-1">Turnover rate by department</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Turnover</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Exits</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Hires</th>
                  <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departmentTurnover.map((dept, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                        >
                          <Building2 className="h-4 w-4" style={{ color: COLORS[index % COLORS.length] }} />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{dept.name}</p>
                      </div>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900">All Departments</h3>
            <p className="text-xs text-gray-500 mt-1">Size distribution</p>
          </div>
        </div>
        <div className="space-y-3">
          {departmentDistribution.map((dept, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${COLORS[index % COLORS.length]}15` }}
              >
                <Building2 className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                  <span className="text-xs text-gray-500">{dept.employees} employees ({dept.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(dept.percentage, 100)}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
