import { quantity } from '@/components/leave/presentation';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/leave/domain-workflows.css';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { collectPages } from '@/services/master-data';
import api from '@/services/api';
import './leave-workspace.css';
import './leave-refresh.css';
import { Calendar, Search, Eye, XCircle, Clock, Download, ChevronLeft, ChevronRight, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LeaveDocumentDownload } from '@/components/leave/LeaveDocumentDownload';
import { leaveService } from '../../services/leave.service';
import { companyService } from '../../services/company.service';
import { toNum } from '@/lib/utils';
import type { LeaveRequest, LeaveType, PaginatedResponse } from '@/types';

interface Company {
  id: number;
  name: string;
}

/**
 * Working days the backend charged for an existing request. Holidays are
 * company-scoped and live only on the server (calculateLeaveDaysWithHolidays),
 * so a stored request's duration is read from total_days, never recomputed.
 */
const chargedDays = (leave: LeaveRequest): number => toNum(leave.total_days);

const chargedDaysLabel = (leave: LeaveRequest): string => {
  // total_days is nullable, and Number(null) is 0 — which would print a
  // confident "0 days" for a row that simply has no stored total. Check for
  // absence before coercing.
  if (leave.total_days == null) return '-';
  const n = toNum(leave.total_days, NaN);
  return Number.isFinite(n) ? n.toLocaleString(intlLocale(), { maximumFractionDigits: 20 }) : '-';
};

export function LeaveRequestsPage() {
  useLocale();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<(LeaveType & { company_id?: number | null })[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [optionError, setOptionError] = useState(false);
  const requestSequence = useRef(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Fetch leaves from API
  const fetchLeaves = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setLoadError(false);
    try {
      const params: {
        page: number;
        limit: number;
        company_id?: number;
        status?: string;
        leave_type_id?: number;
      } = { page, limit };

      if (filterCompany !== 'all') {
        params.company_id = Number(filterCompany);
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterLeaveType !== 'all') {
        params.leave_type_id = Number(filterLeaveType);
      }

      const response = await leaveService.getAll(params);
      if (sequence !== requestSequence.current) return;
      setLeaves(response.data);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total ?? response.data.length);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setLeaves([]); setLoadError(true);
      console.error('Failed to fetch leaves:', error);
      // Shared id: the axios interceptor toasts under 'api-error' too, so the
      // page-level message replaces it instead of stacking a second toast.
      toast.error(t("Failed to load leave requests"), { id: 'api-error' });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [page, filterCompany, filterStatus, filterLeaveType]);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const types = await collectPages(async (page, limit) =>
        (await api.get<PaginatedResponse<LeaveType>>('/leaves/types', { params: { page, limit } })).data);
      setLeaveTypes(types);
    } catch (error) {
      setOptionError(true);
      console.error('Failed to fetch leave types:', error);
    }
  }, []);

  // Fetch companies (lightweight options for filter dropdown).
  const fetchCompanies = useCallback(async () => {
    try {
      setCompanies(await collectPages((page, limit) => companyService.getAll({ page, limit })));
    } catch (error) {
      setOptionError(true);
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchLeaveTypes();
  }, [fetchCompanies, fetchLeaveTypes]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterCompany, filterLeaveType]);

  // Filter leaves by search
  const filteredLeaves = useMemo(() => {
    if (!search) return leaves;
    const searchLower = search.toLowerCase();
    return leaves.filter(leave =>
      leave.employee?.name?.toLowerCase().includes(searchLower) ||
      leave.leaveType?.name?.toLowerCase().includes(searchLower) ||
      leave.reason?.toLowerCase().includes(searchLower)
    );
  }, [leaves, search]);

  // Stats
  const stats = useMemo(() => {
    const pending = leaves.filter(l => l.status === 'pending').length;
    const approved = leaves.filter(l => l.status === 'approved').length;
    const rejected = leaves.filter(l => l.status === 'rejected').length;
    // total_days is what the backend actually charged (working days, holidays
    // excluded). Re-deriving it from the date span inflates the figure by every
    // weekend inside the period.
    const totalDays = leaves
      .filter(l => l.status === 'approved')
      .reduce((acc, l) => acc + chargedDays(l), 0);

    return { totalItems, pending, approved, rejected, totalDays };
  }, [leaves, totalItems]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleViewDetail = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLeave(null);
  };

  const handleExport = () => {
    if (filteredLeaves.length === 0) {
      toast.error(t("No data to export"), { id: 'api-error' });
      return;
    }

    const headers = [
      t("Employee"),
      t("Department"),
      t("Leave Type"),
      t("Start Date"),
      t("End Date"),
      t("Working Days"),
      t("Status"),
      t("Reason"),
      t("Created At"),
    ];

    const rows = filteredLeaves.map(leave => [
      leave.employee?.name || '-',
      leave.employee?.department?.name || '-',
      leave.leaveType?.name || '-',
      formatDate(leave.start_date),
      formatDate(leave.end_date),
      chargedDaysLabel(leave),
      t(leave.status),
      leave.reason || '-',
      leave.created_at ? formatDate(leave.created_at) : '-',
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leave_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("Export successful"));
  };

  return <OperationalWorkspace module="leave" title={t("Leave Requests")} description={t("Monitor leave dates and status across your assigned companies. Approvals are handled in My Approval.")} className="lw-page"
    actions={<><button className="ow-button" onClick={fetchLeaves} disabled={loading}><RefreshCw size={16} />{t("Refresh")}</button><button className="ow-button" onClick={handleExport} disabled={loading || loadError || !filteredLeaves.length}><Download size={16} />{t("Export this page")}</button></>}
    filters={<>
      <label className="ow-field">{t("Company")}<select aria-label={t("Company filter")} value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }}><option value="all">{t("All assigned companies")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
      <label className="ow-field">{t("Status")}<select aria-label={t("Status filter")} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}><option value="all">{t("All statuses")}</option>{['pending','approved','rejected','cancelled','returned'].map(status => <option key={status} value={status}>{t(status.charAt(0).toUpperCase() + status.slice(1))}</option>)}</select></label>
      <label className="ow-field">{t("Leave type")}<select aria-label={t("Leave type filter")} value={filterLeaveType} onChange={e => { setFilterLeaveType(e.target.value); setPage(1); }}><option value="all">{t("All leave types")}</option>{leaveTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
      <button className="ow-button" onClick={() => { setFilterCompany('all'); setFilterStatus('all'); setFilterLeaveType('all'); setSearch(''); setPage(1); }}>{t("Reset filters")}</button>
      <details className="lw-help"><summary>{t("Leave rules")}</summary><p>{t("Full-day requests only. Recorded working days exclude weekends and company holidays.")}</p></details>
    </>}
    >
    {optionError && <p className="ow-feedback" role="alert">{t("Unable to load filter options.")} <button onClick={() => { setOptionError(false); fetchCompanies(); fetchLeaveTypes(); }}>{t("Retry options")}</button></p>}
    <section className="ow-register">
      <div className="lw-register-tools"><p className="lw-note">{t("Search and export apply to the current page.")}</p><label className="lw-search"><Search size={17} /><input aria-label={t("Search this page")} placeholder={t("Search this page…")} value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      {loading ? <div className="lw-empty" role="status"><Loader2 className="animate-spin" />{t("Loading requests…")}</div> : loadError ? <div className="lw-empty" role="alert">{t("Unable to load leave requests.")}<button className="ow-button" onClick={fetchLeaves}>{t("Retry requests")}</button></div> : !filteredLeaves.length ? <div className="lw-empty"><Calendar size={24} /><h3>{t("No leave requests found")}</h3><p>{t("Adjust your filters to view other leave records.")}</p></div> :
      <div className="lw-table-wrap"><table className="ow-table lw-records lw-requests"><thead><tr><th>{t("Employee")}</th><th>{t("Leave type")}</th><th>{t("Period")}</th><th>{t("Working days")}</th><th>{t("Status")}</th><th>{t("Actions")}</th></tr></thead><tbody>
        {filteredLeaves.map(leave => <tr key={leave.id} data-leave-record>
          <td data-label={t("Employee")}><strong>{leave.employee?.name || '—'}</strong><span className="lw-sub">{leave.employee?.department?.name || '—'}</span></td><td data-label={t("Leave type")}>{leave.leaveType?.name || '—'}</td>
          <td data-label={t("Period")}>{formatDate(leave.start_date)}<span className="lw-sub">{t("to")} {formatDate(leave.end_date)}</span></td>
          <td data-label={t("Working days")} className="lw-number">{chargedDaysLabel(leave)}</td>
          <td data-label={t("Status")}><span className={`lw-status ${getStatusColor(leave.status)}`}>{getStatusIcon(leave.status)}{t(leave.status)}</span></td>
          <td data-label={t("Actions")}><div className="lw-actions"><button className="ow-button" title={t("View Details")} onClick={() => handleViewDetail(leave)}><Eye size={15} />{t("Details")}</button>
          </div></td>
        </tr>)}
      </tbody></table></div>}
      {!loading && !loadError && <div className="lw-page-totals"><span>{t("This page")}</span><span><strong>{quantity(stats.pending)}</strong>{' '}{t("pending")}</span><span><strong>{quantity(stats.approved)}</strong>{' '}{t("approved")}</span><span><strong>{quantity(stats.totalDays)}</strong>{' '}{t("approved working days")}</span></div>}
      {!loading && !loadError && <div className="ow-pagination"><span>{quantity(filteredLeaves.length)}{' '}{t("shown ·")} {quantity(totalItems)}{' '}{t("matching requests")}</span><div className="lw-actions"><button className="ow-button" aria-label={t("Previous page")} disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button><span>{t("Page")} {page}{' '}{t("of")} {totalPages}</span><button className="ow-button" aria-label={t("Next page")} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button></div></div>}
    </section>
    {showDetailModal && selectedLeave && <OperationalDialog title={t("Leave Request Details")} subtitle={t('Request #{id}', { id: selectedLeave.id })} onClose={handleCloseDetailModal} className="lw-dialog leave-refresh-dialog"><div className="ph-workflow dw-detail dw-fields">
      <div className="lw-detail-heading"><h3>{selectedLeave.employee?.name || '—'}</h3><span className={`lw-status ${getStatusColor(selectedLeave.status)}`}>{t(selectedLeave.status)}</span></div>
      <dl className="ph-kv dw-detail-grid"><div><dt>{t("Leave type")}</dt><dd>{selectedLeave.leaveType?.name || '—'}</dd></div><div><dt>{t("Stored working days")}</dt><dd>{chargedDaysLabel(selectedLeave)}</dd></div><div><dt>{t("Start date")}</dt><dd>{formatDate(selectedLeave.start_date)}</dd></div><div><dt>{t("End date")}</dt><dd>{formatDate(selectedLeave.end_date)}</dd></div><div className="lw-wide"><dt>{t("Reason")}</dt><dd>{selectedLeave.reason || '—'}</dd></div>{selectedLeave.rejection_reason && <div className="lw-wide"><dt>{t("Rejection reason")}</dt><dd>{selectedLeave.rejection_reason}</dd></div>}{selectedLeave.has_document && <div className="lw-wide"><dt>{t("Attachment")}</dt><dd><LeaveDocumentDownload leave={selectedLeave} /></dd></div>}</dl>
      <p className="lw-note">{t("Monitoring only. Assigned approvers review requests in My Approval.")}</p>
      <div className="ph-form-actions dw-actions"><button className="ow-button" onClick={handleCloseDetailModal}>{t("Close")}</button></div>
    </div></OperationalDialog>}
</OperationalWorkspace>;
}
