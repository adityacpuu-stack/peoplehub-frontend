import { useState, useEffect, useCallback, useMemo } from 'react';
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
import type { LeaveRequest, LeaveType } from '@/types';

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

export function LeaveRequestsPage() {
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
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

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
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [page, filterCompany, filterStatus, filterLeaveType]);

  // Fetch leave types
  const fetchLeaveTypes = useCallback(async () => {
    try {
      const types = await leaveService.getTypes();
      setLeaveTypes(types);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  }, []);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      setCompanies(response.data);
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
    const totalDays = leaves
      .filter(l => l.status === 'approved')
      .reduce((acc, l) => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return acc + days;
      }, 0);

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

  const calculateDays = (startDate: string, endDate: string) => {
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
    setFormData({
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
  };

  const handleViewDetail = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLeave(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leave_type_id || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('End date must be after start date');
      return;
    }

    setSubmitting(true);
    try {
      await leaveService.create({
        leave_type_id: Number(formData.leave_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || undefined,
      });
      toast.success('Leave request created successfully');
      handleCloseModal();
      fetchLeaves();
    } catch (error: unknown) {
      console.error('Failed to create leave request:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create leave request');
    } finally {
      setSubmitting(false);
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
      console.error('Failed to approve leave:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) {
      toast.error('Rejection reason is required');
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
      console.error('Failed to reject leave:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to reject leave');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;

    try {
      await leaveService.delete(id);
      toast.success('Leave request deleted');
      fetchLeaves();
    } catch (error: unknown) {
      console.error('Failed to delete leave:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete leave');
    }
  };

  const handleExport = () => {
    if (filteredLeaves.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Employee',
      'Department',
      'Company',
      'Leave Type',
      'Start Date',
      'End Date',
      'Days',
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
      calculateDays(leave.start_date, leave.end_date),
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
          <p className="text-sm text-gray-500">Total Days (Approved)</p>
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
                    Days
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
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-violet-100 text-violet-700 font-semibold rounded-lg">
                        {calculateDays(leave.start_date, leave.end_date)}
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
                        {leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(leave.id)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(leave.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
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

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      disabled={loadingEmployees}
                    >
                      <option value="">
                        {loadingEmployees ? 'Loading...' : 'Select Employee (Optional for HR)'}
                      </option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.leave_type_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, leave_type_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      required
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        required
                      />
                    </div>
                  </div>

                  {formData.start_date && formData.end_date && (
                    <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-violet-700">Total Days</span>
                        <span className="text-lg font-bold text-violet-700">
                          {calculateDays(formData.start_date, formData.end_date)} days
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      rows={3}
                      placeholder="Enter reason for leave request..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
                        {calculateDays(selectedLeave.start_date, selectedLeave.end_date)} days
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

                {/* Action Buttons */}
                {selectedLeave.status === 'pending' && (
                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={() => handleReject(selectedLeave.id)}
                      className="flex-1 px-4 py-2.5 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedLeave.id)}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                )}

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
