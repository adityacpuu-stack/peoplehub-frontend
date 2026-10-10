import { quantity } from '@/components/leave/presentation';
import { t, useLocale } from '@/i18n';
import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { OperationalDialog, OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { leaveService } from '@/services/leave.service';
import { useAuthStore } from '@/stores/auth.store';
import type { LeaveRequest } from '@/types';
import { LeaveDocumentDownload } from '@/components/leave/LeaveDocumentDownload';
import { toNum } from '@/lib/utils';
import { TeamFeedback, TeamPagination, TeamStatus } from './team-management';
import { APPROVALS_CHANGED, calendarDate, timestamp } from './team-management-utils';
import './team-management.css';

type Mode = 'detail' | 'approve' | 'reject';
const canAct = (row: LeaveRequest) => row.status === 'pending' && row.can_approve === true;

export function LeaveApprovalPage() {
  useLocale();
  const { user } = useAuthStore();
  const enabled = user?.companyFeatures?.leave_enabled ?? true;
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [mode, setMode] = useState<Mode>('detail');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [decisionError, setDecisionError] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false); setSelected(null);
      try { const data = enabled ? await leaveService.getMyApprovals() : []; if (!cancelled) setRows(data); }
      catch { if (!cancelled) { setRows([]); setFailed(true); } }
      finally { if (!cancelled) setLoading(false); }
    }
    void load(); return () => { cancelled = true; };
  }, [retry, enabled, user?.id]);

  const pending = rows.filter(canAct).length;
  const types = [...new Map(rows.map(row => [row.leave_type_id, row.leaveType?.name || t("Leave")])).entries()];
  const query = search.trim().toLowerCase();
  const filtered = rows.filter(row => (status === 'all' || (status === 'pending' ? canAct(row) : row.status === status)) &&
    (type === 'all' || String(row.leave_type_id) === type) &&
    (!query || [row.employee?.name, row.employee?.employee_id].some(value => value?.toLowerCase().includes(query))));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const open = (row: LeaveRequest, nextMode: Mode) => { if (busy.current) return; setSelected(row); setMode(nextMode); setReason(''); setDecisionError(false); };
  const close = () => { if (!busy.current) { setSelected(null); setReason(''); setDecisionError(false); } };
  const decide = async () => {
    if (busy.current || !selected || !canAct(selected) || mode === 'detail' || (mode === 'reject' && !reason.trim())) return;
    busy.current = true; setProcessing(true); setDecisionError(false);
    try {
      if (mode === 'approve') await leaveService.approve(selected.id);
      else await leaveService.reject(selected.id, reason.trim());
      toast.success(mode === 'approve' ? t("Leave request approved") : t("Leave request rejected"));
      setSelected(null); setReason(''); setRetry(value => value + 1);
      window.dispatchEvent(new Event(APPROVALS_CHANGED));
    } catch { setDecisionError(true); }
    finally { busy.current = false; setProcessing(false); }
  };

  return <OperationalWorkspace module="operations" className="tm-page" title={t("Leave Approval")} description={t("Review leave assigned to you and track your approval history.")}
    actions={<button className="ow-button" disabled={loading || processing || !enabled} onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} />{t("Refresh")}</button>}
    filters={enabled && <><label className="tm-search"><Search size={17} /><input aria-label={t("Search leave requests")} placeholder={t("Search name or employee ID…")} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="ow-field">{t("Leave type")}<select aria-label={t("Leave type")} value={type} onChange={event => { setType(event.target.value); setPage(1); }}><option value="all">{t("All leave types")}</option>{types.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></>}>
    {!enabled ? <div className="ow-feedback"><h3>{t("Leave is not enabled for your company")}</h3></div> : <>
      <div className="tm-tabs" role="group" aria-label={t("Request status")}>{['pending', 'approved', 'rejected', 'cancelled', 'all'].map(value => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{value === 'all' ? t("All requests") : t(value.charAt(0).toUpperCase() + value.slice(1))}{value === 'pending' && !loading && !failed && <span>{pending}</span>}</button>)}</div>
      {loading || failed || !filtered.length ? <TeamFeedback loading={loading} failed={failed} empty={status === 'pending' ? t("No pending requests assigned to you") : t("No matching leave requests")} onRetry={() => setRetry(value => value + 1)} /> :
        <div className="tm-request-list">{filtered.slice((currentPage - 1) * 20, currentPage * 20).map(row => <article className="tm-request" key={row.id}>
          <div className="tm-request-person"><h2>{row.employee?.name || t("Employee")}</h2><small>{row.employee?.employee_id} · {row.employee?.department?.name || '—'}</small><TeamStatus status={row.status} /></div>
          <div className="tm-request-period"><strong>{row.leaveType?.name || t("Leave")}</strong><span>{calendarDate(row.start_date)} – {calendarDate(row.end_date)}</span><p>{row.reason || t("No reason provided")}</p></div>
          <div className="tm-days"><strong>{quantity(toNum(row.total_days))}</strong><span>{t("day(s)")}</span></div>
          <div className="tm-request-actions"><button className="ow-button" aria-label={t('View request for {name}', { name: row.employee?.name || t('Employee') })} onClick={() => open(row, 'detail')}>{t("View details")}</button>{canAct(row) && <button className="ow-button ow-primary" onClick={() => open(row, 'approve')}>{t("Review request")}</button>}</div>
        </article>)}</div>}
      {!loading && !failed && <><div className="tm-summary"><span><strong>{pending}</strong>{' '}{t("awaiting your approval")}</span><span><strong>{rows.filter(row => row.status === 'approved').reduce((sum, row) => sum + toNum(row.total_days), 0)}</strong>{' '}{t("approved days in assigned history")}</span></div><TeamPagination page={currentPage} total={filtered.length} onPage={setPage} /></>}
    </>}
    {selected && <OperationalDialog title={mode === 'detail' ? t("Leave request") : mode === 'approve' ? t("Review leave request") : t("Reject leave request")} subtitle={`${selected.employee?.name || t("Employee")} · ${selected.employee?.employee_id || ''}`} onClose={close} busy={processing} className="operations-refresh-dialog tm-dialog">
      <div className="ow-dialog-body">
        <div className="tm-detail-status"><strong>{selected.leaveType?.name || t("Leave")}</strong><TeamStatus status={selected.status} /></div>
        <dl className="tm-details"><div><dt>{t("Start date")}</dt><dd>{calendarDate(selected.start_date)}</dd></div><div><dt>{t("End date")}</dt><dd>{calendarDate(selected.end_date)}</dd></div><div><dt>{t("Duration")}</dt><dd>{quantity(toNum(selected.total_days))}{' '}{t("day(s)")}</dd></div><div><dt>{t("Department")}</dt><dd>{selected.employee?.department?.name || '—'}</dd></div>
          <div className="tm-wide"><dt>{t("Reason")}</dt><dd>{selected.reason || '—'}</dd></div>
          {selected.is_emergency && <div className="tm-wide"><dt>{t("Request priority")}</dt><dd>{t("Emergency leave")}</dd></div>}
          {selected.work_handover && <div className="tm-wide"><dt>{t("Task handover")}</dt><dd>{selected.work_handover}</dd></div>}
          {selected.contact_during_leave && <div><dt>{t("Contact during leave")}</dt><dd>{selected.contact_during_leave}</dd></div>}
          {selected.has_document && <div className="tm-wide"><dt>{t("Attachment")}</dt><dd><LeaveDocumentDownload leave={selected} /></dd></div>}
          <div><dt>{t("Submitted")}</dt><dd>{timestamp(selected.created_at)}</dd></div>
          {['approved', 'rejected'].includes(selected.status) && selected.approver && <div><dt>{selected.status === 'approved' ? t("Approved") : t("Rejected")}{' '}{t("by")}</dt><dd>{selected.approver.name}<small>{timestamp(selected.status === 'approved' ? selected.approved_at : selected.rejected_at)}</small></dd></div>}
          {selected.rejection_reason && <div className="tm-wide"><dt>{t("Rejection reason")}</dt><dd>{selected.rejection_reason}</dd></div>}
        </dl>
        {mode === 'reject' && <label className="tm-reason">{t("Rejection reason")} <span>{t("(required)")}</span><textarea autoFocus rows={4} value={reason} onChange={event => setReason(event.target.value)} disabled={processing} placeholder={t("Explain why this request is rejected")} /></label>}
        {mode === 'approve' && <p className="tm-decision-note">{t("Confirm the dates and handover before approving this request.")}</p>}
        {decisionError && <p role="alert" className="tm-decision-error">{t("The decision could not be saved. Your input is retained; try again or close and refresh the list.")}</p>}
      </div>
      <footer className="tm-dialog-actions"><button className="ow-button" disabled={processing} onClick={close}>{t("Close")}</button>{canAct(selected) && <div>
        {mode !== 'reject' && <button className="ow-button" disabled={processing} onClick={() => { setMode('reject'); setDecisionError(false); }}>{t("Reject")}</button>}
        {mode === 'detail' ? <button className="ow-button ow-primary" onClick={() => setMode('approve')}>{t("Review request")}</button> : <button className={`ow-button ${mode === 'reject' ? 'tm-danger' : 'ow-primary'}`} disabled={processing || (mode === 'reject' && !reason.trim())} onClick={decide}>{processing && <Loader2 size={15} className="animate-spin" />}{mode === 'reject' ? t("Reject request") : t("Approve request")}</button>}
      </div>}</footer>
    </OperationalDialog>}
  </OperationalWorkspace>;
}
