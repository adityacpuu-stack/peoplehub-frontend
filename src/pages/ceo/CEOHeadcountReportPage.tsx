import { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Calendar,
  Target,
  BarChart2,
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
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import {
  dashboardService,
  type HeadcountAnalytics,
  type GroupDashboard,
} from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

export function CEOHeadcountReportPage() {
  const [headcountData, setHeadcountData] = useState<HeadcountAnalytics | null>(null);
  const [groupData, setGroupData] = useState<GroupDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [headcount, group] = await Promise.all([
          dashboardService.getHeadcountAnalytics(),
          dashboardService.getGroupOverview(),
        ]);

        setHeadcountData(headcount);
        setGroupData(group);
      } catch (err: any) {
        console.error('Failed to fetch headcount data:', err);
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

  const headcountTrend = headcountData?.headcount_trend || [];
  const quarterlyComparison = headcountData?.quarterly_comparison || [];
  const headcountByCompany = headcountData?.headcount_by_company || [];
  const departmentHeadcount = headcountData?.department_headcount || [];
  const headcountForecast = headcountData?.headcount_forecast || [];
  const currentHeadcount = headcountData?.current_headcount || groupData?.summary?.total_employees || 0;
  const yearEndTarget = headcountData?.year_end_target || 0;

  const summary = groupData?.summary || {
    new_hires_this_month: 0,
    terminations_this_month: 0,
    total_companies: 0,
  };

  const netGrowth = summary.new_hires_this_month - summary.terminations_this_month;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="headcount-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#headcount-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Headcount Report</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Workforce size & trends</p>
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
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            {netGrowth !== 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${netGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(netGrowth)}
              </span>
            )}
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{formatNumber(currentHeadcount)}</p>
          <p className="text-xs text-gray-500">Current Headcount</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">+{summary.new_hires_this_month}</p>
          <p className="text-xs text-gray-500">New Hires (This Month)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">-{summary.terminations_this_month}</p>
          <p className="text-xs text-gray-500">Exits (This Month)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Target className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{formatNumber(yearEndTarget || currentHeadcount)}</p>
          <p className="text-xs text-gray-500">Year-End Target</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Headcount Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Headcount Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Monthly headcount over time</p>
            </div>
          </div>
          <div className="h-56 md:h-72">
            {headcountTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={headcountTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area type="monotone" dataKey="headcount" stroke="#6366f1" strokeWidth={3} fill="url(#colorHC)" name="Headcount" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No headcount trend data available
              </div>
            )}
          </div>
        </div>

        {/* Hires vs Exits */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Hires vs Exits</h3>
              <p className="text-xs text-gray-500 mt-1">Monthly workforce changes</p>
            </div>
          </div>
          <div className="h-56 md:h-72">
            {headcountTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcountTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="hires" fill="#10b981" name="Hires" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exits" fill="#ef4444" name="Exits" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Headcount by Company */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Headcount by Company</h3>
          <p className="text-xs text-gray-500 mt-1">Distribution across companies</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Headcount</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Growth</th>
                <th className="text-center px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">New Hires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {headcountByCompany.length > 0 ? headcountByCompany.map((company, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{company.name}</p>
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center">
                    <span className="font-bold text-gray-900">{company.headcount}</span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                      company.growth.startsWith('+') ? 'bg-green-100 text-green-700' :
                      company.growth.startsWith('-') ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {company.growth}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-4 text-center hidden md:table-cell">
                    <span className="text-green-600 font-medium">+{company.hires}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No company headcount data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Distribution */}
      {departmentHeadcount.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Department Distribution</h3>
              <p className="text-xs text-gray-500 mt-1">Headcount by department</p>
            </div>
          </div>
          <div className="space-y-3">
            {departmentHeadcount.slice(0, 8).map((dept, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    <span className="text-xs text-gray-500">{dept.employees} ({dept.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
