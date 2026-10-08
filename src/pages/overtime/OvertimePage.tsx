import { payrollNumber } from '@/components/payroll/localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { useDomainConfirmation } from '@/pages/leave/useDomainConfirmation';
import '@/pages/leave/domain-workflows.css';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { Plus, Eye, Check, X, Loader2, RefreshCw, Calendar } from 'lucide-react';
import { overtimeService } from '../../services/overtime.service';
import type { Overtime, OvertimeListQuery } from '../../services/overtime.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { payrollSettingService } from '../../services/payroll-setting.service';
import { CompensationWorkspace, CompensationStatus, CompensationEmpty, CompensationDialog, CompensationEmployeeSelect } from '@/components/compensation/CompensationWorkspace';
import { collectPages } from '@/services/master-data';
import './overtime.css';

/**
 * Bounds for the Total Hours field, which takes a monthly accumulated figure
 * rather than a single session. Declared once because the same numbers drive the
 * input's own min/max (the browser's native validation, which is what the user
 * actually sees rejected), the submit-time check, and the toast text — as three
 * separate literals, raising the cap in one place left the others enforcing the old
 * one.
 */
const MIN_OVERTIME_HOURS = 0.01;
const MAX_OVERTIME_HOURS = 300;

// Helper to calculate period dates based on cut-off
const calculatePeriodDates = (period: string, cutoffDate: number = 20): { start: string; end: string } => {
  const [year, month] = period.split('-').map(Number);
  const startCutoff = cutoffDate + 1;

  // Period start: startCutoff of previous month
  const periodStart = new Date(year, month - 2, startCutoff);
  // Period end: cutoffDate of current month
  const periodEnd = new Date(year, month - 1, cutoffDate);

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    start: formatDate(periodStart),
    end: formatDate(periodEnd),
  };
};

// Generate period options (current month and 11 months back)
const generatePeriodOptions = (): { value: string; label: string }[] => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }

  return options;
};

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employee_id: string;
  basic_salary?: number;
  company_id?: number;
  department?: {
    id: number;
    name: string;
  };
}

export function OvertimePage() {
  useLocale();
  const { requestDecision, decisionDialog } = useDomainConfirmation('compensation-refresh-dialog ot-decision');
  const user = useAuthStore(state => state.user);
  // Match backend requireHRStaffOrHigher / requireManagerOrHigher.
  const canManage = user?.roles.some(role => ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff'].includes(role)) ?? false;
  const canApprove = canManage || (user?.roles.some(role => ['Tax Staff', 'Manager'].includes(role)) ?? false);
  // Data state
  const dataRequest = useRef(0);
  const employeeRequest = useRef(0);
  const cutoffRequest = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [companiesError, setCompaniesError] = useState(false);
  const [employeesError, setEmployeesError] = useState(false);
  useEffect(() => () => { dataRequest.current++; employeeRequest.current++; cutoffRequest.current++; }, []);
  const [requests, setRequests] = useState<Overtime[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [cutoffDate, setCutoffDate] = useState<number>(20);
  const periodOptions = generatePeriodOptions();

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<Overtime | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    company_id: '',
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    rate_multiplier: '1.0',
    reason: '',
    description: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Fetch cutoff date when company changes
  const fetchCutoffDate = useCallback(async (companyId: number) => {
    const request = ++cutoffRequest.current;
    try {
      const settings = await payrollSettingService.getByCompany(companyId);
      if (request === cutoffRequest.current) setCutoffDate(settings.payroll_cutoff_date || 20);
    } catch {
      if (request === cutoffRequest.current) setCutoffDate(20); // Default to 20 if no settings
    }
  }, []);

  // Fetch data
  const fetchOvertimes = useCallback(async () => {
    const request = ++dataRequest.current;
    setLoadError(false);
    try {
      setLoading(true);

      // Calculate period date range
      const { start, end } = calculatePeriodDates(filterPeriod, cutoffDate);

      const query: OvertimeListQuery = {
        page,
        limit,
        sort_by: 'date',
        sort_order: 'desc',
        start_date: start,
        end_date: end,
      };

      if (filterStatus !== 'all') query.status = filterStatus;
      if (filterType !== 'all') query.overtime_type = filterType;
      if (filterCompany !== 'all') query.company_id = Number(filterCompany);

      const response = await overtimeService.list(query);
      if (request !== dataRequest.current) return;
      setRequests(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      if (request !== dataRequest.current) return;
      setLoadError(true);
      setRequests([]);
      console.error('Failed to fetch overtimes:', error);
    } finally {
      if (request === dataRequest.current) setLoading(false);
    }
  }, [page, filterStatus, filterType, filterCompany, filterPeriod, cutoffDate]);

  const fetchCompanies = useCallback(async () => {
    try {
      setCompaniesError(false);
      const rows = await collectPages((page, limit) => companyService.getAll({ page, limit }));
      setCompanies(rows);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompaniesError(true);
    }
  }, []);

  const fetchEmployees = useCallback(async (companyId?: number) => {
    const request = ++employeeRequest.current;
    setEmployeesError(false);
    setEmployees([]);
    if (!companyId) {
      if (request === employeeRequest.current) setEmployeesLoading(false);
      setEmployees([]);
      return;
    }
    setEmployeesLoading(true);
    try {
      const rows = await collectPages((page, limit) => employeeService.getAll({ page, limit, company_id: companyId, employment_status: 'all' }));
      if (request !== employeeRequest.current) return;
      setEmployees(rows.filter(emp => emp.employment_status === 'active' || emp.employment_status === 'resigned') as Employee[]);
    } catch (error) {
      if (request !== employeeRequest.current) return;
      setEmployeesError(true);
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    } finally {
      if (request === employeeRequest.current) setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOvertimes();
  }, [fetchOvertimes]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch cutoff date when company filter changes
  useEffect(() => {
    if (filterCompany !== 'all') {
      fetchCutoffDate(Number(filterCompany));
    } else {
      cutoffRequest.current++;
      setCutoffDate(20); // Reset to default when "All Companies"
    }
  }, [filterCompany, fetchCutoffDate]);

  // Filter requests locally for search
  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    return requests.filter(request => {
      const matchSearch =
        request.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
        request.employee?.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        request.employee?.department?.name?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [requests, search]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: total,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      totalHours: requests.filter(r => r.status === 'approved').reduce((acc, r) => acc + Number(r.hours || 0), 0),
      totalAmount: requests.filter(r => r.status === 'approved').reduce((acc, r) => acc + Number(r.total_amount || 0), 0),
    };
  }, [requests, total]);

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      await overtimeService.approve(id);
      toast.success(t("Overtime request approved"));
      fetchOvertimes();
      setShowDetailModal(false);
    } catch (error) {
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Failed to approve'), { id: 'api-error', ...(showDetailModal ? { toasterId: 'compensation-dialog' } : {}) });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = (await requestDecision({ title: () => t('Reject overtime'), message: () => t('The reason will be recorded with this rejection.'), confirmLabel: () => t('Reject'), reasonLabel: () => t('Please enter rejection reason:') }));
    if (!reason) return;

    try {
      setActionLoading(id);
      await overtimeService.reject(id, { rejection_reason: reason });
      toast.success(t("Overtime request rejected"));
      fetchOvertimes();
      setShowDetailModal(false);
    } catch (error) {
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Failed to reject'), { id: 'api-error', ...(showDetailModal ? { toasterId: 'compensation-dialog' } : {}) });
    } finally {
      setActionLoading(null);
    }
  };

  // Match createForEmployee: retain the fractional hourly rate and round only the total.
  const calculateOvertimeAmount = useCallback(() => {
    if (!selectedEmployee?.basic_salary || !formData.hours) return 0;
    const hourlyRate = selectedEmployee.basic_salary / 173;
    const hours = parseFloat(formData.hours) || 0;
    const multiplier = parseFloat(formData.rate_multiplier) || 1;
    return Math.round(hours * hourlyRate * multiplier * 100) / 100;
  }, [selectedEmployee, formData.hours, formData.rate_multiplier]);

  const getHourlyRate = useCallback(() => {
    if (!selectedEmployee?.basic_salary) return 0;
    return selectedEmployee.basic_salary / 173;
  }, [selectedEmployee]);

  const handleCompanyChange = (companyId: string) => {
    setFormData(prev => ({ ...prev, company_id: companyId, employee_id: '' }));
    setSelectedEmployee(null);
    if (companyId) {
      fetchEmployees(Number(companyId));
    } else {
      setEmployees([]);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setFormData(prev => ({ ...prev, employee_id: employeeId }));
    const emp = employees.find(e => e.id === Number(employeeId));
    setSelectedEmployee(emp || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.date || !formData.hours || !formData.reason) {
      toast.error(t("Please fill in required fields"), { id: 'api-error', toasterId: 'compensation-dialog' });
      return;
    }

    const hours = parseFloat(formData.hours);
    if (hours < MIN_OVERTIME_HOURS || hours > MAX_OVERTIME_HOURS) {
      toast.error(t("Hours must be between {value0} and {value1}", { value0: payrollNumber(MIN_OVERTIME_HOURS), value1: payrollNumber(MAX_OVERTIME_HOURS) }), { id: 'api-error', toasterId: 'compensation-dialog' });
      return;
    }

    try {
      setFormLoading(true);
      await overtimeService.createForEmployee({
        employee_id: Number(formData.employee_id),
        date: formData.date,
        hours: parseFloat(formData.hours), // Send hours directly
        rate_multiplier: parseFloat(formData.rate_multiplier),
        reason: formData.reason,
        task_description: formData.description,
        overtime_type: formData.rate_multiplier === '2.0' ? 'weekend' : formData.rate_multiplier === '3.0' ? 'holiday' : 'regular',
      });
      toast.success(t("Overtime submitted. Approval is required before payroll."));
      setShowAddModal(false);
      setFormData({
        company_id: '',
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        rate_multiplier: '1.0',
        reason: '',
        description: '',
      });
      setSelectedEmployee(null);
      setEmployees([]);
      fetchOvertimes();
    } catch (error) {
      toast.error((isAxiosError(error) ? error.response?.data?.message : undefined) || t('Failed to create overtime'), { id: 'api-error', toasterId: 'compensation-dialog' });
    } finally {
      setFormLoading(false);
    }
  };

  const getTypeBadge = (type: Overtime['overtime_type'], rateMultiplier?: number) => {
    // Show the ACTUAL stored multiplier — not the type-based default — so the
    // badge matches what was entered (e.g. an entry saved at 1x must not read
    // "1.5x"). Falls back to the type default only when no multiplier is set.
    const multiplier = Number(rateMultiplier ?? overtimeService.getMultiplier(type));
    switch (type) {
      case 'regular':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">{t("Weekday (")}{multiplier.toLocaleString(intlLocale())}{t("x)")}</span>;
      case 'weekend':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">{t("Weekend (")}{payrollNumber(Number(multiplier))}{t("x)")}</span>;
      case 'holiday':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">{t("Holiday (")}{payrollNumber(Number(multiplier))}{t("x)")}</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">{type}</span>;
    }
  };

  const formatCurrency = (amount: number, maximumFractionDigits = 0) => {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    // Handle both ISO datetime and time-only formats
    if (timeStr.includes('T')) {
      return new Date(timeStr).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr;
  };

  return (
    <div className="ot-page">
      <CompensationWorkspace title={t("Overtime")} description={t("Pantau lembur karyawan dan status persetujuan per periode payroll.")}
        actions={<><button className="cp-button" disabled={loading} onClick={fetchOvertimes}><RefreshCw size={16} />{t("Refresh")}</button>{canManage && <button className="cp-button cp-primary" onClick={() => setShowAddModal(true)}><Plus size={17} />{t("Add Overtime")}</button>}</>}
        filters={<>
          <label className="cp-field">{t("company")}<select aria-label={t("Filter company")} value={filterCompany} onChange={event => { setFilterCompany(event.target.value); setPage(1); }}><option value="all">{t("Semua company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            {companiesError && <p className="cp-filter-error" role="alert">{t("Daftar company gagal dimuat.")} <button onClick={fetchCompanies}>{t("Coba lagi")}</button></p>}
          <label className="cp-field">{t("periode")}<select aria-label={t("Filter periode")} value={filterPeriod} onChange={event => { setFilterPeriod(event.target.value); setPage(1); }}>{periodOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="cp-field">{t("status")}<select aria-label={t("Filter status")} value={filterStatus} onChange={event => { setFilterStatus(event.target.value); setPage(1); }}><option value="all">{t("Semua status")}</option><option value="pending">{t("Pending")}</option><option value="approved">{t("Approved")}</option><option value="rejected">{t("Rejected")}</option><option value="cancelled">{t("Cancelled")}</option></select></label>
          <label className="cp-field">{t("tipe")}<select aria-label={t("Filter tipe")} value={filterType} onChange={event => { setFilterType(event.target.value); setPage(1); }}><option value="all">{t("Semua tipe")}</option><option value="regular">{t("Weekday")}</option><option value="weekend">{t("Weekend")}</option><option value="holiday">{t("Holiday")}</option></select></label>
          <button className="cp-reset" onClick={() => { setSearch(''); setFilterCompany('all'); setFilterStatus('all'); setFilterType('all'); setFilterPeriod(periodOptions[0].value); setPage(1); }}>{t("Reset filter")}</button>
          <div className="cp-period"><Calendar size={17} /><strong>{t("Rentang periode")}</strong><span>{formatDate(calculatePeriodDates(filterPeriod, cutoffDate).start)}{' '}{t("s.d.")} {formatDate(calculatePeriodDates(filterPeriod, cutoffDate).end)}</span><small>{t("Cutoff tanggal")} {payrollNumber(Number(cutoffDate))}</small></div>
        </>}
        metrics={[
          { label: t('Pengajuan ditemukan'), value: payrollNumber(total), note: t('Sesuai periode dan filter') },
          { label: t('Menunggu persetujuan'), value: payrollNumber(stats.pending), note: t('Pada halaman ini') },
          { label: t('Lembur disetujui'), value: formatCurrency(stats.totalAmount), note: t("{value0} jam pada halaman ini", { value0: Number(stats.totalHours.toFixed(1)).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) },
        ]}
        search={search} onSearch={setSearch} searchLabel={t("Cari karyawan pada halaman ini…")}
        loading={loading} error={loadError} onRetry={fetchOvertimes}
        page={page} totalPages={totalPages} onPage={setPage} count={t("{value0} ditampilkan · {value1} pengajuan", { value0: payrollNumber(filteredRequests.length), value1: payrollNumber(total) })}>
        {!filteredRequests.length ? <CompensationEmpty /> : <table className="cp-table"><thead><tr><th>{t("Karyawan")}</th><th>{t("Tanggal / Jenis")}</th><th>{t("Duration")}</th><th className="cp-money">{t("Total Amount")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
          <tbody>{filteredRequests.map(request => <tr key={request.id}>
            <td><div className="ot-identity"><strong>{request.employee?.name || t('Karyawan')}</strong><small>{request.employee?.employee_id}</small><small>{request.employee?.department?.name || '—'}{request.company?.name && <> · {request.company.name}</>}</small></div></td>
            <td data-label={t("Tanggal / Jenis")}><strong>{formatDate(request.date)}</strong><small>{formatTime(request.start_time)} – {formatTime(request.end_time)}</small><div className="cp-type">{getTypeBadge(request.overtime_type, request.rate_multiplier)}</div></td>
            <td data-label={t("Duration")} className="ot-hours"><strong>{Number(request.hours || 0).toLocaleString(intlLocale(), { maximumFractionDigits: 2 })} {t("hours")}</strong><small>{t("Multiplier")}: {Number(request.rate_multiplier ?? 1).toLocaleString(intlLocale())}×</small></td>
            <td data-label={t("Total Amount")} className="cp-money"><strong>{formatCurrency(Number(request.total_amount || 0))}</strong><small>{t("Hourly Rate")}: {formatCurrency(Number(request.rate_per_hour || 0))}</small></td>
            <td data-label={t("Status")}><CompensationStatus status={request.status} /></td>
            <td className="cp-row-actions"><div className="ot-row-actions"><button className="cp-icon-button" aria-label={t("Detail overtime {value0}", { value0: request.id })} onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}><Eye size={17} /></button>
              {canApprove && request.status === 'pending' && <><button className="cp-icon-button" aria-label={t("Approve overtime {value0}", { value0: request.id })} disabled={actionLoading === request.id} onClick={() => handleApprove(request.id)}><Check size={17} /></button><button className="cp-icon-button cp-danger" aria-label={t("Reject overtime {value0}", { value0: request.id })} disabled={actionLoading === request.id} onClick={() => handleReject(request.id)}><X size={17} /></button></>}</div></td>
          </tr>)}</tbody></table>}
      </CompensationWorkspace>
      {showDetailModal && selectedRequest && <CompensationDialog title={t("Overtime Detail")} subtitle={selectedRequest.employee?.name} busy={actionLoading != null} onClose={() => setShowDetailModal(false)}>
        <div className="cp-detail ph-workflow dw-detail dw-fields ot-detail">
                <dl className="ph-kv dw-detail-grid">
                  <div>
                    <dt>{t("Employee ID")}</dt>
                    <dd>{selectedRequest.employee?.employee_id}</dd>
                  </div>
                  <div>
                    <dt>{t("Department")}</dt>
                    <dd>{selectedRequest.employee?.department?.name || '-'}</dd>
                  </div>
                  <div>
                    <dt>{t("Company")}</dt>
                    <dd>{selectedRequest.company?.name || '-'}</dd>
                  </div>
                  <div>
                    <dt>{t("Status")}</dt>
                    <dd><CompensationStatus status={selectedRequest.status} /></dd>
                  </div>
                </dl>

                <div className="dw-section">
                  <dl className="ph-kv dw-detail-grid">
                    <div>
                      <dt>{t("Date")}</dt>
                      <dd>{formatDate(selectedRequest.date)}</dd>
                    </div>
                    <div>
                      <dt>{t("Time")}</dt>
                      <dd>
                        {formatTime(selectedRequest.start_time)} - {formatTime(selectedRequest.end_time)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Duration")}</dt>
                      <dd>{parseFloat(Number(selectedRequest.hours || 0).toFixed(2)).toLocaleString(intlLocale(), { maximumFractionDigits: 2 })}{' '}{t("hours")}</dd>
                    </div>
                    <div>
                      <dt>{t("Type")}</dt>
                      <dd>{getTypeBadge(selectedRequest.overtime_type, selectedRequest.rate_multiplier)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="dw-section">
                  <p className="text-xs text-gray-500 mb-1">{t("Reason")}</p>
                  <p className="ot-notes">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.task_description && <div className="dw-section"><p className="text-xs text-gray-500 mb-1">{t("Additional Details (Optional)")}</p><p className="ot-notes">{selectedRequest.task_description}</p></div>}

                <div className="dw-section ot-calculation">
                  <h3>{t("Calculation")}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("Hourly Rate")}</span>
                      <span className="font-medium">{formatCurrency(selectedRequest.rate_per_hour || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("Hours × Multiplier")}</span>
                      <span className="font-medium">{parseFloat(Number(selectedRequest.hours || 0).toFixed(2)).toLocaleString(intlLocale(), { maximumFractionDigits: 2 })}{' '}{t("×")} {Number(selectedRequest.rate_multiplier).toLocaleString(intlLocale())}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">{t("Total Amount")}</span>
                      <span className="font-bold text-green-800">{formatCurrency(selectedRequest.total_amount || 0)}</span>
                    </div>
                  </div>
                </div>

                {selectedRequest.approver && (
                  <div className="dw-section">
                    <p className="text-xs text-gray-500 mb-1">{t("Approved By")}</p>
                    <p className="font-medium text-gray-900">{selectedRequest.approver.name}</p>
                    {selectedRequest.approved_at && (
                      <p className="text-xs text-gray-500">{new Date(selectedRequest.approved_at).toLocaleString(intlLocale())}</p>
                    )}
                  </div>
                )}

                {selectedRequest.rejection_reason && (
                  <div className="dw-section">
                    <p className="text-xs text-gray-500 mb-1">{t("Rejection Reason")}</p>
                    <p className="text-red-600">{selectedRequest.rejection_reason}</p>
                  </div>
                )}

                {canApprove && selectedRequest.status === 'pending' && (
                  <div className="ph-form-actions dw-actions">
                    <button
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={actionLoading === selectedRequest.id}
                      className="ph-button"
                    >{t("Reject")} </button>
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={actionLoading === selectedRequest.id}
                      className="ph-button ph-button-primary"
                    >
                      {actionLoading === selectedRequest.id ? t("Processing...") : t("Approve")}
                    </button>
                  </div>
                )}
              </div>
      </CompensationDialog>}
      {showAddModal && canManage && <CompensationDialog title={t("Add Overtime Record")} subtitle={t("Pengajuan perlu disetujui sebelum masuk payroll.")} busy={formLoading} onClose={() => setShowAddModal(false)}>
        {employeesError && <p className="cp-form-error" role="alert">{t("Daftar karyawan gagal dimuat.")} <button type="button" onClick={() => fetchEmployees(formData.company_id ? Number(formData.company_id) : undefined)}>{t("Coba lagi")}</button></p>}
        <form onSubmit={handleSubmit} className="ph-workflow dw-form ot-form"><div className="dw-form-content"><section className="ph-section dw-section">
                  <div className="flex items-center gap-3 mb-4">

                    <h3 className="font-semibold text-gray-900">{t("Select Employee")}</h3>
                  </div>

                  <div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Company")} <span className="text-red-500">*</span>
                      </label>
                      <select aria-label={t("Company *")}
                        value={formData.company_id}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                        required
                      >
                        <option value="">{t("Choose Company")}</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Employee")} <span className="text-red-500">*</span>
                      </label>
                      <CompensationEmployeeSelect
                        options={employees.map(emp => ({
                          value: emp.id,
                          label: emp.name,
                          sublabel: emp.employee_id,
                        }))}
                        value={formData.employee_id ? Number(formData.employee_id) : ''}
                        onChange={(val) => handleEmployeeChange(String(val))}
                        placeholder={!formData.company_id ? t("Select company first") : t("Search employee...")}
                        searchPlaceholder={t("Type name or ID...")}
                        disabled={!formData.company_id || employeesLoading}
                        loading={employeesLoading}
                        emptyMessage={t("No employees found")}
                      />
                    </div>
                  </div>

                  {/* Employee Info Display */}
                  {selectedEmployee && (
                    <div className="dw-context">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-900">{t("Employee Selected")}</p>
                          <p className="text-xs text-green-700 mt-1">
                            <strong>{selectedEmployee.name}</strong>{' '}{t("- Basic Salary:")} {formatCurrency(selectedEmployee.basic_salary || 0)}{' '}{t("- Hourly Rate:")} {formatCurrency(getHourlyRate(), 2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
<section className="ph-section dw-section">
                  <div className="flex items-center gap-3 mb-4">

                    <h3 className="font-semibold text-gray-900">{t("Overtime Details")}</h3>
                  </div>

                  <div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Date")} <span className="text-red-500">*</span>
                      </label>
                      <input aria-label={t("Date *")}
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">{t("Select date within payroll period")}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Total Hours")} <span className="text-red-500">*</span>
                      </label>
                      <input aria-label={t("Total Hours *")}
                        type="number"
                        step="0.01"
                        min={MIN_OVERTIME_HOURS}
                        max={MAX_OVERTIME_HOURS}
                        value={formData.hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                        placeholder={t("e.g., 54")}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">{t("Monthly total or accumulated hours")}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Multiplier")}</label>
                      <select aria-label={t("Multiplier")}
                        value={formData.rate_multiplier}
                        onChange={(e) => setFormData(prev => ({ ...prev, rate_multiplier: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                      >
                        <option value="1.0">{t("1.0x (Normal)")}</option>
                        <option value="1.5">{t("1.5x (Weekday)")}</option>
                        <option value="2.0">{t("2.0x (Weekend)")}</option>
                        <option value="3.0">{t("3.0x (Holiday)")}</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">{t("Default: 1.0x (normal rate)")}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("Estimated Total")}</label>
                      <div className="dw-inline ot-estimate">
                        <span className="dw-money">
                          {formatCurrency(calculateOvertimeAmount(), 2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{t("Auto-calculated")}</p>
                    </div>
                  </div>
                </section>
<section className="ph-section dw-section"><h3>{t("Reason & notes")}</h3><div className="dw-fields"><div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Reason")} <span className="text-red-500">*</span>
                    </label>
                    <textarea aria-label={t("Reason *")}
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                      rows={2}
                      placeholder={t("e.g., Project deadline completion")}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("Additional Details (Optional)")} </label>
                    <textarea aria-label={t("Additional Details (Optional)")}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                      rows={2}
                      placeholder={t("Add any additional information if needed")}
                    />
                  </div>
                </div></div></section></div><div className="ph-form-actions dw-actions">
                  <button
                    type="button"
                    disabled={formLoading}
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedEmployee(null);
                      setEmployees([]);
                      setFormData({
                        company_id: '',
                        employee_id: '',
                        date: new Date().toISOString().split('T')[0],
                        hours: '',
                        rate_multiplier: '1.0',
                        reason: '',
                        description: '',
                      });
                    }}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    type="submit"
                    disabled={formLoading || !selectedEmployee}
                    className="ph-button ph-button-primary"
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />{t("Creating...")} </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />{t("Submit for Approval")} </>
                    )}
                  </button>
                </div></form>
      </CompensationDialog>}
    {decisionDialog}
</div>
  );
}
