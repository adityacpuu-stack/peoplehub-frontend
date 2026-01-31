import { useState, useEffect } from 'react';
import {
  Calculator,
  Building2,
  Users,
  Calendar,
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Percent,
  FileText,
  Eye,
  X,
  Play,
  Clock,
} from 'lucide-react';
import { PageSpinner } from '@/components/ui';
import { payrollService, type Payroll } from '@/services/payroll.service';
import { companyService, type Company } from '@/services/company.service';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  calculated: { label: 'Calculated', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
  error: { label: 'Error', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
};

export function TaxCalculationPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [payrollRes, companiesRes] = await Promise.all([
          payrollService.getAll({
            period: selectedPeriod,
            company_id: selectedCompany || undefined,
            limit: 1000,
          }),
          companyService.getAll(),
        ]);
        setPayrolls(payrollRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriod, selectedCompany]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}M`;
    return formatCurrency(value);
  };

  const handleRecalculate = async () => {
    setIsCalculating(true);
    // Simulate recalculation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsCalculating(false);
  };

  // Filter payrolls
  const filteredPayrolls = payrolls.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.employee?.name?.toLowerCase().includes(query) ||
      p.employee?.employee_id?.toLowerCase().includes(query)
    );
  });

  // Calculate summary
  const totalGross = payrolls.reduce((sum, p) => sum + (Number(p.gross_salary) || 0), 0);
  const totalPPh21 = payrolls.reduce((sum, p) => sum + (Number(p.pph21) || 0), 0);
  const totalBPJSEmployee = payrolls.reduce((sum, p) => sum + (Number(p.bpjs_employee_total) || 0), 0);
  const totalBPJSCompany = payrolls.reduce((sum, p) => sum + (Number(p.bpjs_company_total) || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0);
  const employeeCount = payrolls.length;

  // Period options
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="calc-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#calc-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                <Calculator className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Tax Calculation</h1>
                <p className="text-cyan-100 text-xs md:text-sm mt-1">Kalkulasi Pajak & BPJS</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRecalculate}
                disabled={isCalculating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl text-sm font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
                {isCalculating ? 'Calculating...' : 'Recalculate All'}
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-cyan-700 rounded-xl text-sm font-medium hover:bg-cyan-50 transition-colors shadow-lg">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">Karyawan</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{employeeCount}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">Total Gross</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCompactCurrency(totalGross)}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-gray-500">PPh 21</span>
          </div>
          <p className="text-lg font-bold text-blue-600">{formatCompactCurrency(totalPPh21)}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-gray-500">BPJS (Emp)</span>
          </div>
          <p className="text-lg font-bold text-amber-600">{formatCompactCurrency(totalBPJSEmployee)}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500">BPJS (Co)</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCompactCurrency(totalBPJSCompany)}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-gray-500">Total Net</span>
          </div>
          <p className="text-lg font-bold text-emerald-600">{formatCompactCurrency(totalNet)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {periodOptions.map((option, index) => (
                <option key={`period-${index}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCompany || ''}
              onChange={(e) => setSelectedCompany(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Semua Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama atau NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Calculation Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Detail Kalkulasi Pajak</h3>
          <p className="text-xs text-gray-500 mt-1">Menampilkan {filteredPayrolls.length} karyawan</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karyawan</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Gross</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">PKP</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">PPh 21</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">BPJS Emp</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">BPJS Co</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Net</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {payroll.employee?.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{payroll.employee?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{payroll.employee?.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm text-gray-900">{formatCurrency(Number(payroll.gross_salary) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right hidden md:table-cell">
                      <span className="text-sm text-gray-600">{formatCurrency(Number(payroll.taxable_income) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="font-medium text-blue-600">{formatCurrency(Number(payroll.pph21) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right hidden lg:table-cell">
                      <span className="text-sm text-amber-600">{formatCurrency(Number(payroll.bpjs_employee_total) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right hidden lg:table-cell">
                      <span className="text-sm text-green-600">{formatCurrency(Number(payroll.bpjs_company_total) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(Number(payroll.net_salary) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => setSelectedPayroll(payroll)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data</h3>
                    <p className="text-gray-500">Tidak ada data kalkulasi untuk periode ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Detail Kalkulasi</h3>
                  <p className="text-cyan-100 text-sm">{periodOptions.find((p) => p.value === selectedPeriod)?.label}</p>
                </div>
                <button onClick={() => setSelectedPayroll(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {selectedPayroll.employee?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2) || '?'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedPayroll.employee?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedPayroll.employee?.employee_id}</p>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Penghasilan</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gaji Pokok</span>
                    <span className="font-medium">{formatCurrency(Number(selectedPayroll.basic_salary) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-semibold">Total Gross</span>
                    <span className="font-bold">{formatCurrency(Number(selectedPayroll.gross_salary) || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Tax Calculation */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Kalkulasi Pajak</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">PTKP Status</span>
                    <span className="font-medium">{selectedPayroll.ptkp_status || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">PKP</span>
                    <span className="font-medium">{formatCurrency(Number(selectedPayroll.taxable_income) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">TER Rate</span>
                    <span className="font-medium text-cyan-600">
                      {selectedPayroll.ter_rate ? `${(Number(selectedPayroll.ter_rate) * 100).toFixed(2)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-semibold text-blue-700">PPh 21</span>
                    <span className="font-bold text-blue-600">{formatCurrency(Number(selectedPayroll.pph21) || 0)}</span>
                  </div>
                </div>
              </div>

              {/* BPJS */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">BPJS</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-xs text-amber-600 mb-1">BPJS Karyawan</p>
                    <p className="font-bold text-amber-700">{formatCurrency(Number(selectedPayroll.bpjs_employee_total) || 0)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-green-600 mb-1">BPJS Perusahaan</p>
                    <p className="font-bold text-green-700">{formatCurrency(Number(selectedPayroll.bpjs_company_total) || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-cyan-700">Take Home Pay</span>
                  <span className="text-2xl font-bold text-cyan-600">{formatCurrency(Number(selectedPayroll.net_salary) || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
