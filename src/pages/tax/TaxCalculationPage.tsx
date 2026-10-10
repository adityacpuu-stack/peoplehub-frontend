import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useEffect } from 'react';
import { Calculator, Building2, Calendar, Search, Download, RefreshCw, CheckCircle, AlertCircle, Eye, Clock } from 'lucide-react';
import { PageSpinner } from '@/components/ui';
import { payrollService, type Payroll } from '@/services/payroll.service';
import { companyService, type Company } from '@/services/company.service';
import { collectPages } from '@/services/master-data';
import { savedThp, sumSavedThp } from '@/components/payroll/saved-payroll';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  calculated: { get label() { return t('Calculated'); }, color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle },
  pending: { get label() { return t('Pending'); }, color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
  error: { get label() { return t('Error'); }, color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
};

export function TaxCalculationPage() {
  useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
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
        setLoadError(null);
        const [rows, companiesRes] = await Promise.all([
          collectPages((page, limit) => payrollService.getAll({
            period: selectedPeriod, company_id: selectedCompany || undefined, page, limit,
          })),
          companyService.getAll(),
        ]);
        setPayrolls(rows);
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
  // Saved take-home pay only; rows without one are excluded, never net_salary.
  const totalNet = sumSavedThp(payrolls).total;
  const thpText = (p: Payroll) => { const v = savedThp(p); return v === null ? '-' : formatCurrency(v); };
  const employeeCount = payrolls.length;

  // Period options
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
    return { value, label };
  });

  if (isLoading) {
    return <div className="ph-workflow tax-workflow"><header className="ph-page-header tax-page-header"><h1>{t("Tax Calculation")}</h1></header><div role="status" aria-label={t("Memuat data payroll")}><PageSpinner /></div></div>;
  }

  if (loadError) return <div className="ph-workflow tax-workflow tax-error-page"><header className="ph-page-header tax-page-header"><h1>{t("Tax Calculation")}</h1></header><p role="alert" className="ph-callout" data-tone="error">{t(loadError)}</p><button type="button" className="ph-button tax-button" onClick={() => setRetryAttempt(value => value + 1)}>{t("Coba lagi")}</button></div>;

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("Tax Calculation")}</h1><p>{t("Kalkulasi Pajak & BPJS")}</p></div><div className="ph-actions tax-header-actions"><button type="button"
                onClick={handleRecalculate}
                disabled={isCalculating}
                className="ph-button tax-button"
              >
                <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
                {isCalculating ? t("Calculating...") : t("Recalculate All")}
              </button>
<button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                <Download className="h-4 w-4" />{t("Export")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Rincian ini menampilkan nilai payroll tersimpan. Recalculate All hanya simulasi tampilan; tidak menghitung ulang atau menyimpan payroll. Ekspor belum tersedia.")}</p>

      {/* Summary Cards */}
      <div className="tax-toolbar">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select aria-label={t("Periode")}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 tax-control"
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
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 tax-control"
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 tax-control"
            />
          </div>
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><span className="text-xs text-gray-500">{t("Karyawan")}</span>
<p className="text-xl font-bold text-gray-900">{insightNumber(employeeCount)}</p></div>

        <div className="tax-summary-item"><span className="text-xs text-gray-500">{t("Total Gross")}</span>
<p className="text-lg font-bold text-gray-900">{formatCompactCurrency(totalGross)}</p></div>

        <div className="tax-summary-item"><span className="text-xs text-gray-500">{t("PPh 21")}</span>
<p className="text-lg font-bold text-blue-600">{formatCompactCurrency(totalPPh21)}</p></div>

        <div className="tax-summary-item"><span className="text-xs text-gray-500">{t("BPJS (Emp)")}</span>
<p className="text-lg font-bold text-amber-600">{formatCompactCurrency(totalBPJSEmployee)}</p></div>

        <div className="tax-summary-item"><span className="text-xs text-gray-500">{t("BPJS (Co)")}</span>
<p className="text-lg font-bold text-green-600">{formatCompactCurrency(totalBPJSCompany)}</p></div>

        <div className="tax-summary-item"><span className="text-xs text-gray-500">{t("Total Net")}</span>
<p className="text-lg font-bold text-emerald-600">{formatCompactCurrency(totalNet)}</p></div>
      </div>

      {/* Filters */}

      {/* Calculation Table */}
      <div className="ph-section tax-section tax-register">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 tax-section">
          <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Detail Kalkulasi Pajak")}</h3>
          <p className="text-xs text-gray-500 mt-1">{t("Menampilkan")} {insightNumber(filteredPayrolls.length)}{' '}{t("karyawan")}</p>
        </div>

        <div className="ph-table-scroll tax-table-scroll">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{t("Karyawan")}</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("Gross")}</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("PKP")}</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("PPh 21")}</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("BPJS Emp")}</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("BPJS Co")}</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">{t("Net")}</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">{t("Aksi")}</th>
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
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm text-gray-900">{formatCurrency(Number(payroll.gross_salary) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm text-gray-600">{formatCurrency(Number(payroll.taxable_income) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="font-medium text-blue-600">{formatCurrency(Number(payroll.pph21) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm text-amber-600">{formatCurrency(Number(payroll.bpjs_employee_total) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-sm text-green-600">{formatCurrency(Number(payroll.bpjs_company_total) || 0)}</span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="font-bold text-gray-900">{thpText(payroll)}</span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button type="button"
                        onClick={() => setSelectedPayroll(payroll)}
                        className="ph-button tax-button"
                      >
                        <Eye className="h-3.5 w-3.5" />{t("Detail")} </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Tidak ada data")}</h3>
                    <p className="text-gray-500">{t("Tidak ada data kalkulasi untuk periode ini")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPayroll && (
        <Modal isOpen={true} onClose={() => setSelectedPayroll(null)} title={t("Detail Kalkulasi")} size="lg">
<div className="ph-workflow tax-workflow tax-detail"><p className="tax-period">{periodOptions.find((p) => p.value === selectedPeriod)?.label}</p><p className="ph-callout tax-notice">{t("Rincian ini menampilkan nilai payroll tersimpan. Recalculate All hanya simulasi tampilan; tidak menghitung ulang atau menyimpan payroll. Ekspor belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-14 h-14 flex items-center justify-center font-bold text-lg tax-initials">
                  {selectedPayroll.employee?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2) || '?'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedPayroll.employee?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedPayroll.employee?.employee_id}</p>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">{t("Penghasilan")}</h5>
                <div className="space-y-2">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Gaji Pokok")}</dt><dd>{formatCurrency(Number(selectedPayroll.basic_salary) || 0)}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Total Gross")}</dt><dd>{formatCurrency(Number(selectedPayroll.gross_salary) || 0)}</dd></dl>
                </div>
              </div>

              {/* Tax Calculation */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">{t("Kalkulasi Pajak")}</h5>
                <div className="space-y-2">
                  <dl className="ph-kv tax-kv-row"><dt>{t("PTKP Status")}</dt><dd>{selectedPayroll.ptkp_status || '-'}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("PKP")}</dt><dd>{formatCurrency(Number(selectedPayroll.taxable_income) || 0)}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("TER Rate")}</dt><dd>
                      {selectedPayroll.ter_rate ? `${insightFixed((Number(selectedPayroll.ter_rate) * 100), 2)}%` : '-'}
                    </dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("PPh 21")}</dt><dd>{formatCurrency(Number(selectedPayroll.pph21) || 0)}</dd></dl>
                </div>
              </div>

              {/* BPJS */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">{t("BPJS")}</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="ph-section tax-section">
                    <p className="text-xs text-amber-600 mb-1">{t("BPJS Karyawan")}</p>
                    <p className="font-bold text-amber-700">{formatCurrency(Number(selectedPayroll.bpjs_employee_total) || 0)}</p>
                  </div>
                  <div className="ph-section tax-section">
                    <p className="text-xs text-green-600 mb-1">{t("BPJS Perusahaan")}</p>
                    <p className="font-bold text-green-700">{formatCurrency(Number(selectedPayroll.bpjs_company_total) || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="p-4 border border-cyan-200 tax-section">
                <dl className="ph-kv tax-kv-row"><dt>{t("Take Home Pay")}</dt><dd>{thpText(selectedPayroll)}</dd></dl>
              </div>
            </div><div className="ph-dialog-footer tax-dialog-actions"><button type="button" className="ph-button tax-button" onClick={() => setSelectedPayroll(null)}>{t("Tutup")}</button></div></div>
</Modal>
      )}
    </div>
  );
}
