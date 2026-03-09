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
import { attendanceService } from '@/services/attendance.service';
import type { Attendance } from '@/types';
import toast from 'react-hot-toast';

function getWeekDates(): { start: string; end: string; days: { date: string; label: string }[] } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const days = [];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ date: d.toISOString().split('T')[0], label: labels[i] });
  }

  return {
    start: days[0].date,
    end: days[4].date,
    days,
  };
}

export function AttendanceReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [weeklyAttendance, setWeeklyAttendance] = useState<{ day: string; present: number; late: number; absent: number }[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('this_week');
  const [selectedCompany, setSelectedCompany] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [groupData, weekData] = await Promise.all([
        dashboardService.getGroupOverview(),
        fetchWeeklyAttendance(),
      ]);
      setData(groupData);
      setWeeklyAttendance(weekData);
    } catch (error: any) {
      console.error('Failed to fetch attendance data:', error);
      toast.error('Failed to load attendance reports');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeeklyAttendance = async () => {
    const week = getWeekDates();
    try {
      const result = await attendanceService.getAll({
        start_date: week.start,
        end_date: week.end,
        limit: 5000,
      });
      const records = result.data || [];

      return week.days.map(({ date, label }) => {
        const dayRecords = records.filter((r: Attendance) => {
          const recDate = new Date(r.date).toISOString().split('T')[0];
          return recDate === date;
        });
        const total = dayRecords.length || 1;
        const late = dayRecords.filter((r: Attendance) => r.status === 'late').length;
        const absent = dayRecords.filter((r: Attendance) => r.status === 'absent').length;
        const present = dayRecords.filter((r: Attendance) =>
          r.status === 'present' || r.status === 'late' || (r.check_in && r.status !== 'absent')
        ).length;
        return {
          day: label,
          present: total > 0 ? Math.round((present / total) * 100) : 0,
          late: total > 0 ? Math.round((late / total) * 100) : 0,
          absent: total > 0 ? Math.round((absent / total) * 100) : 0,
        };
      });
    } catch {
      return [];
    }
  };

  // Derive stats from group dashboard data
  const totalEmployees = data?.summary?.total_employees || 0;
  const onLeaveToday = data?.summary?.total_on_leave_today || 0;
  const avgAttendanceRate = data?.summary?.avg_attendance_rate || 0;
  const presentToday = totalEmployees > 0 ? Math.round(totalEmployees * (avgAttendanceRate / 100)) : 0;
  const lateToday = weeklyAttendance.length > 0 ? Math.round(totalEmployees * (weeklyAttendance[weeklyAttendance.length - 1]?.late || 0) / 100) : 0;
  const absentToday = totalEmployees - presentToday - onLeaveToday;

  // Department distribution from dashboard
  const departmentData = data?.department_distribution || [];

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
                <p className="text-xl font-bold text-white">{avgAttendanceRate}%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-blue-100 text-xs">Present Today</span>
                <p className="text-xl font-bold text-white">{presentToday}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10">
                <span className="text-blue-100 text-xs">On Leave</span>
                <p className="text-xl font-bold text-white">{onLeaveToday}</p>
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
              <p className="text-2xl font-bold text-gray-900">{presentToday}</p>
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
              <p className="text-2xl font-bold text-gray-900">{lateToday}</p>
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
              <p className="text-2xl font-bold text-gray-900">{Math.max(absentToday, 0)}</p>
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
              <p className="text-2xl font-bold text-gray-900">{onLeaveToday}</p>
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
          {weeklyAttendance.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-400">No attendance data for this week</p>
            </div>
          )}
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Department Distribution</h3>
              <p className="text-sm text-gray-500">Employee count by department</p>
            </div>
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          {departmentData.length > 0 ? (
            <div className="space-y-4">
              {departmentData.slice(0, 8).map((dept) => (
                <div key={dept.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                    <span className="text-sm text-gray-500">{dept.employees} ({dept.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-blue-500"
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-400">No department data available</p>
            </div>
          )}
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
                              company.attendance_rate >= 75 ? "bg-yellow-500" :
                              company.attendance_rate < 0 ? "bg-gray-300" : "bg-red-500"
                            )}
                            style={{ width: `${Math.max(company.attendance_rate, 0)}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900">
                          {company.attendance_rate >= 0 ? `${company.attendance_rate}%` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{company.on_leave_today}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        company.attendance_rate >= 90 ? 'bg-green-100 text-green-700' :
                        company.attendance_rate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        company.attendance_rate < 0 ? 'bg-gray-100 text-gray-500' :
                        'bg-red-100 text-red-700'
                      )}>
                        {company.attendance_rate >= 90 ? 'Excellent' :
                         company.attendance_rate >= 75 ? 'Good' :
                         company.attendance_rate < 0 ? 'N/A' : 'Needs Attention'}
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
