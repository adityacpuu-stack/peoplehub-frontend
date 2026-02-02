import { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Eye,
  Check,
  X,
  FileText,
  Clock,
  CalendarDays,
  CalendarRange,
  Palmtree,
  Stethoscope,
  Baby,
  Heart,
  Briefcase,
  GraduationCap,
  CalendarCheck,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { leaveService } from '@/services/leave.service';
import type { LeaveRequest } from '@/types';
import toast from 'react-hot-toast';

const leaveTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'bereavement', label: 'Bereavement' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'study', label: 'Study Leave' },
];

export function LeaveApprovalPage() {
  const { user } = useAuthStore();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    setIsLoading(true);
    try {
      // Fetch all team leaves (no status filter = get all)
      const data = await leaveService.getTeamLeaves();
      setLeaveRequests(data);
    } catch (error: any) {
      console.error('Failed to fetch leave requests:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memuat data pengajuan cuti');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = leaveRequests.filter((request) => {
    const matchesSearch =
      request.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.employee?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesType =
      selectedType === 'all' ||
      request.leaveType?.code?.toLowerCase() === selectedType ||
      request.leaveType?.name?.toLowerCase().includes(selectedType);
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === 'pending').length,
    approved: leaveRequests.filter((r) => r.status === 'approved').length,
    rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
    pendingDays: leaveRequests
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + (r.total_days || 0), 0),
    approvedDays: leaveRequests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (r.total_days || 0), 0),
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    const config = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle, label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle, label: 'Cancelled' },
    };
    const { bg, text, icon: Icon, label } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  };

  const getLeaveTypeConfig = (leaveType?: LeaveRequest['leaveType']) => {
    const code = leaveType?.code?.toLowerCase() || '';
    const name = leaveType?.name?.toLowerCase() || '';

    if (code === 'annual' || name.includes('annual') || name.includes('tahunan')) {
      return { icon: Palmtree, color: 'text-green-600', bg: 'bg-green-100', label: leaveType?.name || 'Annual Leave' };
    }
    if (code === 'sick' || name.includes('sick') || name.includes('sakit')) {
      return { icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-100', label: leaveType?.name || 'Sick Leave' };
    }
    if (code === 'maternity' || name.includes('maternity') || name.includes('melahirkan')) {
      return { icon: Baby, color: 'text-pink-600', bg: 'bg-pink-100', label: leaveType?.name || 'Maternity' };
    }
    if (code === 'paternity' || name.includes('paternity')) {
      return { icon: Baby, color: 'text-blue-600', bg: 'bg-blue-100', label: leaveType?.name || 'Paternity' };
    }
    if (code === 'marriage' || name.includes('marriage') || name.includes('nikah')) {
      return { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100', label: leaveType?.name || 'Marriage' };
    }
    if (code === 'bereavement' || name.includes('bereavement') || name.includes('duka')) {
      return { icon: Heart, color: 'text-gray-600', bg: 'bg-gray-100', label: leaveType?.name || 'Bereavement' };
    }
    if (code === 'unpaid' || name.includes('unpaid') || name.includes('tanpa gaji')) {
      return { icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-100', label: leaveType?.name || 'Unpaid' };
    }
    if (code === 'study' || name.includes('study') || name.includes('belajar')) {
      return { icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100', label: leaveType?.name || 'Study Leave' };
    }

    // Default
    return { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-100', label: leaveType?.name || 'Leave' };
  };

  const getLeaveTypeBadge = (leaveType?: LeaveRequest['leaveType']) => {
    const { icon: Icon, color, bg, label } = getLeaveTypeConfig(leaveType);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  };

  const handleApprove = async (request: LeaveRequest) => {
    setIsProcessing(true);
    try {
      await leaveService.approve(request.id);
      toast.success(`Cuti ${request.employee?.name} berhasil disetujui`);
      fetchLeaveRequests();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Failed to approve leave:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menyetujui cuti');
    } finally {
      setIsProcessing(false);
      setActiveDropdown(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan harus diisi');
      return;
    }

    setIsProcessing(true);
    try {
      await leaveService.reject(selectedRequest.id, rejectReason);
      toast.success(`Cuti ${selectedRequest.employee?.name} berhasil ditolak`);
      fetchLeaveRequests();
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
    } catch (error: any) {
      console.error('Failed to reject leave:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menolak cuti');
    } finally {
      setIsProcessing(false);
      setActiveDropdown(null);
    }
  };

  const openRejectModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
    setActiveDropdown(null);
  };

  const handleViewDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setActiveDropdown(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (start === end || startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start);
    }
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-gray-500">Memuat data pengajuan cuti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="leave-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#leave-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <CalendarCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Leave Approval</h1>
                <p className="text-purple-100 text-sm">Review and manage team leave requests</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {stats.pending > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 backdrop-blur-xl rounded-lg text-sm text-amber-100 font-medium border border-amber-500/20">
                  <AlertCircle className="h-4 w-4" />
                  {stats.pending} Pending
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 backdrop-blur-xl rounded-lg text-sm text-green-100 font-medium border border-green-500/20">
                <CheckCircle className="h-4 w-4" />
                {stats.approved} Approved
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-lg text-sm text-white font-medium border border-white/10">
                <FileText className="h-4 w-4" />
                {stats.total} Total
              </span>
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
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2">
            {[
              { value: 'pending', label: 'Pending', count: stats.pending },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'all', label: 'All' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  selectedStatus === filter.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedStatus === filter.value ? 'bg-white/20' : 'bg-red-500 text-white'
                    }`}
                  >
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Leave Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-600"
          >
            {leaveTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <div
            key={request.id}
            className={`bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all ${
              request.status === 'pending' ? 'border-amber-200 shadow-amber-100/50 shadow-md' : 'border-gray-200'
            }`}
          >
            {/* Card Header - Employee Info */}
            <div className={`px-5 py-4 ${request.status === 'pending' ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30">
                    {request.employee?.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2) || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{request.employee?.name || 'Unknown'}</h3>
                    <p className="text-xs text-gray-500">
                      {request.employee?.employee_id} • {request.employee?.position?.name || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(request.status)}
                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === request.id ? null : request.id)}
                      className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                    {activeDropdown === request.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-10">
                        <button
                          onClick={() => handleViewDetail(request)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request)}
                              disabled={isProcessing}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              disabled={isProcessing}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="px-5 py-4">
              {/* Request Details Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Leave Type</p>
                  {getLeaveTypeBadge(request.leaveType)}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDateRange(request.start_date, request.end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Duration</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {request.total_days} day{request.total_days > 1 ? 's' : ''}
                    {(request.start_half_day || request.end_half_day) && (
                      <span className="text-xs text-gray-500 font-normal ml-1">(half day)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Submitted</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDateTime(request.created_at)}</p>
                </div>
              </div>

              {/* Additional Info Section */}
              <div className="mt-4 space-y-3">
                {/* Reason */}
                {request.reason && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Reason</p>
                      <p className="text-sm text-gray-700 mt-0.5">{request.reason}</p>
                      {request.document_name && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-md">
                          <FileText className="h-3.5 w-3.5 text-purple-500" />
                          <span className="text-xs text-purple-600 hover:underline cursor-pointer">
                            {request.document_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Task Handover & Emergency Contact Row */}
                {(request.work_handover || request.contact_during_leave) && (
                  <div className="flex flex-wrap gap-3">
                    {request.work_handover && (
                      <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-blue-500 font-medium">Task Handover</p>
                          <p className="text-sm font-medium text-gray-900 mt-0.5">{request.work_handover}</p>
                        </div>
                      </div>
                    )}
                    {request.contact_during_leave && (
                      <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-orange-500 font-medium">Emergency Contact</p>
                          <p className="text-sm font-medium text-gray-900 mt-0.5">{request.contact_during_leave}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Emergency Badge */}
                {request.is_emergency && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Emergency Leave Request</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending */}
              {request.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <button
                    onClick={() => handleApprove(request)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 font-medium"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => openRejectModal(request)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 font-medium"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}

              {/* Approval/Rejection Info */}
              {request.status !== 'pending' && request.approver && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        request.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {request.status === 'approved' ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-red-600" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {request.status === 'approved' ? 'Approved' : 'Rejected'} by <span className="font-medium text-gray-900">{request.approver.name}</span>
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {request.approved_at ? formatDateTime(request.approved_at) : ''}
                      {request.rejected_at ? formatDateTime(request.rejected_at) : ''}
                    </span>
                  </div>
                  {request.status === 'rejected' && request.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs font-medium text-red-600 mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700">{request.rejection_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRequests.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No leave requests found</h3>
          <p className="text-gray-500 mt-1">
            {leaveRequests.length === 0
              ? 'There are no pending leave requests from your team'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}

      {/* Team Leave Summary */}
      {leaveRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">Team Leave Summary</h3>
            <p className="text-xs text-gray-500 mt-0.5">Approved leave statistics for your team</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative overflow-hidden p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-200/30 rounded-full blur-xl" />
                <div className="relative">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                    <Palmtree className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {leaveRequests
                      .filter(
                        (r) =>
                          (r.leaveType?.code?.toLowerCase() === 'annual' ||
                            r.leaveType?.name?.toLowerCase().includes('annual') ||
                            r.leaveType?.name?.toLowerCase().includes('tahunan')) &&
                          r.status === 'approved'
                      )
                      .reduce((sum, r) => sum + (r.total_days || 0), 0)}
                    <span className="text-sm font-normal text-green-600 ml-1">days</span>
                  </p>
                  <p className="text-xs font-medium text-green-600 mt-1">Annual Leave</p>
                </div>
              </div>
              <div className="relative overflow-hidden p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-red-200/30 rounded-full blur-xl" />
                <div className="relative">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mb-3">
                    <Stethoscope className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {leaveRequests
                      .filter(
                        (r) =>
                          (r.leaveType?.code?.toLowerCase() === 'sick' ||
                            r.leaveType?.name?.toLowerCase().includes('sick') ||
                            r.leaveType?.name?.toLowerCase().includes('sakit')) &&
                          r.status === 'approved'
                      )
                      .reduce((sum, r) => sum + (r.total_days || 0), 0)}
                    <span className="text-sm font-normal text-red-600 ml-1">days</span>
                  </p>
                  <p className="text-xs font-medium text-red-600 mt-1">Sick Leave</p>
                </div>
              </div>
              <div className="relative overflow-hidden p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-200/30 rounded-full blur-xl" />
                <div className="relative">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                    <GraduationCap className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {leaveRequests
                      .filter(
                        (r) =>
                          (r.leaveType?.code?.toLowerCase() === 'study' ||
                            r.leaveType?.name?.toLowerCase().includes('study') ||
                            r.leaveType?.name?.toLowerCase().includes('belajar')) &&
                          r.status === 'approved'
                      )
                      .reduce((sum, r) => sum + (r.total_days || 0), 0)}
                    <span className="text-sm font-normal text-purple-600 ml-1">days</span>
                  </p>
                  <p className="text-xs font-medium text-purple-600 mt-1">Study Leave</p>
                </div>
              </div>
              <div className="relative overflow-hidden p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-rose-200/30 rounded-full blur-xl" />
                <div className="relative">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-3">
                    <Heart className="h-5 w-5 text-rose-600" />
                  </div>
                  <p className="text-2xl font-bold text-rose-700">
                    {leaveRequests
                      .filter((r) => {
                        const code = r.leaveType?.code?.toLowerCase() || '';
                        const name = r.leaveType?.name?.toLowerCase() || '';
                        return (
                          !['annual', 'sick', 'study'].includes(code) &&
                          !name.includes('annual') &&
                          !name.includes('tahunan') &&
                          !name.includes('sick') &&
                          !name.includes('sakit') &&
                          !name.includes('study') &&
                          !name.includes('belajar') &&
                          r.status === 'approved'
                        );
                      })
                      .reduce((sum, r) => sum + (r.total_days || 0), 0)}
                    <span className="text-sm font-normal text-rose-600 ml-1">days</span>
                  </p>
                  <p className="text-xs font-medium text-rose-600 mt-1">Other Leave</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowDetailModal(false)}
            />

            <div className="relative bg-white rounded-2xl max-w-lg w-full mx-auto shadow-2xl transform transition-all">
              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-violet-600 rounded-t-2xl p-6">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {selectedRequest.employee?.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2) || '?'}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">{selectedRequest.employee?.name}</h3>
                    <p className="text-purple-200">{selectedRequest.employee?.position?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Status & Type */}
                <div className="flex items-center justify-between mb-6">
                  {getLeaveTypeBadge(selectedRequest.leaveType)}
                  {getStatusBadge(selectedRequest.status)}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedRequest.start_date)}
                        {selectedRequest.start_half_day && ' (Half day)'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedRequest.end_date)}
                        {selectedRequest.end_half_day && ' (Half day)'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.total_days} day{selectedRequest.total_days > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.employee?.department?.name || '-'}
                      </p>
                    </div>
                  </div>

                  {selectedRequest.reason && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Reason</p>
                      <p className="font-medium text-gray-900">{selectedRequest.reason}</p>
                    </div>
                  )}

                  {selectedRequest.is_emergency && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">Emergency Leave Request</span>
                      </div>
                    </div>
                  )}

                  {selectedRequest.work_handover && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600 mb-1">Task Handover</p>
                      <p className="text-sm font-medium text-blue-800">{selectedRequest.work_handover}</p>
                    </div>
                  )}

                  {selectedRequest.contact_during_leave && (
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-xs text-orange-600 mb-1">Emergency Contact</p>
                      <p className="text-sm font-medium text-orange-800">{selectedRequest.contact_during_leave}</p>
                    </div>
                  )}

                  {selectedRequest.document_name && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-xs text-gray-500 mb-1">Attachment</p>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-purple-700 font-medium">{selectedRequest.document_name}</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="font-medium text-gray-900">{formatDateTime(selectedRequest.created_at)}</p>
                  </div>

                  {selectedRequest.approver && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">
                        {selectedRequest.status === 'approved' ? 'Approved' : 'Rejected'} by
                      </p>
                      <p className="font-medium text-gray-900">{selectedRequest.approver.name}</p>
                      <p className="text-sm text-gray-500">
                        {selectedRequest.approved_at && formatDateTime(selectedRequest.approved_at)}
                        {selectedRequest.rejected_at && formatDateTime(selectedRequest.rejected_at)}
                      </p>
                    </div>
                  )}

                  {selectedRequest.rejection_reason && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700">{selectedRequest.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        openRejectModal(selectedRequest);
                      }}
                      disabled={isProcessing}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRequest)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}
            />

            <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-2xl transform transition-all">
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Reject Leave Request</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Please provide a reason for rejecting {selectedRequest.employee?.name}'s leave request.
                </p>

                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isProcessing || !rejectReason.trim()}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Reject Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
