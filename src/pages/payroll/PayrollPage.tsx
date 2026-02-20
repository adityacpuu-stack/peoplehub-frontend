import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { companyService, type Company } from '@/services/company.service';
import {
  payrollService,
  type Payroll,
  type PayrollSummary,
  type GeneratePayrollRequest,
  PAYROLL_STATUS,
} from '@/services/payroll.service';

const PAYROLL_COMPANY_KEY = 'payroll_selected_company';

export function PayrollPage() {
  const [records, setRecords] = useState<Payroll[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(() => {
    const saved = localStorage.getItem(PAYROLL_COMPANY_KEY);
    return saved ? Number(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'processing' | 'validation' | 'approved' | 'paid'>('processing');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<Payroll | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Period options (current month and 5 months back)
  const periodOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem(PAYROLL_COMPANY_KEY, String(selectedCompanyId));
      fetchPayrollData();
    }
  }, [selectedPeriod, selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getAll({ limit: 100 });
      setCompanies(response.data);
      if (response.data.length > 0) {
        // Check if saved company exists in list, otherwise use first
        const savedId = localStorage.getItem(PAYROLL_COMPANY_KEY);
        const savedCompany = savedId ? response.data.find(c => c.id === Number(savedId)) : null;
        if (savedCompany) {
          setSelectedCompanyId(savedCompany.id);
        } else {
          setSelectedCompanyId(response.data[0].id);
        }
      }
    } catch {
      toast.error('Gagal memuat data company');
    }
  };

  const fetchPayrollData = async () => {
    setIsLoading(true);
    try {
      const response = await payrollService.getAll({
        company_id: selectedCompanyId!,
        period: selectedPeriod,
        limit: 500, // Get all for this period
      });
      // Filter out freelance/internship (separate page)
      // Include active and resigned employees (resigned employees with payroll in this period are valid)
      const permanentRecords = response.data.filter(
        record =>
          !['freelance', 'internship'].includes(record.employee.employment_type || '') &&
          ['active', 'resigned'].includes(record.employee.employment_status || '')
      );
      setRecords(permanentRecords);
    } catch {
      toast.error('Gagal memuat data payroll');
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatCurrency = (amount: number) => payrollService.formatCurrency(amount);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const handleViewDetail = async (record: Payroll) => {
    // Fetch full detail from API (includes all BPJS breakdown and gross up fields)
    try {
      const detail = await payrollService.getById(record.id);
      setSelectedRecord(detail);
      setShowDetailModal(true);
    } catch (error) {
      // Fallback to list data if fetch fails
      setSelectedRecord(record);
      setShowDetailModal(true);
      toast.error('Gagal memuat detail lengkap');
    }
  };

  // Generate payroll for company
  const handleGeneratePayroll = async () => {
    if (!selectedCompanyId) return;

    setIsGenerating(true);
    try {
      const request: GeneratePayrollRequest = {
        company_id: selectedCompanyId,
        period: selectedPeriod,
      };
      const result = await payrollService.generate(request);

      if (result.generated > 0) {
        toast.success(`${result.generated} payroll berhasil digenerate`);
        fetchPayrollData();
      }
      if (result.errors > 0) {
        toast.error(`${result.errors} payroll gagal digenerate`);
      }
      setShowGenerateModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal generate payroll');
    } finally {
      setIsGenerating(false);
    }
  };

  // Validate payroll
  const handleValidate = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.validate(id);
      toast.success('Payroll berhasil divalidasi');
      fetchPayrollData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memvalidasi payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit payroll
  const handleSubmit = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.submit(id);
      toast.success('Payroll berhasil disubmit');
      fetchPayrollData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal submit payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve payroll
  const handleApprove = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.approve(id);
      toast.success('Payroll berhasil diapprove');
      fetchPayrollData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal approve payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark as paid
  const handleMarkAsPaid = async (id: number) => {
    setIsProcessing(true);
    try {
      await payrollService.markAsPaid(id);
      toast.success('Payroll berhasil dibayar');
      fetchPayrollData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membayar payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch validate
  const handleBatchValidate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal 1 payroll');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.validateBatch(selectedIds);
      toast.success(`${result.success} payroll berhasil divalidasi`);
      if (result.failed > 0) {
        toast.error(`${result.failed} payroll gagal divalidasi`);
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error('Gagal memvalidasi payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch submit (validated -> submitted)
  const handleBatchSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal 1 payroll');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.submitBatch(selectedIds);
      toast.success(`${result.success} payroll berhasil disubmit`);
      if (result.failed > 0) {
        toast.error(`${result.failed} payroll gagal disubmit`);
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error('Gagal submit payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch approve (submitted -> approved)
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal 1 payroll');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.approveBatch(selectedIds);
      toast.success(`${result.success} payroll berhasil diapprove`);
      if (result.failed > 0) {
        toast.error(`${result.failed} payroll gagal diapprove`);
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error('Gagal approve payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch mark as paid
  const handleBatchMarkAsPaid = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal 1 payroll');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await payrollService.markAsPaidBatch(selectedIds);
      toast.success(`${result.success} payroll berhasil dibayar`);
      if (result.failed > 0) {
        toast.error(`${result.failed} payroll gagal dibayar`);
      }
      setSelectedIds([]);
      fetchPayrollData();
    } catch {
      toast.error('Gagal membayar payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export payroll data to Excel (matching PFI template)
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (exportAll: boolean = false) => {
    if (!exportAll && !selectedCompanyId) {
      toast.error('Pilih company terlebih dahulu');
      return;
    }

    // Check if there are approved or paid payrolls
    if (tabCounts.approved === 0 && tabCounts.paid === 0) {
      toast.error('Tidak ada payroll dengan status Approved/Paid. Approve payroll terlebih dahulu sebelum export.');
      return;
    }

    setShowExportMenu(false);

    setIsExporting(true);
    try {
      // Pass null for all companies, or selectedCompanyId for single company
      const companyIdToExport = exportAll ? null : selectedCompanyId;
      await payrollService.exportExcel(companyIdToExport, selectedPeriod);
      toast.success(exportAll
        ? 'Data payroll semua company berhasil diekspor ke Excel'
        : 'Data payroll berhasil diekspor ke Excel'
      );
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengekspor data');
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
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  // Get action button based on status
  const getActionButton = (record: Payroll) => {
    switch (record.status) {
      case PAYROLL_STATUS.DRAFT:
      case PAYROLL_STATUS.PROCESSING:
        return (
          <button
            onClick={() => handleValidate(record.id)}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            Validasi
          </button>
        );
      case PAYROLL_STATUS.VALIDATED:
        return (
          <button
            onClick={() => handleSubmit(record.id)}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Submit
          </button>
        );
      case PAYROLL_STATUS.SUBMITTED:
        return (
          <button
            onClick={() => handleApprove(record.id)}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        );
      case PAYROLL_STATUS.APPROVED:
        return (
          <button
            onClick={() => handleMarkAsPaid(record.id)}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Bayar
          </button>
        );
      case PAYROLL_STATUS.PAID:
        return (
          <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">
            Selesai
          </span>
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
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
            Draft
          </span>
        );
      case PAYROLL_STATUS.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Processing
          </span>
        );
      case PAYROLL_STATUS.VALIDATED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validated
          </span>
        );
      case PAYROLL_STATUS.SUBMITTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Submitted
          </span>
        );
      case PAYROLL_STATUS.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approved
          </span>
        );
      case PAYROLL_STATUS.PAID:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Paid
          </span>
        );
      case PAYROLL_STATUS.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Payroll Management
                  </h1>
                  <p className="text-purple-100 text-sm mt-1">
                    {selectedCompany ? (
                      <>Proses payroll - <span className="font-semibold">{selectedCompany.name}</span></>
                    ) : (
                      'Pilih company untuk memulai'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {summary.total_employees} Karyawan
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatCurrency(summary.total_net)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Company Selector */}
              <div className="relative">
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-medium cursor-pointer min-w-[200px]"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id} className="text-gray-900">
                      {company.name}
                    </option>
                  ))}
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Period Selector */}
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-medium cursor-pointer"
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="text-gray-900">{opt.label}</option>
                  ))}
                </select>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Export Dropdown - Only enabled when there are approved payrolls */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isExporting || (tabCounts.approved === 0 && tabCounts.paid === 0)}
                  title={tabCounts.approved === 0 && tabCounts.paid === 0 ? 'Approve payroll terlebih dahulu' : 'Export Excel'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[101]">
                      <button
                        onClick={() => handleExport(false)}
                        disabled={!selectedCompanyId}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div>
                          <div className="font-medium">Export Company Ini</div>
                          <div className="text-xs text-gray-500">{selectedCompany?.name || 'Pilih company dulu'}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleExport(true)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="font-medium text-green-700">Export Semua Company</div>
                          <div className="text-xs text-gray-500">PFI Groups (sorted by PFI first)</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-700 rounded-xl hover:bg-purple-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Generate Payroll</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-500">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{summary.total_employees}</p>
          <p className="text-sm text-gray-500">Total Karyawan</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{summary.pending_count}</p>
          <p className="text-sm text-gray-500">Perlu Diproses</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Done
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{summary.paid_count}</p>
          <p className="text-sm text-gray-500">Sudah Dibayar</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-500">IDR</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(summary.total_gross)}
          </p>
          <p className="text-sm text-gray-500">Total Gross</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'processing', label: 'Processing', count: tabCounts.processing },
              { id: 'validation', label: 'Validation', count: tabCounts.validation },
              { id: 'approved', label: 'Approved', count: tabCounts.approved },
              { id: 'paid', label: 'Paid', count: tabCounts.paid },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                    activeTab === tab.id ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Batch Actions */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Batch Actions based on active tab */}
            <div className="flex items-center gap-2">
              {activeTab === 'processing' && selectedIds.length > 0 && (
                <button
                  onClick={handleBatchValidate}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Validasi ({selectedIds.length})
                </button>
              )}

              {activeTab === 'validation' && selectedCounts.validated > 0 && (
                <button
                  onClick={handleBatchSubmit}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Submit ({selectedCounts.validated})
                </button>
              )}

              {activeTab === 'validation' && selectedCounts.submitted > 0 && (
                <button
                  onClick={handleBatchApprove}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Approve ({selectedCounts.submitted})
                </button>
              )}

              {activeTab === 'approved' && selectedIds.length > 0 && (
                <button
                  onClick={handleBatchMarkAsPaid}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                  Bayar ({selectedIds.length})
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                Company: <span className="font-semibold text-gray-900">{selectedCompany?.name || '-'}</span>
              </span>
              <span className="text-gray-300">|</span>
              <span>
                Periode: <span className="font-semibold text-gray-900">{formatPeriod(selectedPeriod)}</span>
              </span>
            </div>
            {filteredRecords.length > 0 && (
              <span className="text-sm text-gray-500">
                {selectedIds.length > 0 && (
                  <span className="text-purple-600 font-medium">{selectedIds.length} dipilih dari </span>
                )}
                {filteredRecords.length} data
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {!selectedCompanyId ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Pilih Company</h3>
              <p className="mt-1 text-gray-500">Pilih company terlebih dahulu untuk melihat data payroll.</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-gray-500">Memuat data payroll...</p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Tidak ada data</h3>
              <p className="mt-1 text-gray-500">
                {records.length === 0
                  ? 'Belum ada payroll untuk periode ini. Klik "Generate Payroll" untuk memulai.'
                  : 'Tidak ada data payroll untuk filter ini.'}
              </p>
              {records.length === 0 && (
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generate Payroll
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {activeTab !== 'paid' && (
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </th>
                  )}
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Karyawan</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gaji Pokok</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">BPJS</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">PPh21</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Take Home Pay</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map(record => (
                  <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(record.id) ? 'bg-purple-50' : ''}`}>
                    {activeTab !== 'paid' && (
                      <td className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelection(record.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm bg-gradient-to-br from-purple-500 to-indigo-600">
                          {record.employee.name.charAt(0)}
                        </div>
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
                      <p className="font-medium text-gray-900">{formatCurrency(record.basic_salary)}</p>
                      <p className="text-xs text-gray-500">{record.pay_type === 'gross' ? 'Gross' : 'Nett'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(record.bpjs_employee_total || 0) > 0 ? (
                        <p className="font-medium text-red-600">-{formatCurrency(record.bpjs_employee_total || 0)}</p>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(record.pph21 || 0) > 0 ? (
                        <>
                          <p className="font-medium text-orange-600">-{formatCurrency(record.pph21)}</p>
                          {record.ter_category && (
                            <p className="text-xs text-gray-500">TER {record.ter_category}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900 text-lg">{formatCurrency(record.take_home_pay || record.net_salary)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Lihat Detail"
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
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowGenerateModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Generate Payroll</h2>
                      <p className="text-purple-100 text-sm">Buat payroll untuk periode ini</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 font-medium">
                      {selectedCompany?.name || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Periode</label>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 font-medium">
                      {formatPeriod(selectedPeriod)}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-800">Perhatian</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Sistem akan menghitung payroll untuk semua karyawan aktif dengan status employment "active".
                          Kalkulasi meliputi BPJS, PPh21, dan prorate jika ada.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleGeneratePayroll}
                    disabled={isGenerating}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 px-6 py-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                      {selectedRecord.employee.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedRecord.employee.name}</h2>
                      <p className="text-purple-100 text-sm">
                        {selectedRecord.employee.employee_id}
                        {selectedRecord.employee.position && ` • ${selectedRecord.employee.position.name}`}
                      </p>
                      <p className="text-purple-200 text-xs mt-1">
                        {selectedRecord.employee.department?.name} • {selectedCompany?.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-sm text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Periode: {formatPeriod(selectedRecord.period)}
                  </span>
                  {getStatusBadge(selectedRecord.status)}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedRecord.pay_type === 'gross' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedRecord.pay_type?.toUpperCase() || 'GROSS'}
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
                {/* Calculation Breakdown Table - Like Laravel */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 overflow-x-auto">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Calculation Breakdown
                  </h3>

                  <table className="w-full text-xs">
                    <tbody>
                      {/* BPJS Section */}
                      <tr className="bg-blue-100">
                        <td colSpan={5} className="px-2 py-1.5 font-semibold text-blue-800">BPJS PAYMENT BY COMPANY</td>
                        <td colSpan={3} className="px-2 py-1.5 font-semibold text-blue-800">BPJS BY EMPLOYEE</td>
                        <td className="px-2 py-1.5 font-semibold text-blue-800">SUB TOTAL</td>
                        <td className="px-2 py-1.5 font-semibold text-blue-800">OBJECT PPH21</td>
                      </tr>
                      <tr className="bg-blue-50 text-center">
                        <td className="px-2 py-1 border-r border-blue-200">JHT</td>
                        <td className="px-2 py-1 border-r border-blue-200">JKM</td>
                        <td className="px-2 py-1 border-r border-blue-200">JKK</td>
                        <td className="px-2 py-1 border-r border-blue-200">JKS</td>
                        <td className="px-2 py-1 border-r border-blue-200">JP</td>
                        <td className="px-2 py-1 border-r border-blue-200">JHT</td>
                        <td className="px-2 py-1 border-r border-blue-200">JP</td>
                        <td className="px-2 py-1 border-r border-blue-200">JKS</td>
                        <td className="px-2 py-1 border-r border-blue-200">BPJS</td>
                        <td className="px-2 py-1">BPJS</td>
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
                        <td className="px-2 py-1.5 border-r border-gray-200 text-blue-700 font-bold">
                          {formatCurrency((Number(selectedRecord.bpjs_company_total) || 0) + (Number(selectedRecord.bpjs_employee_total) || 0))}
                        </td>
                        <td className="px-2 py-1.5 text-purple-700 font-bold">{formatCurrency(selectedRecord.bpjs_object_pph21 || 0)}</td>
                      </tr>

                      {/* Calculation Section */}
                      <tr className="bg-orange-100">
                        <td colSpan={2} className="px-2 py-1.5 font-semibold text-orange-800">TOTAL GROSS</td>
                        <td colSpan={2} className="px-2 py-1.5 font-semibold text-orange-800">GROSS UP</td>
                        <td colSpan={2} className="px-2 py-1.5 font-semibold text-orange-800">GROSS UP FINAL</td>
                        <td className="px-2 py-1.5 font-semibold text-orange-800">GOL</td>
                        <td className="px-2 py-1.5 font-semibold text-orange-800">TER</td>
                        <td className="px-2 py-1.5 font-semibold text-orange-800">TER FINAL</td>
                        <td className="px-2 py-1.5 font-semibold text-orange-800">PPH21</td>
                      </tr>
                      <tr className="text-center font-medium">
                        <td colSpan={2} className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.total_gross || selectedRecord.gross_salary)}</td>
                        <td colSpan={2} className="px-2 py-1.5 border-r border-gray-200">{formatCurrency(selectedRecord.gross_up_initial || 0)}</td>
                        <td colSpan={2} className="px-2 py-1.5 border-r border-gray-200 text-orange-700 font-bold">{formatCurrency(selectedRecord.final_gross_up || 0)}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200 font-bold">{selectedRecord.ter_category || '-'}</td>
                        <td className="px-2 py-1.5 border-r border-gray-200">{((Number(selectedRecord.ter_rate_initial) || 0) * 100).toFixed(2)}%</td>
                        <td className="px-2 py-1.5 border-r border-gray-200 text-orange-700">{((Number(selectedRecord.ter_rate) || 0) * 100).toFixed(2)}%</td>
                        <td className="px-2 py-1.5 text-red-600 font-bold">{formatCurrency(selectedRecord.pph21)}</td>
                      </tr>

                      {/* Result Section */}
                      <tr className="bg-green-100">
                        <td colSpan={4} className="px-2 py-1.5 font-semibold text-green-800">TAKE HOME PAY (THP)</td>
                        <td colSpan={3} className="px-2 py-1.5 font-semibold text-green-800">TOTAL COST COMPANY</td>
                        <td colSpan={3} className="px-2 py-1.5 font-semibold text-green-800">PTKP STATUS</td>
                      </tr>
                      <tr className="text-center font-bold">
                        <td colSpan={4} className="px-2 py-2 border-r border-gray-200 text-green-700 text-base">
                          {formatCurrency(selectedRecord.thp || selectedRecord.take_home_pay || selectedRecord.net_salary)}
                        </td>
                        <td colSpan={3} className="px-2 py-2 border-r border-gray-200 text-purple-700 text-base">
                          {formatCurrency(selectedRecord.total_cost_company || selectedRecord.total_cost_to_company || 0)}
                        </td>
                        <td colSpan={3} className="px-2 py-2 text-gray-700">
                          {selectedRecord.ptkp_status || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Income */}
                  <div className="space-y-4">
                    {/* Basic Salary */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        Penghasilan
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Gaji Pokok</span>
                          <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.basic_salary)}</span>
                        </div>
                        {(selectedRecord.transport_allowance || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tunjangan Transport</span>
                            <span className="font-medium text-green-600">+{formatCurrency(selectedRecord.transport_allowance!)}</span>
                          </div>
                        )}
                        {(selectedRecord.meal_allowance || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tunjangan Makan</span>
                            <span className="font-medium text-green-600">+{formatCurrency(selectedRecord.meal_allowance!)}</span>
                          </div>
                        )}
                        {(selectedRecord.position_allowance || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tunjangan Jabatan</span>
                            <span className="font-medium text-green-600">+{formatCurrency(selectedRecord.position_allowance!)}</span>
                          </div>
                        )}
                        {selectedRecord.allowances_detail && Array.isArray(selectedRecord.allowances_detail) && selectedRecord.allowances_detail.map((al: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{al.name}</span>
                            <span className="font-medium text-green-600">+{formatCurrency(al.amount)}</span>
                          </div>
                        ))}
                        {(selectedRecord.other_allowances || 0) > 0 && (!selectedRecord.allowances_detail || !Array.isArray(selectedRecord.allowances_detail) || selectedRecord.allowances_detail.length === 0) && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tunjangan Lainnya</span>
                            <span className="font-medium text-green-600">+{formatCurrency(selectedRecord.other_allowances!)}</span>
                          </div>
                        )}
                        {(selectedRecord.overtime_pay || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Lembur ({selectedRecord.overtime_hours} jam)</span>
                            <span className="font-medium text-green-600">+{formatCurrency(selectedRecord.overtime_pay!)}</span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between">
                          <span className="font-semibold text-gray-900">Gross Salary</span>
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedRecord.gross_salary)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Prorate Info */}
                    {selectedRecord.is_prorated && (
                      <div className="bg-amber-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          Prorate
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Factor</span>
                            <span className="font-medium">{((selectedRecord.prorate_factor || 1) * 100).toFixed(2)}%</span>
                          </div>
                          {selectedRecord.prorate_reason && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Alasan</span>
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
                    {(selectedRecord.working_days || selectedRecord.absent_days || selectedRecord.late_days) && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          Info Kehadiran
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {selectedRecord.working_days && (
                            <div>
                              <span className="text-gray-500">Hari Kerja</span>
                              <p className="font-medium">{selectedRecord.working_days} hari</p>
                            </div>
                          )}
                          {selectedRecord.actual_working_days && (
                            <div>
                              <span className="text-gray-500">Hari Hadir</span>
                              <p className="font-medium">{selectedRecord.actual_working_days} hari</p>
                            </div>
                          )}
                          {(selectedRecord.absent_days || 0) > 0 && (
                            <div>
                              <span className="text-gray-500">Tidak Hadir</span>
                              <p className="font-medium text-red-600">{selectedRecord.absent_days} hari</p>
                            </div>
                          )}
                          {(selectedRecord.late_days || 0) > 0 && (
                            <div>
                              <span className="text-gray-500">Terlambat</span>
                              <p className="font-medium text-orange-600">{selectedRecord.late_days} hari</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* BPJS */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        BPJS (Karyawan)
                      </h3>
                      <div className="space-y-2">
                        {(selectedRecord.bpjs_kes_employee || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">BPJS Kesehatan (1%)</span>
                            <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.bpjs_kes_employee!)}</span>
                          </div>
                        )}
                        {(selectedRecord.bpjs_jht_employee || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">BPJS JHT (2%)</span>
                            <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.bpjs_jht_employee!)}</span>
                          </div>
                        )}
                        {(selectedRecord.bpjs_jp_employee || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">BPJS JP (1%)</span>
                            <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.bpjs_jp_employee!)}</span>
                          </div>
                        )}
                        <div className="border-t border-blue-200 pt-2 mt-2 flex items-center justify-between">
                          <span className="font-semibold text-gray-900">Total BPJS</span>
                          <span className="font-bold text-red-600">-{formatCurrency(selectedRecord.bpjs_employee_total || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tax */}
                    <div className="bg-orange-50 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                          </svg>
                        </div>
                        PPh21
                      </h3>
                      <div className="space-y-2">
                        {selectedRecord.ptkp_status && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Status PTKP</span>
                            <span className="font-medium">{selectedRecord.ptkp_status}</span>
                          </div>
                        )}
                        {selectedRecord.ter_category && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Kategori TER</span>
                            <span className="font-medium">TER {selectedRecord.ter_category}</span>
                          </div>
                        )}
                        {/* Gross Up Iteration (for NET/NETT pay type) */}
                        {(selectedRecord.pay_type === 'net' || selectedRecord.pay_type === 'gross_up') && selectedRecord.gross_up_initial && (
                          <>
                            <div className="border-t border-orange-200 pt-2 mt-2">
                              <p className="text-xs font-semibold text-orange-700 mb-2">Gross Up Calculation:</p>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Gross Up Initial</span>
                                <span className="font-medium">{formatCurrency(selectedRecord.gross_up_initial)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">TER Rate Initial</span>
                                <span className="font-medium">{((Number(selectedRecord.ter_rate_initial) || 0) * 100).toFixed(2)}%</span>
                              </div>
                              <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-600">Gross Up Final</span>
                                <span className="font-medium text-orange-700">{formatCurrency(selectedRecord.final_gross_up || 0)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">TER Rate Final</span>
                                <span className="font-medium text-orange-700">{((Number(selectedRecord.ter_rate) || 0) * 100).toFixed(2)}%</span>
                              </div>
                            </div>
                          </>
                        )}
                        {/* For GROSS pay type, show simple TER rate */}
                        {selectedRecord.pay_type === 'gross' && selectedRecord.ter_rate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">TER Rate</span>
                            <span className="font-medium">{((Number(selectedRecord.ter_rate) || 0) * 100).toFixed(2)}%</span>
                          </div>
                        )}
                        <div className="border-t border-orange-200 pt-2 mt-2 flex items-center justify-between">
                          <span className="font-semibold text-gray-900">PPh21</span>
                          <span className="font-bold text-red-600">-{formatCurrency(selectedRecord.pph21)}</span>
                        </div>
                        {selectedRecord.pph21_paid_by_company && (
                          <p className="text-xs text-orange-600 mt-1">* Ditanggung perusahaan</p>
                        )}
                      </div>
                    </div>

                    {/* Other Deductions */}
                    {(selectedRecord.total_deductions || 0) > (selectedRecord.bpjs_employee_total || 0) + (selectedRecord.pph21 || 0) && (
                      <div className="bg-red-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          Potongan Lain
                        </h3>
                        <div className="space-y-2">
                          {(selectedRecord.absence_deduction || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Potongan Absen</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.absence_deduction!)}</span>
                            </div>
                          )}
                          {(selectedRecord.late_deduction || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Potongan Telat</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.late_deduction!)}</span>
                            </div>
                          )}
                          {(selectedRecord.loan_deduction || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Potongan Pinjaman</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.loan_deduction!)}</span>
                            </div>
                          )}
                          {(selectedRecord.other_deductions || 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Potongan Lainnya</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedRecord.other_deductions!)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-purple-100 text-sm">Total Potongan</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(selectedRecord.total_deductions)}</p>
                    </div>
                    <div className="text-center border-x border-white/20">
                      <p className="text-purple-100 text-sm">
                        {(selectedRecord.pay_type === 'net' || selectedRecord.pay_type === 'gross_up') ? 'Gross Up Final' : 'Net Salary'}
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(
                          (selectedRecord.pay_type === 'net' || selectedRecord.pay_type === 'gross_up')
                            ? (selectedRecord.final_gross_up || selectedRecord.gross_salary)
                            : selectedRecord.net_salary
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-100 text-sm">Take Home Pay</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(selectedRecord.thp || selectedRecord.take_home_pay || selectedRecord.net_salary)}</p>
                    </div>
                  </div>
                </div>

                {/* BPJS Company */}
                {(selectedRecord.bpjs_company_total || 0) > 0 && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">BPJS (Ditanggung Perusahaan)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Kesehatan (4%)</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_kes_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">JHT (3.7%)</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jht_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">JP (2%)</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jp_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">JKK</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jkk_company || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">JKM</p>
                        <p className="font-medium">{formatCurrency(selectedRecord.bpjs_jkm_company || 0)}</p>
                      </div>
                    </div>
                    {/* BPJS Object PPh21 (for NET pay type) */}
                    {selectedRecord.bpjs_object_pph21 && (
                      <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-sm">
                        <span className="text-gray-600">BPJS Object PPh21</span>
                        <span className="font-medium">{formatCurrency(selectedRecord.bpjs_object_pph21)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                      <span className="font-semibold">Total Cost to Company</span>
                      <span className="font-bold text-purple-600">{formatCurrency(selectedRecord.total_cost_company || selectedRecord.total_cost_to_company || 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
