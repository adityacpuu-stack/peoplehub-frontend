import { insightNumber, insightFixed, insightPeriod } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useEffect } from 'react';
import { History, Calendar, Download, Search, CheckCircle, Clock, AlertCircle, FileText, Eye } from 'lucide-react';
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
  paid: { get label() { return t('Paid'); }, color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  pending: { get label() { return t('Pending'); }, color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
  calculated: { get label() { return t('Calculated'); }, color: 'text-blue-600', bg: 'bg-blue-100', icon: FileText },
  overdue: { get label() { return t('Overdue'); }, color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
};

const typeColors: Record<string, string> = {
  'PPh 21': 'bg-blue-100 text-blue-700',
  'BPJS Kesehatan': 'bg-green-100 text-green-700',
  'BPJS TK': 'bg-amber-100 text-amber-700',
};

export function PaymentHistoryPage() {
  useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
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
        setLoadError(null);
        // Fetch payrolls for the selected year (all months)
        const [payrollRes, companiesRes] = await Promise.all([
          payrollService.getAll({ limit: 5000 }),
          companyService.getAll(),
        ]);
        setPayrolls(payrollRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setLoadError('Data payroll tidak dapat dimuat. Silakan coba lagi.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, retryAttempt]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${insightFixed((value / 1000000000), 1)}${t('billion short')}`;
    if (value >= 1000000) return `Rp ${insightFixed((value / 1000000), 0)}${t('million short')}`;
    return formatCurrency(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(intlLocale(), {
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
      const companyId = payroll.company_id || 0;
      const companyName = 'Company';
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
      const periodLabel = periodDate.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });

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
          // The existing summary has an application-owned company placeholder.
          get company() { return t('Company'); },
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
          // The existing summary has an application-owned company placeholder.
          get company() { return t('Company'); },
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
          // The existing summary has an application-owned company placeholder.
          get company() { return t('Company'); },
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
      const monthKey = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(intlLocale(), { month: 'short' });

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
    return <div className="ph-workflow tax-workflow"><header className="ph-page-header tax-page-header"><h1>{t("Payment History")}</h1></header><div role="status" aria-label={t("Memuat data payroll")}><PageSpinner /></div></div>;
  }

  if (loadError) return <div className="ph-workflow tax-workflow tax-error-page"><header className="ph-page-header tax-page-header"><h1>{t("Payment History")}</h1></header><p role="alert" className="ph-callout" data-tone="error">{t(loadError)}</p><button type="button" className="ph-button tax-button" onClick={() => setRetryAttempt(value => value + 1)}>{t("Coba lagi")}</button></div>;

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("Payment History")}</h1><p>{t("Riwayat Pembayaran Pajak & BPJS")}</p></div><div className="ph-actions tax-header-actions"><button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <Download className="h-4 w-4" />{t("Export History")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Ringkasan ini diturunkan dari payroll, bukan bukti setor pajak. Status dan tanggal pembayaran mengikuti logika ringkasan payroll; konfirmasi pembayaran dan ekspor belum tersedia.")}</p>

      {/* Stats */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select aria-label={t("Tahun")}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tax-control"
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
            <input aria-label={t("Cari company atau jenis...")}
              type="text"
              placeholder={t("Cari company atau jenis...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tax-control"
            />
          </div>

          <select aria-label={t("Jenis")}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tax-control"
          >
            <option value="all">{t("Semua Jenis")}</option>
            <option value="PPh 21">{t("PPh 21")}</option>
            <option value="BPJS Kesehatan">{t("BPJS Kesehatan")}</option>
            <option value="BPJS TK">{t("BPJS TK")}</option>
          </select>

          <select aria-label={t("Status")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tax-control"
          >
            <option value="all">{t("Semua Status")}</option>
            <option value="paid">{t("Paid")}</option>
            <option value="pending">{t("Pending")}</option>
            <option value="calculated">{t("Calculated")}</option>
          </select>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-lg font-bold text-green-600">{formatCompactCurrency(totalPaid)}</p>
<p className="text-xs text-gray-500">{t("Total Paid")}</p></div>

        <div className="tax-summary-item"><p className="text-lg font-bold text-amber-600">{formatCompactCurrency(totalPending)}</p>
<p className="text-xs text-gray-500">{t("Pending")}</p></div>

        <div className="tax-summary-item"><p className="text-lg font-bold text-blue-600">{formatCompactCurrency(totalCalculated)}</p>
<p className="text-xs text-gray-500">{t("Calculated")}</p></div>

        <div className="tax-summary-item"><p className="text-2xl font-bold text-gray-900">{insightNumber(transactionCount)}</p>
<p className="text-xs text-gray-500">{t("Transactions")}</p></div>
      </div>

      {/* Payment Trend Chart */}
      {trendData.length > 0 && (
        <details className="tax-charts"><summary>{t("Lihat grafik pembayaran")}</summary><div className="ph-section tax-section">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">{t("Tren Pembayaran Bulanan")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v)} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Area type="monotone" dataKey="pph21" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name={t("PPh 21")} />
                <Area type="monotone" dataKey="bpjs" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name={t("BPJS")} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600">{t("PPh 21")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-600">{t("BPJS")}</span>
            </div>
          </div>
        </div></details>
      )}

      {/* Filters */}

      {/* Payment History Table */}
      <div className="ph-section tax-section tax-register">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 tax-section">
          <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Riwayat Pembayaran")}</h3>
          <p className="text-xs text-gray-500 mt-1">{t("Menampilkan")} {insightNumber(filteredData.length)}{' '}{t("transaksi")}</p>
        </div>

        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{t("Jenis")}</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">{t("Company")}</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">{t("Periode")}</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("Jumlah")}</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">{t("Karyawan")}</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">{t("Due Date")}</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">{t("Status")}</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">{t("Aksi")}</th>
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
                      <td className="px-3 py-4">
                        <span className="text-sm text-gray-600">{payment.periodLabel}</span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="text-sm text-gray-600">{insightNumber(payment.employeeCount)}</span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-sm text-gray-600">{formatDate(payment.dueDate)}</span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button type="button"
                          onClick={() => setSelectedPayment(payment)}
                          className="ph-button tax-button"
                        >
                          <Eye className="h-3.5 w-3.5" />{t("Detail")} </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Tidak ada data")}</h3>
                    <p className="text-gray-500">{t("Tidak ada riwayat pembayaran yang ditemukan")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPayment && (
        <Modal isOpen={true} onClose={() => setSelectedPayment(null)} title={t("Detail Pembayaran")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="tax-period">{selectedPayment.type}</p><p className="ph-callout tax-notice">{t("Ringkasan ini diturunkan dari payroll, bukan bukti setor pajak. Status dan tanggal pembayaran mengikuti logika ringkasan payroll; konfirmasi pembayaran dan ekspor belum tersedia.")}</p><div className="tax-dialog-body">
              <dl className="ph-kv tax-kv-row"><dt>{t("Jenis Pajak")}</dt><dd>
                  {selectedPayment.type}
                </dd></dl>
              <dl className="ph-kv tax-kv-row"><dt>{t("Company")}</dt><dd>{selectedPayment.company}</dd></dl>
              <dl className="ph-kv tax-kv-row"><dt>{t("Periode")}</dt><dd>{insightPeriod(selectedPayment.period)}</dd></dl>
              <dl className="ph-kv tax-kv-row"><dt>{t("Jumlah Karyawan")}</dt><dd>{insightNumber(selectedPayment.employeeCount)}{' '}{t("orang")}</dd></dl>
              <dl className="ph-kv tax-kv-row"><dt>{t("Due Date")}</dt><dd>{formatDate(selectedPayment.dueDate)}</dd></dl>
              {selectedPayment.paidDate && (
                <dl className="ph-kv tax-kv-row"><dt>{t("Paid Date")}</dt><dd>{formatDate(selectedPayment.paidDate)}</dd></dl>
              )}

              <div className="p-4 border border-indigo-200 tax-section">
                <dl className="ph-kv tax-kv-row"><dt>{t("Jumlah")}</dt><dd>{formatCurrency(selectedPayment.amount)}</dd></dl>
              </div>

              <dl className="ph-kv tax-kv-row"><dt>{t("Status")}</dt><dd>
                  {statusConfig[selectedPayment.status].label}
                </dd></dl>
            </div><div className="ph-dialog-footer tax-dialog-actions"><button type="button" className="ph-button tax-button" onClick={() => setSelectedPayment(null)}>{t("Tutup")}</button></div></div>
</Modal>
      )}
    </div>
  );
}
