import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Clock,
  Calendar,
  Download,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Eye,
  Check,
  X,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { overtimeService, type Overtime, type OvertimeListQuery } from '@/services/overtime.service';
import toast from 'react-hot-toast';

export function TeamOvertimePage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Overtime | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchOvertimeRequests = useCallback(async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      const query: OvertimeListQuery = {
        start_date: startDate,
        end_date: endDate,
        limit: 100,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      if (selectedStatus !== 'all') query.status = selectedStatus;

      const result = await overtimeService.list(query);
      setRequests(result.data);
    } catch {
      toast.error('Failed to load overtime requests');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedStatus]);

  useEffect(() => {
    fetchOvertimeRequests();
  }, [fetchOvertimeRequests]);

  // Client-side search
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      request.employee.name.toLowerCase().includes(q) ||
      request.employee.employee_id.toLowerCase().includes(q)
    );
  });

  // Stats from actual data
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    totalHours: requests.filter((r) => r.status === 'approved').reduce((sum, r) => sum + r.hours, 0),
    pendingHours: requests.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.hours, 0),
  };

  const getStatusBadge = (status: Overtime['status']) => {
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

  const handleApprove = async (request: Overtime) => {
    setActionLoading(request.id);
    try {
      await overtimeService.approve(request.id);
      toast.success(`Overtime for ${request.employee.name} approved`);
      fetchOvertimeRequests();
    } catch {
      toast.error('Failed to approve overtime');
    } finally {
      setActionLoading(null);
      setActiveDropdown(null);
    }
  };

  const handleReject = async (request: Overtime) => {
    setActionLoading(request.id);
    try {
      await overtimeService.reject(request.id, { rejection_reason: 'Rejected by manager' });
      toast.success(`Overtime for ${request.employee.name} rejected`);
      fetchOvertimeRequests();
    } catch {
      toast.error('Failed to reject overtime');
    } finally {
      setActionLoading(null);
      setActiveDropdown(null);
    }
  };

  const handleViewDetail = (request: Overtime) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setActiveDropdown(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-8">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Timer className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Team Overtime</h1>
                <p className="text-blue-100 mt-1">Manage overtime requests from your team</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <CalendarDays className="h-5 w-5 text-blue-200" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{loading ? '-' : stats.total}</p>
                  <p className="text-sm text-blue-100">Total Requests</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/30 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{loading ? '-' : stats.pending}</p>
                  <p className="text-sm text-blue-100">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{loading ? '-' : stats.approved}</p>
                  <p className="text-sm text-blue-100">Approved</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/30 rounded-lg flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{loading ? '-' : stats.rejected}</p>
                  <p className="text-sm text-blue-100">Rejected</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/30 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{loading ? '-' : `${stats.totalHours}h`}</p>
                  <p className="text-sm text-blue-100">Approved Hours</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center">
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{loading ? '-' : `${stats.pendingHours}h`}</p>
                  <p className="text-sm text-blue-100">Pending Hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending', count: stats.pending },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  selectedStatus === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    selectedStatus === filter.value ? 'bg-white/20' : 'bg-red-500 text-white'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Overtime Requests List */}
      {!loading && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-xl border hover:shadow-lg transition-all ${
                request.status === 'pending' ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {request.employee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.employee.name}</h3>
                      <p className="text-sm text-gray-500">
                        {request.employee.employee_id}
                        {request.employee.department ? ` - ${request.employee.department.name}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === request.id ? null : request.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>

                      {activeDropdown === request.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => handleViewDetail(request)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(request)}
                                disabled={actionLoading === request.id}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                              >
                                {actionLoading === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request)}
                                disabled={actionLoading === request.id}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {actionLoading === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(request.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {request.start_time && request.end_time ? `${request.start_time} - ${request.end_time}` : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="text-sm font-medium text-gray-900">{request.hours} hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">{request.overtime_type}</p>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Reason</p>
                  <p className="text-sm text-gray-700">{request.reason}</p>
                </div>

                {/* Quick Actions for Pending */}
                {request.status === 'pending' && (
                  <div className="mt-4 flex items-center gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={actionLoading === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      disabled={actionLoading === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      Reject
                    </button>
                  </div>
                )}

                {/* Approval Info */}
                {request.status !== 'pending' && request.approver && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.approver.name}
                    </span>
                    {request.approved_at && (
                      <span className="text-gray-400">{new Date(request.approved_at).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRequests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Timer className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No overtime requests found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Summary Card */}
      {!loading && requests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Employees with OT</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {new Set(requests.filter((r) => r.status === 'approved').map((r) => r.employee.id)).size}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Total OT Hours</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.totalHours}h</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Avg per Request</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {stats.approved > 0 ? (stats.totalHours / stats.approved).toFixed(1) : 0}h
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Total OT Amount</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {requests
                  .filter((r) => r.status === 'approved')
                  .reduce((sum, r) => sum + (r.total_amount || 0), 0)
                  .toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl max-w-lg w-full mx-auto shadow-2xl transform transition-all">
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-t-2xl p-6">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {selectedRequest.employee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">{selectedRequest.employee.name}</h3>
                    <p className="text-blue-200">{selectedRequest.employee.employee_id}</p>
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
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm text-gray-500">Status</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedRequest.date)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium text-gray-900">{selectedRequest.hours} hours</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.start_time && selectedRequest.end_time
                          ? `${selectedRequest.start_time} - ${selectedRequest.end_time}`
                          : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="font-medium text-gray-900 capitalize">{selectedRequest.overtime_type}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Reason</p>
                    <p className="font-medium text-gray-900">{selectedRequest.reason}</p>
                  </div>

                  {selectedRequest.total_amount > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">OT Amount</p>
                      <p className="font-medium text-gray-900">
                        Rp {selectedRequest.total_amount.toLocaleString('id-ID')}
                        <span className="text-xs text-gray-500 ml-2">
                          ({selectedRequest.rate_multiplier}x @ Rp {selectedRequest.rate_per_hour.toLocaleString('id-ID')}/hr)
                        </span>
                      </p>
                    </div>
                  )}

                  {selectedRequest.approver && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">
                        {selectedRequest.status === 'approved' ? 'Approved' : 'Rejected'} by
                      </p>
                      <p className="font-medium text-gray-900">{selectedRequest.approver.name}</p>
                      {selectedRequest.approved_at && (
                        <p className="text-sm text-gray-500">{new Date(selectedRequest.approved_at).toLocaleString()}</p>
                      )}
                    </div>
                  )}

                  {selectedRequest.rejection_reason && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs text-red-600">Rejection Reason</p>
                      <p className="font-medium text-red-700">{selectedRequest.rejection_reason}</p>
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
                        handleReject(selectedRequest);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        handleApprove(selectedRequest);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
