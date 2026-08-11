import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  Calendar,
  Plus,
  Search,
  Eye,
  X,
  Check,
  XCircle,
  Clock,
  Building,
  User,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  FileText,
  Filter,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';
import { leaveService } from '../../services/leave.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { useAuthStore } from '@/stores/auth.store';
import { toNum } from '@/lib/utils';
import type { LeaveRequest, LeaveType } from '@/types';

/**
 * Wave 6.5: scope Approve/Reject actions to the designated approver only.
 * Super Admin retains god-mode. /leave is HR oversight view — buttons stay
 * visible but disabled for non-routed requests (with tooltip explaining
 * who the approver is).
 */
function canApproveLeave(
  leave: LeaveRequest,
  currentEmployeeId: number | null | undefined,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!currentEmployeeId) return false;
  const emp = leave.employee;
  if (!emp) return false;
  return (
    emp.leave_approver_id === currentEmployeeId ||
    emp.manager_id === currentEmployeeId ||
    emp.direct_manager_id === currentEmployeeId
  );
}
import { leaveRequestSchema, type LeaveRequestFormData } from '@/schemas/leave-request.schema';

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  company_id?: number;
  department?: {
    id: number;
    name: string;
  };
}

/**
 * Backdating is capped instead of banned: HR really does file sick leave a few
 * days after the fact, but an unbounded past start date quietly books a period
 * that has already been worked (and, for a closed month, already paid).
 */
const MAX_BACKDATE_DAYS = 30;

/** YYYY-MM-DD in the browser's own timezone — toISOString() alone shifts to UTC
 *  and hands a date input yesterday's date for anyone east of Greenwich. */
const toDateInputValue = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

/**
 * The two per-type rules the backend enforces (leave.service.ts answers a
 * violation with a 400). Both are counted in WORKING days, same as the charged
 * total — never in the calendar span the date pickers suggest.
 */
// The schema default for min_days_per_request. Every row carries it, so showing
// it would put "Minimum 0.5 working days" under every leave type — noise that
// tells the user nothing. Only a deliberately raised minimum is worth surfacing.
const DEFAULT_MIN_DAYS = 0.5;

const leaveTypeLimitText = (type: LeaveType | null | undefined): string | null => {
  if (!type) return null;

  // min is a Prisma Decimal and arrives as a STRING ("0.5"), max is an Int and
  // arrives as a number. A typeof === 'number' test therefore silently dropped
  // the minimum entirely — the exact rejection-after-submit this hint exists to
  // prevent. Guard null explicitly: toNum(null) would be 0, a real-looking value.
  const rawMin = type.min_days_per_request;
  const minNum = rawMin == null ? null : toNum(rawMin, NaN);
  const min = minNum !== null && Number.isFinite(minNum) && minNum > DEFAULT_MIN_DAYS ? minNum : null;
  const max = typeof type.max_days_per_request === 'number' ? type.max_days_per_request : null;
  const unit = (n: number) => `${n} working day${n === 1 ? '' : 's'}`;

  if (min !== null && max !== null) return `Must be between ${unit(min)} and ${unit(max)} per request.`;
  if (min !== null) return `Minimum ${unit(min)} per request.`;
  if (max !== null) return `Maximum ${unit(max)} per request.`;
  return null;
};

/**
 * Working days the backend charged for an existing request. Holidays are
 * company-scoped and live only on the server (calculateLeaveDaysWithHolidays),
 * so a stored request's duration is read from total_days, never recomputed.
 */
const chargedDays = (leave: LeaveRequest): number => toNum(leave.total_days);

const chargedDaysLabel = (leave: LeaveRequest): string => {
  // total_days is nullable, and Number(null) is 0 — which would print a
  // confident "0 days" for a row that simply has no stored total. Check for
  // absence before coercing.
  if (leave.total_days == null) return '-';
  const n = toNum(leave.total_days, NaN);
  return Number.isFinite(n) ? String(n) : '-';
};

export function LeaveRequestsPage() {
  const { user } = useAuthStore();
  const currentEmployeeId = user?.employee?.id ?? null;
  const isSuperAdmin = (user?.roles ?? []).includes('Super Admin');

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // ===== Leave request form (RHF + Zod) =====
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      employee_id: '',
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  const watchedStart = watch('start_date');
  const watchedEnd = watch('end_date');
  const watchedLeaveType = watch('leave_type_id');

  // Selected type drives the limit hint + the "document required" notice.
  const selectedLeaveType = useMemo(
    () => leaveTypes.find(t => String(t.id) === String(watchedLeaveType)) ?? null,
    [leaveTypes, watchedLeaveType],
  );
  const limitText = leaveTypeLimitText(selectedLeaveType);

  const minStartDate = useMemo(() => {
    const earliest = new Date();
    earliest.setDate(earliest.getDate() - MAX_BACKDATE_DAYS);
    return toDateInputValue(earliest);
  }, []);

  // Fetch leaves from API
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        limit: number;
        company_id?: number;
        status?: string;
        leave_type_id?: number;
      } = { page, limit };

      if (filterCompany !== 'all') {
        params.company_id = Number(filterCompany);
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterLeaveType !== 'all') {
        params.leave_type_id = Number(filterLeaveType);
      }

      const response = await leaveService.getAll(params);
      setLeaves(response.data);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      // Shared id: the axios interceptor toasts under 'api-error' too, so the
      // page-level message replaces it instead of stacking a second toast.
      toast.error('Failed to load leave requests', { id: 'api-error' });
    } finally {
      setLoading(false);
    }
  }, [page, filterCompany, filterStatus, filterLeaveType]);

  // Fetch leave types. getTypeOptions() projects down to {id, name, code} and
  // would drop min_days_per_request / max_days_per_request — the two rules the
  // backend rejects a request on — so the form could not show them before submit.
  const fetchLeaveTypes = useCallback(async () => {
    try {
      const types = await leaveService.getTypes();
      setLeaveTypes(types);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  }, []);

  // Fetch companies (lightweight options for filter dropdown).
  const fetchCompanies = useCallback(async () => {
    try {
      const options = await companyService.getOptions();
      // Map to Company-shaped objects so existing setCompanies state stays compatible.
      setCompanies(options as unknown as typeof companies);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  // Fetch employees
  const fetchEmployees = useCallback(async (companyId?: number) => {
    setLoadingEmployees(true);
    try {
      const params: { page: number; limit: number; company_id?: number; employment_status?: string } = {
        page: 1,
        limit: 200,
        employment_status: 'active'
      };
      if (companyId) {
        params.company_id = companyId;
      }
      const response = await employeeService.getAll(params);
      setEmployees(response.data.map(emp => ({
        id: emp.id,
        name: emp.name,
        employee_id: emp.employee_id || '',
        company_id: emp.company_id,
        department: emp.department || undefined,
      })));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchLeaveTypes();
  }, [fetchCompanies, fetchLeaveTypes]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCompany, filterLeaveType]);

  // Fetch employees when modal opens
  useEffect(() => {
    if (showModal) {
      fetchEmployees();
    }
  }, [showModal, fetchEmployees]);

  // Filter leaves by search
  const filteredLeaves = useMemo(() => {
    if (!search) return leaves;
    const searchLower = search.toLowerCase();
    return leaves.filter(leave =>
      leave.employee?.name?.toLowerCase().includes(searchLower) ||
      leave.leaveType?.name?.toLowerCase().includes(searchLower) ||
      leave.reason?.toLowerCase().includes(searchLower)
    );
  }, [leaves, search]);

  // Stats
  const stats = useMemo(() => {
    const pending = leaves.filter(l => l.status === 'pending').length;
    const approved = leaves.filter(l => l.status === 'approved').length;
    const rejected = leaves.filter(l => l.status === 'rejected').length;
    // total_days is what the backend actually charged (working days, holidays
    // excluded). Re-deriving it from the date span inflates the figure by every
    // weekend inside the period.
    const totalDays = leaves
      .filter(l => l.status === 'approved')
      .reduce((acc, l) => acc + chargedDays(l), 0);

    return { totalItems, pending, approved, rejected, totalDays };
  }, [leaves, totalItems]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Plain span between the two dates. This is NOT the charged figure: the
  // backend bills working days, so a Fri→Mon request spans 4 here and costs 2.
  // Only ever used for the pre-submit preview, which labels itself as calendar days.
  const calculateCalendarDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleOpenModal = () => {
    reset({
      employee_id: '',
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    reset();
  };

  const handleViewDetail = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLeave(null);
  };

  const onSubmit = async (data: LeaveRequestFormData) => {
    const payload = {
      leave_type_id: Number(data.leave_type_id),
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason && data.reason.trim() !== '' ? data.reason : undefined,
    };

    // POST /leaves ignores any employee_id and files against the caller's own
    // record, so an HR user who picked someone from the dropdown would book the
    // leave on themselves. Filing for anyone else has to go via /leaves/employee.
    const parsedEmployeeId = data.employee_id ? Number(data.employee_id) : NaN;
    const targetEmployeeId = Number.isFinite(parsedEmployeeId) && parsedEmployeeId > 0
      ? parsedEmployeeId
      : null;
    const isOnBehalf = targetEmployeeId !== null && targetEmployeeId !== currentEmployeeId;

    try {
      if (isOnBehalf) {
        await leaveService.createForEmployee({ ...payload, employee_id: targetEmployeeId });
      } else {
        await leaveService.create(payload);
      }
      toast.success('Leave request created successfully');
      handleCloseModal();
      fetchLeaves();
    } catch (error) {
      // Axios interceptor handles error toast; just keep the modal open
      console.error('Failed to create leave request:', error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await leaveService.approve(id);
      toast.success('Leave request approved');
      fetchLeaves();
      if (selectedLeave?.id === id) {
        handleCloseDetailModal();
      }
    } catch (error: unknown) {
      // Axios interceptor handles 4xx/5xx toast; catch is for logging only
      console.error('Failed to approve leave:', error);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) {
      toast.error('Rejection reason is required', { id: 'api-error' });
      return;
    }

    try {
      await leaveService.reject(id, reason);
      toast.success('Leave request rejected');
      fetchLeaves();
      if (selectedLeave?.id === id) {
        handleCloseDetailModal();
      }
    } catch (error: unknown) {
      // Axios interceptor handles 4xx/5xx toast; catch is for logging only
      console.error('Failed to reject leave:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;

    try {
      await leaveService.delete(id);
      toast.success('Leave request deleted');
      fetchLeaves();
    } catch (error: unknown) {
      // Axios interceptor handles 4xx/5xx toast; catch is for logging only
      console.error('Failed to delete leave:', error);
    }
  };

  const handleExport = () => {
    if (filteredLeaves.length === 0) {
      toast.error('No data to export', { id: 'api-error' });
      return;
    }

    const headers = [
      'Employee',
      'Department',
      'Company',
      'Leave Type',
      'Start Date',
      'End Date',
      'Working Days',
      'Status',
      'Reason',
      'Created At',
    ];

    const rows = filteredLeaves.map(leave => [
      leave.employee?.name || '-',
      leave.employee?.department?.name || '-',
      '-',
      leave.leaveType?.name || '-',
      formatDate(leave.start_date),
      formatDate(leave.end_date),
      chargedDaysLabel(leave),
      leave.status,
      leave.reason || '-',
      leave.created_at ? formatDate(leave.created_at) : '-',
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export successful');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Leave Requests
                  </h1>
                  <p className="text-violet-100 text-sm mt-1">
                    Manage employee leave requests and approvals
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-violet-600 rounded-xl hover:bg-violet-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>New Request</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalItems}</p>
          <p className="text-sm text-gray-500">Total Requests</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pending}</p>
          <p className="text-sm text-gray-500">Awaiting Approval</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Approved
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.approved}</p>
          <p className="text-sm text-gray-500">Approved</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg">
              Rejected
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.rejected}</p>
          <p className="text-sm text-gray-500">Rejected</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <CalendarCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalDays}</p>
          <p className="text-sm text-gray-500">Working Days (Approved)</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee, leave type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="w-4 h-4" />
                <span>Filters:</span>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={filterLeaveType}
                onChange={(e) => setFilterLeaveType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="all">All Leave Types</option>
                {leaveTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>

              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No leave requests found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Working Days
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{leave.employee?.name || '-'}</p>
                          <p className="text-xs text-gray-500">
                            {leave.employee?.department?.name || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-violet-500" />
                        <span className="text-gray-900">{leave.leaveType?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{formatDate(leave.start_date)}</p>
                        <p className="text-gray-500">to {formatDate(leave.end_date)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 bg-violet-100 text-violet-700 font-semibold rounded-lg"
                        title="Working days charged — weekends and public holidays excluded"
                      >
                        {chargedDaysLabel(leave)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                        {getStatusIcon(leave.status)}
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewDetail(leave)}
                          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {leave.status === 'pending' && (() => {
                          const isApprover = canApproveLeave(leave, currentEmployeeId, isSuperAdmin);
                          const disabledTip = !isApprover
                            ? 'Bukan approver — request ini dirouting ke manager/HR lain'
                            : undefined;
                          return (
                            <>
                              <button
                                onClick={() => isApprover && handleApprove(leave.id)}
                                disabled={!isApprover}
                                className={`p-2 rounded-lg transition-colors ${
                                  isApprover
                                    ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                    : 'text-gray-200 cursor-not-allowed'
                                }`}
                                title={disabledTip || 'Approve'}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => isApprover && handleReject(leave.id)}
                                disabled={!isApprover}
                                className={`p-2 rounded-lg transition-colors ${
                                  isApprover
                                    ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                    : 'text-gray-200 cursor-not-allowed'
                                }`}
                                title={disabledTip || 'Reject'}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          );
                        })()}
                        <button
                          onClick={() => handleDelete(leave.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredLeaves.length} of {totalItems} requests
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Leave Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">New Leave Request</h2>
                      <p className="text-violet-100 text-sm">Create a new leave request</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6" noValidate>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee
                    </label>
                    <select
                      {...register('employee_id')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      disabled={loadingEmployees}
                    >
                      <option value="">
                        {loadingEmployees ? 'Loading...' : 'Select Employee (Optional for P&C)'}
                      </option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-400">
                      Leave blank to file for yourself. Picking someone files the request
                      on their record (HR Staff or higher).
                    </p>
                    {errors.employee_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.employee_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('leave_type_id')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    {errors.leave_type_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.leave_type_id.message}</p>
                    )}
                    {/* The backend rejects a request that breaks either rule with a 400,
                        so state them here rather than after the fact. */}
                    {limitText && (
                      <p className="mt-2 text-sm text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{limitText}</span>
                      </p>
                    )}
                    {selectedLeaveType?.requires_document && (
                      <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          This leave type requires a supporting document (e.g. medical
                          certificate). Send it to HR separately — it cannot be uploaded here.
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="start_date"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="date"
                            {...field}
                            value={field.value || ''}
                            min={minStartDate}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                          />
                        )}
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Backdated up to {MAX_BACKDATE_DAYS} days
                      </p>
                      {errors.start_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name="end_date"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="date"
                            {...field}
                            value={field.value || ''}
                            min={watchedStart || minStartDate}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                          />
                        )}
                      />
                      {errors.end_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Calendar span only — the balance is charged in working days, which
                      depends on the company holiday calendar the server owns. Labelled
                      so nobody reads this number as the amount being deducted. */}
                  {watchedStart && watchedEnd && watchedEnd >= watchedStart && (
                    <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-violet-700">Period Selected</span>
                        <span className="text-lg font-bold text-violet-700">
                          {calculateCalendarDays(watchedStart, watchedEnd)} calendar days
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-violet-600">
                        Weekends and company public holidays are not counted. The working
                        days actually charged are calculated on submit and shown on the
                        request once created.
                      </p>
                    </div>
                  )}

                  {/* The file picker here was never sent anywhere: /leaves accepts no
                      attachment field, so a medical certificate chosen in this modal was
                      dropped on submit. Replaced with the actual process until the
                      backend has an upload endpoint. */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <span className="font-semibold">Documents cannot be attached here.</span>{' '}
                        Send any supporting document (medical certificate, official letter)
                        to HR separately — this form submits dates and reason only.
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason
                    </label>
                    <textarea
                      {...register('reason')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      rows={3}
                      placeholder="Enter reason for leave request..."
                    />
                    {errors.reason && (
                      <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLeave && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseDetailModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Leave Request Details</h2>
                      <p className="text-violet-100 text-sm">Request #{selectedLeave.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseDetailModal}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(selectedLeave.status)}`}>
                      {getStatusIcon(selectedLeave.status)}
                      {selectedLeave.status.charAt(0).toUpperCase() + selectedLeave.status.slice(1)}
                    </span>
                  </div>

                  {/* Employee Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedLeave.employee?.name || '-'}</p>
                        <p className="text-sm text-gray-500">
                          {selectedLeave.employee?.department?.name || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Leave Type</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-violet-500" />
                        {selectedLeave.leaveType?.name || '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-semibold text-gray-900">
                        {chargedDaysLabel(selectedLeave)} working days
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Weekends &amp; public holidays excluded
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedLeave.start_date)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedLeave.end_date)}</p>
                    </div>
                  </div>

                  {selectedLeave.reason && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Reason</p>
                      <p className="text-gray-900">{selectedLeave.reason}</p>
                    </div>
                  )}

                  {selectedLeave.created_at && (
                    <div className="text-center text-sm text-gray-400">
                      Requested on {formatDate(selectedLeave.created_at)}
                    </div>
                  )}
                </div>

                {/* Action Buttons — disabled when current user is not the designated approver */}
                {selectedLeave.status === 'pending' && (() => {
                  const isApprover = canApproveLeave(selectedLeave, currentEmployeeId, isSuperAdmin);
                  return (
                    <div className="flex flex-col gap-2 mt-6">
                      {!isApprover && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Bukan approver — request ini dirouting ke manager/HR lain
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => isApprover && handleReject(selectedLeave.id)}
                          disabled={!isApprover}
                          className={`flex-1 px-4 py-2.5 border font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            isApprover
                              ? 'border-red-300 text-red-600 hover:bg-red-50'
                              : 'border-gray-200 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => isApprover && handleApprove(selectedLeave.id)}
                          disabled={!isApprover}
                          className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            isApprover
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {selectedLeave.status !== 'pending' && (
                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={handleCloseDetailModal}
                      className="flex-1 px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      Close
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
