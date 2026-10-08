import { payrollNumber } from '@/components/payroll/localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { companyService, type Company } from '@/services/company.service';
import { employeeService } from '@/services/employee.service';
import { payrollSettingService } from '@/services/payroll-setting.service';
import { payrollService } from '@/services/payroll.service';
import { useAuthStore } from '@/stores/auth.store';
import { canAction, canViewCompensation } from '@/lib/actions';
import type { Employee } from '@/types';

import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { collectPages } from '@/services/master-data';
import './payroll-workspace.css';
import './payroll-refresh.css';
import './payroll-workflows.css';

// Helper to calculate period dates based on cutoff
const calculatePeriodDates = (period: string, cutoffDate: number = 20): { start: Date; end: Date; label: string } => {
  const [year, month] = period.split('-').map(Number);
  const startCutoff = cutoffDate + 1;

  // Period start: (cutoff + 1) of previous month
  const periodStart = new Date(year, month - 2, startCutoff);

  // Period end: cutoffDate of current month
  const periodEnd = new Date(year, month - 1, cutoffDate);

  // Format label
  const formatDate = (d: Date) => {
    return d.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' });
  };

  return {
    start: periodStart,
    end: periodEnd,
    label: `${formatDate(periodStart)} - ${formatDate(periodEnd)} ${year}`,
  };
};

type EmploymentType = 'freelance' | 'internship';

interface FreelanceDetail {
  rate_type: 'hourly' | 'daily' | 'project';
  rate_amount: number;
  quantity: number;
  total_fee: number;
}

interface InternshipDetail {
  stipend: number;
  meal_allowance?: number;
  transport_allowance?: number;
}

interface TaxDetail {
  gross_income: number;
  gross_up: number;
  ptkp: string;
  ptkp_amount: number;
  pkp: number;
  tax_rate: string;
  pph21: number;
  effective_rate: number;
  formula: string;
}

interface PayrollRecord {
  id: number;
  company_id: number;
  employment_type: EmploymentType;
  employee: {
    id: number;
    name: string;
    employee_id: string;
    department: string;
    position: string;
    avatar?: string;
    join_date?: string;
    bank_name?: string;
    bank_account?: string;
  };
  period: string;
  total_payment: number;
  gross_up: number;
  tax: number;
  tax_detail?: TaxDetail;
  freelance_detail?: FreelanceDetail;
  internship_detail?: InternshipDetail;
  net_salary: number;
  company_cost: number;
  status: 'pending' | 'processing' | 'validated' | 'paid';
  paid_at?: string;
  calculated_at?: string;
  validated_by?: string;
  paid_by?: string;
}

interface PayrollSummary {
  total_freelance: number;
  total_internship: number;
  pending_count: number;
  paid_count: number;
  total_payment: number;
}

// Constants for gross-up calculation (matching Laravel HRIS)
const GROSS_UP_DIVISOR = 0.975; // H3/0.975
const PPH21_RATE = 0.025; // 2.5% PPH21 rate

// Helper function to convert Employee to PayrollRecord
const employeeToPayrollRecord = (employee: Employee, period: string): PayrollRecord => {
  const isFreelance = employee.employment_type === 'freelance';
  const basicSalary = Number(employee.basic_salary || 0);
  const mealAllowance = Number(employee.meal_allowance || 0);
  const transportAllowance = Number(employee.transport_allowance || 0);

  if (isFreelance) {
    // Freelance: Use gross-up formula (matching Laravel HRIS)
    // Gross Up = Basic Salary ÷ 0.975
    // PPH21 = Gross Up × 2.5%
    // Employee receives full basic salary, company pays the tax
    const totalPayment = basicSalary; // What employee receives
    const grossUp = Math.round(basicSalary / GROSS_UP_DIVISOR);
    const tax = Math.round(grossUp * PPH21_RATE);
    const effectiveRate = basicSalary > 0 ? (tax / basicSalary) * 100 : 0;
    const companyCost = basicSalary + tax; // Company pays: basic + PPH21

    return {
      id: employee.id,
      company_id: employee.company_id || 0,
      employment_type: 'freelance',
      employee: {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id || '-',
        department: employee.department?.name || '-',
        position: employee.position?.name || '-',
        avatar: employee.avatar,
        bank_name: undefined,
        bank_account: undefined,
      },
      period,
      total_payment: totalPayment,
      gross_up: grossUp,
      tax,
      tax_detail: {
        gross_income: totalPayment,
        gross_up: grossUp,
        ptkp: '-',
        ptkp_amount: 0,
        pkp: grossUp,
        tax_rate: 'PPh 21 Final 2.5%',
        pph21: tax,
        effective_rate: Math.round(effectiveRate * 100) / 100,
        formula: 'Gross Up = Basic Salary ÷ 0.975, PPH21 = Gross Up × 2.5%',
      },
      freelance_detail: {
        rate_type: 'project',
        rate_amount: basicSalary,
        quantity: 1,
        total_fee: basicSalary,
      },
      net_salary: totalPayment, // Employee receives full amount
      company_cost: companyCost,
      status: 'pending',
    };
  } else {
    // Internship: Also use gross-up formula (same as freelance)
    const totalPayment = basicSalary + mealAllowance + transportAllowance;
    const grossUp = Math.round(totalPayment / GROSS_UP_DIVISOR);
    const tax = Math.round(grossUp * PPH21_RATE);
    const effectiveRate = totalPayment > 0 ? (tax / totalPayment) * 100 : 0;
    const companyCost = totalPayment + tax;

    return {
      id: employee.id,
      company_id: employee.company_id || 0,
      employment_type: 'internship',
      employee: {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id || '-',
        department: employee.department?.name || '-',
        position: employee.position?.name || '-',
        avatar: employee.avatar,
        join_date: employee.join_date,
        bank_name: undefined,
        bank_account: undefined,
      },
      period,
      total_payment: totalPayment,
      gross_up: grossUp,
      tax,
      tax_detail: {
        gross_income: totalPayment,
        gross_up: grossUp,
        ptkp: '-',
        ptkp_amount: 0,
        pkp: grossUp,
        tax_rate: 'PPh 21 Final 2.5%',
        pph21: tax,
        effective_rate: Math.round(effectiveRate * 100) / 100,
        formula: 'Gross Up = Basic Salary ÷ 0.975, PPH21 = Gross Up × 2.5%',
      },
      internship_detail: {
        stipend: basicSalary,
        meal_allowance: mealAllowance || undefined,
        transport_allowance: transportAllowance || undefined,
      },
      net_salary: totalPayment, // Employee receives full amount
      company_cost: companyCost,
      status: 'pending',
    };
  }
};

export function FreelanceInternshipPayrollPage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  // Estimates are computed from employee records, so they need the employee list
  // (employee.view) AND visible compensation (salary eligibility + employee.view_salary).
  // Otherwise the API returns 403 or redacted nulls, which must not become zero estimates.
  const previewAvailable = canAction(user, 'employee.view') && canViewCompensation(user, null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<EmploymentType | 'all'>('all');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cutoffDate, setCutoffDate] = useState<number>(20);
  const [isExporting, setIsExporting] = useState(false);

  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [settingsState, setSettingsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [page, setPage] = useState(1);
  const companyRequest = useRef(0);
  const dataRequest = useRef(0);
  const settingsRequest = useRef(0);

  const fetchCompanies = useCallback(async () => {
    const request = ++companyRequest.current;
    setCompanyLoading(true); setCompanyError(false);
    try {
      const rows = (await collectPages((page, limit) => companyService.getAll({ page, limit }))).filter(c => c.is_active);
      if (request !== companyRequest.current) return;
      setCompanies(rows); setSelectedCompanyId(current => rows.some(c => c.id === current) ? current : rows[0]?.id ?? null);
    } catch {
      if (request === companyRequest.current) { setCompanyError(true); setCompanies([]); setSelectedCompanyId(null); }
    } finally { if (request === companyRequest.current) setCompanyLoading(false); }
  }, []);

  const fetchPayrollSettings = useCallback(async () => {
    const request = ++settingsRequest.current;
    setSettingsState('loading');
    if (!selectedCompanyId) return;
    try {
      const settings = await payrollSettingService.getByCompany(selectedCompanyId);
      if (request !== settingsRequest.current) return;
      setCutoffDate(settings?.payroll_cutoff_date || 20); setSettingsState('ready');
    } catch { if (request === settingsRequest.current) setSettingsState('error'); }
  }, [selectedCompanyId]);

  const fetchPayrollData = useCallback(async () => {
    const request = ++dataRequest.current;
    setRecords([]); setPage(1); setLoadError(false);
    if (!selectedCompanyId || !previewAvailable) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const fetchType = (employment_type: EmploymentType) => collectPages((page, limit) => employeeService.getAll({
        company_id: selectedCompanyId, employment_type, employment_status: 'active', page, limit,
      }));
      const [freelance, internship] = await Promise.all([fetchType('freelance'), fetchType('internship')]);
      if (request !== dataRequest.current) return;
      setRecords([...freelance, ...internship].map(employee => employeeToPayrollRecord(employee, selectedPeriod)));
    } catch { if (request === dataRequest.current) setLoadError(true); }
    finally { if (request === dataRequest.current) setIsLoading(false); }
  }, [selectedCompanyId, selectedPeriod, previewAvailable]);

  useEffect(() => { const request = companyRequest; void fetchCompanies(); return () => { request.current++; }; }, [fetchCompanies]);
  useEffect(() => { const request = settingsRequest; void fetchPayrollSettings(); return () => { request.current++; }; }, [fetchPayrollSettings]);
  useEffect(() => {
    const request = dataRequest;
    setSelectedRecord(null); setShowDetailModal(false); void fetchPayrollData();
    return () => { request.current++; };
  }, [fetchPayrollData]);
  const summary: PayrollSummary = useMemo(() => ({
    total_freelance: records.filter(record => record.employment_type === 'freelance').length,
    total_internship: records.filter(record => record.employment_type === 'internship').length,
    pending_count: records.filter(record => ['pending', 'processing'].includes(record.status)).length,
    paid_count: records.filter(record => record.status === 'paid').length,
    total_payment: records.reduce((sum, record) => sum + record.total_payment, 0),
  }), [records]);

  const filteredRecords = records.filter(record => {
    const matchCompany = record.company_id === selectedCompanyId;
    const matchSearch =
      record.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      record.employee.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchEmploymentType = employmentTypeFilter === 'all' || record.employment_type === employmentTypeFilter;

    return matchCompany && matchSearch && matchEmploymentType;
  });

  const handleViewDetail = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  // Export to Excel (all companies)
  const handleExport = async () => {
    if (settingsState !== 'ready' || !selectedCompanyId) return;
    setIsExporting(true);

    try {
      await payrollService.exportFreelanceInternship(selectedPeriod, cutoffDate);
      toast.success(t("Export berhasil! File Excel sedang didownload."));
    } catch (error) {
      console.error('Export error:', error);
      if (isAxiosError(error) && error.response?.status === 404) {
        toast.error(t("Tidak ada data freelance/internship untuk diexport"));
      } else {
        toast.error(t("Gagal export data"));
      }
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
  };

  // Format period with cutoff dates
  const formatPeriodWithCutoff = (period: string) => {
    const periodDates = calculatePeriodDates(period, cutoffDate);
    return periodDates.label;
  };

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / 25));
  const visibleRecords = filteredRecords.slice((page - 1) * 25, page * 25);
  const periods = Array.from({ length: 12 }, (_, index) => {
    const now = new Date(); const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const busy = companyLoading || isLoading;
  const summaryHidden = busy || loadError || companyError || !previewAvailable;

  return <OperationalWorkspace module="payroll" title={t("Freelance & Internship")} className="payroll-workspace"
    description={t("Estimasi fee, uang saku, dan pajak berdasarkan data karyawan aktif.")}
    actions={canAction(user, 'payroll.export') ? <button className="ow-button ow-primary" disabled={busy || isExporting || settingsState !== 'ready' || !selectedCompanyId}
      onClick={handleExport}>{isExporting ? t("Mengekspor…") : t("Export semua company yang diakses")}</button> : undefined}>
    <section className="ow-register pw-register" aria-label={t("Register freelance dan internship")}>
    <section className="pw-controls" aria-label={t("Periode freelance dan internship")}>
      <label className="ow-field">{t("Company")}<select aria-label={t("Company payroll")} value={selectedCompanyId ?? ''} disabled={companyLoading} onChange={event => setSelectedCompanyId(Number(event.target.value))}>
        {!companies.length && <option value="">{companyLoading ? t("Memuat company…") : t("Tidak ada company")}</option>}
        {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
      </select></label>
      <label className="ow-field">{t("Periode")}<select aria-label={t("Periode payroll")} value={selectedPeriod} onChange={event => setSelectedPeriod(event.target.value)}>
        {periods.map(period => <option key={period} value={period}>{formatPeriod(period)}</option>)}
      </select></label>
      <div className="pw-control-note"><span>{settingsState === 'ready' ? t("Cutoff: {value0}", { value0: formatPeriodWithCutoff(selectedPeriod) }) : t("Cutoff belum tersedia")}</span></div>
        <label className="ow-field pw-search"><span className="sr-only">{t("Cari karyawan")}</span><input aria-label={t("Cari karyawan")} placeholder={t("Cari nama atau ID karyawan…")} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
        <label className="ow-field"><span className="sr-only">{t("Jenis karyawan")}</span><select aria-label={t("Jenis karyawan")} value={employmentTypeFilter} onChange={event => { setEmploymentTypeFilter(event.target.value as EmploymentType | 'all'); setPage(1); }}>
          <option value="all">{t("Semua jenis")}</option><option value="freelance">{t("Freelance")}</option><option value="internship">{t("Internship")}</option>
        </select></label>
      <button className="ow-button" disabled={busy || !selectedCompanyId} onClick={() => fetchPayrollData()}>{t("Refresh")}</button>
    </section>
    {companyError && <div role="alert" className="ow-feedback">{t("Gagal memuat company.")} <button className="ow-button" onClick={() => fetchCompanies()}>{t("Coba lagi company")}</button></div>}
    {settingsState === 'error' && <div role="alert" className="ow-feedback">{t("Cutoff payroll gagal dimuat. Export menunggu cutoff yang sesuai.")} <button className="ow-button" onClick={() => fetchPayrollSettings()}>{t("Coba lagi cutoff")}</button></div>}
    <details className="pw-preview-notice"><summary>{t("Estimasi, belum menjadi payroll tersimpan")}</summary><p>{t("Nominal dihitung dari data karyawan aktif dengan rumus estimasi yang tersedia. Halaman ini tidak mencatat persetujuan atau pembayaran. Export mencakup semua company yang dapat diakses, tanpa mengikuti filter company atau jenis karyawan di layar.")}</p></details>


      <div className="ow-toolbar pw-toolbar">


        <span className="pw-count">{payrollNumber(Number(filteredRecords.length))}{' '}{t("karyawan")}</span>

      </div>
      {!previewAvailable ? <div className="pw-empty" data-testid="estimate-unavailable"><h2>{t("Estimates unavailable")}</h2><p>{t("Your access does not include employee compensation, so estimates cannot be calculated.")}</p></div>
        : loadError ? <div role="alert" className="ow-feedback">{t("Gagal memuat data karyawan.")} <button className="ow-button" onClick={() => fetchPayrollData()}>{t("Coba lagi")}</button></div>
        : busy ? <div role="status" className="pw-empty">{t("Memuat estimasi payroll…")}</div>
        : !filteredRecords.length ? <div className="pw-empty"><h2>{selectedCompanyId ? t("Tidak ada karyawan sesuai filter") : t("Pilih company")}</h2><p>{t("Ubah pencarian atau jenis karyawan.")}</p></div>
        : <div className="pw-table-scroll" tabIndex={0} role="region" aria-label={t("Tabel pembayaran, geser untuk kolom lainnya")}>
            <table className="ow-table pw-table">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Nama")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Tipe")}</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Pembayaran")}</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Pajak")}</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Take Home")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Sumber")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRecords.map(record => (
                  <tr key={record.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">

                        <div>
                          <p className="font-semibold text-gray-900">{record.employee.name}</p>
                          <p className="text-xs text-gray-500">{record.employee.employee_id} • {record.employee.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.employment_type === 'freelance' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">{t("Freelance")} </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">{t("Internship")} </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(record.total_payment)}</p>
                      {record.freelance_detail && (
                        <p className="text-xs text-gray-500">
                          {formatCurrency(record.freelance_detail.rate_amount)}/{record.freelance_detail.rate_type === 'hourly' ? t("jam") : record.freelance_detail.rate_type === 'daily' ? t("hari") : t("project")}
                        </p>
                      )}
                      {record.internship_detail && (
                        <p className="text-xs text-gray-500">{t("Uang Saku + Tunjangan")}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.tax > 0 ? (
                        <>
                          <p className="font-medium text-slate-700">{formatCurrency(record.tax)}</p>
                          <p className="text-xs text-gray-500">{t("PPh 21 (Company)")}</p>
                        </>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900 text-sm">{formatCurrency(record.net_salary)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="ow-status">{t("Estimasi")}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(record)} aria-label={t("Detail {value0}", { value0: record.employee.name })}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:pw-selected rounded-lg transition-colors"
                          title={t("Lihat Detail")}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>}
      <div className="pw-ledger-footer">
      <p className="pw-ledger-scope">{t("Semua jenis · Tanpa filter pencarian")}</p>
      <dl className="pw-ledger-summary" aria-label={t("Ringkasan estimasi")}>
      <div><dt>{t("Freelance")}</dt><dd>{summaryHidden ? '—' : summary.total_freelance}</dd></div>
      <div><dt>{t("Internship")}</dt><dd>{summaryHidden ? '—' : summary.total_internship}</dd></div>
      <div><dt>{t("Estimasi pembayaran company ini")}</dt><dd>{summaryHidden ? '—' : formatCurrency(summary.total_payment)}</dd></div>
    </dl>
    </div>
        <div className="ow-pagination pw-pagination"><span>{filteredRecords.length ? t("{value0}–{value1} dari {value2}", { value0: payrollNumber((page - 1) * 25 + 1), value1: payrollNumber(Math.min(page * 25, filteredRecords.length)), value2: payrollNumber(filteredRecords.length) }) : t("0 karyawan")}</span><div><button className="ow-button" disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>{t("Sebelumnya")}</button><span>{payrollNumber(Number(page))} / {payrollNumber(Number(pageCount))}</span><button className="ow-button" disabled={page >= pageCount || busy} onClick={() => setPage(value => value + 1)}>{t("Berikutnya")}</button></div></div>
    </section>
    {showDetailModal && selectedRecord && <OperationalDialog title={t("Detail freelance & internship")} subtitle={`${selectedRecord.employee.employee_id} · ${formatPeriod(selectedRecord.period)}`} onClose={() => setShowDetailModal(false)} className="pw-detail-dialog pw-freelance-dialog payroll-refresh-dialog ph-workflow">
      <div className="pw-detail-identity"><div><h3>{selectedRecord.employee.name}</h3><p>{selectedRecord.employee.position} · {selectedRecord.employee.department}</p></div><span className="ow-status">{selectedRecord.employment_type === 'freelance' ? t("Freelance") : t("Internship")}</span></div>
      <div className="pw-detail-content ph-workflow">
        <p className="pw-detail-note">{t("Estimasi dari data karyawan aktif ·")} {settingsState === 'ready' ? formatPeriodWithCutoff(selectedRecord.period) : t("Cutoff belum tersedia")}{t(". Belum menjadi payroll atau pembayaran tersimpan.")}</p>
        <div className="pw-detail-totals"><div><p>{t("Take Home Pay")}</p><strong>{formatCurrency(selectedRecord.net_salary)}</strong></div><div><p>{t("Biaya perusahaan")}</p><strong>{formatCurrency(selectedRecord.company_cost)}</strong></div></div>
        <div className="pw-breakdown-grid">
                {/* Freelance Detail */}
                {selectedRecord.employment_type === 'freelance' && selectedRecord.freelance_detail && (
                  <div className="pw-breakdown-section">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("Perhitungan Fee")}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("Tipe Rate")}</span>
                        <span className="font-medium capitalize">
                          {selectedRecord.freelance_detail.rate_type === 'hourly' ? t("Per Jam") :
                           selectedRecord.freelance_detail.rate_type === 'daily' ? t("Per Hari") : t("Per Project")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("Rate")}</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.freelance_detail.rate_amount)}</span>
                      </div>
                      {selectedRecord.freelance_detail.rate_type !== 'project' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t("Jumlah")} {selectedRecord.freelance_detail.rate_type === 'hourly' ? t("Jam") : t("Hari")}
                          </span>
                          <span className="font-medium">{payrollNumber(Number(selectedRecord.freelance_detail.quantity))}</span>
                        </div>
                      )}
                      <div className="border-t pw-rule pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">{t("Total Fee")}</span>
                        <span className="font-bold pw-amount">{formatCurrency(selectedRecord.freelance_detail.total_fee)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Internship Detail */}
                {selectedRecord.employment_type === 'internship' && selectedRecord.internship_detail && (
                  <div className="pw-breakdown-section">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("Kompensasi Magang")}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("Uang Saku")}</span>
                        <span className="font-medium pw-amount">{formatCurrency(selectedRecord.internship_detail.stipend)}</span>
                      </div>
                      {selectedRecord.internship_detail.meal_allowance && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t("Uang Makan")}</span>
                          <span className="font-medium pw-amount">{formatCurrency(selectedRecord.internship_detail.meal_allowance)}</span>
                        </div>
                      )}
                      {selectedRecord.internship_detail.transport_allowance && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t("Uang Transport")}</span>
                          <span className="font-medium pw-amount">{formatCurrency(selectedRecord.internship_detail.transport_allowance)}</span>
                        </div>
                      )}
                      <div className="border-t pw-rule pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">{t("Total")}</span>
                        <span className="font-bold pw-amount">{formatCurrency(selectedRecord.total_payment)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tax Calculation (Gross-Up Formula) */}
                {selectedRecord.tax > 0 && (
                  <div className="pw-breakdown-section">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("Perhitungan Pajak (PPh 21 Final - Gross Up)")}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("Basic Salary (Diterima Karyawan)")}</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.total_payment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("Gross Up (÷ 0.975)")}</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.gross_up)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("Tarif PPh 21")}</span>
                        <span className="font-medium">{(2.5).toLocaleString(intlLocale())}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t("Effective Rate")}</span>
                        <span className="font-medium">{Number(selectedRecord.tax_detail?.effective_rate?.toFixed(2)).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                      </div>
                      <div className="border-t pw-rule pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">{t("PPh 21 (Dibayar Perusahaan)")}</span>
                        <span className="font-bold pw-amount">{formatCurrency(selectedRecord.tax)}</span>
                      </div>
                    </div>
                    <p className="text-xs pw-amount mt-3 italic">{t("Formula: Gross Up = Basic Salary ÷ 0.975, PPH21 = Gross Up × 2.5%")} </p>
                  </div>
                )}

                {/* Company Cost */}
                <div className="pw-breakdown-section">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("Biaya Perusahaan")}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("Gaji/Fee Karyawan")}</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.total_payment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("PPh 21 (Company Pays)")}</span>
                      <span className="font-medium pw-amount">+{formatCurrency(selectedRecord.tax)}</span>
                    </div>
                    <div className="border-t pw-rule pt-2 mt-2 flex justify-between">
                      <span className="font-semibold">{t("Total Biaya Perusahaan")}</span>
                      <span className="font-bold pw-amount">{formatCurrency(selectedRecord.company_cost)}</span>
                    </div>
                  </div>
                </div>


        </div>

      </div>
    </OperationalDialog>}
  </OperationalWorkspace>;
}
