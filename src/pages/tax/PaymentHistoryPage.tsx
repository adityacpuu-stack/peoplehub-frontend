import { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Building2,
  Download,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Eye,
  Receipt,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageSpinner } from '@/components/ui';
import { payrollService, type Payroll } from '@/services/payroll.service';
import { companyService, type Company } from '@/services/company.service';

interface PaymentSummary {
  id: string;
  type: 'PPh 21' | 'BPJS Kesehatan' | 'BPJS TK';
  period: string;
  periodLabel: string;
  company: string;
  companyId: number;
  amount: number;
  employeeCount: number;
  status: 'paid' | 'pending' | 'calculated';
  dueDate: string;
  paidDate: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  paid: { label: 'Paid', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
  calculated: { label: 'Calculated', color: 'text-blue-600', bg: 'bg-blue-100', icon: FileText },
  overdue: { label: 'Overdue', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
};

const typeColors: Record<string, string> = {
  'PPh 21': 'bg-blue-100 text-blue-700',
  'BPJS Kesehatan': 'bg-green-100 text-green-700',
  'BPJS TK': 'bg-amber-100 text-amber-700',
};

export function PaymentHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch payrolls for the selected year (all months)
        const [payrollRes, companiesRes] = await Promise.all([
          payrollService.getAll({ limit: 5000 }),
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
  }, [selectedYear]);

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Aggregate payrolls by company and period
  const aggregatePayments = (): PaymentSummary[] => {
    const summaryMap = new Map<string, {
      pph21: number;
      bpjsKes: number;
      bpjsTK: number;
      employeeCount: number;
      companyName: string;
      companyId: number;
      period: string;
      status: string;
    }>();

    payrolls.forEach((payroll) => {
      const period = payroll.period || '';
      const companyId = payroll.employee?.company_id || 0;
      const companyName = payroll.employee?.company?.name || 'Unknown';
      const key = `${companyId}-${period}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          pph21: 0,
          bpjsKes: 0,
          bpjsTK: 0,
          employeeCount: 0,
          companyName,
          companyId,
          period,
          status: payroll.status || 'calculated',
        });
      }

      const summary = summaryMap.get(key)!;
      summary.pph21 += Number(payroll.pph21) || 0;
      summary.bpjsKes += Number(payroll.bpjs_kes_employee) || 0;
      summary.bpjsTK += (Number(payroll.bpjs_jht_employee) || 0) + (Number(payroll.bpjs_jp_employee) || 0);
      summary.employeeCount += 1;

      // Update status to most "complete" status
      if (payroll.status === 'paid') summary.status = 'paid';
      else if (payroll.status === 'approved' && summary.status !== 'paid') summary.status = 'pending';
    });

    const payments: PaymentSummary[] = [];
    const currentDate = new Date();

    summaryMap.forEach((summary, key) => {
      const [year, month] = summary.period.split('-');
      const periodDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const periodLabel = periodDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      // Due date is 10th of next month for PPh 21
      const dueDate = new Date(parseInt(year), parseInt(month), 10);

      // Determine status based on payroll status
      let status: 'paid' | 'pending' | 'calculated' = 'calculated';
      if (summary.status === 'paid') status = 'paid';
      else if (summary.status === 'approved') status = 'pending';

      // PPh 21
      if (summary.pph21 > 0) {
        payments.push({
          id: `${key}-pph21`,
          type: 'PPh 21',
          period: summary.period,
          periodLabel,
          company: summary.companyName,
          companyId: summary.companyId,
          amount: summary.pph21,
          employeeCount: summary.employeeCount,
          status,
          dueDate: dueDate.toISOString().split('T')[0],
          paidDate: status === 'paid' ? dueDate.toISOString().split('T')[0] : null,
        });
      }

      // BPJS Kesehatan
      if (summary.bpjsKes > 0) {
        payments.push({
          id: `${key}-bpjskes`,
          type: 'BPJS Kesehatan',
          period: summary.period,
          periodLabel,
          company: summary.companyName,
          companyId: summary.companyId,
          amount: summary.bpjsKes,
          employeeCount: summary.employeeCount,
          status,
          dueDate: dueDate.toISOString().split('T')[0],
          paidDate: status === 'paid' ? dueDate.toISOString().split('T')[0] : null,
        });
      }

      // BPJS TK (JHT + JP)
      if (summary.bpjsTK > 0) {
        const dueDateTK = new Date(parseInt(year), parseInt(month), 15);
        payments.push({
          id: `${key}-bpjstk`,
          type: 'BPJS TK',
          period: summary.period,
          periodLabel,
          company: summary.companyName,
          companyId: summary.companyId,
          amount: summary.bpjsTK,
          employeeCount: summary.employeeCount,
          status,
          dueDate: dueDateTK.toISOString().split('T')[0],
          paidDate: status === 'paid' ? dueDateTK.toISOString().split('T')[0] : null,
        });
      }
    });

    // Sort by period descending, then by type
    return payments.sort((a, b) => {
      const periodCompare = b.period.localeCompare(a.period);
      if (periodCompare !== 0) return periodCompare;
      return a.type.localeCompare(b.type);
    });
  };

  const allPayments = aggregatePayments();

  // Filter by year
  const yearFilteredPayments = allPayments.filter((p) => p.period.startsWith(selectedYear));

  // Apply other filters
  const filteredData = yearFilteredPayments.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.company.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.periodLabel.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate summary
  const totalPaid = yearFilteredPayments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = yearFilteredPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalCalculated = yearFilteredPayments.filter((p) => p.status === 'calculated').reduce((sum, p) => sum + p.amount, 0);
  const transactionCount = yearFilteredPayments.length;

  // Build trend data from aggregated payments
  const buildTrendData = () => {
    const monthMap = new Map<string, { pph21: number; bpjs: number }>();

    yearFilteredPayments.forEach((payment) => {
      const [year, month] = payment.period.split('-');
      const monthKey = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('id-ID', { month: 'short' });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { pph21: 0, bpjs: 0 });
      }

      const data = monthMap.get(monthKey)!;
      if (payment.type === 'PPh 21') {
        data.pph21 += payment.amount;
      } else {
        data.bpjs += payment.amount;
      }
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      pph21: data.pph21,
      bpjs: data.bpjs,
    }));
  };

  const trendData = buildTrendData();

  const yearOptions = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 md:px-8 py-6 md:py-8 relative">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="history-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#history-pattern)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                <History className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Payment History</h1>
                <p className="text-indigo-100 text-xs md:text-sm mt-1">Riwayat Pembayaran Pajak & BPJS</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors shadow-lg">
              <Download className="h-4 w-4" />
              Export History
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{formatCompactCurrency(totalPaid)}</p>
              <p className="text-xs text-gray-500">Total Paid</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-600">{formatCompactCurrency(totalPending)}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{formatCompactCurrency(totalCalculated)}</p>
              <p className="text-xs text-gray-500">Calculated</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{transactionCount}</p>
              <p className="text-xs text-gray-500">Transactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Trend Chart */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Tren Pembayaran Bulanan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v)} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Area type="monotone" dataKey="pph21" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="PPh 21" />
                <Area type="monotone" dataKey="bpjs" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="BPJS" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600">PPh 21</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-600">BPJS</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari company atau jenis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Jenis</option>
            <option value="PPh 21">PPh 21</option>
            <option value="BPJS Kesehatan">BPJS Kesehatan</option>
            <option value="BPJS TK">BPJS TK</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="calculated">Calculated</option>
          </select>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Riwayat Pembayaran</h3>
          <p className="text-xs text-gray-500 mt-1">Menampilkan {filteredData.length} transaksi</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jenis</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Periode</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Jumlah</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Karyawan</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Due Date</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((payment) => {
                  const status = statusConfig[payment.status];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[payment.type]}`}>
                          {payment.type}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-900 text-sm">{payment.company}</p>
                      </td>
                      <td className="px-3 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-600">{payment.periodLabel}</span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td className="px-3 py-4 text-center hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{payment.employeeCount}</span>
                      </td>
                      <td className="px-3 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{formatDate(payment.dueDate)}</span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={() => setSelectedPayment(payment)}
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
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data</h3>
                    <p className="text-gray-500">Tidak ada riwayat pembayaran yang ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Detail Pembayaran</h3>
                  <p className="text-indigo-100 text-sm">{selectedPayment.type}</p>
                </div>
                <button onClick={() => setSelectedPayment(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Jenis Pajak</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[selectedPayment.type]}`}>
                  {selectedPayment.type}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Company</span>
                <span className="font-medium text-gray-900">{selectedPayment.company}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Periode</span>
                <span className="font-medium text-gray-900">{selectedPayment.periodLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Jumlah Karyawan</span>
                <span className="font-medium text-gray-900">{selectedPayment.employeeCount} orang</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Due Date</span>
                <span className="font-medium text-gray-900">{formatDate(selectedPayment.dueDate)}</span>
              </div>
              {selectedPayment.paidDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid Date</span>
                  <span className="font-medium text-gray-900">{formatDate(selectedPayment.paidDate)}</span>
                </div>
              )}

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-indigo-700">Jumlah</span>
                  <span className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedPayment.amount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[selectedPayment.status].bg} ${statusConfig[selectedPayment.status].color}`}>
                  {statusConfig[selectedPayment.status].label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
