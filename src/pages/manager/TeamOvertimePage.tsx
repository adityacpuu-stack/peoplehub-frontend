import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { intlLocale, useLocale } from '@/i18n';
import { OperationalDialog, OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { overtimeService, type Overtime } from '@/services/overtime.service';
import { useAuthStore } from '@/stores/auth.store';
import { TeamFeedback, TeamPagination, TeamStatus } from './team-management';
import { calendarDate, timestamp } from './team-management-utils';
import { teamTimeText as t } from './team-time.catalog';
import './team-management.css';
import './team-time.css';

const statusLabels = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
const typeLabels: Record<string, string> = { regular: 'Regular', weekend: 'Weekend', holiday: 'Holiday' };
// Matches requireManagerOrHigher; record/company authorization remains on the server.
const decisionRoles = ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'Finance Manager', 'Tax Manager', 'HR Staff', 'Tax Staff', 'Manager'];
function number(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function quantity(value: unknown) {
  const parsed = number(value);
  return parsed == null ? '—' : parsed.toLocaleString(intlLocale(), { maximumFractionDigits: 2 });
}
function time(value?: string) {
  if (!value) return '—';
  // Older records can contain clock-only values; current API returns ISO timestamps.
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString(intlLocale(), { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
}
type DialogState = { request: Overtime; mode: 'view' | 'approve' | 'reject' };

export function TeamOvertimePage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  const canDecide = !!user?.roles.some(role => decisionRoles.includes(role));
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 7));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [requests, setRequests] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false); setRequests([]); setDialog(null);
      const [year, monthNumber] = month.split('-').map(Number);
      const endDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      const collected: Overtime[] = [];
      try {
        // The endpoint has no search parameter. Load the entire selected month so
        // local search/status filters and monthly totals include records beyond 100.
        let nextPage = 1;
        let totalPages = 1;
        do {
          const result = await overtimeService.list({ start_date: `${month}-01`, end_date: `${month}-${endDay}`, page: nextPage, limit: 100, sort_by: 'created_at', sort_order: 'desc' });
          if (cancelled) return;
          collected.push(...result.data);
          totalPages = result.pagination.totalPages;
          nextPage += 1;
        } while (nextPage <= totalPages);
        setRequests(Array.from(new Map(collected.map(row => [row.id, row])).values()));
      } catch { if (!cancelled) setFailed(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [month, retry, user?.id]);

  const query = search.trim().toLowerCase();
  const filtered = requests.filter(row => (!query || [row.employee?.name, row.employee?.employee_id].some(value => value?.toLowerCase().includes(query))) && (status === 'all' || row.status === status));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const approved = requests.filter(row => row.status === 'approved');
  // A missing stored value must not become a fabricated zero or computed payment.
  const total = (field: 'hours' | 'total_amount') => approved.some(row => number(row[field]) == null) ? null : approved.reduce((sum, row) => sum + Number(row[field]), 0);

  return <OperationalWorkspace module="operations" className="tm-page tt-page" title={t('Team Overtime')} description={t('Overtime records from companies you can access, including employees outside your direct reports.')}
    actions={<button className="ow-button" disabled={loading} onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} />{t('Refresh')}</button>}
    filters={<>
      <label className="tm-search"><Search size={17} /><input aria-label={t('Search team')} placeholder={t('Search by name or employee ID...')} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="ow-field">{t('Month')}<input aria-label={t('Month')} type="month" value={month} onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) { setMonth(event.target.value); setPage(1); } }} /></label>
      <label className="ow-field">{t('Status')}<select aria-label={t('Status')} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">{t('All')}</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
    </>}>
    <div className="tt-register-heading"><h2>{t('Overtime requests')}</h2><span>{t('Times shown in WIB')}</span></div>
    {loading || failed || !filtered.length ? <TeamFeedback loading={loading} failed={failed} empty={requests.length ? t('No overtime requests found') : t('No overtime records for this month')} onRetry={() => setRetry(value => value + 1)} /> :
      <div className="tm-table-scroll"><table className="tm-table tt-table"><thead><tr><th>{t('Employee')}</th><th>{t('Date')}</th><th>{t('Duration')}</th><th>{t('Status')}</th><th><span className="sr-only">{t('Actions')}</span></th></tr></thead><tbody>
        {filtered.slice((currentPage - 1) * 20, currentPage * 20).map(row => <tr key={row.id}>
          <td><div className="tm-person"><span className="tm-avatar" aria-hidden="true">{row.employee?.name?.split(' ').map(part => part[0]).join('').slice(0, 2) || '—'}</span><div><strong>{row.employee?.name || t('Unknown')}</strong><small>{row.employee?.employee_id || '—'}{row.employee?.department?.name && ` · ${row.employee.department.name}`}</small></div></div><small className="tt-reason-preview" title={row.reason}>{row.reason}</small></td>
          <td data-label={t('Date')}><div><strong>{calendarDate(row.date)}</strong><small>{time(row.start_time)} – {time(row.end_time)}</small></div></td><td data-label={t('Duration')}><div><strong>{quantity(row.hours)} {t('h')}</strong><small>{t(typeLabels[row.overtime_type] || 'Unavailable')}</small></div></td><td data-label={t('Status')}><TeamStatus status={row.status} /></td>
          <td><div className="tt-row-actions"><button className="ow-button" aria-label={t('View {name}', { name: row.employee?.name || t('Unknown') })} onClick={() => setDialog({ request: row, mode: 'view' })}>{t('View Details')}</button>{canDecide && row.status === 'pending' && <button className="ow-button ow-primary" onClick={() => setDialog({ request: row, mode: 'approve' })}>{t('Review')}</button>}</div></td>
        </tr>)}
      </tbody></table></div>}
    {!loading && !failed && <><div className="tm-summary"><span>{t('Monthly records')} <strong>{requests.length}</strong></span><span>{t('Pending')} <strong>{requests.filter(row => row.status === 'pending').length}</strong></span><span>{t('Approved hours')} <strong>{quantity(total('hours'))} {t('h')}</strong></span><span>{t('Approved amount')} <strong>Rp {quantity(total('total_amount'))}</strong></span></div><TeamPagination page={currentPage} total={filtered.length} onPage={setPage} /></>}
    {dialog && <OvertimeDialog key={dialog.request.id} initial={dialog} canDecide={canDecide} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); setRetry(value => value + 1); }} />}
  </OperationalWorkspace>;
}

function OvertimeDialog({ initial, canDecide, onClose, onSaved }: { initial: DialogState; canDecide: boolean; onClose: () => void; onSaved: () => void }) {
  useLocale();
  const [request, setRequest] = useState<Overtime | null>(null);
  const [mode, setMode] = useState(initial.mode);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [decisionFailed, setDecisionFailed] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false); setRequest(null);
      try { const result = await overtimeService.getById(initial.request.id); if (!cancelled) setRequest(result); }
      catch { if (!cancelled) setFailed(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [initial.request.id, retry]);
  const actionable = canDecide && request?.status === 'pending';
  async function confirm() {
    if (submitting.current || !actionable || !request || mode === 'view' || (mode === 'reject' && !reason.trim())) return;
    submitting.current = true; setBusy(true); setDecisionFailed(false);
    try {
      if (mode === 'approve') await overtimeService.approve(request.id, notes.trim() ? { approval_notes: notes.trim() } : {});
      else await overtimeService.reject(request.id, { rejection_reason: reason.trim() });
      toast.success(t(mode === 'approve' ? 'Overtime for {name} approved' : 'Overtime for {name} rejected', { name: request.employee?.name || t('Unknown') }));
      onSaved();
    } catch { setDecisionFailed(true); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <OperationalDialog title={mode === 'view' ? t('Overtime details') : t(mode === 'approve' ? 'Confirm approval' : 'Confirm rejection')} subtitle={`${initial.request.employee?.name || t('Unknown')} · ${initial.request.employee?.employee_id || '—'}`} busy={busy} onClose={onClose} className="operations-refresh-dialog tm-dialog tt-dialog">
    <div className="ow-dialog-body">
      {loading || failed ? <TeamFeedback loading={loading} failed={failed} empty="" onRetry={() => setRetry(value => value + 1)} /> : request && <>
        <div className="tm-detail-status"><strong>{calendarDate(request.date)}</strong><TeamStatus status={request.status} /></div><dl className="tm-details">
          <div><dt>{t('Time')} (WIB)</dt><dd>{time(request.start_time)} – {time(request.end_time)}</dd></div><div><dt>{t('Duration')}</dt><dd>{quantity(request.hours)} {t('hours')}</dd></div>
          <div><dt>{t('Type')}</dt><dd>{t(typeLabels[request.overtime_type] || 'Unavailable')}</dd></div><div><dt>{t('Break duration (minutes)')}</dt><dd>{quantity(request.break_duration)}</dd></div>
          <div className="tm-wide"><dt>{t('Reason')}</dt><dd>{request.reason || '—'}</dd></div>
          {request.task_description && <div className="tm-wide"><dt>{t('Task description')}</dt><dd>{request.task_description}</dd></div>}
          <div><dt>{t('OT Amount')}</dt><dd>Rp {quantity(request.total_amount)}</dd></div><div><dt>{t('Rate')}</dt><dd>Rp {quantity(request.rate_per_hour)} × {quantity(request.rate_multiplier)}</dd></div>
          {request.approver && <div className="tm-wide"><dt>{t(request.status === 'approved' ? 'Approved by' : 'Rejected by')}</dt><dd>{request.approver.name}{request.approved_at && <small>{timestamp(request.approved_at)}</small>}</dd></div>}
          {request.approval_notes && <div className="tm-wide"><dt>{t('Approval Notes')}</dt><dd>{request.approval_notes}</dd></div>}
          {request.rejection_reason && <div className="tm-wide"><dt>{t('Rejection Reason')}</dt><dd>{request.rejection_reason}</dd></div>}
        </dl>
        {mode !== 'view' && actionable && <><p className="tm-decision-note">{t('Review the request before confirming your decision.')}</p>{mode === 'reject' ? <label className="tm-reason">{t('Rejection Reason')}<textarea required aria-label={t('Rejection Reason')} aria-describedby="tt-rejection-help" disabled={busy} rows={3} value={reason} onChange={event => setReason(event.target.value)} /><small id="tt-rejection-help">{t('Rejection reason is required')}</small></label> : <label className="tm-reason">{t('Approval notes (optional)')}<textarea aria-label={t('Approval notes (optional)')} disabled={busy} rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label>}</>}
        {mode !== 'view' && request.status !== 'pending' && <p className="tm-decision-note" role="status">{t('This request is no longer pending.')}</p>}
        {decisionFailed && <p className="tm-decision-error" role="alert">{t('Decision could not be saved. Review the request and try again.')}</p>}
      </>}
    </div>
    <footer className="tm-dialog-actions"><button className="ow-button" disabled={busy} onClick={onClose}>{t(mode === 'view' ? 'Close' : 'Cancel')}</button>{!loading && !failed && actionable && <div>
      {mode === 'view' ? <><button className="ow-button" onClick={() => setMode('reject')}>{t('Reject')}</button><button className="ow-button ow-primary" onClick={() => setMode('approve')}>{t('Approve')}</button></> : <><button className="ow-button" disabled={busy} onClick={() => { setMode(mode === 'approve' ? 'reject' : 'approve'); setDecisionFailed(false); }}>{t(mode === 'approve' ? 'Reject' : 'Approve')}</button><button className={`ow-button ${mode === 'reject' ? 'tm-danger' : 'ow-primary'}`} disabled={busy || (mode === 'reject' && !reason.trim())} onClick={() => void confirm()}>{busy ? t('Saving...') : t(mode === 'approve' ? 'Confirm approval' : 'Confirm rejection')}</button></>}
    </div>}</footer>
  </OperationalDialog>;
}
