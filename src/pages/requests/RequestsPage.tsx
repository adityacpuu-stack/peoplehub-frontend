import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { leaveService } from '@/services/leave.service';
import type { LeaveRequest } from '@/types';

// ==========================================
// TYPES
// ==========================================

type TabType = 'approvals' | 'activity';

interface ActivityItem {
  id: string;
  type: 'submitted' | 'approved' | 'rejected' | 'cancelled';
  timestamp: string;
  leave: LeaveRequest;
}

// ==========================================
// HELPERS
// ==========================================

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffWeek < 4) return `${diffWeek} minggu lalu`;
  return `${diffMonth} bulan lalu`;
}

function buildActivityItems(leaves: LeaveRequest[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const leave of leaves) {
    // Always add submitted
    items.push({
      id: `${leave.id}-submitted`,
      type: 'submitted',
      timestamp: leave.created_at,
      leave,
    });

    if (leave.status === 'approved' && leave.approved_at) {
      items.push({
        id: `${leave.id}-approved`,
        type: 'approved',
        timestamp: leave.approved_at,
        leave,
      });
    }

    if (leave.status === 'rejected' && leave.rejected_at) {
      items.push({
        id: `${leave.id}-rejected`,
        type: 'rejected',
        timestamp: leave.rejected_at,
        leave,
      });
    }

    if (leave.status === 'cancelled') {
      items.push({
        id: `${leave.id}-cancelled`,
        type: 'cancelled',
        timestamp: leave.updated_at || leave.created_at,
        leave,
      });
    }
  }

  // Sort by most recent first
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}

const ACTIVITY_COLORS = {
  submitted: { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  approved: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  cancelled: { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

const ACTIVITY_LABELS: Record<string, string> = {
  submitted: 'Diajukan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

// ==========================================
// COMPONENTS
// ==========================================

function ActivityFeed() {
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    search: '',
  });

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  const fetchAllLeaves = async () => {
    setIsLoading(true);
    try {
      const data = await leaveService.getTeamLeaves();
      setAllLeaves(data);
    } catch (error) {
      console.error('Failed to load activity:', error);
      toast.error('Gagal memuat aktivitas');
    } finally {
      setIsLoading(false);
    }
  };

  const activityItems = useMemo(() => {
    const items = buildActivityItems(allLeaves);

    return items.filter(item => {
      // Filter by activity type
      if (filter.status !== 'all' && item.type !== filter.status) return false;

      // Filter by search
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        return (
          item.leave.employee?.name?.toLowerCase().includes(searchLower) ||
          item.leave.employee?.employee_id?.toLowerCase().includes(searchLower) ||
          item.leave.approver?.name?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [allLeaves, filter]);

  const getActivityDescription = (item: ActivityItem) => {
    const employeeName = item.leave.employee?.name || 'Unknown';
    const leaveTypeName = item.leave.leaveType?.name || 'Cuti';
    const approverName = item.leave.approver?.name;

    switch (item.type) {
      case 'submitted':
        return (
          <>
            <span className="font-semibold text-gray-900">{employeeName}</span>
            {' mengajukan '}
            <span className="font-medium text-blue-600">{leaveTypeName}</span>
            {approverName && (
              <>
                {' ke '}
                <span className="font-semibold text-gray-900">{approverName}</span>
              </>
            )}
          </>
        );
      case 'approved':
        return (
          <>
            <span className="font-semibold text-gray-900">{approverName || 'Approver'}</span>
            {' menyetujui cuti '}
            <span className="font-semibold text-gray-900">{employeeName}</span>
          </>
        );
      case 'rejected':
        return (
          <>
            <span className="font-semibold text-gray-900">{approverName || 'Approver'}</span>
            {' menolak cuti '}
            <span className="font-semibold text-gray-900">{employeeName}</span>
          </>
        );
      case 'cancelled':
        return (
          <>
            <span className="font-semibold text-gray-900">{employeeName}</span>
            {' membatalkan pengajuan '}
            <span className="font-medium text-blue-600">{leaveTypeName}</span>
          </>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500">Memuat aktivitas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Tipe:</span>
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              {[
                { value: 'all', label: 'Semua' },
                { value: 'submitted', label: 'Diajukan' },
                { value: 'approved', label: 'Disetujui' },
                { value: 'rejected', label: 'Ditolak' },
                { value: 'cancelled', label: 'Dibatalkan' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilter(prev => ({ ...prev, status: option.value }))}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    filter.status === option.value
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 lg:max-w-xs lg:ml-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={filter.search}
                onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {activityItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Belum ada aktivitas</h3>
          <p className="mt-1 text-gray-500">Tidak ada aktivitas yang sesuai dengan filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gray-200"></div>

              <div className="space-y-6">
                {activityItems.map(item => {
                  const colors = ACTIVITY_COLORS[item.type];
                  const formatDate = (d: string) =>
                    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                  return (
                    <div key={item.id} className="relative flex gap-4">
                      {/* Dot */}
                      <div className="relative z-10 flex-shrink-0 mt-1">
                        <div className={`w-[9px] h-[9px] rounded-full ${colors.dot} ring-4 ring-white`}></div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <div className="flex flex-wrap items-start gap-2">
                          {/* Avatar initial */}
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                            {item.leave.employee?.name?.charAt(0) || '?'}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Description */}
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {getActivityDescription(item)}
                            </p>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                {ACTIVITY_LABELS[item.type]}
                              </span>
                              <span className="text-xs text-gray-400">
                                {getRelativeTime(item.timestamp)}
                              </span>
                              <span className="text-xs text-gray-300">•</span>
                              <span className="text-xs text-gray-400">
                                {item.leave.employee?.department?.name}
                              </span>
                            </div>

                            {/* Detail card */}
                            <div className={`mt-2 p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                <span className="text-gray-500">
                                  {item.leave.leaveType?.name}
                                </span>
                                <span className="text-gray-500">
                                  {formatDate(item.leave.start_date)} - {formatDate(item.leave.end_date)}
                                </span>
                                <span className="font-medium text-gray-700">
                                  {item.leave.total_days} hari
                                </span>
                              </div>
                              {item.type === 'rejected' && item.leave.rejection_reason && (
                                <p className="mt-1.5 text-xs text-red-600">
                                  Alasan: {item.leave.rejection_reason}
                                </p>
                              )}
                              {item.type === 'submitted' && item.leave.reason && (
                                <p className="mt-1.5 text-xs text-gray-600">
                                  {item.leave.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export function RequestsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('approvals');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'pending',
    search: '',
  });
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await leaveService.getPendingApprovals();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load approval requests');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter.status !== 'all' && request.status !== filter.status) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        request.employee?.name?.toLowerCase().includes(searchLower) ||
        request.employee?.employee_id?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total: requests.length,
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await leaveService.approve(selectedRequest.id, approveComment || undefined);
      toast.success('Leave request approved successfully');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApproveComment('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setIsProcessing(true);
    try {
      await leaveService.reject(selectedRequest.id, rejectReason);
      toast.success('Leave request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                My Approval
              </h1>
              <p className="mt-2 text-blue-100 max-w-xl">
                Approve or reject leave requests from your team members
              </p>
            </div>
            <button
              onClick={fetchRequests}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'approvals'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Approvals
            {stats.pending > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                {stats.pending}
              </span>
            )}
            {activeTab === 'approvals' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'activity'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Activity
            {activeTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t"></div>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'activity' ? (
        <ActivityFeed />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            </div>

            <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilter(prev => ({ ...prev, status: option.value }))}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        filter.status === option.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="flex-1 lg:max-w-xs lg:ml-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={filter.search}
                    onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Request Cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading data...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No requests</h3>
              <p className="mt-1 text-gray-500">
                {filter.status === 'pending'
                  ? 'No pending leave requests to approve.'
                  : 'No requests match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(request => (
                <div
                  key={request.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Employee Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                          {request.employee?.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900">
                              {request.employee?.name || 'Unknown'}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {request.leaveType?.name || 'Leave'}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-gray-500">
                            {request.employee?.employee_id} • {request.employee?.department?.name || 'No Department'} • {request.employee?.position?.name || 'No Position'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted: {formatDateTime(request.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      {request.status === 'pending' && (
                        <div className="flex items-center gap-2 lg:flex-shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApproveModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Request Details */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Leave Period</span>
                          <p className="font-medium text-gray-900">
                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Duration</span>
                          <p className="font-medium text-gray-900">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-sm">
                              {calculateDays(request.start_date, request.end_date)} days
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Leave Type</span>
                          <p className="font-medium text-gray-900">
                            {request.leaveType?.name || '-'}
                          </p>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-500">Reason</span>
                          <p className="text-gray-700 mt-1">{request.reason}</p>
                        </div>
                      )}
                    </div>

                    {/* Approval Info */}
                    {request.status !== 'pending' && request.approved_at && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                          {formatDateTime(request.approved_at)}
                          {request.approver && ` by ${request.approver.name}`}
                        </p>
                        {request.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            Reason: {request.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Approve Leave Request?</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                You are about to approve the leave request from{' '}
                <span className="font-medium text-gray-900">{selectedRequest.employee?.name}</span>
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm">
                  <p><span className="text-gray-500">Type:</span> <span className="font-medium">{selectedRequest.leaveType?.name}</span></p>
                  <p><span className="text-gray-500">Period:</span> <span className="font-medium">{formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}</span></p>
                  <p><span className="text-gray-500">Duration:</span> <span className="font-medium">{calculateDays(selectedRequest.start_date, selectedRequest.end_date)} days</span></p>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={approveComment}
                  onChange={e => setApproveComment(e.target.value)}
                  rows={2}
                  placeholder="Add a comment..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedRequest(null);
                    setApproveComment('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Yes, Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Reject Leave Request?</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                You are about to reject the leave request from{' '}
                <span className="font-medium text-gray-900">{selectedRequest.employee?.name}</span>
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm">
                  <p><span className="text-gray-500">Type:</span> <span className="font-medium">{selectedRequest.leaveType?.name}</span></p>
                  <p><span className="text-gray-500">Period:</span> <span className="font-medium">{formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}</span></p>
                  <p><span className="text-gray-500">Duration:</span> <span className="font-medium">{calculateDays(selectedRequest.start_date, selectedRequest.end_date)} days</span></p>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Enter rejection reason..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectReason('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Yes, Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
