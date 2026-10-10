import { payrollNumber } from '@/components/payroll/localization';
import { payrollCalculationCurrency, payrollCurrency, payrollEnumLabel } from '@/components/payroll/localization';
import { savedCompanyCost, savedThp } from '@/components/payroll/saved-payroll';
import { SalarySimulator } from '@/components/payroll/SalarySimulator';
import { t, useLocale, intlLocale } from '@/i18n';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { PayrollPreparation, PayrollPolicyDetail, PayrollPaymentHold, PayrollSavedBPJS } from '@/components/payroll/PayrollPreparation';
import { companyService, type Company } from '@/services/company.service';
import {
  payrollService,
  type Payroll,
  type PayrollSummary,
  PAYROLL_STATUS,
} from '@/services/payroll.service';

import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { collectPages } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import './payroll-workspace.css';
import './payroll-refresh.css';

const PAYROLL_COMPANY_KEY = 'payroll_selected_company';

export function PayrollPage() {
  useLocale();
  const [records, setRecords] = useState<Payroll[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'processing' | 'validation' | 'approved' | 'paid'>('processing');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<Payroll | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPreparation, setShowPreparation] = useState(false);
  const [showSalarySimulator, setShowSalarySimulator] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Period options (current month and 5 months back)
  const periodOptions = (() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  })();

  const { user } = useAuthStore();
  // Match the existing backend role levels; this is not a new approval policy.
  const canPrepare = user?.roles.some(role => ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'].includes(role)) ?? false;
  const canApprove = user?.roles.some(role => ['Super Admin', 'Group CEO', 'CEO', 'HR Manager'].includes(role)) ?? false;
  // Role eligibility above is the ceiling; each payroll step also needs its own action.
  const canGenerate = canPrepare && canAction(user, 'payroll.generate');
  const canUpdateRun = canPrepare && canAction(user, 'payroll.update');
  const canSubmitRun = canPrepare && canAction(user, 'payroll.submit');
  const canApproveRun = canApprove && canAction(user, 'payroll.approve');
  const canPayRun = canApprove && canAction(user, 'payroll.pay');
  const canExportPayroll = canAction(user, 'payroll.export');
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const companyRequest = useRef(0);
  const dataRequest = useRef(0);
  const detailRequest = useRef(0);

  const fetchCompanies = useCallback(async () => {
    const request = ++companyRequest.current;
    setCompanyLoading(true); setCompanyError(false);
    try {
      const rows = await collectPages((page, limit) => companyService.getAll({ page, limit }));
      if (request !== companyRequest.current) return;
      setCompanies(rows);
      const savedId = Number(localStorage.getItem(PAYROLL_COMPANY_KEY));
      setSelectedCompanyId(current => rows.some(c => c.id === current) ? current
        : rows.find(c => c.id === savedId)?.id ?? rows[0]?.id ?? null);
    } catch {
      if (request === companyRequest.current) { setCompanyError(true); setCompanies([]); setSelectedCompanyId(null); }
    } finally {
      if (request === companyRequest.current) setCompanyLoading(false);
    }
  }, []);

  const fetchPayrollData = useCallback(async () => {
    const request = ++dataRequest.current;
    setRecords([]); setSelectedIds([]); setPage(1); setLoadError(false);
    if (!selectedCompanyId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const rows = await collectPages((page, limit) => payrollService.getAll({ company_id: selectedCompanyId, period: selectedPeriod, page, limit }));
      if (request !== dataRequest.current) return;
      setRecords(rows.filter(record =>
        !['freelance', 'internship'].includes(record.employee.employment_type || '') &&
        ['active', 'resigned'].includes(record.employee.employment_status || '')));
    } catch {
      if (request === dataRequest.current) setLoadError(true);
    } finally {
      if (request === dataRequest.current) setIsLoading(false);
    }
  }, [selectedCompanyId, selectedPeriod]);

  useEffect(() => { const request = companyRequest; void fetchCompanies(); return () => { request.current++; }; }, [fetchCompanies]);
  useEffect(() => {
    const data = dataRequest, detail = detailRequest;
    if (selectedCompanyId) localStorage.setItem(PAYROLL_COMPANY_KEY, String(selectedCompanyId));
    setShowDetailModal(false); setSelectedRecord(null); setDetailLoading(null);
    void fetchPayrollData();
    return () => { data.current++; detail.current++; };
  }, [fetchPayrollData, selectedCompanyId]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Calculate summary from records
  const summary: PayrollSummary = useMemo(() => {
    return payrollService.calculateSummary(records);
  }, [records]);

  // Filter records based on active tab and search
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchSearch =
        record.employee.name.toLowerCase().includes(search.toLowerCase()) ||
        record.employee.employee_id.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      switch (activeTab) {
        case 'processing':
          return record.status === PAYROLL_STATUS.DRAFT || record.status === PAYROLL_STATUS.PROCESSING;
        case 'validation':
          return record.status === PAYROLL_STATUS.VALIDATED || record.status === PAYROLL_STATUS.SUBMITTED;
        case 'approved':
          return record.status === PAYROLL_STATUS.APPROVED;
        case 'paid':
          return record.status === PAYROLL_STATUS.PAID;
        default:
          return true;
      }
    });
  }, [records, activeTab, search]);

  // Get tab counts
  const tabCounts = useMemo(() => ({
    processing: records.filter(r => r.status === PAYROLL_STATUS.DRAFT || r.status === PAYROLL_STATUS.PROCESSING).length,
    validation: records.filter(r => r.status === PAYROLL_STATUS.VALIDATED || r.status === PAYROLL_STATUS.SUBMITTED).length,
    approved: records.filter(r => r.status === PAYROLL_STATUS.APPROVED).length,
    paid: records.filter(r => r.status === PAYROLL_STATUS.PAID).length,
  }), [records]);

  // Count selected records by status (for showing appropriate bulk action buttons)
  const selectedCounts = useMemo(() => {
    const selectedRecords = records.filter(r => selectedIds.includes(r.id));
    return {
      validated: selectedRecords.filter(r => r.status === PAYROLL_STATUS.VALIDATED).length,
      submitted: selectedRecords.filter(r => r.status === PAYROLL_STATUS.SUBMITTED).length,
    };
  }, [records, selectedIds]);

  const selectedCalculation = selectedRecord?.metadata?.calculation?.version === 2 ? selectedRecord.metadata.calculation : null;
  const formatCurrency = (amount: number) => selectedCalculation || records.some(record => record.metadata?.calculation?.version === 2)
    ? payrollCalculationCurrency(amount) : payrollCurrency(amount);
  // Funding, Position split, THP and cost come from the backend's saved read
  // presentation; the page never re-derives them. Unknown stays unknown.
  const presentation = selectedRecord?.presentation ?? null;
  const pph21Funding = presentation?.funding.pph21 ?? null;
  const bpjsFunding = presentation?.funding.bpjs_employee ?? null;
  const legacyCompanyBears = pph21Funding === 'company_paid';
  const detailGrossUp = selectedCalculation
    ? selectedCalculation.policy?.tax_allowance_mode === 'gross_up'
    : legacyCompanyBears;
  const formatDetailCurrency = selectedCalculation ? payrollCalculationCurrency : payrollCurrency;
  const positionSplit = presentation && presentation.position.business !== null && presentation.position.tax_allowance !== null
    ? { business: presentation.position.business, tax: presentation.position.tax_allowance } : null;
  // Saved company cost; a row that never stored one shows '-', not Rp 0.
  const detailCompanyCost = selectedRecord ? savedCompanyCost(selectedRecord) : null;
  // Saved take-home pay (take_home_pay, then thp); never net_salary.
  const detailThp = selectedRecord ? savedThp(selectedRecord) : null;
  const detailDeductionTotal = presentation?.deductions.total ?? null;
  // Saved system deductions (absence/late/loan/other), shown on their own.
  const detailSystemDeductions = presentation ? presentation.deductions.system
    : selectedRecord?.total_deductions == null ? null : Number(selectedRecord.total_deductions);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
  };

  const handleViewDetail = async (record: Payroll) => {
    if (detailLoading === record.id) return;
    const request = ++detailRequest.current;
    setDetailLoading(record.id);
    try {
      const detail = await payrollService.getById(record.id);
      if (request !== detailRequest.current) return;
      setSelectedRecord(detail); setShowDetailModal(true);
    } catch {
      if (request === detailRequest.current) toast.error(t("Gagal memuat detail payroll. Coba lagi."));
    } finally {
      if (request === detailRequest.current) setDetailLoading(null);
    }
  };

  // Validate payroll
  const handleValidate = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.validate(id);
      toast.success(t("Payroll berhasil divalidasi"));
      fetchPayrollData();
    } catch (error) {
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Gagal memvalidasi payroll'), { id: 'api-error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit payroll
  const handleSubmit = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.submit(id);
      toast.success(t("Payroll berhasil disubmit"));
      fetchPayrollData();
    } catch (error) {
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Gagal submit payroll'), { id: 'api-error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve payroll
  const handleApprove = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.approve(id);
      toast.success(t("Payroll berhasil diapprove"));
      fetchPayrollData();
    } catch (error) {
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Gagal approve payroll'), { id: 'api-error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark as paid
  const handleMarkAsPaid = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.markAsPaid(id);
      toast.success(t("Payroll berhasil dibayar"));
      fetchPayrollData();
    } catch (error) {
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Gagal membayar payroll'), { id: 'api-error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch validate
  const handleBatchValidate = async () => {
    if (selectedIds.length === 0) {
      toast.error(t("Pilih minimal 1 payroll"));
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.validateBatch(selectedIds);
      toast.success(t("{value0} payroll berhasil divalidasi", { value0: payrollNumber(result.success) }));
      if (result.failed > 0) {
        toast.error(t("{value0} payroll gagal divalidasi", { value0: payrollNumber(result.failed) }));
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error(t("Gagal memvalidasi payroll"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch submit (validated -> submitted)
  const handleBatchSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error(t("Pilih minimal 1 payroll"));
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.submitBatch(records.filter(r => selectedIds.includes(r.id) && r.status === PAYROLL_STATUS.VALIDATED).map(r => r.id));
      toast.success(t("{value0} payroll berhasil disubmit", { value0: payrollNumber(result.success) }));
      if (result.failed > 0) {
        toast.error(t("{value0} payroll gagal disubmit", { value0: payrollNumber(result.failed) }));
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error(t("Gagal submit payroll"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch approve (submitted -> approved)
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error(t("Pilih minimal 1 payroll"));
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.approveBatch(records.filter(r => selectedIds.includes(r.id) && r.status === PAYROLL_STATUS.SUBMITTED).map(r => r.id));
      toast.success(t("{value0} payroll berhasil diapprove", { value0: payrollNumber(result.success) }));
      if (result.failed > 0) {
        toast.error(t("{value0} payroll gagal diapprove", { value0: payrollNumber(result.failed) }));
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error(t("Gagal approve payroll"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch mark as paid
  const handleBatchMarkAsPaid = async () => {
    if (selectedIds.length === 0) {
      toast.error(t("Pilih minimal 1 payroll"));
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.markAsPaidBatch(selectedIds);
      toast.success(t("{value0} payroll berhasil dibayar", { value0: payrollNumber(result.success) }));
      if (result.failed > 0) {
        toast.error(t("{value0} payroll gagal dibayar", { value0: payrollNumber(result.failed) }));
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error(t("Gagal membayar payroll"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Export payroll data to Excel (matching PFI template)
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (exportAll: boolean = false) => {
    if (!exportAll && !selectedCompanyId) {
      toast.error(t("Pilih company terlebih dahulu"));
      return;
    }

    // Check if there are approved or paid payrolls
    if (!exportAll && tabCounts.approved === 0 && tabCounts.paid === 0) {
      toast.error(t("Tidak ada payroll dengan status Approved/Paid. Approve payroll terlebih dahulu sebelum export."));
      return;
    }

    setShowExportMenu(false);

    setIsExporting(true);
    try {
      // Pass null for all companies, or selectedCompanyId for single company
      const companyIdToExport = exportAll ? null : selectedCompanyId;
      await payrollService.exportExcel(companyIdToExport, selectedPeriod);
      toast.success(exportAll
        ? t("Data payroll semua company berhasil diekspor ke Excel")
        : t("Data payroll berhasil diekspor ke Excel")
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Gagal mengekspor data'), { id: 'api-error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (filteredRecords.every(record => selectedIds.includes(record.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  // Get action button based on status
  const getActionButton = (record: Payroll) => {
    if ([PAYROLL_STATUS.SUBMITTED, PAYROLL_STATUS.APPROVED].includes(record.status as 'submitted' | 'approved') ? !canApprove : !canPrepare) return null;
    switch (record.status) {
      case PAYROLL_STATUS.DRAFT:
      case PAYROLL_STATUS.PROCESSING:
        if (!canUpdateRun) return null;
        return (
          <button
            onClick={() => handleValidate(record.id)}
            disabled={isProcessing}
            className="ow-button ow-primary pw-row-action"
          >{t("Validasi")} </button>
        );
      case PAYROLL_STATUS.VALIDATED:
        if (!canSubmitRun) return null;
        return (
          <button
            onClick={() => handleSubmit(record.id)}
            disabled={isProcessing}
            className="ow-button ow-primary pw-row-action"
          >{t("Submit")} </button>
        );
      case PAYROLL_STATUS.SUBMITTED:
        if (!canApproveRun) return null;
        return (
          <button
            onClick={() => handleApprove(record.id)}
            disabled={isProcessing}
            className="ow-button ow-primary pw-row-action"
          >{t("Approve")} </button>
        );
      case PAYROLL_STATUS.APPROVED:
        if (!canPayRun) return null;
        return (
          <button
            onClick={() => handleMarkAsPaid(record.id)}
            disabled={isProcessing}
            className="ow-button ow-primary pw-row-action"
          >{t("Bayar")} </button>
        );
      case PAYROLL_STATUS.PAID:
        return (
          <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">{t("Selesai")} </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case PAYROLL_STATUS.DRAFT:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>{t("Draft")} </span>
        );
      case PAYROLL_STATUS.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>{t("Processing")} </span>
        );
      case PAYROLL_STATUS.VALIDATED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>{t("Validated")} </span>
        );
      case PAYROLL_STATUS.SUBMITTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>{t("Submitted")} </span>
        );
      case PAYROLL_STATUS.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>{t("Approved")} </span>
        );
      case PAYROLL_STATUS.PAID:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>{t("Paid")} </span>
        );
      case PAYROLL_STATUS.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>{t("Rejected")} </span>
        );
      default:
        return null;
    }
  };

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / 25));
  const visibleRecords = filteredRecords.slice((page - 1) * 25, page * 25);
  const busy = isLoading || companyLoading || isProcessing;

  return (
    <OperationalWorkspace module="payroll" title={t("Payroll Management")}
      description={t("Tinjau perhitungan, persetujuan, dan pembayaran gaji per periode.")}
      className="payroll-workspace"
      actions={<>
        {canExportPayroll && <div className="pw-export">
          <button className="ow-button" onClick={() => setShowExportMenu(value => !value)} disabled={isExporting || busy || companyError}
            aria-expanded={showExportMenu}>{isExporting ? t("Mengekspor…") : t("Export Excel")}</button>
          {showExportMenu && <div className="pw-export-menu" onKeyDown={event => { if (event.key === 'Escape') setShowExportMenu(false); }}>
            <button className="ow-button" disabled={!selectedCompanyId || (tabCounts.approved === 0 && tabCounts.paid === 0)} onClick={() => handleExport(false)}>{t("Export Company Ini")}</button>
            <button className="ow-button" onClick={() => handleExport(true)}>{t("Export Semua Company")}</button>
            <p>{t("Hanya payroll Approved / Paid. Semua company mengikuti akses akun.")}</p>
            <button className="pw-text-button" onClick={() => setShowExportMenu(false)}>{t("Tutup menu")}</button>
          </div>}
        </div>}
        {canGenerate && <button type="button" className="ow-button" disabled={!selectedCompanyId || companyError}
          onClick={() => setShowSalarySimulator(true)} data-testid="payroll-salary-sim-open">{t("Salary simulation")}</button>}
        {canGenerate && <button className="ow-button ow-primary" disabled={busy || !selectedCompanyId || companyError} onClick={() => setShowPreparation(true)}>{t("Generate Payroll")}</button>}
      </>}>
      <section className="ow-register pw-register" aria-label={t("Register payroll")}>
      <section className="pw-controls" aria-label={t("Periode payroll")}>
        <label className="ow-field">{t("Company")}<select aria-label={t("Company payroll")} value={selectedCompanyId ?? ''} disabled={companyLoading || isProcessing} onChange={event => { setSelectedCompanyId(Number(event.target.value)); setShowExportMenu(false); }}>
          {!companies.length && <option value="">{companyLoading ? t("Memuat company…") : t("Tidak ada company")}</option>}
          {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select></label>
        <label className="ow-field">{t("Periode")}<select aria-label={t("Periode payroll")} value={selectedPeriod} disabled={isProcessing} onChange={event => { setSelectedPeriod(event.target.value); setShowExportMenu(false); }}>
          {periodOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
          <label className="ow-field pw-search"><span className="sr-only">{t("Cari karyawan")}</span><input aria-label={t("Cari karyawan")} placeholder={t("Cari nama atau ID karyawan…")} value={search} disabled={isProcessing} onChange={event => { setSearch(event.target.value); setSelectedIds([]); setPage(1); }} /></label>
        <button className="ow-button" disabled={busy || !selectedCompanyId} onClick={() => fetchPayrollData()}>{t("Refresh")}</button>
      </section>
      {companyError && <div role="alert" className="ow-feedback">{t("Gagal memuat company.")} <button className="ow-button" onClick={() => fetchCompanies()}>{t("Coba lagi company")}</button></div>}


        <div className="pw-stages" role="tablist" aria-label={t("Tahap payroll")}>
          {([
            { id: 'processing', label: t('Processing'), note: t('Draft & perhitungan') },
            { id: 'validation', label: t('Validation'), note: t('Validasi & pengajuan') },
            { id: 'approved', label: t('Approved'), note: t('Siap dibayar') },
            { id: 'paid', label: t('Paid'), note: t('Pembayaran selesai') },
          ] as const).map(tab => <button key={tab.id} title={tab.note} role="tab" aria-selected={activeTab === tab.id} disabled={isProcessing}
            onClick={() => { setActiveTab(tab.id); setSelectedIds([]); setPage(1); }}>
            <span>{tab.label}</span><em>{payrollNumber(Number(tabCounts[tab.id]))}</em>
          </button>)}
        </div>
        <div className="ow-toolbar pw-toolbar">

          <span className="pw-count">{payrollNumber(Number(filteredRecords.length))}{' '}{t("payroll")}{' '}{selectedIds.length > 0 && t(" · {value0} dipilih", { value0: payrollNumber(selectedIds.length) })}</span>
          <div className="pw-bulk">
            {canUpdateRun && activeTab === 'processing' && selectedIds.length > 0 && <button className="ow-button ow-primary" disabled={busy} onClick={handleBatchValidate}>{t("Validasi (")}{payrollNumber(Number(selectedIds.length))})</button>}
            {canSubmitRun && activeTab === 'validation' && selectedCounts.validated > 0 && <button className="ow-button ow-primary" disabled={busy} onClick={handleBatchSubmit}>{t("Submit (")}{payrollNumber(Number(selectedCounts.validated))})</button>}
            {canApproveRun && activeTab === 'validation' && selectedCounts.submitted > 0 && <button className="ow-button ow-primary" disabled={busy} onClick={handleBatchApprove}>{t("Approve (")}{payrollNumber(Number(selectedCounts.submitted))})</button>}
            {canPayRun && activeTab === 'approved' && selectedIds.length > 0 && <button className="ow-button ow-primary" disabled={busy} onClick={handleBatchMarkAsPaid}>{t("Bayar (")}{payrollNumber(Number(selectedIds.length))})</button>}
          </div>
        </div>
        {loadError ? <div role="alert" className="ow-feedback">{t("Gagal memuat payroll. Data periode ini belum tersedia.")} <button className="ow-button" onClick={() => fetchPayrollData()}>{t("Coba lagi")}</button></div>
          : busy && !isProcessing ? <div role="status" className="pw-empty">{t("Memuat payroll…")}</div>
          : !filteredRecords.length ? <div className="pw-empty"><h2>{!selectedCompanyId ? t("Pilih company") : t("Tidak ada payroll di tahap ini")}</h2><p>{search ? t("Coba nama atau ID lain, atau ubah tahap payroll.") : t("Pilih tahap lain atau klik Generate Payroll untuk meninjau payroll periode ini.")}</p>
          </div> : <div className="pw-table-scroll" tabIndex={0} role="region" aria-label={t("Tabel payroll, geser untuk kolom lainnya")}>
            <table className="ow-table pw-table">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {activeTab !== 'paid' && (
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && filteredRecords.every(record => selectedIds.includes(record.id))}
                        onChange={toggleSelectAll} aria-label={t("Pilih semua hasil filter")} disabled={isProcessing}
                        className="w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-500"
                      />
                    </th>
                  )}
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Karyawan")}</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Gaji Pokok")}</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("BPJS")}</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("PPh21")}</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Take Home Pay")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Status")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRecords.map(record => (
                  <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(record.id) ? 'pw-selected' : ''}`}>
                    {activeTab !== 'paid' && (
                      <td className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelection(record.id)} aria-label={t("Pilih {value0}", { value0: record.employee.name })} disabled={isProcessing}
                          className="w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">

                        <div>
                          <p className="font-semibold text-gray-900">{record.employee.name}</p>
                          <p className="text-xs text-gray-500">
                            {record.employee.employee_id}
                            {record.employee.department && ` • ${record.employee.department.name}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-gray-900">{record.metadata?.calculation?.version === 2
                        ? payrollCalculationCurrency(record.basic_salary)
                        : formatCurrency(record.basic_salary)}</p>
                      <p className="text-xs text-gray-500">{record.pay_type === 'gross' ? t("Gross") : t("Nett")}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.metadata?.calculation?.version === 2 ? (
                        <>
                          <p className="font-medium text-gray-900">{payrollCalculationCurrency(record.bpjs_employee_total)}</p>
                          <p className="text-xs text-gray-500">{record.metadata.calculation.policy?.bpjs_paid_by_company == null ? '-' : record.metadata.calculation.policy.bpjs_paid_by_company ? t("Ditanggung perusahaan") : t("Porsi karyawan")}</p>
                        </>
                      ) : (record.bpjs_employee_total ?? 0) > 0 ? (
                        <p className="font-medium text-red-600">-{formatCurrency(record.bpjs_employee_total || 0)}</p>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.metadata?.calculation?.version === 2 ? (
                        <>
                          <p className="font-medium text-slate-700">{payrollCalculationCurrency(record.pph21)}</p>
                          <p className="text-xs text-gray-500">{t("Pajak diterapkan")}</p>
                        </>
                      ) : (record.pph21 ?? 0) > 0 ? (
                        <>
                          <p className="font-medium text-slate-700">-{formatCurrency(record.pph21)}</p>
                          {record.ter_category && (
                            <p className="text-xs text-gray-500">{t("TER")} {record.ter_category}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900 text-sm">{savedThp(record) === null ? '-'
                        : record.metadata?.calculation?.version === 2
                          ? payrollCalculationCurrency(savedThp(record))
                          : formatCurrency(savedThp(record)!)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(record)} aria-disabled={detailLoading === record.id} aria-busy={detailLoading === record.id} aria-label={t("Detail {value0}", { value0: record.employee.name })}
                          className="p-2 text-gray-400 hover:text-emerald-700 hover:pw-selected rounded-lg transition-colors"
                          title={t("Lihat Detail")}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {getActionButton(record)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>}
        <div className="pw-ledger-footer">
        <p className="pw-ledger-scope">{t("Semua status · Tanpa filter pencarian")}</p>
        <dl className="pw-ledger-summary" aria-label={t("Ringkasan periode")}>
        <div><dt>{t("Karyawan")}</dt><dd>{busy || loadError || companyError ? '—' : summary.total_employees}</dd></div>
        <div><dt>{t("Total gross")}</dt><dd>{busy || loadError || companyError ? '—' : formatCurrency(summary.total_gross)}</dd></div>
        <div><dt>{t("Total take home pay")}</dt><dd data-testid="payroll-summary-thp">{busy || loadError || companyError ? '—' : formatCurrency(summary.total_net)}
          {!busy && !loadError && !companyError && summary.total_net_missing > 0
            && <small> · {t('{count} payroll tanpa THP tersimpan tidak dijumlahkan', { count: summary.total_net_missing })}</small>}</dd></div>
        <div><dt>{t("Sudah dibayar")}</dt><dd>{busy || loadError || companyError ? '—' : summary.paid_count}{!busy && !loadError && !companyError && <small> / {payrollNumber(Number(summary.total_employees))}{' '}{t("payroll")}</small>}</dd></div>
      </dl>
      </div>
        <div className="ow-pagination pw-pagination"><span>{filteredRecords.length ? t("{value0}–{value1} dari {value2}", { value0: payrollNumber((page - 1) * 25 + 1), value1: payrollNumber(Math.min(page * 25, filteredRecords.length)), value2: payrollNumber(filteredRecords.length) }) : t("0 payroll")}{' '}{t("· Pilih semua mencakup seluruh hasil filter")}</span><div>
          <button className="ow-button" disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>{t("Sebelumnya")}</button><span>{payrollNumber(Number(page))} / {payrollNumber(Number(pageCount))}</span><button className="ow-button" disabled={page >= pageCount || busy} onClick={() => setPage(value => value + 1)}>{t("Berikutnya")}</button>
        </div></div>
      </section>
      {/* Standalone simulation: read-only, no Apply, never touches payroll runs. */}
      {canGenerate && <SalarySimulator open={showSalarySimulator} onClose={() => setShowSalarySimulator(false)}
        mode="standalone" companyId={selectedCompanyId} companyName={selectedCompany?.name} period={selectedPeriod} />}
      {showPreparation && canGenerate && <PayrollPreparation companies={companies} initialCompanyId={selectedCompanyId} initialPeriod={selectedPeriod}
        onClose={() => setShowPreparation(false)} onGenerated={async (companyId, period) => {
          setSelectedIds([]); setSelectedCompanyId(companyId); setSelectedPeriod(period);
          if (companyId === selectedCompanyId && period === selectedPeriod) await fetchPayrollData();
        }} />}
      {showDetailModal && selectedRecord && <OperationalDialog title={t("Detail payroll")} subtitle={`${selectedRecord.employee.employee_id} · ${formatPeriod(selectedRecord.period)}`} onClose={() => setShowDetailModal(false)} className="pw-detail-dialog payroll-refresh-dialog ph-workflow">
        <div className="pw-detail-identity"><div><h3>{selectedRecord.employee.name}</h3><p>{selectedRecord.employee.position?.name} · {selectedRecord.employee.department?.name} · {selectedCompany?.name}</p></div><div>{getStatusBadge(selectedRecord.status)}<span className="ow-status">{selectedRecord.pay_type ? payrollEnumLabel(selectedRecord.pay_type) : t('GROSS')}</span></div></div>
        <div className="pw-detail-content ph-workflow">
                {/* Summary */}
                <div role="region" aria-label={t("Ringkasan payroll")} className="pw-detail-totals">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="pw-summary-value">
                      <p className="text-slate-600 text-sm">{t("Total Potongan")}</p>
                      {/* Backend presentation total (withheld PPh21 + employee BPJS + system);
                          raw total_deductions is system deductions only. Unknown: '-'. */}
                      <p className="text-2xl font-bold mt-1" data-testid="payroll-detail-total-deductions">
                        {detailDeductionTotal === null ? '-' : formatDetailCurrency(detailDeductionTotal)}</p>
                    </div>
                    <div className="pw-summary-value">
                      <p className="text-slate-600 text-sm">
                        {detailGrossUp ? t("Gross Up Final") : t("Net Salary")}
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {formatDetailCurrency(
                          detailGrossUp
                            ? (selectedRecord.final_gross_up ?? selectedRecord.gross_salary)
                            : selectedRecord.net_salary
                        )}
                      </p>
                    </div>
                    <div className="pw-summary-value">
                      <p className="text-slate-600 text-sm">{t("Take Home Pay")}</p>
                      <p className="text-3xl font-bold mt-1">{detailThp === null ? '-' : formatDetailCurrency(detailThp)}</p>
                    </div>
                  </div>
                </div>


                {selectedCalculation && (
                  <>
                    <PayrollPolicyDetail snapshot={selectedCalculation} appliedTax={selectedRecord.pph21}
                      workDays={selectedRecord.metadata?.proration?.work_days_per_week} />
                    <PayrollPaymentHold key={selectedRecord.id} record={selectedRecord} onUpdated={updated => {
                      setSelectedRecord(current => current?.id === updated.id ? updated : current);
                      setRecords(current => current.map(record => record.id === updated.id ? updated : record));
                    }} />
                  </>
                )}
                {/* Calculation Breakdown Table - Like Laravel */}
                {!selectedCalculation && (
                <div className="pw-breakdown-section ph-table-scroll pw-calculation-scroll">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">{t("Calculation Breakdown")} </h3>

                  <table className="w-full text-xs">
                    <tbody>
                      {/* BPJS Section */}
                      <tr className="pw-table-band">
                        <td colSpan={5} className="px-2 py-1.5 font-semibold pw-amount">{t("BPJS PAYMENT BY COMPANY")}</td>
                        <td colSpan={3} className="px-2 py-1.5 font-semibold pw-amount">{t("BPJS BY EMPLOYEE")}</td>
                        <td className="px-2 py-1.5 font-semibold pw-amount">{t("SUB TOTAL")}</td>
                        <td className="px-2 py-1.5 font-semibold pw-amount">{t("OBJECT PPH21")}</td>
                      </tr>
                      <tr className="pw-table-band text-center">
                        <td className="px-2 py-1 border-r pw-rule">{t("JHT")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("JKM")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("JKK")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("JKS")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("JP")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("JHT")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("JP")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("JKS")}</td>
                        <td className="px-2 py-1 border-r pw-rule">{t("BPJS")}</td>
                        <td className="px-2 py-1">{t("BPJS")}</td>
                      </tr>
                      <tr className="text-center text-gray-500">
                        <td className="px-2 py-0.5 border-r border-gray-200">3.70%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200">0.30%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200">0.24%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200">4.00%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200">2.00%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200">2.00%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200">1.00%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200">1.00%</td>
                        <td className="px-2 py-0.5 border-r border-gray-200"></td>
                        <td className="px-2 py-0.5"></td>
                      </tr>
                      <tr className="text-center font-medium">
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_jht_company || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_jkm_company || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_jkk_company || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_kes_company || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_jp_company || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_jht_employee || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_jp_employee || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.bpjs_kes_employee || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200 pw-amount font-bold">
                          {formatCurrency((Number(selectedRecord.bpjs_company_total) || 0) + (Number(selectedRecord.bpjs_employee_total) || 0))}
                        </td>
                        <td className="px-2 py-1.5 pw-amount font-bold">{formatCurrency(selectedRecord.bpjs_object_pph21 || 0)}</td>
                      </tr>

                      {/* Calculation Section */}
                      <tr className="pw-table-band">
                        <td colSpan={2} className="px-2 py-1.5 font-semibold pw-amount">{t("TOTAL GROSS")}</td>
                        <td colSpan={2} className="px-2 py-1.5 font-semibold pw-amount">{t("GROSS UP")}</td>
                        <td colSpan={2} className="px-2 py-1.5 font-semibold pw-amount">{t("GROSS UP FINAL")}</td>
                        <td className="px-2 py-1.5 font-semibold pw-amount">{t("GOL")}</td>
                        <td className="px-2 py-1.5 font-semibold pw-amount">{t("TER")}</td>
                        <td className="px-2 py-1.5 font-semibold pw-amount">{t("TER FINAL")}</td>
                        <td className="px-2 py-1.5 font-semibold pw-amount">{t("PPH21")}</td>
                      </tr>
                      <tr className="text-center font-medium">
                        <td colSpan={2} className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.total_gross ?? selectedRecord.gross_salary)}</td>
                        <td colSpan={2} className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.gross_up_initial || 0)}</td>
                        <td colSpan={2} className="px-2 py-1.5 border-r border-gray-200 pw-amount font-bold">{formatCurrency(selectedRecord.final_gross_up || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200 font-bold">{selectedRecord.ter_category || '-'}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{Number(((Number(selectedRecord.ter_rate_initial) || 0) * 100).toFixed(2)).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                        <td className="px-2 py-1.5 border-r border-gray-200 pw-amount">{Number(((Number(selectedRecord.ter_rate) || 0) * 100).toFixed(2)).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                        <td className="px-2 py-1.5 text-red-600 font-bold">{formatCurrency(selectedRecord.pph21)}</td>
                      </tr>

                      {/* Result Section */}
                      <tr className="pw-table-band">
                        <td colSpan={4} className="px-2 py-1.5 font-semibold pw-amount">{t("TAKE HOME PAY (THP)")}</td>
                        <td colSpan={3} className="px-2 py-1.5 font-semibold pw-amount">{t("TOTAL COST COMPANY")}</td>
                        <td colSpan={3} className="px-2 py-1.5 font-semibold pw-amount">{t("PTKP STATUS")}</td>
                      </tr>
                      <tr className="text-center font-bold">
                        <td colSpan={4} className="px-2 py-2 border-r border-gray-200 pw-amount text-base">
                          {detailThp === null ? '-' : formatDetailCurrency(detailThp)}
                        </td>
                        <td colSpan={3} className="px-2 py-2 border-r border-gray-200 pw-amount text-base" data-testid="payroll-detail-company-cost">
                          {detailCompanyCost === null ? '-' : formatCurrency(detailCompanyCost)}
                        </td>
                        <td colSpan={3} className="px-2 py-2 text-gray-700">
                          {selectedRecord.ptkp_status || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                )}

                <div className="pw-detail-columns">
                  {/* Left Column - Income */}
                  <div className="space-y-4">
                    {/* Basic Salary */}
                    <div className="pw-breakdown-section">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">{t("Penghasilan")} </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{t("Gaji Pokok")}</span>
                          <span className="font-medium text-gray-900">{formatDetailCurrency(selectedRecord.basic_salary)}</span>
                        </div>
                        {(selectedRecord.transport_allowance || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("Tunjangan Transport")}</span>
                            <span className="font-medium pw-amount">+{formatDetailCurrency(selectedRecord.transport_allowance)}</span>
                          </div>
                        )}
                        {(selectedRecord.meal_allowance || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("Tunjangan Makan")}</span>
                            <span className="font-medium pw-amount">+{formatDetailCurrency(selectedRecord.meal_allowance)}</span>
                          </div>
                        )}
                        {/* Saved Position = business Position + tax allowance. Split only
                            when the v2 snapshot recorded the tax allowance; otherwise the
                            combined saved amount is shown without inventing a split. */}
                        {positionSplit ? (<>
                          {positionSplit.business !== 0 && (
                            <div className="flex items-center justify-between text-sm" data-testid="payroll-position-business">
                              <span className="text-gray-600">{t("Tunjangan Jabatan")}</span>
                              <span className="font-medium pw-amount">+{formatDetailCurrency(positionSplit.business)}</span>
                            </div>
                          )}
                          {positionSplit.tax !== 0 && (
                            <div className="flex items-center justify-between text-sm" data-testid="payroll-position-tax">
                              <span className="text-gray-600">{t("Tunjangan pajak")}</span>
                              <span className="font-medium pw-amount">+{formatDetailCurrency(positionSplit.tax)}</span>
                            </div>
                          )}
                        </>) : (Number(selectedRecord.position_allowance) || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm" data-testid="payroll-position-combined">
                            <span className="text-gray-600">{t("Tunjangan Jabatan")}</span>
                            <span className="font-medium pw-amount">+{formatDetailCurrency(selectedRecord.position_allowance)}</span>
                          </div>
                        )}
                        {selectedRecord.allowances_detail && Array.isArray(selectedRecord.allowances_detail) && selectedRecord.allowances_detail.map((al: { name: string; amount: number }, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{al.name}</span>
                            <span className="font-medium pw-amount">+{formatDetailCurrency(al.amount)}</span>
                          </div>
                        ))}
                        {(selectedRecord.other_allowances || 0) > 0 && (!selectedRecord.allowances_detail || !Array.isArray(selectedRecord.allowances_detail) || selectedRecord.allowances_detail.length === 0) && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("Tunjangan Lainnya")}</span>
                            <span className="font-medium pw-amount">+{formatDetailCurrency(selectedRecord.other_allowances)}</span>
                          </div>
                        )}
                        {(selectedRecord.overtime_pay || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("Lembur (")}{payrollNumber(Number(selectedRecord.overtime_hours))}{' '}{t("jam)")}</span>
                            <span className="font-medium pw-amount">+{formatDetailCurrency(selectedRecord.overtime_pay)}</span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{t("Gross Salary")}</span>
                          <span className="text-lg font-bold text-gray-900">{formatDetailCurrency(selectedRecord.gross_salary)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prorate Info */}
                    {selectedRecord.is_prorated && (
                      <div className="bg-amber-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">{t("Prorate")} </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("Factor")}</span>
                            <span className="font-medium">{selectedRecord.prorate_factor != null && Number.isFinite(Number(selectedRecord.prorate_factor))
                              ? `${Number((Number(selectedRecord.prorate_factor) * 100).toFixed(2)).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                              : '-'}</span>
                          </div>
                          {selectedRecord.prorate_reason && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("Alasan")}</span>
                              <span className="font-medium">{selectedRecord.prorate_reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Deductions */}
                  <div className="space-y-4">
                    {/* Attendance Info */}
                    {(selectedRecord.working_days != null || selectedRecord.actual_working_days != null || !!selectedRecord.absent_days || !!selectedRecord.late_days) && (
                      <div className="pw-breakdown-section">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">{t("Info Kehadiran")} </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {selectedRecord.working_days != null && (
                            <div>
                              <span className="text-gray-500">{t("Hari Kerja")}</span>
                              <p className="font-medium">{payrollNumber(Number(selectedRecord.working_days))}{' '}{t("hari")}</p>
                            </div>
                          )}
                          {selectedRecord.actual_working_days != null && (
                            <div>
                              <span className="text-gray-500">{t("Hari Hadir")}</span>
                              <p className="font-medium">{selectedRecord.actual_working_days}{' '}{t("hari")}</p>
                            </div>
                          )}
                          {(selectedRecord.absent_days || 0) > 0 && (
                            <div>
                              <span className="text-gray-500">{t("Tidak Hadir")}</span>
                              <p className="font-medium text-red-600">{payrollNumber(Number(selectedRecord.absent_days))}{' '}{t("hari")}</p>
                            </div>
                          )}
                          {(selectedRecord.late_days || 0) > 0 && (
                            <div>
                              <span className="text-gray-500">{t("Terlambat")}</span>
                              <p className="font-medium pw-amount">{payrollNumber(Number(selectedRecord.late_days))}{' '}{t("hari")}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* BPJS */}
                    {selectedCalculation ? <PayrollSavedBPJS record={selectedRecord} /> : (
                    <div className="pw-breakdown-section">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">{t("BPJS (Karyawan)")} </h3>
                      {bpjsFunding === null ? (
                        <p className="text-sm text-gray-500" data-testid="payroll-funding-unrecorded">{t("Penanggung PPh21 dan BPJS karyawan tidak tercatat pada payroll ini.")}</p>
                      ) : bpjsFunding === 'company' ? (
                        /* Gross-up: company bears all employee BPJS via tunjangan;
                           raw bpjs_*_employee fields still hold computed amounts but
                           are NOT deducted from THP. Show "Ditanggung Perusahaan"
                           to keep card consistent with THP. */
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("BPJS Kesehatan (1%)")}</span>
                            <span className="font-medium text-gray-400 italic">{t("Ditanggung Perusahaan")}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("BPJS JHT (2%)")}</span>
                            <span className="font-medium text-gray-400 italic">{t("Ditanggung Perusahaan")}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("BPJS JP (1%)")}</span>
                            <span className="font-medium text-gray-400 italic">{t("Ditanggung Perusahaan")}</span>
                          </div>
                          <div className="border-t pw-rule pt-2 mt-2 flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{t("Total Potongan BPJS")}</span>
                            <span className="font-bold pw-amount">{t("Rp 0")}</span>
                          </div>
                          <p className="text-xs pw-amount mt-1">{t("* BPJS karyawan ditanggung perusahaan sesuai kebijakan payroll.")}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(selectedRecord.bpjs_kes_employee || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("BPJS Kesehatan (1%)")}</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.bpjs_kes_employee!)}</span>
                            </div>
                          )}
                          {(selectedRecord.bpjs_jht_employee || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("BPJS JHT (2%)")}</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.bpjs_jht_employee!)}</span>
                            </div>
                          )}
                          {(selectedRecord.bpjs_jp_employee || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("BPJS JP (1%)")}</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.bpjs_jp_employee!)}</span>
                            </div>
                          )}
                          <div className="border-t pw-rule pt-2 mt-2 flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{t("Total BPJS")}</span>
                            <span className="font-bold text-red-600">-{formatCurrency(selectedRecord.bpjs_employee_total || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    )}

                    {/* Tax */}
                    {!selectedCalculation && (
                    <div className="pw-breakdown-section">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">{t("PPh21")} </h3>
                      <div className="space-y-2">
                        {selectedRecord.ptkp_status && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("Status PTKP")}</span>
                            <span className="font-medium">{selectedRecord.ptkp_status}</span>
                          </div>
                        )}
                        {selectedRecord.ter_category && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("Kategori TER")}</span>
                            <span className="font-medium">{t("TER")} {selectedRecord.ter_category}</span>
                          </div>
                        )}
                        {/* Gross Up Iteration — shown for any payroll where company bears
                            PPh21 (Wave 6.5: PFI uses gross-up regardless of pay_type label) */}
                        {legacyCompanyBears && selectedRecord.gross_up_initial && (
                          <>
                            <div className="border-t pw-rule pt-2 mt-2">
                              <p className="text-xs font-semibold pw-amount mb-2">{t("Gross Up Calculation:")}</p>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{t("Gross Up Initial")}</span>
                                <span className="font-medium">{formatCurrency(selectedRecord.gross_up_initial)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{t("TER Rate Initial")}</span>
                                <span className="font-medium">{Number(((Number(selectedRecord.ter_rate_initial) || 0) * 100).toFixed(2)).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                              </div>
                              <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-600">{t("Gross Up Final")}</span>
                                <span className="font-medium pw-amount">{formatCurrency(selectedRecord.final_gross_up || 0)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{t("TER Rate Final")}</span>
                                <span className="font-medium pw-amount">{Number(((Number(selectedRecord.ter_rate) || 0) * 100).toFixed(2)).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                              </div>
                            </div>
                          </>
                        )}
                        {/* For pure GROSS (employee pays tax) — TER rate only, no iteration panel */}
                        {!legacyCompanyBears && selectedRecord.ter_rate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{t("TER Rate")}</span>
                            <span className="font-medium">{Number(((Number(selectedRecord.ter_rate) || 0) * 100).toFixed(2)).toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                          </div>
                        )}
                        <div className="border-t pw-rule pt-2 mt-2 flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{legacyCompanyBears ? t("PPh21 (Ditanggung Perusahaan)") : t("PPh21")}</span>
                          {legacyCompanyBears ? (
                            <span className="font-bold pw-amount">{t("Rp 0")}</span>
                          ) : pph21Funding === 'withheld' && presentation?.deductions.pph21 != null ? (
                            <span className="font-bold text-red-600">-{formatCurrency(presentation.deductions.pph21)}</span>
                          ) : (
                            /* Bearer not recorded: the saved PPh21 is not shown as a deduction. */
                            <span className="font-bold text-gray-500" data-testid="payroll-pph21-unrecorded">-</span>
                          )}
                        </div>
                        {legacyCompanyBears && (
                          <p className="text-xs pw-amount mt-1">{t("* Tunjangan Jabatan")} {formatCurrency(selectedRecord.pph21)}{' '}{t("= nilai PPh21 yang dibayar perusahaan (skema gross-up)")}</p>
                        )}
                      </div>
                    </div>

                    )}

                    {/* System deductions: shown whenever the saved system total is
                        positive (total_deductions holds only these; no comparison with
                        PPh21/BPJS, which are listed in their own cards). */}
                    {!selectedCalculation && detailSystemDeductions !== null && detailSystemDeductions > 0 && (
                      <div className="pw-breakdown-section" data-testid="payroll-system-deductions">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">{t("Potongan sistem (absen, telat, pinjaman, lainnya)")} </h3>
                        <div className="space-y-2">
                          {(selectedRecord.absence_deduction || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("Potongan Absen")}</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.absence_deduction!)}</span>
                            </div>
                          )}
                          {(selectedRecord.late_deduction || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("Potongan Telat")}</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.late_deduction!)}</span>
                            </div>
                          )}
                          {(selectedRecord.loan_deduction || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("Potongan Pinjaman")}</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.loan_deduction!)}</span>
                            </div>
                          )}
                          {(selectedRecord.other_deductions || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t("Potongan Lainnya")}</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.other_deductions!)}</span>
                            </div>
                          )}
                          <div className="border-t pw-rule pt-2 mt-2 flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{t("Total")}</span>
                            <span className="font-bold text-red-600" data-testid="payroll-system-deductions-total">-{formatCurrency(detailSystemDeductions)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BPJS Company */}
                {!selectedCalculation && (selectedRecord.bpjs_company_total ?? 0) > 0 && (
                  <div className="mt-4 pw-breakdown-section">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("BPJS (Ditanggung Perusahaan)")}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">{t("Kesehatan (4%)")}</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_kes_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t("JHT (3.7%)")}</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jht_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t("JP (2%)")}</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jp_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t("JKK")}</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jkk_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t("JKM")}</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jkm_company || 0)}</p>
                      </div>
                    </div>
                    {/* BPJS Object PPh21 (for NET pay type) */}
                    {selectedRecord.bpjs_object_pph21 && (
                      <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-sm">
                        <span className="text-gray-600">{t("BPJS Object PPh21")}</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.bpjs_object_pph21)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                      <span className="font-semibold">{t("Total Cost to Company")}</span>
                      <span className="font-bold pw-amount">{detailCompanyCost === null ? '-' : formatCurrency(detailCompanyCost)}</span>
                    </div>
                  </div>
                )}

        </div>
      </OperationalDialog>}
    </OperationalWorkspace>
  );
}
