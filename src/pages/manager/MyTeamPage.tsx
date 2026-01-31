import { useState, useEffect } from 'react';
import {
  Search,
  MoreVertical,
  Eye,
  Clock,
  Calendar,
  Mail,
  Phone,
  UsersRound,
  UserCheck,
  UserX,
  Briefcase,
  FileText,
  MessageSquare,
  CalendarDays,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { dashboardService, type TeamMember, type TeamDashboard } from '@/services/dashboard.service';
import toast from 'react-hot-toast';

export function MyTeamPage() {
  const { user } = useAuthStore();
  const [teamData, setTeamData] = useState<TeamDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  // Company features
  const attendanceEnabled = user?.companyFeatures?.attendance_enabled ?? false;
  const leaveEnabled = user?.companyFeatures?.leave_enabled ?? true;

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardService.getTeamDashboard();
      setTeamData(data);
    } catch (error: any) {
      console.error('Failed to fetch team data:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memuat data tim');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter team members
  const filteredMembers = (teamData?.team_members || []).filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.position.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'wfh') {
        // WFH not tracked separately yet, show as present
        matchesStatus = member.status_today === 'present';
      } else if (selectedStatus === 'on_leave') {
        matchesStatus = member.status_today === 'leave';
      } else if (selectedStatus === 'absent') {
        matchesStatus = member.status_today === 'not_checked_in';
      } else {
        matchesStatus = member.status_today === selectedStatus;
      }
    }
    return matchesSearch && matchesStatus;
  });

  // Stats from API
  const stats = {
    total: teamData?.team_size || 0,
    present: teamData?.present_today || 0,
    wfh: 0, // WFH tracking not implemented yet
    onLeave: teamData?.on_leave_today || 0,
    absent: (teamData?.team_size || 0) - (teamData?.present_today || 0) - (teamData?.on_leave_today || 0),
    late: (teamData?.team_members || []).filter((m) => m.status_today === 'late').length,
  };

  const getAttendanceBadge = (status: TeamMember['status_today']) => {
    const styles: Record<string, string> = {
      present: 'bg-green-100 text-green-700',
      late: 'bg-amber-100 text-amber-700',
      leave: 'bg-purple-100 text-purple-700',
      not_checked_in: 'bg-gray-100 text-gray-600',
      absent: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      present: 'Present',
      late: 'Late',
      leave: 'On Leave',
      not_checked_in: 'Not Checked In',
      absent: 'Absent',
    };
    const icons: Record<string, JSX.Element> = {
      present: <CheckCircle className="h-3.5 w-3.5" />,
      late: <AlertCircle className="h-3.5 w-3.5" />,
      leave: <Calendar className="h-3.5 w-3.5" />,
      not_checked_in: <Clock className="h-3.5 w-3.5" />,
      absent: <XCircle className="h-3.5 w-3.5" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.not_checked_in}`}>
        {icons[status] || icons.not_checked_in}
        {labels[status] || 'Unknown'}
      </span>
    );
  };

  const handleViewDetail = (member: TeamMember) => {
    setSelectedMember(member);
    setShowDetailModal(true);
    setActiveDropdown(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500">Memuat data tim...</p>
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
                <pattern id="team-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#team-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <UsersRound className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">My Team</h1>
                <p className="text-indigo-100 text-sm">Manage and monitor your direct reports</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-lg text-sm text-white font-medium border border-white/10">
                <UsersRound className="h-4 w-4" />
                {stats.total} Members
              </span>
              {attendanceEnabled && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 backdrop-blur-xl rounded-lg text-sm text-green-100 font-medium border border-green-500/20">
                  <UserCheck className="h-4 w-4" />
                  {stats.present} Present
                </span>
              )}
              {leaveEnabled && stats.onLeave > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 backdrop-blur-xl rounded-lg text-sm text-purple-100 font-medium border border-purple-500/20">
                  <Calendar className="h-4 w-4" />
                  {stats.onLeave} On Leave
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            {[
              { value: 'all', label: 'All', show: true },
              { value: 'present', label: 'Present', show: attendanceEnabled },
              { value: 'on_leave', label: 'On Leave', show: leaveEnabled },
              { value: 'late', label: 'Late', show: attendanceEnabled },
              { value: 'absent', label: 'Not In', show: attendanceEnabled },
            ]
              .filter((f) => f.show)
              .map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedStatus === filter.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all group"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.employee_id}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeDropdown === member.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => handleViewDetail(member)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        View Profile
                      </button>
                      {attendanceEnabled && (
                        <>
                          <button
                            onClick={() => setActiveDropdown(null)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <CalendarDays className="h-4 w-4" />
                            View Attendance
                          </button>
                          <button
                            onClick={() => setActiveDropdown(null)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Timer className="h-4 w-4" />
                            View Overtime
                          </button>
                        </>
                      )}
                      {leaveEnabled && (
                        <button
                          onClick={() => setActiveDropdown(null)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <FileText className="h-4 w-4" />
                          View Leave History
                        </button>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={() => setActiveDropdown(null)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Send Message
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Position & Department */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>{member.position}</span>
                </div>
                {member.department && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span className="ml-6">{member.department}</span>
                  </div>
                )}
              </div>

              {/* Today's Status - only show if attendance is enabled */}
              {attendanceEnabled && (
                <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Today's Status</p>
                    {getAttendanceBadge(member.status_today)}
                  </div>
                  {member.check_in_time && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Check-in</p>
                      <p className="text-sm font-medium text-gray-900">{member.check_in_time}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Mail className="h-4 w-4" />
                  <span className="truncate max-w-[150px]">{member.email || '-'}</span>
                </div>
                {leaveEnabled && member.pending_leaves > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    <Calendar className="h-3 w-3" />
                    {member.pending_leaves} pending
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersRound className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No team members found</h3>
          <p className="text-gray-500 mt-1">
            {teamData?.team_members.length === 0
              ? 'You have no direct reports assigned'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl max-w-lg w-full mx-auto shadow-2xl transform transition-all">
              {/* Header with gradient */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-600 rounded-t-2xl p-6">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                    {selectedMember.avatar ? (
                      <img src={selectedMember.avatar} alt={selectedMember.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedMember.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">{selectedMember.name}</h3>
                    <p className="text-indigo-200">{selectedMember.position}</p>
                    <p className="text-indigo-300 text-sm">{selectedMember.employee_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{selectedMember.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{selectedMember.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{selectedMember.department}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Joined {formatDate(selectedMember.join_date)}</span>
                  </div>
                </div>

                {/* Today's Status - only show if attendance is enabled */}
                {attendanceEnabled && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Today's Status</h4>
                    <div className="flex items-center justify-between">
                      {getAttendanceBadge(selectedMember.status_today)}
                      {selectedMember.check_in_time && (
                        <span className="text-sm text-gray-600">
                          Check-in: <span className="font-medium">{selectedMember.check_in_time}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className={`grid ${leaveEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {leaveEnabled && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-600 font-medium">Pending Leaves</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-700">{selectedMember.pending_leaves}</p>
                    </div>
                  )}
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm text-indigo-600 font-medium">Position</span>
                    </div>
                    <p className="text-sm font-bold text-indigo-700 truncate">{selectedMember.position}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </button>
                  <a
                    href={`/employees/${selectedMember.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Full Profile
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
