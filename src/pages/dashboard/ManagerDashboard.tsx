import {
  Clock,
  Calendar,
  ArrowRight,
  FileText,
  CheckCircle,
  UsersRound,
  UserCheck,
  CalendarCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TeamDashboard } from '@/services/dashboard.service';
import type { LeaveRequest } from '@/types';

interface Props {
  user: { employee?: { name?: string }; email?: string; companyFeatures?: { attendance_enabled?: boolean; leave_enabled?: boolean } } | null;
  teamDashboard: TeamDashboard | null;
  pendingApprovals: LeaveRequest[];
  greeting: () => string;
}

export function ManagerDashboard({ user, teamDashboard, pendingApprovals, greeting }: Props) {
  const attendanceEnabled = user?.companyFeatures?.attendance_enabled ?? false;
  const leaveEnabled = user?.companyFeatures?.leave_enabled ?? true;

  const teamMembers = teamDashboard?.team_members || [];
  const teamStats = {
    total: teamDashboard?.team_size || 0,
    present: teamMembers.filter(m => m.status_today === 'present').length,
    onLeave: teamDashboard?.on_leave_today || 0,
    late: teamMembers.filter(m => m.status_today === 'late').length,
    pendingLeaves: teamDashboard?.pending_leave_requests || 0,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-green-100 text-green-700',
      late: 'bg-amber-100 text-amber-700',
      wfh: 'bg-blue-100 text-blue-700',
      leave: 'bg-purple-100 text-purple-700',
      on_leave: 'bg-purple-100 text-purple-700',
      absent: 'bg-red-100 text-red-700',
      not_checked_in: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      present: 'Present',
      late: 'Late',
      wfh: 'WFH',
      leave: 'On Leave',
      on_leave: 'On Leave',
      absent: 'Absent',
      not_checked_in: 'Not Checked In',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Manager Style */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="manager-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#manager-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                  <UsersRound className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                  </h1>
                  <p className="text-indigo-100 text-sm mt-1">Here's your team overview for today</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                  <UsersRound className="h-4 w-4" />
                  {teamStats.total} Team Members
                </span>
                {pendingApprovals.length > 0 && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-xl rounded-xl text-sm text-amber-100 font-medium border border-amber-500/20">
                    <FileText className="h-4 w-4" />
                    {pendingApprovals.length} Pending Approval
                  </span>
                )}
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                  <Clock className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats Cards */}
      <div className={`grid grid-cols-2 ${attendanceEnabled ? 'md:grid-cols-5' : leaveEnabled ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <UsersRound className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{teamStats.total}</p>
          <p className="text-xs text-gray-500">Team Members</p>
        </div>
        {attendanceEnabled && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-green-600">Present</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{teamStats.present}</p>
              <p className="text-xs text-gray-500">In Office</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-amber-600">Late</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{teamStats.late}</p>
              <p className="text-xs text-gray-500">Late Today</p>
            </div>
          </>
        )}
        {leaveEnabled && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-blue-600">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{teamStats.pendingLeaves}</p>
              <p className="text-xs text-gray-500">Leave Requests</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-purple-600">Leave</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{teamStats.onLeave}</p>
              <p className="text-xs text-gray-500">On Leave Today</p>
            </div>
          </>
        )}
      </div>

      {/* Main Content Row */}
      <div className={`grid ${leaveEnabled ? 'lg:grid-cols-3' : ''} gap-6`}>
        {/* Team Members */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
              <p className="text-xs text-gray-500 mt-1">Your direct reports</p>
            </div>
            <Link to="/my-team" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <UsersRound className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No team members found</p>
              </div>
            ) : (
              teamMembers.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.position || member.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {attendanceEnabled && member.check_in_time && (
                      <span className="text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {member.check_in_time}
                      </span>
                    )}
                    {attendanceEnabled && getStatusBadge(member.status_today)}
                    {member.pending_leaves > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {member.pending_leaves} pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        {leaveEnabled && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pending Approvals</h3>
              <p className="text-xs text-gray-500 mt-1">Requests awaiting your action</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              {pendingApprovals.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending approvals</p>
              </div>
            ) : (
              pendingApprovals.slice(0, 3).map((approval) => (
                <div
                  key={approval.id}
                  className="p-3 rounded-xl border bg-purple-50 border-purple-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900">{approval.employee?.name || 'Unknown'}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-200 text-purple-700">
                      {approval.leaveType?.name || 'Leave'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {approval.total_days} day(s) - {approval.reason || 'No reason provided'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(approval.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(approval.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))
            )}
          </div>
          {pendingApprovals.length > 0 && (
            <Link
              to="/leave-approval"
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-blue-700 transition-all"
            >
              Review All Approvals
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        )}
      </div>

    </div>
  );
}
