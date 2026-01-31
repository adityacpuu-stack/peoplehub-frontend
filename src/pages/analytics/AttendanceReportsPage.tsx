import { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService, type GroupDashboard } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

export function AttendanceReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('this_week');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [_currentDate, _setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardService.getGroupOverview();
      setData(response);
    } catch (error: any) {
      console.error('Failed to fetch attendance data:', error);
      toast.error('Failed to load attendance reports');
    } finally {
      setIsLoading(false);
    }
  };

  // Mock weekly attendance data
  const weeklyAttendance = [
    { day: 'Mon', present: 92, late: 5, absent: 3 },
    { day: 'Tue', present: 88, late: 7, absent: 5 },
    { day: 'Wed', present: 95, late: 3, absent: 2 },
    { day: 'Thu', present: 90, late: 6, absent: 4 },
    { day: 'Fri', present: 85, late: 8, absent: 7 },
  ];

  // Mock monthly trend
  const monthlyTrend = [
    { month: 'Jan', rate: 92 },
    { month: 'Feb', rate: 89 },
    { month: 'Mar', rate: 94 },
    { month: 'Apr', rate: 91 },
    { month: 'May', rate: 93 },
    { month: 'Jun', rate: 88 },
  ];

  // Mock attendance by department
  const departmentAttendance = [
    { name: 'Engineering', rate: 94, present: 47, total: 50 },
    { name: 'Marketing', rate: 91, present: 32, total: 35 },
    { name: 'Sales', rate: 88, present: 44, total: 50 },
    { name: 'Finance', rate: 96, present: 24, total: 25 },
    { name: 'HR', rate: 93, present: 14, total: 15 },
    { name: 'Operations', rate: 89, present: 40, total: 45 },
  ];

  // Mock late arrivals leaderboard
  const lateArrivals = [
    { name: 'John Doe', department: 'Sales', lateCount: 8, avgMinutes: 15 },
    { name: 'Jane Smith', department: 'Marketing', lateCount: 6, avgMinutes: 12 },
    { name: 'Mike Johnson', department: 'Engineering', lateCount: 5, avgMinutes: 20 },
    { name: 'Sarah Wilson', department: 'Operations', lateCount: 4, avgMinutes: 10 },
    { name: 'Tom Brown', department: 'Finance', lateCount: 3, avgMinutes: 8 },
  ];

  // Quick stats
  const stats = {
    avgAttendanceRate: data?.summary?.avg_attendance_rate || 91,
    onLeaveToday: data?.summary?.total_on_leave_today || 12,
    totalEmployees: data?.summary?.total_employees || 300,
    presentToday: Math.round((data?.summary?.total_employees || 300) * 0.88),
  };

  const maxBarHeight = 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading attendance reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="attendance-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#attendance-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Attendance Reports</h1>
                <p className="text-blue-100 text-sm">Monitor and analyze attendance patterns</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-blue-100 text-xs">Avg Rate</span>
                <p className="text-xl font-bold text-white">{stats.avgAttendanceRate}%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-blue-100 text-xs">Present Today</span>
                <p className="text-xl font-bold text-white">{stats.presentToday}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-blue-100 text-xs">On Leave</span>
                <p className="text-xl font-bold text-white">{stats.onLeaveToday}</p>
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
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="all">All Companies</option>
              {data?.companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <button className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-2xl font-bold text-gray-900">{stats.presentToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Late</p>
              <p className="text-2xl font-bold text-gray-900">18</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Absent</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">On Leave</p>
              <p className="text-2xl font-bold text-gray-900">{stats.onLeaveToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Weekly Attendance</h3>
              <p className="text-sm text-gray-500">Attendance breakdown by day</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {weeklyAttendance.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse gap-1" style={{ height: maxBarHeight }}>
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${(day.present / 100) * maxBarHeight}px` }}
                    title={`Present: ${day.present}%`}
                  />
                  <div
                    className="w-full bg-yellow-500"
                    style={{ height: `${(day.late / 100) * maxBarHeight}px` }}
                    title={`Late: ${day.late}%`}
                  />
                  <div
                    className="w-full bg-red-500 rounded-b"
                    style={{ height: `${(day.absent / 100) * maxBarHeight}px` }}
                    title={`Absent: ${day.absent}%`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600 mt-2">{day.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span className="text-sm text-gray-600">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-gray-600">Absent</span>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monthly Trend</h3>
              <p className="text-sm text-gray-500">Attendance rate over months</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="relative h-48">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-400">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
            </div>
            {/* Chart area */}
            <div className="ml-10 h-full flex items-end justify-between gap-4">
              {monthlyTrend.map((month) => (
                <div key={month.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: `${month.rate}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700">
                      {month.rate}%
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 mt-2">{month.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Department Attendance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Department Attendance</h3>
              <p className="text-sm text-gray-500">Attendance rate by department</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {departmentAttendance.map((dept) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                  <span className="text-sm text-gray-500">{dept.present}/{dept.total} ({dept.rate}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      dept.rate >= 95 ? "bg-green-500" :
                      dept.rate >= 90 ? "bg-blue-500" :
                      dept.rate >= 85 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${dept.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Frequent Late Arrivals</h3>
              <p className="text-sm text-gray-500">Employees with most late check-ins</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {lateArrivals.map((person, index) => (
              <div key={person.name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                  index === 0 ? "bg-red-500" :
                  index === 1 ? "bg-orange-500" :
                  index === 2 ? "bg-yellow-500" : "bg-gray-400"
                )}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{person.name}</p>
                  <p className="text-xs text-gray-500">{person.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{person.lateCount}x late</p>
                  <p className="text-xs text-gray-500">Avg {person.avgMinutes} min</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Company Attendance Table */}
      {data?.companies && data.companies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Company Attendance Summary</h3>
            <p className="text-sm text-gray-500">Attendance metrics by company</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Employees</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Attendance Rate</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">On Leave Today</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {company.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{company.employees}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              company.attendance_rate >= 90 ? "bg-green-500" :
                              company.attendance_rate >= 75 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${company.attendance_rate}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900">{company.attendance_rate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{company.on_leave_today}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        company.attendance_rate >= 90 ? 'bg-green-100 text-green-700' :
                        company.attendance_rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {company.attendance_rate >= 90 ? 'Excellent' :
                         company.attendance_rate >= 75 ? 'Good' : 'Needs Attention'}
                      </span>
                    </td>
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
