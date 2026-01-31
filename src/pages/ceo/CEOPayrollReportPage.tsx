import { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  Building2,
  TrendingUp,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Eye,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Briefcase,
} from 'lucide-react';
import { PageSpinner } from '@/components/ui';
import { payrollService, type Payroll } from '@/services/payroll.service';
import { useAuthStore } from '@/stores/auth.store';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  processing: { label: 'Processing', color: 'text-blue-600', bg: 'bg-blue-100' },
  validated: { label: 'Validated', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  submitted: { label: 'Submitted', color: 'text-amber-600', bg: 'bg-amber-100' },
  approved: { label: 'Approved', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' },
  paid: { label: 'Paid', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export function CEOPayrollReportPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [filteredPayrolls, setFilteredPayrolls] = useState<Payroll[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [sortField, setSortField] = useState<'name' | 'gross' | 'net' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get user's company
  const userCompanyId = user?.employee?.company_id;
  const userCompanyName = user?.employee?.company?.name || 'Your Company';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const payrollRes = await payrollService.getAll({
        company_id: userCompanyId || undefined,
        period: selectedPeriod,
        limit: 1000,
      });

      setPayrolls(payrollRes.data || []);
      setFilteredPayrolls(payrollRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch payroll data:', err);
      setError(err.message || 'Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userCompanyId, selectedPeriod]);

  // Filter and sort payrolls
  useEffect(() => {
    let result = [...payrolls];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.employee?.full_name?.toLowerCase().includes(query) ||
          p.employee?.employee_id?.toLowerCase().includes(query) ||
          p.employee?.position?.name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      result = result.filter((p) => p.employee?.department?.name === departmentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.employee?.full_name || '').localeCompare(b.employee?.full_name || '');
          break;
        case 'gross':
          comparison = (Number(a.gross_salary) || 0) - (Number(b.gross_salary) || 0);
          break;
        case 'net':
          comparison = (Number(a.net_salary) || 0) - (Number(b.net_salary) || 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredPayrolls(result);
  }, [payrolls, searchQuery, statusFilter, departmentFilter, sortField, sortOrder]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp ${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(0)}M`;
    }
    return formatCurrency(value);
  };

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  // Get unique departments
  const departments = [...new Set(payrolls.map((p) => p.employee?.department?.name).filter(Boolean))];

  // Calculate summary stats
  const totalGross = payrolls.reduce((sum, p) => sum + (Number(p.gross_salary) || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0);
  const totalEmployees = payrolls.length;
  const paidCount = payrolls.filter((p) => p.status === 'paid').length;
  const pendingCount = payrolls.filter((p) => ['draft', 'processing', 'validated', 'submitted', 'approved'].includes(p.status || '')).length;

  const handleSort = (field: 'name' | 'gross' | 'net' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExport = async () => {
    try {
      await payrollService.exportExcel(userCompanyId, selectedPeriod);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load payroll data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="payroll-report-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#payroll-report-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Payroll Report</h1>
                <p className="text-slate-400 text-xs md:text-sm mt-1">{userCompanyName} - Detail per Karyawan</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors shadow-lg"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
              <p className="text-xs text-gray-500">Total Karyawan</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCompactCurrency(totalNet)}</p>
              <p className="text-xs text-gray-500">Total Net Salary</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{paidCount}</p>
              <p className="text-xs text-gray-500">Sudah Dibayar</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Period */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, NIK, atau posisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="validated">Validated</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Payroll Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Daftar Slip Gaji Karyawan</h3>
              <p className="text-xs text-gray-500 mt-1">
                Menampilkan {filteredPayrolls.length} dari {payrolls.length} karyawan
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Karyawan
                    <SortIcon field="name" />
                  </div>
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                  Department
                </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('gross')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Gross
                    <SortIcon field="gross" />
                  </div>
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">
                  Potongan
                </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('net')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Net
                    <SortIcon field="net" />
                  </div>
                </th>
                <th
                  className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((payroll) => {
                  const status = statusConfig[payroll.status || 'draft'];
                  const totalDeductions =
                    (Number(payroll.pph21) || 0) +
                    (Number(payroll.bpjs_employee_total) || 0);

                  return (
                    <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {payroll.employee?.full_name
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {payroll.employee?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payroll.employee?.employee_id} • {payroll.employee?.position?.name || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {payroll.employee?.department?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="font-medium text-gray-900 text-sm">
                          {formatCurrency(Number(payroll.gross_salary) || 0)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right hidden lg:table-cell">
                        <span className="text-red-600 text-sm">
                          -{formatCurrency(totalDeductions)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="font-bold text-gray-900 text-sm">
                          {formatCurrency(Number(payroll.net_salary) || 0)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={() => setSelectedPayroll(payroll)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data</h3>
                    <p className="text-gray-500">
                      {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all'
                        ? 'Coba ubah filter pencarian'
                        : 'Tidak ada data payroll untuk periode ini'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Detail Modal */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Slip Gaji</h3>
                  <p className="text-indigo-200 text-sm">
                    {periodOptions.find((p) => p.value === selectedPeriod)?.label}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPayroll(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {selectedPayroll.employee?.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2) || '?'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedPayroll.employee?.full_name}</h4>
                  <p className="text-sm text-gray-500">
                    {selectedPayroll.employee?.employee_id} • {selectedPayroll.employee?.position?.name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedPayroll.employee?.department?.name}</p>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Pendapatan</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gaji Pokok</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(Number(selectedPayroll.basic_salary) || 0)}
                    </span>
                  </div>
                  {Number(selectedPayroll.allowances) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tunjangan</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(Number(selectedPayroll.allowances) || 0)}
                      </span>
                    </div>
                  )}
                  {Number(selectedPayroll.overtime_pay) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Lembur</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(Number(selectedPayroll.overtime_pay) || 0)}
                      </span>
                    </div>
                  )}
                  {Number(selectedPayroll.bonus) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bonus</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(Number(selectedPayroll.bonus) || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-700">Total Pendapatan</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(Number(selectedPayroll.gross_salary) || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Potongan</h5>
                <div className="space-y-2">
                  {Number(selectedPayroll.pph21) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">PPh 21</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(Number(selectedPayroll.pph21) || 0)}
                      </span>
                    </div>
                  )}
                  {Number(selectedPayroll.bpjs_employee_total) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">BPJS Karyawan</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(Number(selectedPayroll.bpjs_employee_total) || 0)}
                      </span>
                    </div>
                  )}
                  {Number(selectedPayroll.deductions) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Potongan Lain</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(Number(selectedPayroll.deductions) || 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-700">Total Potongan</span>
                    <span className="font-bold text-red-600">
                      -{formatCurrency(
                        (Number(selectedPayroll.pph21) || 0) +
                          (Number(selectedPayroll.bpjs_employee_total) || 0) +
                          (Number(selectedPayroll.deductions) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Company Contribution */}
              {Number(selectedPayroll.bpjs_company_total) > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Kontribusi Perusahaan</h5>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">BPJS Perusahaan</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(Number(selectedPayroll.bpjs_company_total) || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Net Salary */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-700">Take Home Pay</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(Number(selectedPayroll.net_salary) || 0)}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">Status Pembayaran</span>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    statusConfig[selectedPayroll.status || 'draft'].bg
                  } ${statusConfig[selectedPayroll.status || 'draft'].color}`}
                >
                  {statusConfig[selectedPayroll.status || 'draft'].label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
