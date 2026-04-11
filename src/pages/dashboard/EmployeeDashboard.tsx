import {
  Users,
  Clock,
  Calendar,
  Activity,
  ArrowRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyDashboard } from '@/services/dashboard.service';

interface Props {
  user: { employee?: { name?: string }; email?: string } | null;
  myDashboard: MyDashboard | null;
  greeting: () => string;
}

export function EmployeeDashboard({ user, myDashboard, greeting }: Props) {
  // Use real data from API or fallback to empty arrays
  const attendanceHistory = myDashboard?.attendance_history || [];
  const leaveBalance = myDashboard?.leave_balance || [];
  const recentRequests = myDashboard?.recent_requests || [];
  const announcements = myDashboard?.announcements || [];
  const attendance = myDashboard?.attendance;
  const pendingRequestsCount = myDashboard?.pending_requests || { leave: 0, overtime: 0 };

  const totalLeaveRemaining = leaveBalance.reduce((sum, b) => sum + b.remaining, 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-green-100 text-green-700',
      late: 'bg-amber-100 text-amber-700',
      on_leave: 'bg-purple-100 text-purple-700',
      absent: 'bg-red-100 text-red-700',
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      present: 'Present',
      late: 'Late',
      on_leave: 'On Leave',
      absent: 'Absent',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Banner - Employee Style */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-xl md:rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-5 md:py-10 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="employee-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#employee-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                <div className="w-11 h-11 md:w-14 md:h-14 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                  <Users className="h-5 w-5 md:h-7 md:w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-3xl font-bold text-white">
                    {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                  </h1>
                  <p className="text-cyan-100 text-xs md:text-sm mt-0.5 md:mt-1">Welcome to your personal dashboard</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3 md:mt-4">
                <span className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 bg-white/20 backdrop-blur-xl rounded-lg md:rounded-xl text-xs md:text-sm text-white font-medium border border-white/10">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {totalLeaveRemaining} Days Leave
                </span>
                {attendance && (
                  <span className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 backdrop-blur-xl rounded-lg md:rounded-xl text-xs md:text-sm font-medium border ${
                    attendance.today_status === 'checked_in' || attendance.today_status === 'checked_out' ? 'bg-green-500/20 text-green-100 border-green-500/20' :
                    attendance.today_status === 'on_leave' ? 'bg-purple-500/20 text-purple-100 border-purple-500/20' :
                    'bg-white/20 text-white border-white/10'
                  }`}>
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">
                      {attendance.today_status === 'checked_in' || attendance.today_status === 'checked_out'
                        ? `Checked in at ${attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}`
                        : attendance.today_status === 'on_leave' ? 'On Leave' : 'Not checked in yet'}
                    </span>
                    <span className="sm:hidden">
                      {attendance.today_status === 'checked_in' || attendance.today_status === 'checked_out'
                        ? `In: ${attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}`
                        : attendance.today_status === 'on_leave' ? 'On Leave' : 'Not checked in'}
                    </span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 bg-white/20 backdrop-blur-xl rounded-lg md:rounded-xl text-xs md:text-sm text-white font-medium border border-white/10">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-gray-500">This Month</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{attendance?.this_month.present_days || 0}</p>
          <p className="text-[10px] md:text-xs text-gray-500">Days Present</p>
        </div>
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-gray-500">This Month</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{attendance?.this_month.late_days || 0}</p>
          <p className="text-[10px] md:text-xs text-gray-500">Days Late</p>
        </div>
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-gray-500">Leave Balance</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{totalLeaveRemaining}</p>
          <p className="text-[10px] md:text-xs text-gray-500">Days Available</p>
        </div>
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-3.5 md:p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-gray-500">Pending</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{pendingRequestsCount.leave + pendingRequestsCount.overtime}</p>
          <p className="text-[10px] md:text-xs text-gray-500">Requests</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Leave Balance */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              Leave Balance
            </h3>
            <Link to="/my-leave" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Link>
          </div>
          <div className="p-4 md:p-6 space-y-3 md:space-y-4">
            {leaveBalance.length > 0 ? leaveBalance.map((leave, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1.5 md:mb-2">
                  <span className="text-xs md:text-sm font-medium text-gray-700">{leave.type}</span>
                  <span className="text-xs md:text-sm text-gray-500">{leave.remaining} / {leave.total}</span>
                </div>
                <div className="w-full h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${leave.total > 0 ? (leave.remaining / leave.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No leave balance data</p>
            )}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              Recent Requests
            </h3>
            <Link to="/requests" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentRequests.length > 0 ? recentRequests.map((request) => (
              <div key={`${request.type}-${request.id}`} className="px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-900 truncate">{request.detail}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">{request.date}</p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-6">No recent requests</p>
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
              <Activity className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
              Announcements
            </h3>
            <Link to="/employee/announcements" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {announcements.length > 0 ? announcements.map((announcement) => (
              <div key={announcement.id} className="px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {announcement.is_new && (
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                      )}
                      <p className="text-xs md:text-sm font-medium text-gray-900 truncate">{announcement.title}</p>
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">{new Date(announcement.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ${
                    announcement.category === 'policy' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {announcement.category}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-6">No announcements</p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm md:text-base">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            Recent Attendance
          </h3>
          <Link to="/attendance" className="text-xs md:text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Link>
        </div>
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {attendanceHistory.length > 0 ? attendanceHistory.map((record, index) => (
            <div key={index} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                {getStatusBadge(record.status)}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>In: <span className="text-gray-700 font-medium">{record.check_in || '-'}</span></span>
                <span>Out: <span className="text-gray-700 font-medium">{record.check_out || '-'}</span></span>
                <span>Hours: <span className="text-gray-700 font-medium">{record.hours > 0 ? `${record.hours}h` : '-'}</span></span>
              </div>
            </div>
          )) : (
            <p className="text-sm text-gray-500 text-center py-6">No attendance records</p>
          )}
        </div>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Check In</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Check Out</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendanceHistory.length > 0 ? attendanceHistory.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.check_in || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.check_out || '-'}</td>
                  <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.hours > 0 ? `${record.hours}h` : '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 text-center">No attendance records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
          <Zap className="h-4 w-4 md:h-5 md:w-5 text-cyan-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <Link
            to="/my-leave"
            className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg md:rounded-xl border border-cyan-100 hover:border-cyan-300 hover:shadow-md transition-all group active:scale-95"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-cyan-700 text-center">Request Leave</span>
          </Link>
          <Link
            to="/attendance"
            className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl border border-green-100 hover:border-green-300 hover:shadow-md transition-all group active:scale-95"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-green-700 text-center">Attendance</span>
          </Link>
          <Link
            to="/profile"
            className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg md:rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group active:scale-95"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-purple-700 text-center">Profile</span>
          </Link>
          <Link
            to="/employee/announcements"
            className="flex flex-col items-center gap-2 md:gap-3 p-2.5 md:p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg md:rounded-xl border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all group active:scale-95"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Activity className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-gray-600 group-hover:text-orange-700 text-center">News</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
