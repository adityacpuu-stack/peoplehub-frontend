import { insightNumber, insightFixed } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { Modal } from '@/components/ui/Modal';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { useState, useEffect, useRef } from 'react';
import { Calendar, Download, AlertCircle, Search, Eye, FileText, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
import { PageSpinner } from '@/components/ui';
import { payrollService, type Payroll, type PayrollEarningKey } from '@/services/payroll.service';
import { savedThp, signedDeduction, sumSavedThp } from '@/components/payroll/saved-payroll';
import { collectPages } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { get label() { return t('Draft'); }, color: 'text-gray-600', bg: 'bg-gray-100' },
  processing: { get label() { return t('Processing'); }, color: 'text-blue-600', bg: 'bg-blue-100' },
  validated: { get label() { return t('Validated'); }, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  submitted: { get label() { return t('Submitted'); }, color: 'text-amber-600', bg: 'bg-amber-100' },
  approved: { get label() { return t('Approved'); }, color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { get label() { return t('Rejected'); }, color: 'text-red-600', bg: 'bg-red-100' },
  paid: { get label() { return t('Paid'); }, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  cancelled: { get label() { return t('Cancelled'); }, color: 'text-gray-500', bg: 'bg-gray-100' },
};

// Labels for the backend presentation's saved earning lines.
const earningLabels: Record<PayrollEarningKey, string> = {
  basic_salary: 'Gaji Pokok', position_allowance: 'Tunjangan Jabatan',
  position_allowance_unsplit: 'Tunjangan Jabatan (gabungan tersimpan)', tax_allowance: 'Tunjangan pajak',
  transport_allowance: 'Tunjangan Transport', meal_allowance: 'Tunjangan Makan', overtime_pay: 'Lembur',
  other_allowances: 'Tunjangan Lainnya', thr: 'THR', bonus: 'Bonus',
  incentive: 'Insentif', commission: 'Komisi', back_pay: 'Rapel',
};

export function CEOPayrollReportPage() {
  useLocale();
  const authUser = useAuthStore(state => state.user);
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
  const [slip, setSlip] = useState<Payroll | null>(null);
  const [slipError, setSlipError] = useState(false);
  const slipRequest = useRef(0);
  const [sortField, setSortField] = useState<'name' | 'gross' | 'net' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Operational reports use backend-authorized companies, not the account
  // holder's personal employee company (which can be outside that assignment).
  const userCompanyName = 'Perusahaan dalam cakupan akses Anda';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Every page of the period; one limit=1000 request could truncate it.
      const rows = await collectPages((page, limit) => payrollService.getAll({ period: selectedPeriod, page, limit }));

      setPayrolls(rows);
      setFilteredPayrolls(rows);
    } catch (err: any) {
      console.error('Failed to fetch payroll data:', err);
      setError('Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  // Filter and sort payrolls
  useEffect(() => {
    let result = [...payrolls];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.employee?.name?.toLowerCase().includes(query) ||
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
          comparison = (a.employee?.name || '').localeCompare(b.employee?.name || '');
          break;
        case 'gross':
          comparison = (Number(a.gross_salary) || 0) - (Number(b.gross_salary) || 0);
          break;
        case 'net':
          comparison = (savedThp(a) ?? -Infinity) - (savedThp(b) ?? -Infinity) || 0;
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
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp ${insightFixed((value / 1000000000), 1)}${t('billion short')}`;
    }
    if (value >= 1000000) {
      return `Rp ${insightFixed((value / 1000000), 0)}${t('million short')}`;
    }
    return formatCurrency(value);
  };

  // Deductions, company contributions and earnings are the backend's saved read
  // presentation (what the saved result withheld); never re-derived here.
  const money = (value: number | null | undefined) => value == null ? '-' : formatCurrency(value);
  const openPayslip = async (row: Payroll) => {
    const request = ++slipRequest.current;
    setSelectedPayroll(row);
    setSlip(null);
    setSlipError(false);
    try {
      // List rows carry no earning components; the slip reads the saved detail.
      const detail = await payrollService.getById(row.id);
      if (request === slipRequest.current) setSlip(detail);
    } catch {
      if (request === slipRequest.current) setSlipError(true);
    }
  };
  const closePayslip = () => { slipRequest.current++; setSelectedPayroll(null); setSlip(null); setSlipError(false); };
  const slipView = slip?.presentation ?? null;

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
    return { value, label };
  });

  // Get unique departments
  const departments = [...new Set(payrolls.map((p) => p.employee?.department?.name).filter(Boolean))];

  // Calculate summary stats
  const totalGross = payrolls.reduce((sum, p) => sum + (Number(p.gross_salary) || 0), 0);
  // Saved take-home pay (take_home_pay, then thp); rows without one are counted.
  const { total: totalNet, missing: missingThp } = sumSavedThp(payrolls);
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
      await payrollService.exportExcel(null, selectedPeriod);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
  useLocale();
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Failed to load payroll data")}</h3>
          <p className="text-gray-600 mb-4">{t(error)}</p>
          <button onClick={() => fetchData()} className="ph-button ph-button-primary px-4 py-2 rounded-lg">{t("Retry")} </button>
        </div>
      </div>
    );
  }

  return (
    <ReportPage>{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl md:text-2xl font-bold">{t("Payroll Report")}</h1><p className="text-xs md:text-sm mt-1">{t('Perusahaan dalam cakupan akses Anda')}{' '}{t("- Detail per Karyawan")}</p></div>
<div className="report-header-context">{canAction(authUser, 'payroll.export') && <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-indigo-700 rounded-md text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />{t("Export Excel")} </button>}</div>
</ReportHeader>{/* Summary Stats */}<ReportSummary><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-value">{insightNumber(totalEmployees)}</p>
              <p className="report-metric-label">{t("Total Karyawan")}</p>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-value">{formatCompactCurrency(totalNet)}</p>
              <p className="report-metric-label">{t("Total Net Salary")}</p>
              {missingThp > 0 && <p className="text-xs text-gray-500">{t('{count} payroll tanpa THP tersimpan tidak dijumlahkan', { count: missingThp })}</p>}
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-value">{insightNumber(paidCount)}</p>
              <p className="report-metric-label">{t("Sudah Dibayar")}</p>
            </div></div></div><div className="report-metric"><div  className="report-metric-context"><div>
              <p className="report-metric-value">{insightNumber(pendingCount)}</p>
              <p className="report-metric-label">{t("Pending")}</p>
            </div></div></div></ReportSummary>{/* Filters */}<ReportSection><div className="report-filters">
          {/* Period */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 report-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("Cari nama, NIK, atau posisi...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t("Semua Status")}</option>
            <option value="draft">{t("Draft")}</option>
            <option value="validated">{t("Validated")}</option>
            <option value="approved">{t("Approved")}</option>
            <option value="paid">{t("Paid")}</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t("Semua Department")}</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div></ReportSection>{/* Employee Payroll Table */}<ReportSection  className="overflow-hidden"><section  className="report-inline-note"><div className="flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{t("Daftar Slip Gaji Karyawan")}</h3>
              <p className="text-xs text-gray-500 mt-1">{t("Menampilkan")} {insightNumber(filteredPayrolls.length)}{' '}{t("dari")} {insightNumber(payrolls.length)}{' '}{t("karyawan")} </p>
            </div>
          </div></section><div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">{t("Karyawan")} <SortIcon field="name" />
                  </div>
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">{t("Department")} </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('gross')}
                >
                  <div className="flex items-center justify-end gap-1">{t("Gross")} <SortIcon field="gross" />
                  </div>
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">{t("Potongan")} </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('net')}
                >
                  <div className="flex items-center justify-end gap-1">{t("Net")} <SortIcon field="net" />
                  </div>
                </th>
                <th
                  className="text-center px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-1">{t("Status")} <SortIcon field="status" />
                  </div>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">{t("Aksi")} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((payroll) => {
                  const status = statusConfig[payroll.status || 'draft'];
                  const totalDeductions = payroll.presentation?.deductions.total ?? null;

                  return (
                    <tr key={payroll.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm report-avatar">
                            {payroll.employee?.name
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .substring(0, 2) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {payroll.employee?.name || t('Unknown')}
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
                          {totalDeductions === null ? '-' : `-${formatCurrency(totalDeductions)}`}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="font-bold text-gray-900 text-sm">
                          {money(savedThp(payroll))}
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
                          onClick={() => void openPayslip(payroll)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />{t("Detail")} </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("Tidak ada data")}</h3>
                    <p className="text-gray-500">
                      {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all'
                        ? t("Coba ubah filter pencarian")
                        : t("Tidak ada data payroll untuk periode ini")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table></div></ReportSection>{/* Payslip Detail Modal */}{selectedPayroll && (
        <Modal isOpen onClose={closePayslip} title={t("Slip Gaji")} description={periodOptions.find((p) => p.value === selectedPeriod)?.label} size="lg" className="report-payslip-dialog executive-dialog">


            <div className="admin-dialog-content">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-14 h-14 rounded-md flex items-center justify-center font-bold text-lg report-avatar">
                  {selectedPayroll.employee?.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2) || '?'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedPayroll.employee?.name}</h4>
                  <p className="text-sm text-gray-500">
                    {selectedPayroll.employee?.employee_id} • {selectedPayroll.employee?.position?.name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedPayroll.employee?.department?.name}</p>
                </div>
              </div>

              {/* The slip renders the saved detail's backend read presentation:
                  same earnings, deductions and company contributions as the payroll
                  detail and exports. Nothing is recomputed or defaulted to 0. */}
              {slipError ? (
                <p className="text-sm text-red-600" role="alert">{t("Gagal memuat detail payroll. Coba lagi.")}</p>
              ) : !slip || !slipView ? (
                <p className="text-sm text-gray-500">{t("Memuat...")}</p>
              ) : (<>
              {/* Earnings */}
              <section className="ph-section" data-testid="payslip-earnings"><h5 className="text-sm font-semibold text-gray-700 mb-3">{t("Pendapatan")}</h5>
                <div className="space-y-2">
                  {(slipView.earnings?.items ?? []).filter(item => item.key === 'basic_salary' || item.amount !== 0).map(item => (
                    <div key={item.key} className="flex justify-between text-sm" data-testid={`payslip-earning-${item.key}`}>
                      <span className="text-gray-600">{t(earningLabels[item.key])}</span>
                      <span className="font-medium text-gray-900">{money(item.amount)}</span>
                    </div>
                  ))}
                  {/* A saved total not explained by the saved lines is shown, not hidden. */}
                  {slipView.earnings?.unreconciled != null && slipView.earnings.unreconciled !== 0 && (
                    <div className="flex justify-between text-sm" data-testid="payslip-earnings-unreconciled">
                      <span className="text-amber-700">{t("Selisih komponen tersimpan")}</span>
                      <span className="font-medium text-amber-700">{money(slipView.earnings.unreconciled)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-700">{t("Total Pendapatan Tunai")}</span>
                    <span className="font-bold text-gray-900" data-testid="payslip-earnings-total">{money(slipView.earnings?.total)}</span>
                  </div>
                  {/* DPP is the tax base (includes the BPJS object), not money paid. */}
                  <div className="flex justify-between text-xs text-gray-500" data-testid="payslip-taxable-base">
                    <span>{t("Dasar pengenaan pajak (DPP)")} · {t("Bukan pendapatan tunai; termasuk objek BPJS.")}</span>
                    <span>{money(slipView.taxable_base)}</span>
                  </div>
                </div>
              </section>

              {/* Deductions */}
              <section className="ph-section"><h5 className="text-sm font-semibold text-gray-700 mb-3">{t("Potongan")}</h5>
                <div className="space-y-2">
                  {slipView.deductions.pph21 !== null && slipView.deductions.pph21 !== 0 && (
                    <div className="flex justify-between text-sm" data-testid="payslip-deduction-pph21">
                      <span className="text-gray-600">{slipView.annual_tax ? t("PPh 21 masa pajak terakhir (tahunan)") : t("PPh 21")}
                        {slipView.deductions.pph21 < 0 && <> · {t("refund kelebihan potong")}</>}</span>
                      <span className={`font-medium ${slipView.deductions.pph21 < 0 ? 'text-emerald-600' : 'text-red-600'}`}>{signedDeduction(slipView.deductions.pph21, formatCurrency)}</span>
                    </div>
                  )}
                  {slipView.deductions.bpjs_employee !== null && slipView.deductions.bpjs_employee > 0 && (
                    <div className="flex justify-between text-sm" data-testid="payslip-deduction-bpjs">
                      <span className="text-gray-600">{t("BPJS Karyawan")}</span>
                      <span className="font-medium text-red-600">-{money(slipView.deductions.bpjs_employee)}</span>
                    </div>
                  )}
                  {slipView.deductions.system !== null && slipView.deductions.system > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t("Potongan Lain")}</span>
                      <span className="font-medium text-red-600">-{money(slipView.deductions.system)}</span>
                    </div>
                  )}
                  {slipView.funding.pph21 === null && (
                    <p className="text-xs text-gray-500" data-testid="payslip-funding-unrecorded">{t("Penanggung PPh21 dan BPJS karyawan tidak tercatat pada payroll ini.")}</p>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-700">{t("Total Potongan")}</span>
                    <span className="font-bold text-red-600" data-testid="payslip-deduction-total">
                      {slipView.deductions.total === null ? '-' : signedDeduction(slipView.deductions.total, formatCurrency)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Company Contribution: employer BPJS plus what the saved result shows the company bore. */}
              {[slipView.company_borne.bpjs_company, slipView.company_borne.pph21, slipView.company_borne.bpjs_employee].some(v => v !== null && v !== 0) && (
                <section className="ph-section"><h5 className="text-sm font-semibold text-gray-700 mb-3">{t("Kontribusi Perusahaan")}</h5>
                  <div className="space-y-2">
                    {slipView.company_borne.bpjs_company !== null && slipView.company_borne.bpjs_company !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("BPJS Perusahaan")}</span>
                        <span className="font-medium text-emerald-600">{money(slipView.company_borne.bpjs_company)}</span>
                      </div>
                    )}
                    {slipView.company_borne.pph21 !== null && slipView.company_borne.pph21 !== 0 && (
                      <div className="flex justify-between text-sm" data-testid="payslip-company-pph21">
                        <span className="text-gray-600">{slipView.funding.pph21 === 'company_paid' ? t("PPh21 (Ditanggung Perusahaan)") : t("Tunjangan pajak")}</span>
                        <span className="font-medium text-emerald-600">{money(slipView.company_borne.pph21)}</span>
                      </div>
                    )}
                    {slipView.company_borne.bpjs_employee !== null && slipView.company_borne.bpjs_employee !== 0 && (
                      <div className="flex justify-between text-sm" data-testid="payslip-company-bpjs">
                        <span className="text-gray-600">{t("BPJS Karyawan")} · {t("Ditanggung Perusahaan")}</span>
                        <span className="font-medium text-emerald-600">{money(slipView.company_borne.bpjs_employee)}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Net Salary */}
              <section  className="report-inline-note"><div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-700">{t("Take Home Pay")}</span>
                  <span className="text-2xl font-bold text-emerald-600" data-testid="payslip-thp">{money(slipView.take_home_pay)}</span>
                </div></section>
              </>)}

              {/* Status */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">{t("Status Pembayaran")}</span>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    statusConfig[selectedPayroll.status || "draft"].bg
                  } ${statusConfig[selectedPayroll.status || "draft"].color}`}
                >
                  {statusConfig[selectedPayroll.status || 'draft'].label}
                </span>
              </div>
            </div>
          <div className="ph-dialog-footer"><button type="button" className="ph-button" onClick={closePayslip}>{t("Tutup")}</button></div>
</Modal>
      )}</ReportPage>
  );
}
