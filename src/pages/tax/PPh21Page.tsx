import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useEffect } from 'react';
import { Calendar, Building2, Download, Search, Eye, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
  calculated: { get label() { return t('Calculated'); }, color: 'text-blue-600', bg: 'bg-blue-100' },
  reported: { get label() { return t('Reported'); }, color: 'text-amber-600', bg: 'bg-amber-100' },
  paid: { get label() { return t('Paid'); }, color: 'text-green-600', bg: 'bg-green-100' },
  overdue: { get label() { return t('Overdue'); }, color: 'text-red-600', bg: 'bg-red-100' },
};

export function PPh21Page() {
  useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
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
        setLoadError(null);
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
        setLoadError('Data payroll tidak dapat dimuat. Silakan coba lagi.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriod, selectedCompany, retryAttempt]);

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
    const label = date.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
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
  useLocale();
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="ph-workflow tax-workflow"><header className="ph-page-header tax-page-header"><h1>{t("PPh 21")}</h1></header><div role="status" aria-label={t("Memuat data payroll")}><PageSpinner /></div></div>;
  }

  if (loadError) return <div className="ph-workflow tax-workflow tax-error-page"><header className="ph-page-header tax-page-header"><h1>{t("PPh 21")}</h1></header><p role="alert" className="ph-callout" data-tone="error">{t(loadError)}</p><button type="button" className="ph-button tax-button" onClick={() => setRetryAttempt(value => value + 1)}>{t("Coba lagi")}</button></div>;

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("PPh 21")}</h1><p>{t("Pajak Penghasilan Pasal 21")}</p></div><div className="ph-actions tax-header-actions"><button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
              <Download className="h-4 w-4" />{t("Export e-SPT")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Nilai PPh 21 berasal dari payroll yang dimuat. Grafik tren adalah contoh tampilan; ekspor e-SPT belum tersedia.")}</p>

      {/* Stats */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select aria-label={t("Periode")}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tax-control"
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
            <select aria-label={t("Perusahaan")}
              value={selectedCompany || ''}
              onChange={(e) => setSelectedCompany(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tax-control"
            >
              <option value="">{t("Semua Company")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input aria-label={t("Cari nama atau NIK...")}
              type="text"
              placeholder={t("Cari nama atau NIK...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tax-control"
            />
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-lg font-bold text-gray-900">{formatCompactCurrency(totalPPh21)}</p>
<p className="text-xs text-gray-500">{t("Total PPh 21")}</p></div>

        <div className="tax-summary-item"><p className="text-2xl font-bold text-gray-900">{insightNumber(employeeCount)}</p>
<p className="text-xs text-gray-500">{t("Karyawan")}</p></div>

        <div className="tax-summary-item"><p className="text-lg font-bold text-gray-900">{formatCompactCurrency(avgPPh21)}</p>
<p className="text-xs text-gray-500">{t("Rata-rata PPh 21")}</p></div>

        <div className="tax-summary-item"><p className="text-lg font-bold text-gray-900">{formatCompactCurrency(totalTaxableIncome)}</p>
<p className="text-xs text-gray-500">{t("PKP")}</p></div>
      </div>

      {/* PPh 21 Trend Chart */}

      {/* Filters */}

      {/* Employee PPh 21 Table */}
      <div className="ph-section tax-section tax-register">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 tax-section">
          <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Detail PPh 21 per Karyawan")}</h3>
          <p className="text-xs text-gray-500 mt-1">{t("Menampilkan")} {insightNumber(filteredPayrolls.length)}{' '}{t("dari")} {insightNumber(payrolls.length)}{' '}{t("karyawan")} </p>
        </div>

        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500  cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">{t("Karyawan")} <SortIcon field="name" />
                  </div>
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">{t("PTKP")} </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("PKP")} </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500  cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ter')}
                >
                  <div className="flex items-center justify-end gap-1">{t("TER")} <SortIcon field="ter" />
                  </div>
                </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500  cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pph21')}
                >
                  <div className="flex items-center justify-end gap-1">{t("PPh 21")} <SortIcon field="pph21" />
                  </div>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center font-bold text-sm tax-initials">
                          {payroll.employee?.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{payroll.employee?.name || t('Unknown')}</p>
                          <p className="text-xs text-gray-500">{payroll.employee?.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="text-sm text-gray-600">{payroll.ptkp_status || '-'}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm text-gray-900">{formatCurrency(Number(payroll.taxable_income) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm font-medium text-emerald-600">
                        {payroll.ter_rate ? `${insightFixed((Number(payroll.ter_rate) * 100), 2)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(Number(payroll.pph21) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button type="button"
                        onClick={() => setSelectedEmployee(payroll)}
                        className="ph-button tax-button"
                      >
                        <Eye className="h-3.5 w-3.5" />{t("Detail")} </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Tidak ada data")}</h3>
                    <p className="text-gray-500">{t("Tidak ada data PPh 21 untuk periode ini")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEmployee && (
        <Modal isOpen={true} onClose={() => setSelectedEmployee(null)} title={t("Detail PPh 21")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="tax-period">{periodOptions.find((p) => p.value === selectedPeriod)?.label}</p><div className="tax-dialog-body">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-14 h-14 flex items-center justify-center font-bold text-lg tax-initials">
                  {selectedEmployee.employee?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2) || '?'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedEmployee.employee?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedEmployee.employee?.employee_id}</p>
                </div>
              </div>

              {/* Tax Details */}
              <div className="space-y-4">
                <dl className="ph-kv tax-kv-row"><dt>{t("Penghasilan Bruto")}</dt><dd>{formatCurrency(Number(selectedEmployee.gross_salary) || 0)}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("PTKP Status")}</dt><dd>{selectedEmployee.ptkp_status || '-'}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("PTKP Amount")}</dt><dd>{formatCurrency(Number(selectedEmployee.ptkp_amount) || 0)}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("Penghasilan Kena Pajak (PKP)")}</dt><dd>{formatCurrency(Number(selectedEmployee.taxable_income) || 0)}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("TER Category")}</dt><dd>{selectedEmployee.ter_category || '-'}</dd></dl>
                <dl className="ph-kv tax-kv-row"><dt>{t("TER Rate")}</dt><dd>
                    {selectedEmployee.ter_rate ? `${insightFixed((Number(selectedEmployee.ter_rate) * 100), 2)}%` : '-'}
                  </dd></dl>
              </div>

              {/* PPh 21 Result */}
              <div className="p-4 border border-emerald-200 tax-section">
                <dl className="ph-kv tax-kv-row"><dt>{t("PPh 21 Terutang")}</dt><dd>{formatCurrency(Number(selectedEmployee.pph21) || 0)}</dd></dl>
              </div>
            </div><div className="ph-dialog-footer tax-dialog-actions"><button type="button" className="ph-button tax-button" onClick={() => setSelectedEmployee(null)}>{t("Tutup")}</button></div></div>
</Modal>
      )}
    <details className="tax-charts"><summary>{t("Lihat grafik")}</summary><div className="ph-section tax-section">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">{t("Tren PPh 21 Bulanan")}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pph21TrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v)} tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} name={t("PPh 21")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div></details>
</div>
  );
}
