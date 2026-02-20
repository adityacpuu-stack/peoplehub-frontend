import { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Timer,
  Plus,
  Search,
  Eye,
  Check,
  X,
  Clock,
  Loader2,
  RefreshCw,
  User,
  Calculator,
  Calendar,
} from 'lucide-react';
import { overtimeService } from '../../services/overtime.service';
import type { Overtime, OvertimeListQuery } from '../../services/overtime.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { payrollSettingService } from '../../services/payroll-setting.service';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

// Helper to calculate period dates based on cut-off
const calculatePeriodDates = (period: string, cutoffDate: number = 20): { start: string; end: string } => {
  const [year, month] = period.split('-').map(Number);
  const startCutoff = cutoffDate + 1;

  // Period start: startCutoff of previous month
  const periodStart = new Date(year, month - 2, startCutoff);
  // Period end: cutoffDate of current month
  const periodEnd = new Date(year, month - 1, cutoffDate);

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    start: formatDate(periodStart),
    end: formatDate(periodEnd),
  };
};

// Generate period options (current month and 11 months back)
const generatePeriodOptions = (): { value: string; label: string }[] => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }

  return options;
};

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  basic_salary?: number;
  company_id?: number;
  department?: {
    id: number;
    name: string;
  };
}

export function OvertimePage() {
  // Data state
  const [requests, setRequests] = useState<Overtime[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [cutoffDate, setCutoffDate] = useState<number>(20);
  const periodOptions = useMemo(() => generatePeriodOptions(), []);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<Overtime | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    company_id: '',
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    rate_multiplier: '1.0',
    reason: '',
    description: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Fetch cutoff date when company changes
  const fetchCutoffDate = useCallback(async (companyId: number) => {
    try {
      const settings = await payrollSettingService.getByCompany(companyId);
      setCutoffDate(settings.payroll_cutoff_date || 20);
    } catch {
      setCutoffDate(20); // Default to 20 if no settings
    }
  }, []);

  // Fetch data
  const fetchOvertimes = useCallback(async () => {
    try {
      setLoading(true);

      // Calculate period date range
      const { start, end } = calculatePeriodDates(filterPeriod, cutoffDate);

      const query: OvertimeListQuery = {
        page,
        limit,
        sort_by: 'date',
        sort_order: 'desc',
        start_date: start,
        end_date: end,
      };

      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterType !== 'all') query.overtime_type = filterType;
      if (filterCompany !== 'all') query.company_id = Number(filterCompany);

      const response = await overtimeService.list(query);
      setRequests(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      console.error('Failed to fetch overtimes:', error);
      toast.error('Failed to load overtime data');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType, filterCompany, filterPeriod, cutoffDate]);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  const fetchEmployees = useCallback(async (companyId?: number) => {
    if (!companyId) {
      setEmployees([]);
      return;
    }
    setEmployeesLoading(true);
    try {
      const response = await employeeService.getAll({
        page: 1,
        company_id: companyId,
        limit: 500,
        employment_status: 'all',
      });
      setEmployees(response.data as Employee[]);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOvertimes();
  }, [fetchOvertimes]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch cutoff date when company filter changes
  useEffect(() => {
    if (filterCompany !== 'all') {
      fetchCutoffDate(Number(filterCompany));
    } else {
      setCutoffDate(20); // Reset to default when "All Companies"
    }
  }, [filterCompany, fetchCutoffDate]);

  // Filter requests locally for search
  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    return requests.filter(request => {
      const matchSearch =
        request.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
        request.employee?.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        request.employee?.department?.name?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [requests, search]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: total,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      totalHours: requests.filter(r => r.status === 'approved').reduce((acc, r) => acc + Number(r.hours || 0), 0),
      totalAmount: requests.filter(r => r.status === 'approved').reduce((acc, r) => acc + (r.total_amount || 0), 0),
    };
  }, [requests, total]);

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      await overtimeService.approve(id);
      toast.success('Overtime request approved');
      fetchOvertimes();
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      setActionLoading(id);
      await overtimeService.reject(id, { rejection_reason: reason });
      toast.success('Overtime request rejected');
      fetchOvertimes();
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate overtime amount (same formula as Laravel: floor(basic_salary / 173) * hours * multiplier)
  const calculateOvertimeAmount = useCallback(() => {
    if (!selectedEmployee?.basic_salary || !formData.hours) return 0;
    const hourlyRate = Math.floor(selectedEmployee.basic_salary / 173);
    const hours = parseFloat(formData.hours) || 0;
    const multiplier = parseFloat(formData.rate_multiplier) || 1;
    return hourlyRate * hours * multiplier;
  }, [selectedEmployee, formData.hours, formData.rate_multiplier]);

  const getHourlyRate = useCallback(() => {
    if (!selectedEmployee?.basic_salary) return 0;
    return Math.floor(selectedEmployee.basic_salary / 173);
  }, [selectedEmployee]);

  const handleCompanyChange = (companyId: string) => {
    setFormData(prev => ({ ...prev, company_id: companyId, employee_id: '' }));
    setSelectedEmployee(null);
    if (companyId) {
      fetchEmployees(Number(companyId));
    } else {
      setEmployees([]);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setFormData(prev => ({ ...prev, employee_id: employeeId }));
    const emp = employees.find(e => e.id === Number(employeeId));
    setSelectedEmployee(emp || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.date || !formData.hours || !formData.reason) {
      toast.error('Please fill in required fields');
      return;
    }

    const hours = parseFloat(formData.hours);
    if (hours < 0.01 || hours > 200) {
      toast.error('Hours must be between 0.01 and 200');
      return;
    }

    try {
      setFormLoading(true);
      await overtimeService.createForEmployee({
        employee_id: Number(formData.employee_id),
        date: formData.date,
        hours: parseFloat(formData.hours), // Send hours directly
        rate_multiplier: parseFloat(formData.rate_multiplier),
        reason: formData.reason,
        task_description: formData.description,
        overtime_type: formData.rate_multiplier === '2.0' ? 'weekend' : formData.rate_multiplier === '3.0' ? 'holiday' : 'regular',
      });
      toast.success('Overtime created and auto-approved');
      setShowAddModal(false);
      setFormData({
        company_id: '',
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        rate_multiplier: '1.0',
        reason: '',
        description: '',
      });
      setSelectedEmployee(null);
      setEmployees([]);
      fetchOvertimes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create overtime');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusBadge = (status: Overtime['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Check className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <X className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <X className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: Overtime['overtime_type']) => {
    const multiplier = overtimeService.getMultiplier(type);
    switch (type) {
      case 'regular':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">Weekday ({multiplier}x)</span>;
      case 'weekend':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">Weekend ({multiplier}x)</span>;
      case 'holiday':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">Holiday ({multiplier}x)</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">{type}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    // Handle both ISO datetime and time-only formats
    if (timeStr.includes('T')) {
      return new Date(timeStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <Timer className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Overtime Management
                  </h1>
                  <p className="text-orange-100 text-sm mt-1">
                    Manage and approve employee overtime requests
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchOvertimes()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Add Overtime</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Period Info Banner */}
      {(() => {
        const { start, end } = calculatePeriodDates(filterPeriod, cutoffDate);
        const startDate = new Date(start);
        const endDate = new Date(end);
        const formatPeriodDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Period: <span className="font-bold">{periodOptions.find(p => p.value === filterPeriod)?.label}</span>
                </p>
                <p className="text-xs text-blue-700">
                  Date Range: {formatPeriodDate(startDate)} - {formatPeriodDate(endDate)} (Cut-off: {cutoffDate})
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600">
              Only showing overtime within this period
            </p>
          </div>
        );
      })()}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
              <Timer className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Requests</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pending}</p>
          <p className="text-sm text-gray-500">Awaiting Approval</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Check className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Approved
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.approved}</p>
          <p className="text-sm text-gray-500">Approved Requests</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Timer className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalHours.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Total Hours</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Timer className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalAmount)}</p>
          <p className="text-sm text-gray-500">Total Amount</p>
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
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Period Filter */}
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <Calendar className="w-4 h-4 text-orange-600" />
                <select
                  value={filterPeriod}
                  onChange={(e) => { setFilterPeriod(e.target.value); setPage(1); }}
                  className="bg-transparent text-sm font-medium text-orange-700 focus:outline-none cursor-pointer"
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <select
                value={filterCompany}
                onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">All Types</option>
                <option value="regular">Weekday</option>
                <option value="weekend">Weekend</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Timer className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No overtime requests found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm bg-gradient-to-br from-orange-500 to-amber-600">
                          {request.employee?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{request.employee?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">
                            {request.employee?.employee_id} • {request.employee?.department?.name || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{formatDate(request.date)}</p>
                      <p className="text-xs text-gray-500">
                        {formatTime(request.start_time)} - {formatTime(request.end_time)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-gray-900">{parseFloat(Number(request.hours || 0).toFixed(2))}</span>
                      <span className="text-sm text-gray-500"> hrs</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getTypeBadge(request.overtime_type)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(request.total_amount || 0)}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(request.rate_per_hour || 0)}/hr × {request.rate_multiplier || 1}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoading === request.id}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={actionLoading === request.id}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <Timer className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Overtime Detail</h2>
                      <p className="text-orange-100 text-sm">{selectedRequest.employee?.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                    <p className="font-medium text-gray-900">{selectedRequest.employee?.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="font-medium text-gray-900">{selectedRequest.employee?.department?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Company</p>
                    <p className="font-medium text-gray-900">{selectedRequest.company?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Date</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedRequest.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Time</p>
                      <p className="font-medium text-gray-900">
                        {formatTime(selectedRequest.start_time)} - {formatTime(selectedRequest.end_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Duration</p>
                      <p className="font-medium text-gray-900">{parseFloat(Number(selectedRequest.hours || 0).toFixed(2))} hours</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Type</p>
                      {getTypeBadge(selectedRequest.overtime_type)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Reason</p>
                  <p className="text-gray-900">{selectedRequest.reason}</p>
                </div>

                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Calculation</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hourly Rate</span>
                      <span className="font-medium">{formatCurrency(selectedRequest.rate_per_hour || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hours × Multiplier</span>
                      <span className="font-medium">{parseFloat(Number(selectedRequest.hours || 0).toFixed(2))} × {selectedRequest.rate_multiplier}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-orange-200">
                      <span className="font-semibold text-gray-900">Total Amount</span>
                      <span className="font-bold text-orange-600">{formatCurrency(selectedRequest.total_amount || 0)}</span>
                    </div>
                  </div>
                </div>

                {selectedRequest.approver && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-500 mb-1">Approved By</p>
                    <p className="font-medium text-gray-900">{selectedRequest.approver.name}</p>
                    {selectedRequest.approved_at && (
                      <p className="text-xs text-gray-500">{new Date(selectedRequest.approved_at).toLocaleString()}</p>
                    )}
                  </div>
                )}

                {selectedRequest.rejection_reason && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-500 mb-1">Rejection Reason</p>
                    <p className="text-red-600">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {selectedRequest.status === 'pending' && (
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={actionLoading === selectedRequest.id}
                      className="flex-1 px-4 py-2.5 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={actionLoading === selectedRequest.id}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedRequest.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowAddModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <Timer className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Add Overtime Record</h2>
                      <p className="text-orange-100 text-sm">Input overtime hours - automatically approved for payroll</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="mx-6 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Calculator className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How Overtime Calculation Works:</p>
                    <p className="text-blue-700">Total = Hours × (Basic Salary ÷ 173) × Multiplier</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Employee Selection Section */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Select Employee</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.company_id}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        required
                      >
                        <option value="">Choose Company</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={employees.map(emp => ({
                          value: emp.id,
                          label: emp.name,
                          sublabel: emp.employee_id,
                        }))}
                        value={formData.employee_id ? Number(formData.employee_id) : ''}
                        onChange={(val) => handleEmployeeChange(String(val))}
                        placeholder={!formData.company_id ? 'Select company first' : 'Search employee...'}
                        searchPlaceholder="Type name or ID..."
                        disabled={!formData.company_id || employeesLoading}
                        loading={employeesLoading}
                        emptyMessage="No employees found"
                      />
                    </div>
                  </div>

                  {/* Employee Info Display */}
                  {selectedEmployee && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-900">Employee Selected</p>
                          <p className="text-xs text-green-700 mt-1">
                            <strong>{selectedEmployee.name}</strong> -
                            Basic Salary: {formatCurrency(selectedEmployee.basic_salary || 0)} -
                            Hourly Rate: {formatCurrency(getHourlyRate())}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Overtime Details Section */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Overtime Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Select date within payroll period</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="200"
                        value={formData.hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        placeholder="e.g., 54"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Monthly total or accumulated hours</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Multiplier</label>
                      <select
                        value={formData.rate_multiplier}
                        onChange={(e) => setFormData(prev => ({ ...prev, rate_multiplier: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      >
                        <option value="1.0">1.0x (Normal)</option>
                        <option value="1.5">1.5x (Weekday)</option>
                        <option value="2.0">2.0x (Weekend)</option>
                        <option value="3.0">3.0x (Holiday)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Default: 1.0x (normal rate)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Total</label>
                      <div className="px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(calculateOvertimeAmount())}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                    </div>
                  </div>
                </div>

                {/* Reason Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      rows={2}
                      placeholder="e.g., Project deadline completion"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      rows={2}
                      placeholder="Add any additional information if needed"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedEmployee(null);
                      setEmployees([]);
                      setFormData({
                        company_id: '',
                        employee_id: '',
                        date: new Date().toISOString().split('T')[0],
                        hours: '',
                        rate_multiplier: '1.0',
                        reason: '',
                        description: '',
                      });
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || !selectedEmployee}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save & Auto Approve
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
