import { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  MinusCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Building,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  XCircle,
  AlertTriangle,
  Banknote,
  Receipt,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { deductionService, DEDUCTION_TYPES } from '../../services/deduction.service';
import type { PayrollAdjustment, DeductionListQuery } from '../../services/deduction.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

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

export function DeductionsPage() {
  const [deductions, setDeductions] = useState<PayrollAdjustment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<PayrollAdjustment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 12;

  const [formData, setFormData] = useState({
    type: 'deduction' as string,
    category: '',
    description: '',
    reason: '',
    amount: 0,
    is_recurring: false,
    recurring_frequency: 'monthly' as string,
    recurring_end_date: '',
    company_id: '' as string | number,
    employee_id: '' as string | number,
    effective_date: '',
    pay_period: '',
    reference_number: '',
    total_loan_amount: 0,
    installment_amount: 0,
  });

  // Fetch deductions from API
  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    try {
      const query: DeductionListQuery = {
        page,
        limit,
        search: search || undefined,
      };
      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterCompany !== 'all') {
        query.company_id = Number(filterCompany);
      }
      if (filterType !== 'all') {
        query.type = filterType;
      }

      const response = await deductionService.list(query);
      // Filter to only show deduction types
      const deductionData = response.data.filter(d =>
        DEDUCTION_TYPES.includes(d.type as typeof DEDUCTION_TYPES[number])
      );
      setDeductions(deductionData);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch deductions:', error);
      toast.error('Gagal memuat data potongan');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterCompany, filterType]);

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  // Fetch employees (filtered by company if selected)
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
        basic_salary: emp.basic_salary,
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
  }, [fetchCompanies]);

  // Fetch employees when modal opens or company changes
  useEffect(() => {
    if (showModal) {
      if (formData.company_id) {
        fetchEmployees(Number(formData.company_id));
      } else {
        fetchEmployees();
      }
    }
  }, [showModal, formData.company_id, fetchEmployees]);

  useEffect(() => {
    fetchDeductions();
  }, [fetchDeductions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCompany, filterType]);

  // Stats (computed from current data)
  const stats = useMemo(() => {
    const pendingCount = deductions.filter(d => d.status === 'pending').length;
    const approvedCount = deductions.filter(d => d.status === 'approved').length;
    const totalAmount = deductions.filter(d => d.status === 'approved').reduce((acc, d) => acc + Number(d.amount || 0), 0);
    return {
      totalItems,
      pendingCount,
      approvedCount,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
    };
  }, [deductions, totalItems]);

  const isLoanType = formData.type === 'loan' || formData.type === 'advance';

  const computedInstallments = useMemo(() => {
    if (!isLoanType || !formData.total_loan_amount || !formData.installment_amount) return 0;
    return Math.ceil(formData.total_loan_amount / formData.installment_amount);
  }, [isLoanType, formData.total_loan_amount, formData.installment_amount]);

  const computedEndDate = useMemo(() => {
    if (!computedInstallments || !formData.effective_date) return '';
    const date = new Date(formData.effective_date);
    date.setMonth(date.getMonth() + computedInstallments);
    return date.toISOString().split('T')[0];
  }, [computedInstallments, formData.effective_date]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deduction':
        return <MinusCircle className="w-5 h-5" />;
      case 'penalty':
        return <AlertTriangle className="w-5 h-5" />;
      case 'loan':
        return <Banknote className="w-5 h-5" />;
      case 'advance':
        return <Wallet className="w-5 h-5" />;
      default:
        return <Receipt className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'deduction':
        return 'from-red-500 to-red-600';
      case 'penalty':
        return 'from-orange-500 to-orange-600';
      case 'loan':
        return 'from-blue-500 to-blue-600';
      case 'advance':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const handleOpenModal = (deduction?: PayrollAdjustment) => {
    if (deduction) {
      setEditingDeduction(deduction);
      setFormData({
        type: deduction.type,
        category: deduction.category || '',
        description: deduction.description || '',
        reason: deduction.reason || '',
        amount: Number(deduction.amount) || 0,
        is_recurring: deduction.is_recurring,
        recurring_frequency: deduction.recurring_frequency || 'monthly',
        recurring_end_date: deduction.recurring_end_date ? deduction.recurring_end_date.split('T')[0] : '',
        company_id: deduction.company_id || '',
        employee_id: deduction.employee_id || '',
        effective_date: deduction.effective_date ? deduction.effective_date.split('T')[0] : '',
        pay_period: deduction.pay_period || '',
        reference_number: deduction.reference_number || '',
        total_loan_amount: Number(deduction.total_loan_amount) || 0,
        installment_amount: Number(deduction.installment_amount) || 0,
      });
      if (deduction.employee) {
        setSelectedEmployee({
          id: deduction.employee.id,
          name: deduction.employee.name,
          employee_id: deduction.employee.employee_id,
          department: deduction.employee.department,
        });
      } else {
        setSelectedEmployee(null);
      }
    } else {
      setEditingDeduction(null);
      setFormData({
        type: 'deduction',
        category: '',
        description: '',
        reason: '',
        amount: 0,
        is_recurring: false,
        recurring_frequency: 'monthly',
        recurring_end_date: '',
        company_id: '',
        employee_id: '',
        effective_date: '',
        pay_period: '',
        reference_number: '',
        total_loan_amount: 0,
        installment_amount: 0,
      });
      setSelectedEmployee(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDeduction(null);
    setSelectedEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isLoan = formData.type === 'loan' || formData.type === 'advance';

    if (!formData.employee_id) {
      toast.error('Karyawan harus dipilih');
      return;
    }

    if (isLoan) {
      if (!formData.total_loan_amount || !formData.installment_amount) {
        toast.error('Total pinjaman dan cicilan per bulan harus diisi');
        return;
      }
    } else {
      if (!formData.amount) {
        toast.error('Jumlah harus diisi');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        employee_id: Number(formData.employee_id),
        type: formData.type,
        category: formData.category || undefined,
        amount: isLoan ? formData.installment_amount : formData.amount,
        description: formData.description || undefined,
        reason: formData.reason || undefined,
        effective_date: formData.effective_date || undefined,
        pay_period: formData.pay_period || undefined,
        is_recurring: isLoan ? true : formData.is_recurring,
        recurring_frequency: isLoan ? 'monthly' : (formData.is_recurring ? formData.recurring_frequency : undefined),
        recurring_end_date: isLoan
          ? (computedEndDate || undefined)
          : (formData.is_recurring && formData.recurring_end_date ? formData.recurring_end_date : undefined),
        reference_number: formData.reference_number || undefined,
        company_id: formData.company_id ? Number(formData.company_id) : undefined,
      };

      if (isLoan) {
        payload.total_loan_amount = formData.total_loan_amount;
        payload.installment_amount = formData.installment_amount;
      }

      if (editingDeduction) {
        await deductionService.update(editingDeduction.id, payload);
        toast.success('Potongan berhasil diperbarui');
      } else {
        await deductionService.create(payload);
        toast.success('Potongan berhasil ditambahkan');
      }

      handleCloseModal();
      fetchDeductions();
    } catch (error: any) {
      console.error('Failed to save deduction:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Gagal menyimpan potongan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus potongan ini?')) return;

    try {
      await deductionService.delete(id);
      toast.success('Potongan berhasil dihapus');
      fetchDeductions();
    } catch (error: any) {
      console.error('Failed to delete deduction:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Gagal menghapus potongan');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await deductionService.approve(id);
      toast.success('Potongan berhasil disetujui');
      fetchDeductions();
    } catch (error: any) {
      console.error('Failed to approve:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Gagal menyetujui');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Alasan penolakan:');
    if (!reason) return;

    try {
      await deductionService.reject(id, reason);
      toast.success('Potongan berhasil ditolak');
      fetchDeductions();
    } catch (error: any) {
      console.error('Failed to reject:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Gagal menolak');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <MinusCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Deductions Management
                  </h1>
                  <p className="text-red-100 text-sm mt-1">
                    Kelola potongan gaji karyawan
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toast.success('Export feature coming soon')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Potongan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalItems}</p>
          <p className="text-sm text-gray-500">Total Potongan</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingCount}</p>
          <p className="text-sm text-gray-500">Menunggu Persetujuan</p>
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
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.approvedCount}</p>
          <p className="text-sm text-gray-500">Disetujui</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalAmount)}</p>
          <p className="text-sm text-gray-500">Total Potongan (Approved)</p>
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
                placeholder="Cari potongan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="processed">Processed</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="all">Semua Tipe</option>
                {DEDUCTION_TYPES.map(type => (
                  <option key={type} value={type}>{deductionService.getTypeLabel(type)}</option>
                ))}
              </select>

              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="all">Semua Perusahaan</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Deduction Cards Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : deductions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MinusCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Tidak ada potongan</h3>
              <p className="mt-1 text-gray-500">Coba sesuaikan filter pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deductions.map(deduction => (
                <div
                  key={deduction.id}
                  className={`relative overflow-hidden bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                    deduction.status === 'approved' ? 'border-green-200' :
                    deduction.status === 'pending' ? 'border-yellow-200' :
                    deduction.status === 'rejected' ? 'border-red-200' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${getIconColor(deduction.type)}`}>
                        {getIcon(deduction.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{deductionService.getTypeLabel(deduction.type)}</h3>
                        <p className="text-xs text-gray-500">{deduction.category || 'Umum'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {deduction.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(deduction.id)}
                            className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(deduction.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenModal(deduction)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(deduction.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {deduction.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{deduction.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${deductionService.getStatusColor(deduction.status)}`}>
                      {deductionService.getStatusLabel(deduction.status)}
                    </span>
                    {deduction.is_recurring && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        Recurring
                      </span>
                    )}
                    {deduction.pay_period && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {deduction.pay_period}
                      </span>
                    )}
                    {(deduction.type === 'loan' || deduction.type === 'advance') && deduction.total_installments && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Cicilan {deduction.current_installment || 0}/{deduction.total_installments}
                      </span>
                    )}
                  </div>

                  {/* Loan Progress */}
                  {(deduction.type === 'loan' || deduction.type === 'advance') && deduction.total_loan_amount && deduction.total_installments && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress Cicilan</span>
                        <span>{Math.round(((deduction.current_installment || 0) / deduction.total_installments) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((deduction.current_installment || 0) / deduction.total_installments) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <span>Sisa: {formatCurrency(Number(deduction.remaining_balance || 0))}</span>
                        <span>Total: {formatCurrency(Number(deduction.total_loan_amount))}</span>
                      </div>
                    </div>
                  )}

                  {deduction.employee && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Users className="w-3.5 h-3.5" />
                      <span>{deduction.employee.name}</span>
                      {deduction.employee.department && (
                        <span className="text-gray-400">({deduction.employee.department.name})</span>
                      )}
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-500">Jumlah</p>
                        <p className="font-bold text-red-600 text-lg">
                          {formatCurrency(Number(deduction.amount))}
                        </p>
                      </div>
                      {deduction.effective_date && (
                        <div className="text-right">
                          <p className="text-gray-500">Efektif</p>
                          <p className="font-medium text-gray-900">
                            {new Date(deduction.effective_date).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {deduction.rejection_reason && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-red-600 bg-red-50 p-2 rounded">
                      <strong>Alasan Penolakan:</strong> {deduction.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Menampilkan {deductions.length} dari {totalItems} potongan
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
                Halaman {page} dari {totalPages}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <MinusCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {editingDeduction ? 'Edit Potongan' : 'Tambah Potongan'}
                      </h2>
                      <p className="text-red-100 text-sm">
                        {editingDeduction ? 'Perbarui data potongan' : 'Buat potongan baru'}
                      </p>
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

              <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* Company & Employee Selection */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-3">Pilih Karyawan</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Perusahaan</label>
                        <select
                          value={formData.company_id}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, company_id: e.target.value, employee_id: '' }));
                            setSelectedEmployee(null);
                          }}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                        >
                          <option value="">Semua Perusahaan</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Karyawan <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={employees.map(emp => ({
                            value: emp.id,
                            label: emp.name,
                            sublabel: emp.employee_id,
                          }))}
                          value={formData.employee_id ? Number(formData.employee_id) : ''}
                          onChange={(val) => {
                            const employeeId = String(val);
                            setFormData(prev => ({ ...prev, employee_id: employeeId }));
                            const emp = employees.find(emp => emp.id === Number(employeeId));
                            setSelectedEmployee(emp || null);
                          }}
                          placeholder="Cari karyawan..."
                          searchPlaceholder="Ketik nama atau ID..."
                          disabled={loadingEmployees}
                          loading={loadingEmployees}
                          emptyMessage="Tidak ada karyawan"
                        />
                      </div>
                    </div>

                    {selectedEmployee && (
                      <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{selectedEmployee.name}</p>
                            <p className="text-xs text-gray-500">
                              {selectedEmployee.employee_id}
                              {selectedEmployee.department && ` - ${selectedEmployee.department.name}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deduction Type & Amount */}
                  <div className={`grid ${isLoanType ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipe Potongan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          type: e.target.value,
                          // Reset loan fields when switching away from loan type
                          ...(e.target.value !== 'loan' && e.target.value !== 'advance' ? {
                            total_loan_amount: 0,
                            installment_amount: 0,
                          } : {}),
                        }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        required
                      >
                        {DEDUCTION_TYPES.map(type => (
                          <option key={type} value={type}>{deductionService.getTypeLabel(type)}</option>
                        ))}
                      </select>
                    </div>
                    {!isLoanType && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jumlah (Rp) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          placeholder="0"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Loan/Kasbon Details */}
                  {isLoanType && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-3">Detail Pinjaman / Kasbon</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Pinjaman (Rp) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.total_loan_amount || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, total_loan_amount: Number(e.target.value) }))}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            placeholder="e.g. 4000000"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cicilan per Bulan (Rp) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.installment_amount || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, installment_amount: Number(e.target.value) }))}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            placeholder="e.g. 500000"
                            required
                          />
                        </div>
                      </div>
                      {computedInstallments > 0 && (
                        <div className="mt-3 text-sm text-blue-700">
                          Jumlah Cicilan: <strong>{computedInstallments} bulan</strong>
                        </div>
                      )}

                      {/* Loan Summary Preview */}
                      {formData.total_loan_amount > 0 && formData.installment_amount > 0 && computedInstallments > 0 && (
                        <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Ringkasan Pinjaman</p>
                          <div className="space-y-1 text-sm text-gray-700">
                            <div className="flex justify-between">
                              <span>Total Pinjaman</span>
                              <span className="font-medium">{formatCurrency(formData.total_loan_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cicilan</span>
                              <span className="font-medium">
                                {formatCurrency(formData.installment_amount)} x {computedInstallments} bulan
                              </span>
                            </div>
                            {formData.effective_date && computedEndDate && (
                              <div className="flex justify-between">
                                <span>Periode</span>
                                <span className="font-medium">
                                  {new Date(formData.effective_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                                  {' - '}
                                  {new Date(computedEndDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        placeholder="e.g., Cicilan, Denda"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Periode Gaji</label>
                      <input
                        type="month"
                        value={formData.pay_period}
                        onChange={(e) => setFormData(prev => ({ ...prev, pay_period: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      rows={2}
                      placeholder="Keterangan potongan..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Efektif</label>
                      <input
                        type="date"
                        value={formData.effective_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">No. Referensi</label>
                      <input
                        type="text"
                        value={formData.reference_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        placeholder="e.g., LOAN-2024-001"
                      />
                    </div>
                  </div>

                  {/* Recurring Options - hidden for loan types (auto-managed) */}
                  {!isLoanType && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={formData.is_recurring}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Potongan Berulang (Recurring)</span>
                      </label>

                      {formData.is_recurring && (
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Frekuensi</label>
                            <select
                              value={formData.recurring_frequency}
                              onChange={(e) => setFormData(prev => ({ ...prev, recurring_frequency: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            >
                              <option value="monthly">Bulanan</option>
                              <option value="quarterly">Per Kuartal</option>
                              <option value="yearly">Tahunan</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Berakhir Pada</label>
                            <input
                              type="date"
                              value={formData.recurring_end_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, recurring_end_date: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview */}
                  {!isLoanType && formData.amount > 0 && (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700">Total Potongan</span>
                        <span className="text-lg font-bold text-red-700">
                          {formatCurrency(formData.amount)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingDeduction ? 'Perbarui' : 'Simpan'}
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
