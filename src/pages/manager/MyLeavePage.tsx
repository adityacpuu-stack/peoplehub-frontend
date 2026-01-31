import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Palmtree,
  Stethoscope,
  Baby,
  Heart,
  GraduationCap,
  X,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Briefcase,
  UserCheck,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { leaveService } from '@/services/leave.service';
import { employeeService } from '@/services/employee.service';
import type { LeaveRequest, LeaveBalance, LeaveType, Employee } from '@/types';
import toast from 'react-hot-toast';

export function MyLeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myProfile, setMyProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    leave_type_id: 0,
    start_date: '',
    end_date: '',
    reason: '',
    work_handover: '',
    contact_during_leave: '',
  });

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leavesRes, balances, types, profile] = await Promise.all([
        leaveService.getMyLeaves({ page: currentPage, limit: 10 }),
        leaveService.getMyBalance(),
        leaveService.getTypes(),
        employeeService.getMyProfile(),
      ]);

      setLeaveRequests(leavesRes.data);
      setTotalPages(leavesRes.pagination.totalPages);
      setTotalItems(leavesRes.pagination.total);
      setLeaveBalances(balances);
      setLeaveTypes(types);
      setMyProfile(profile);

      // Set default leave type
      if (types.length > 0 && formData.leave_type_id === 0) {
        setFormData((prev) => ({ ...prev, leave_type_id: types[0].id }));
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memuat data cuti');
    } finally {
      setIsLoading(false);
    }
  };

  const getLeaveTypeConfig = (leaveType?: LeaveType | null) => {
    const code = leaveType?.code?.toLowerCase() || '';
    const name = leaveType?.name?.toLowerCase() || '';

    if (code === 'annual' || name.includes('annual') || name.includes('tahunan')) {
      return { label: leaveType?.name || 'Annual Leave', icon: Palmtree, color: 'bg-green-100 text-green-700' };
    }
    if (code === 'sick' || name.includes('sick') || name.includes('sakit')) {
      return { label: leaveType?.name || 'Sick Leave', icon: Stethoscope, color: 'bg-red-100 text-red-700' };
    }
    if (code === 'maternity' || name.includes('maternity') || name.includes('melahirkan')) {
      return { label: leaveType?.name || 'Maternity', icon: Baby, color: 'bg-pink-100 text-pink-700' };
    }
    if (code === 'paternity' || name.includes('paternity')) {
      return { label: leaveType?.name || 'Paternity', icon: Baby, color: 'bg-blue-100 text-blue-700' };
    }
    if (code === 'marriage' || name.includes('marriage') || name.includes('nikah')) {
      return { label: leaveType?.name || 'Marriage', icon: Heart, color: 'bg-rose-100 text-rose-700' };
    }
    if (code === 'bereavement' || name.includes('bereavement') || name.includes('duka')) {
      return { label: leaveType?.name || 'Bereavement', icon: Heart, color: 'bg-gray-100 text-gray-700' };
    }
    if (code === 'unpaid' || name.includes('unpaid') || name.includes('tanpa gaji')) {
      return { label: leaveType?.name || 'Unpaid Leave', icon: Briefcase, color: 'bg-amber-100 text-amber-700' };
    }
    if (code === 'study' || name.includes('study') || name.includes('belajar')) {
      return { label: leaveType?.name || 'Study Leave', icon: GraduationCap, color: 'bg-purple-100 text-purple-700' };
    }

    return { label: leaveType?.name || 'Leave', icon: Calendar, color: 'bg-gray-100 text-gray-700' };
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700' };
      case 'approved':
        return { label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-700' };
      case 'rejected':
        return { label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-700' };
      case 'cancelled':
        return { label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 text-gray-600' };
      default:
        return { label: status, icon: AlertCircle, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const filteredRequests = leaveRequests.filter((request) => {
    const matchesSearch = request.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesYear = new Date(request.start_date).getFullYear().toString() === filterYear;
    return matchesSearch && matchesStatus && matchesYear;
  });

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === 'pending').length,
    approved: leaveRequests.filter((r) => r.status === 'approved').length,
    rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leave_type_id) {
      toast.error('Pilih jenis cuti');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Tanggal mulai dan berakhir harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      await leaveService.create({
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || undefined,
        work_handover: formData.work_handover || undefined,
        contact_during_leave: formData.contact_during_leave || undefined,
      });

      toast.success('Pengajuan cuti berhasil dikirim');
      setShowRequestModal(false);
      setFormData({
        leave_type_id: leaveTypes.length > 0 ? leaveTypes[0].id : 0,
        start_date: '',
        end_date: '',
        reason: '',
        work_handover: '',
        contact_during_leave: '',
      });
      fetchData();
    } catch (error: any) {
      console.error('Failed to submit leave request:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal mengajukan cuti');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    setIsCancelling(true);
    try {
      await leaveService.cancel(id);
      toast.success('Pengajuan cuti berhasil dibatalkan');
      setSelectedRequest(null);
      fetchData();
    } catch (error: any) {
      console.error('Failed to cancel leave request:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal membatalkan cuti');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateLong = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cyan-600 animate-spin" />
          <p className="text-gray-500">Memuat data cuti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-2xl shadow-xl">
        <div className="px-6 py-6 relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="myleave-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#myleave-grid)" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">My Leave</h1>
                <p className="text-cyan-100 text-sm">Manage your leave requests</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {leaveBalances.length > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-lg text-sm text-white font-medium border border-white/10">
                  <CalendarDays className="h-4 w-4" />
                  {leaveBalances[0]?.remaining_days || 0} Days Left
                </span>
              )}
              <button
                onClick={() => setShowRequestModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-cyan-700 font-medium rounded-lg hover:bg-cyan-50 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Request Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {leaveBalances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaveBalances.slice(0, 3).map((balance) => {
            const config = getLeaveTypeConfig(balance.leaveType);
            return (
              <div key={balance.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-gray-600 text-sm font-medium">{config.label}</p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{balance.remaining_days}</span>
                    <span className="text-gray-500 text-sm ml-1">/ {balance.allocated_days} days</span>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>Used: {balance.used_days}</p>
                    {balance.pending_days > 0 && <p className="text-amber-600">Pending: {balance.pending_days}</p>}
                  </div>
                </div>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                    style={{
                      width: `${balance.allocated_days > 0 ? (balance.remaining_days / balance.allocated_days) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Alert */}
      {stats.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Pending Requests</p>
            <p className="text-sm text-amber-700 mt-1">
              You have {stats.pending} leave request(s) waiting for approval.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Leave History</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredRequests.map((request) => {
            const typeConfig = getLeaveTypeConfig(request.leaveType);
            const statusConfig = getStatusConfig(request.status);
            const TypeIcon = typeConfig.icon;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', typeConfig.color)}>
                    <TypeIcon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', typeConfig.color)}>
                            {typeConfig.label}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                              statusConfig.color
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                        {request.reason && <p className="text-sm text-gray-600 mt-2">{request.reason}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{request.total_days} days</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(request.start_date)}
                        {request.start_date !== request.end_date && <> - {formatDate(request.end_date)}</>}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        Submitted {formatDate(request.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No leave requests found</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filteredRequests.length} of {totalItems} requests
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 bg-cyan-600 text-white text-sm font-medium rounded-lg">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Request Leave Modal */}
      {showRequestModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowRequestModal(false)} />
          <div className="fixed inset-0 md:inset-auto md:top-[5%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Request Leave</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <form id="leave-request-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
                  <select
                    value={formData.leave_type_id}
                    onChange={(e) => setFormData({ ...formData, leave_type_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    required
                  >
                    <option value="">Select leave type...</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none text-sm"
                    placeholder="Please provide a reason for your leave request..."
                  />
                </div>

                {/* Handover Section */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    Task Handover
                  </p>
                  <input
                    type="text"
                    value={formData.work_handover}
                    onChange={(e) => setFormData({ ...formData, work_handover: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm"
                    placeholder="Name of person handling your tasks..."
                  />
                </div>

                {/* Emergency Contact Section */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Emergency Contact
                  </p>
                  <input
                    type="text"
                    value={formData.contact_during_leave}
                    onChange={(e) => setFormData({ ...formData, contact_during_leave: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm"
                    placeholder="e.g. John (Brother) - +62 812-xxxx-xxxx"
                  />
                </div>

                {/* Leave Balance Info */}
                {formData.leave_type_id > 0 && (
                  <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">
                    {(() => {
                      const balance = leaveBalances.find((b) => b.leave_type_id === formData.leave_type_id);
                      if (balance) {
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-cyan-700">Available Balance:</span>
                            <span className="text-base font-bold text-cyan-700">
                              {balance.remaining_days} days
                            </span>
                          </div>
                        );
                      }
                      return <p className="text-sm text-cyan-700">No balance allocated for this leave type</p>;
                    })()}
                  </div>
                )}

                {/* Leave Approver Info */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <p className="text-xs text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    Leave Approver
                  </p>
                  {myProfile?.leaveApprover ? (
                    <p className="text-sm text-indigo-800">
                      Request akan dikirim ke: <strong>{myProfile.leaveApprover.name}</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-indigo-700">
                      Belum ada leave approver. Request akan dikirim ke HR.
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* Footer - Fixed Buttons */}
            <div className="flex gap-3 p-4 md:p-6 border-t border-gray-100 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="leave-request-form"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-cyan-600 text-white font-medium rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Request
              </button>
            </div>
          </div>
        </>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setSelectedRequest(null)} />
          <div className="fixed inset-0 md:inset-auto md:top-[5%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center',
                    getLeaveTypeConfig(selectedRequest.leaveType).color
                  )}
                >
                  {(() => {
                    const TypeIcon = getLeaveTypeConfig(selectedRequest.leaveType).icon;
                    return <TypeIcon className="h-5 w-5 md:h-6 md:w-6" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    {getLeaveTypeConfig(selectedRequest.leaveType).label}
                  </h3>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      getStatusConfig(selectedRequest.status).color
                    )}
                  >
                    {(() => {
                      const StatusIcon = getStatusConfig(selectedRequest.status).icon;
                      return <StatusIcon className="h-3 w-3" />;
                    })()}
                    {getStatusConfig(selectedRequest.status).label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Period</p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span>
                      {formatDateLong(selectedRequest.start_date)}
                      {selectedRequest.start_date !== selectedRequest.end_date && (
                        <> - {formatDateLong(selectedRequest.end_date)}</>
                      )}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mt-2">{selectedRequest.total_days} day(s)</p>
                  {(selectedRequest.start_half_day || selectedRequest.end_half_day) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedRequest.start_half_day && 'Start: Half day'}
                      {selectedRequest.start_half_day && selectedRequest.end_half_day && ' | '}
                      {selectedRequest.end_half_day && 'End: Half day'}
                    </p>
                  )}
                </div>

                {selectedRequest.reason && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Reason</p>
                    <p className="text-sm text-gray-700">{selectedRequest.reason}</p>
                  </div>
                )}

                {selectedRequest.work_handover && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" />
                      Task Handover
                    </p>
                    <p className="text-sm font-medium text-blue-800">{selectedRequest.work_handover}</p>
                  </div>
                )}

                {selectedRequest.contact_during_leave && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Emergency Contact
                    </p>
                    <p className="text-sm font-medium text-amber-800">{selectedRequest.contact_during_leave}</p>
                  </div>
                )}

                {selectedRequest.document_name && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs text-purple-600 uppercase tracking-wider mb-2">Attachment</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-purple-700 font-medium">{selectedRequest.document_name}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Submitted</p>
                    <p className="text-sm text-gray-700">{formatDateLong(selectedRequest.created_at)}</p>
                  </div>
                  {selectedRequest.approved_at && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {selectedRequest.status === 'approved' ? 'Approved' : 'Processed'}
                      </p>
                      <p className="text-sm text-gray-700">{formatDateLong(selectedRequest.approved_at)}</p>
                    </div>
                  )}
                </div>

                {selectedRequest.approver && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm text-green-800">
                      Approved by <strong>{selectedRequest.approver.name}</strong>
                    </p>
                  </div>
                )}

                {selectedRequest.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs text-red-600 uppercase tracking-wider mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-800">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed Buttons */}
            <div className="p-4 md:p-6 border-t border-gray-100 bg-white flex-shrink-0">
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={() => handleCancel(selectedRequest.id)}
                  disabled={isCancelling}
                  className="w-full px-4 py-2.5 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cancel Request
                </button>
              )}
              {selectedRequest.status !== 'pending' && (
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
