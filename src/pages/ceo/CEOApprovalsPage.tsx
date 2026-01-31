import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2,
  Search,
  AlertCircle,
  FileText,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { leaveService } from '@/services/leave.service';
import type { LeaveRequest } from '@/services/leave.service';
import { overtimeService, type Overtime } from '@/services/overtime.service';
import { PageSpinner } from '@/components/ui';
import toast from 'react-hot-toast';

interface ApprovalItem {
  id: number;
  type: 'leave' | 'overtime';
  title: string;
  requester: string;
  department: string;
  company: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'normal' | 'high';
  submittedDate: string;
  details: string;
  originalData: LeaveRequest | Overtime;
}

const typeIcons: Record<string, React.ElementType> = {
  leave: Calendar,
  overtime: Clock,
};

const typeColors: Record<string, string> = {
  leave: '#6366f1',
  overtime: '#f59e0b',
};

export function CEOApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [leaveRequests, overtimeRequests] = await Promise.all([
        leaveService.getPendingApprovals(),
        overtimeService.getPendingApprovals(),
      ]);

      // Transform leave requests to approval items
      const leaveItems: ApprovalItem[] = leaveRequests.map((leave) => ({
        id: leave.id,
        type: 'leave' as const,
        title: `${leave.leave_type?.name || 'Leave'} Request`,
        requester: leave.employee?.name || 'Unknown',
        department: leave.employee?.department?.name || '-',
        company: leave.employee?.company?.name || '-',
        status: leave.status as 'pending' | 'approved' | 'rejected',
        priority: leave.total_days > 5 ? 'high' : 'normal',
        submittedDate: leave.created_at,
        details: `${leave.total_days} days (${new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`,
        originalData: leave,
      }));

      // Transform overtime requests to approval items
      const overtimeItems: ApprovalItem[] = overtimeRequests.map((ot) => ({
        id: ot.id,
        type: 'overtime' as const,
        title: 'Overtime Request',
        requester: ot.employee?.name || 'Unknown',
        department: ot.employee?.department?.name || '-',
        company: ot.company?.name || '-',
        status: ot.status as 'pending' | 'approved' | 'rejected',
        priority: ot.hours > 4 ? 'high' : 'normal',
        submittedDate: ot.created_at,
        details: `${ot.hours} hours on ${new Date(ot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${ot.reason}`,
        originalData: ot,
      }));

      // Combine and sort by date (newest first)
      const allApprovals = [...leaveItems, ...overtimeItems].sort(
        (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
      );

      setApprovals(allApprovals);
    } catch (err: any) {
      console.error('Failed to fetch approvals:', err);
      setError(err.message || 'Failed to load approvals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (item: ApprovalItem) => {
    const itemKey = `${item.type}-${item.id}`;
    setProcessingId(itemKey);
    try {
      if (item.type === 'leave') {
        await leaveService.approve(item.id);
      } else {
        await overtimeService.approve(item.id);
      }
      toast.success(`${item.title} approved`);
      // Update local state
      setApprovals((prev) =>
        prev.map((a) =>
          a.type === item.type && a.id === item.id ? { ...a, status: 'approved' } : a
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item: ApprovalItem) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    const itemKey = `${item.type}-${item.id}`;
    setProcessingId(itemKey);
    try {
      if (item.type === 'leave') {
        await leaveService.reject(item.id, reason);
      } else {
        await overtimeService.reject(item.id, { rejection_reason: reason });
      }
      toast.success(`${item.title} rejected`);
      // Update local state
      setApprovals((prev) =>
        prev.map((a) =>
          a.type === item.type && a.id === item.id ? { ...a, status: 'rejected' } : a
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load approvals</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchApprovals()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredApprovals = approvals
    .filter((a) => filter === 'all' || a.status === filter)
    .filter(
      (a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = {
    pending: approvals.filter((a) => a.status === 'pending').length,
    approved: approvals.filter((a) => a.status === 'approved').length,
    rejected: approvals.filter((a) => a.status === 'rejected').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="approvals-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#approvals-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ClipboardList className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Pending Approvals</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Review and approve requests</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.pending > 0 && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-xl rounded-xl text-sm text-amber-300 font-semibold border border-amber-500/30">
                  <Clock className="h-4 w-4" />
                  {stats.pending} Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.approved}</p>
          <p className="text-xs text-gray-500">Approved</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
              <XCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.rejected}</p>
          <p className="text-xs text-gray-500">Rejected</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search approvals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.map((approval) => {
          const TypeIcon = typeIcons[approval.type] || FileText;
          const itemKey = `${approval.type}-${approval.id}`;
          const isProcessing = processingId === itemKey;
          return (
            <div
              key={itemKey}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${typeColors[approval.type]}15` }}
                >
                  <TypeIcon className="h-6 w-6" style={{ color: typeColors[approval.type] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900">{approval.title}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(
                          approval.status
                        )}`}
                      >
                        {getStatusLabel(approval.status)}
                      </span>
                      {approval.priority === 'high' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600">
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{approval.details}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {approval.requester}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      {approval.department}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {approval.company}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(approval.submittedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                {approval.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <button
                      onClick={() => handleApprove(approval)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(approval)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredApprovals.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No approvals found</h3>
          <p className="text-gray-500">
            {filter === 'pending' ? 'All caught up! No pending approvals.' : 'Try changing the filter or search criteria.'}
          </p>
        </div>
      )}
    </div>
  );
}
