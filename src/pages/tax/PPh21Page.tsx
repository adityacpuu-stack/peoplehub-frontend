import { useState, useEffect } from 'react';
import {
  Percent,
  Calendar,
  Building2,
  Users,
  Download,
  Search,
  Filter,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Calculator,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import { payrollService, type Payroll } from '@/services/payroll.service';
import { companyService, type Company } from '@/services/company.service';

// Mock data for PPh 21 trend
const pph21TrendData = [
  { month: 'Aug', amount: 125000000, employees: 250 },
  { month: 'Sep', amount: 132000000, employees: 255 },
  { month: 'Oct', amount: 128000000, employees: 258 },
  { month: 'Nov', amount: 135000000, employees: 260 },
  { month: 'Dec', amount: 142000000, employees: 263 },
  { month: 'Jan', amount: 138000000, employees: 265 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  calculated: { label: 'Calculated', color: 'text-blue-600', bg: 'bg-blue-100' },
  reported: { label: 'Reported', color: 'text-amber-600', bg: 'bg-amber-100' },
  paid: { label: 'Paid', color: 'text-green-600', bg: 'bg-green-100' },
  overdue: { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-100' },
};

export function PPh21Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Payroll | null>(null);
  const [sortField, setSortField] = useState<'name' | 'pph21' | 'ter'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Filter payrolls
  const filteredPayrolls = payrolls
    .filter((p) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.employee?.name?.toLowerCase().includes(query) ||
        p.employee?.employee_id?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.employee?.name || '').localeCompare(b.employee?.name || '');
          break;
        case 'pph21':
          comparison = (Number(a.pph21) || 0) - (Number(b.pph21) || 0);
          break;
        case 'ter':
          comparison = (Number(a.ter_rate) || 0) - (Number(b.ter_rate) || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Calculate totals
  const totalPPh21 = payrolls.reduce((sum, p) => sum + (Number(p.pph21) || 0), 0);
  const totalTaxableIncome = payrolls.reduce((sum, p) => sum + (Number(p.taxable_income) || 0), 0);
  const employeeCount = payrolls.length;
  const avgPPh21 = employeeCount > 0 ? totalPPh21 / employeeCount : 0;

  // Period options
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  const handleSort = (field: 'name' | 'pph21' | 'ter') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="pph21-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pph21-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                <Percent className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">PPh 21</h1>
                <p className="text-emerald-100 text-xs md:text-sm mt-1">Pajak Penghasilan Pasal 21</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-50 transition-colors shadow-lg">
              <Download className="h-4 w-4" />
              Export e-SPT
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Percent className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCompactCurrency(totalPPh21)}</p>
              <p className="text-xs text-gray-500">Total PPh 21</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{employeeCount}</p>
              <p className="text-xs text-gray-500">Karyawan</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCompactCurrency(avgPPh21)}</p>
              <p className="text-xs text-gray-500">Rata-rata PPh 21</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCompactCurrency(totalTaxableIncome)}</p>
              <p className="text-xs text-gray-500">PKP</p>
            </div>
          </div>
        </div>
      </div>

      {/* PPh 21 Trend Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Tren PPh 21 Bulanan</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pph21TrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v)} tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} name="PPh 21" />
            </BarChart>
          </ResponsiveContainer>
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
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Employee PPh 21 Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Detail PPh 21 per Karyawan</h3>
          <p className="text-xs text-gray-500 mt-1">
            Menampilkan {filteredPayrolls.length} dari {payrolls.length} karyawan
          </p>
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
                  PTKP
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">
                  PKP
                </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ter')}
                >
                  <div className="flex items-center justify-end gap-1">
                    TER
                    <SortIcon field="ter" />
                  </div>
                </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pph21')}
                >
                  <div className="flex items-center justify-end gap-1">
                    PPh 21
                    <SortIcon field="pph21" />
                  </div>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
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
                    <td className="px-3 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{payroll.ptkp_status || '-'}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm text-gray-900">{formatCurrency(Number(payroll.taxable_income) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm font-medium text-emerald-600">
                        {payroll.ter_rate ? `${(Number(payroll.ter_rate) * 100).toFixed(2)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(Number(payroll.pph21) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => setSelectedEmployee(payroll)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data</h3>
                    <p className="text-gray-500">Tidak ada data PPh 21 untuk periode ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Detail PPh 21</h3>
                  <p className="text-emerald-100 text-sm">{periodOptions.find((p) => p.value === selectedPeriod)?.label}</p>
                </div>
                <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {selectedEmployee.employee?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2) || '?'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedEmployee.employee?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedEmployee.employee?.employee_id}</p>
                </div>
              </div>

              {/* Tax Details */}
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Penghasilan Bruto</span>
                  <span className="font-medium text-gray-900">{formatCurrency(Number(selectedEmployee.gross_salary) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PTKP Status</span>
                  <span className="font-medium text-gray-900">{selectedEmployee.ptkp_status || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PTKP Amount</span>
                  <span className="font-medium text-gray-900">{formatCurrency(Number(selectedEmployee.ptkp_amount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Penghasilan Kena Pajak (PKP)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(Number(selectedEmployee.taxable_income) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TER Category</span>
                  <span className="font-medium text-gray-900">{selectedEmployee.ter_category || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TER Rate</span>
                  <span className="font-medium text-emerald-600">
                    {selectedEmployee.ter_rate ? `${(Number(selectedEmployee.ter_rate) * 100).toFixed(2)}%` : '-'}
                  </span>
                </div>
              </div>

              {/* PPh 21 Result */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-700">PPh 21 Terutang</span>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(Number(selectedEmployee.pph21) || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
