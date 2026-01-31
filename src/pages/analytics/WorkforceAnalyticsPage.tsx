import { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Briefcase,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Download,
  Calendar,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard, type WorkforceAnalytics } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

// Chart colors
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function WorkforceAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [analytics, setAnalytics] = useState<WorkforceAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCompany]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardService.getGroupOverview();
      setData(response);
    } catch (error: any) {
      console.error('Failed to fetch workforce data:', error);
      toast.error('Failed to load workforce analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const companyId = selectedCompany !== 'all' ? parseInt(selectedCompany) : undefined;
      const response = await dashboardService.getWorkforceAnalytics(companyId);
      setAnalytics(response);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  // Calculate workforce metrics
  const metrics = data ? {
    totalEmployees: data.summary.total_employees,
    activeRate: data.summary.total_employees > 0
      ? Math.round((data.summary.total_employees - data.summary.terminations_this_month) / data.summary.total_employees * 100)
      : 0,
    newHires: data.summary.new_hires_this_month,
    terminations: data.summary.terminations_this_month,
    departments: data.summary.total_departments,
    companies: data.summary.total_companies,
    avgAttendance: data.summary.avg_attendance_rate,
  } : null;

  // Use real data from analytics
  const genderDistribution = analytics?.gender_distribution || [];
  const employmentTypes = analytics?.employment_type_distribution || [];
  const ageDistribution = analytics?.age_distribution || [];
  const tenureDistribution = analytics?.tenure_distribution || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          <p className="text-gray-500">Loading workforce analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="workforce-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#workforce-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Workforce Analytics</h1>
                <p className="text-amber-100 text-sm">Comprehensive workforce composition and demographics</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-amber-100 text-xs">Total Employees</span>
                <p className="text-xl font-bold text-white">{metrics?.totalEmployees || 0}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-amber-100 text-xs">Departments</span>
                <p className="text-xl font-bold text-white">{metrics?.departments || 0}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-amber-100 text-xs">Companies</span>
                <p className="text-xl font-bold text-white">{metrics?.companies || 0}</p>
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
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="all">All Companies</option>
              {data?.companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <button className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Workforce</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.totalEmployees || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">New Hires</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{metrics?.newHires || 0}</p>
                <span className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  This month
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Terminations</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{metrics?.terminations || 0}</p>
                <span className="flex items-center text-xs text-red-600">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  This month
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.avgAttendance || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Department Distribution</h3>
              <p className="text-sm text-gray-500">Employees by department</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          {(!data?.department_distribution || data.department_distribution.length === 0) ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No department data available
            </div>
          ) : (
          <div className="space-y-4">
            {data.department_distribution.slice(0, 6).map((dept, index) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                  <span className="text-sm text-gray-500">{dept.employees} ({dept.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${dept.percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Employment Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Employment Type</h3>
              <p className="text-sm text-gray-500">Breakdown by employment status</p>
            </div>
            <Briefcase className="h-5 w-5 text-gray-400" />
          </div>
          {employmentTypes.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No employment type data available
            </div>
          ) : (
          <>
          <div className="flex items-center justify-center mb-6">
            {/* Simple donut representation */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {employmentTypes.reduce((acc, item, index) => {
                  const startAngle = acc.offset;
                  const angle = (item.value / 100) * 360;
                  const endAngle = startAngle + angle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);

                  const largeArc = angle > 180 ? 1 : 0;

                  acc.paths.push(
                    <path
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  );
                  acc.offset = endAngle;
                  return acc;
                }, { paths: [] as JSX.Element[], offset: 0 }).paths}
                <circle cx="50" cy="50" r="25" fill="white" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">100%</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {employmentTypes.map((type) => (
              <div key={type.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                <span className="text-sm text-gray-600">{type.label}</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{type.value}%</span>
              </div>
            ))}
          </div>
          </>
          )}
        </div>

        {/* Age Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Age Distribution</h3>
              <p className="text-sm text-gray-500">Workforce demographics by age</p>
            </div>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          {ageDistribution.length === 0 || ageDistribution.every(a => a.count === 0) ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No age data available
            </div>
          ) : (
          <div className="space-y-3">
            {ageDistribution.map((age, index) => (
              <div key={age.range} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-20">{age.range}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center"
                    style={{
                      width: `${age.percentage}%`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  >
                    {age.count > 0 && <span className="text-xs font-medium text-white ml-2">{age.count}</span>}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">{age.percentage}%</span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Tenure Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tenure Distribution</h3>
              <p className="text-sm text-gray-500">Years of service breakdown</p>
            </div>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          {tenureDistribution.length === 0 || tenureDistribution.every(t => t.count === 0) ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No tenure data available
            </div>
          ) : (
          <div className="space-y-3">
            {tenureDistribution.map((tenure, index) => (
              <div key={tenure.range} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-20">{tenure.range}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center"
                    style={{
                      width: `${tenure.percentage}%`,
                      backgroundColor: CHART_COLORS[(index + 5) % CHART_COLORS.length],
                    }}
                  >
                    {tenure.count > 0 && <span className="text-xs font-medium text-white ml-2">{tenure.count}</span>}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">{tenure.percentage}%</span>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Company Overview Table */}
      {data?.companies && data.companies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Company Workforce Overview</h3>
            <p className="text-sm text-gray-500">Employee distribution across companies</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Active</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Attendance Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">New Hires</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">On Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {company.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-900">{company.employees}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{company.active_employees}</td>
                    <td className="px-6 py-4 text-center">
                      {company.attendance_rate < 0 ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          N/A
                        </span>
                      ) : (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          company.attendance_rate >= 90 ? 'bg-green-100 text-green-700' :
                          company.attendance_rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {company.attendance_rate}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-green-600 font-medium">+{company.new_hires_this_month}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{company.on_leave_today}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
