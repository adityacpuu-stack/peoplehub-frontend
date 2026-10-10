import { enumLabel } from '@/pages/employees/enum-labels';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApprovalInbox, decideApproval, canDecideApproval, hasExecutiveApprovals, type ApprovalRequest } from '@/services/approval-inbox.service';
import { useAuthStore } from '@/stores/auth.store';
import { MANAGER_UP_ROLES } from '@/lib/actions';
import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import './requests.css';
import { LeaveDocumentDownload } from '@/components/leave/LeaveDocumentDownload';

interface ActivityItem {
  id: string;
  type: 'submitted' | 'approved' | 'rejected' | 'cancelled';
  timestamp: string;
  leave: ApprovalRequest;
}

// ==========================================
// HELPERS
// ==========================================

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 1) return t('Baru saja');
  if (diffMin < 60) return t('{count} menit lalu', { count: diffMin.toLocaleString(intlLocale()) });
  if (diffHour < 24) return t('{count} jam lalu', { count: diffHour.toLocaleString(intlLocale()) });
  if (diffDay < 7) return t('{count} hari lalu', { count: diffDay.toLocaleString(intlLocale()) });
  if (diffWeek < 4) return t('{count} minggu lalu', { count: diffWeek.toLocaleString(intlLocale()) });
  return t('{count} bulan lalu', { count: diffMonth.toLocaleString(intlLocale()) });
}

function buildActivityItems(leaves: ApprovalRequest[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const leave of leaves) {
    // Always add submitted
    items.push({
      id: `${leave.key}-submitted`,
      type: 'submitted',
      timestamp: leave.created_at,
      leave,
    });

    if (leave.status === 'approved' && leave.approved_at) {
      items.push({
        id: `${leave.key}-approved`,
        type: 'approved',
        timestamp: leave.approved_at,
        leave,
      });
    }

    if (leave.status === 'rejected' && leave.rejected_at) {
      items.push({
        id: `${leave.key}-rejected`,
        type: 'rejected',
        timestamp: leave.rejected_at,
        leave,
      });
    }

    if (leave.status === 'cancelled') {
      items.push({
        id: `${leave.key}-cancelled`,
        type: 'cancelled',
        timestamp: leave.updated_at || leave.created_at,
        leave,
      });
    }
  }

  // Sort by most recent first
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}


const formatDate = (value: string) => new Date(value).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
const duration = (request: ApprovalRequest) => request.amount == null ? '-' : Number(request.amount).toLocaleString(intlLocale());
const activityLabels = { submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };

export function RequestsPage() {
  useLocale();
  const { user } = useAuthStore();
  const executive = hasExecutiveApprovals(user?.roles);
  // IT Admin without a Manager-or-higher role: the API limits the inbox to current direct reports.
  const itScope = !executive && !!user?.roles?.includes('IT Admin') && !user.roles.some(role => role === 'Super Admin' || MANAGER_UP_ROLES.includes(role));
  // That inbox is keyed to the linked employee record: without one there is nothing to request.
  const itUnlinked = itScope && !user?.employee;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = !executive && searchParams.get('tab') === 'activity' ? 'activity' : 'approvals';
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [kind, setKind] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('pending');
  const [activityType, setActivityType] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState<{ request: ApprovalRequest; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    let current = true;
    setError(false); setRequests([]);
    if (itUnlinked) { setLoading(false); return; }
    setLoading(true);
    getApprovalInbox(executive).then(data => { if (current) setRequests(data); })
      .catch(() => { if (current) setError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision, executive, itUnlinked, user?.id, user?.employee?.id]);
  const changeTab = (tab: 'approvals' | 'activity') => {
    setSearchParams(previous => { previous.set('tab', tab); return previous; }, { replace: true });
    setPage(1);
  };
  const matches = (request: ApprovalRequest) => (kind === 'all' || request.kind === kind) && `${request.employee?.name || ''} ${request.employee?.employee_id || ''} ${request.approver?.name || ''}`.toLowerCase().includes(search.trim().toLowerCase());
  const visible = requests.filter(r => matches(r) && (status === 'all' || r.status === status));
  const activity = buildActivityItems(requests).filter(item => matches(item.leave) && (activityType === 'all' || item.type === activityType));
  const count = activeTab === 'activity' ? activity.length : visible.length;
  const totalPages = Math.max(1, Math.ceil(count / 10));
  const currentPage = Math.min(page, totalPages);
  const pendingCount = requests.filter(canDecideApproval).length;
  const openDecision = (request: ApprovalRequest, action: 'approve' | 'reject') => { if (submitting.current || !canDecideApproval(request)) return; setDecision({ request, action }); setComment(''); setDecisionError(''); };
  const closeDecision = () => { if (!submitting.current) setDecision(null); };
  const submitDecision = async () => {
    if (!decision || submitting.current || !decision.request.can_approve || decision.request.status !== 'pending') return;
    if (decision.action === 'reject' && !comment.trim()) { setDecisionError('Rejection reason is required.'); return; }
    submitting.current = true; setBusy(true); setDecisionError('');
    try {
      await decideApproval(decision.request, decision.action, comment);
      setDecision(null); setRevision(value => value + 1);
      toast.success(decision.action === 'approve' ? t("Request approved successfully") : t("Request rejected"));
      window.dispatchEvent(new Event('leave-approvals-changed'));
      window.dispatchEvent(new Event('executive-approvals-changed'));
    } catch (error) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || 'Unable to save the decision. Try again.';
      setDecisionError(message);
    } finally { submitting.current = false; setBusy(false); }
  };

  if (itUnlinked) return <OperationalWorkspace module="operations" title={t("My Approval")} className="requests-workspace"
    description={t("Leave requests assigned to you as approver. Company-wide records are in Leave Requests.")}>
    <section className="ow-register"><div className="ow-feedback" role="status" data-requests-unlinked>
      <h2>{t('No approval inbox for this account')}</h2>
      <p>{t('IT Admins approve leave only for their direct reports, which requires this account to be linked to an employee record. This account is not linked, so there is nothing to approve here.')}</p>
    </div></section>
  </OperationalWorkspace>;

  return <OperationalWorkspace module="operations" title={t("My Approval")} description={executive ? t("Pending leave and overtime requests within your approval scope.") : t("Leave requests assigned to you as approver. Company-wide records are in Leave Requests.")} className="requests-workspace"
    actions={<button className="ow-button" disabled={loading || busy} onClick={() => setRevision(v => v + 1)}>{t("Refresh")}</button>}
    filters={<>
      <label className="request-search"><span className="sr-only">{t("Search requests")}</span><input placeholder={t("Search employee or approver...")} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      {executive && <label className="ow-field">{t("Request type")}<select aria-label={t("Request type")} value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="all">{t("All request types")}</option><option value="leave">{t("Leave")}</option><option value="overtime">{t("Overtime")}</option></select></label>}
      {activeTab === 'approvals' ? <>
        {!executive && <label className="ow-field">{t("Request status")}<select aria-label={t("Request status")} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">{t("All statuses")}</option>{['pending', 'approved', 'rejected', 'cancelled'].map(s => <option key={s} value={s}>{enumLabel(s)}</option>)}</select></label>}
        <details className="request-scope-help"><summary>{t("Approval scope")}</summary><p>{executive ? t("Pending requests follow your existing company and approval access. Approval actions remain subject to authorization; this queue does not include completed history.") : itScope ? t("Only leave requests from your current direct reports appear here, and only when no other leave approver is designated for them.") : t("Requests follow the designated leave approver. If none is assigned, they follow the employee's manager. Your HR role does not add other employees to this inbox.")}</p></details>
      </> : <label className="ow-field">{t("Activity type")}<select aria-label={t("Activity type")} value={activityType} onChange={e => { setActivityType(e.target.value); setPage(1); }}><option value="all">{t("All activity")}</option>{Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>}
      <button className="ow-button" onClick={() => { setSearch(''); setKind('all'); setStatus('pending'); setActivityType('all'); setPage(1); }}>{t("Reset filters")}</button>
    </>}

  >
    <section className="ow-register">
      <div className="ow-toolbar"><div className="request-tabs" aria-label={t("Approval view")}><button aria-pressed={activeTab === 'approvals'} onClick={() => changeTab('approvals')}>{t("Approval inbox")}</button>{!executive && <button aria-pressed={activeTab === 'activity'} onClick={() => changeTab('activity')}>{t("Activity")}</button>}</div><p className="request-count">{loading ? t("Loading history...") : error ? t("History unavailable") : t('{count} awaiting your approval', { count: pendingCount.toLocaleString(intlLocale()) })}</p></div>
      {loading ? <div className="ow-feedback" role="status">{t("Loading requests...")}</div> : error ? <div className="ow-feedback" role="alert">{t("Unable to load approval requests.")} <button className="ow-button" onClick={() => setRevision(v => v + 1)}>{t("Retry requests")}</button></div>
      : count === 0 ? <div className="ow-feedback"><h2>{t("No requests in this view")}</h2><p>{t("There are no assigned requests matching these filters.")}</p></div>
      : activeTab === 'approvals' ? <div className="request-list">{visible.slice((currentPage - 1) * 10, currentPage * 10).map(request => <article key={request.key} className="request-record" data-request-record>
        <div className="request-row">
          <div className="request-person"><h2>{request.employee?.name || t('Unknown employee')}</h2><p>{request.employee?.employee_id || '-'} / {request.employee?.department?.name || t('No department')}</p></div>
          <div className="request-period"><h3>{request.kind === 'overtime' ? t('Overtime') : request.label}</h3><p>{formatDate(request.start_date)} - {formatDate(request.end_date)}</p></div>
          <div className="request-duration"><strong>{duration(request)}</strong><span>{request.unit === 'hours' ? t('hours') : request.unit === 'leave days' ? t('leave days') : request.unit}</span></div>
          <div className="request-decisions"><span className="ow-status" data-status={request.status}>{enumLabel(request.status)}</span>{request.status === 'pending' && (request.can_approve ? <div><button className="ow-button" onClick={() => openDecision(request, 'reject')}>{t("Reject")}</button><button className="ow-button ow-primary" onClick={() => openDecision(request, 'approve')}>{t("Approve")}</button></div> : <span className="request-note">{t("Awaiting assigned approver")}</span>)}</div>
        </div>
        <p className="request-reason">{request.reason || t('No reason provided.')}</p>
        {request.rejection_reason && <p className="request-rejection"><strong>{t("Rejection reason:")}</strong> {request.rejection_reason}</p>}
        <details className="request-details"><summary>{t("Request details")}</summary><div><p>{t("Submitted")} {formatDate(request.created_at)}</p>{request.approver?.name && <p>{t("Approver:")} {request.approver.name}</p>}{request.work_handover && <p>{t("Handover:")} {request.work_handover}</p>}{request.kind === 'leave' && <LeaveDocumentDownload leave={request} />}</div></details>
      </article>)}</div>
      : <ol className="request-activity">{activity.slice((currentPage - 1) * 10, currentPage * 10).map(item => <li key={item.id}><span className="request-event-dot" data-event={item.type} /><div><div className="request-event-header"><h2>{item.leave.employee?.name || t('Unknown employee')}</h2><span className="ow-status" data-status={item.type}>{t(activityLabels[item.type])}</span><time dateTime={item.timestamp} title={new Date(item.timestamp).toLocaleString(intlLocale())}>{getRelativeTime(item.timestamp)}</time></div><p>{item.leave.kind === 'overtime' ? t('Overtime') : item.leave.label} / {formatDate(item.leave.start_date)} / {formatDate(item.leave.end_date)} / {duration(item.leave)} {item.leave.unit === 'hours' ? t('hours') : item.leave.unit === 'leave days' ? t('leave days') : item.leave.unit}</p>{item.leave.approver?.name && <p>{t("Approver:")} {item.leave.approver.name}</p>}{item.type === 'rejected' && <p>{item.leave.rejection_reason}</p>}</div></li>)}</ol>}
      {!loading && !error && <div className="ow-pagination"><span>{count.toLocaleString(intlLocale())} {activeTab === 'activity' ? t("events") : t("requests")}</span><span>{t("Page")} {currentPage.toLocaleString(intlLocale())}{' '}{t("of")} {totalPages.toLocaleString(intlLocale())}</span><div><button className="ow-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t("Previous")}</button><button className="ow-button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>{t("Next")}</button></div></div>}
    </section>
    {decision && <OperationalDialog title={decision.action === 'approve' ? (decision.request.kind === 'leave' ? t('Approve Leave Request?') : t('Approve Overtime Request?')) : (decision.request.kind === 'leave' ? t('Reject Leave Request?') : t('Reject Overtime Request?'))} subtitle={decision.request.employee?.name} onClose={closeDecision} busy={busy} className="request-decision ph-workflow operations-refresh-dialog">
      <div className="ow-dialog-body"><dl className="ops-decision-details"><div><dt>{t("Request type")}</dt><dd>{decision.request.kind === 'overtime' ? t('Overtime') : decision.request.label}</dd></div><div><dt>{t("Recorded duration")}</dt><dd>{duration(decision.request)} {decision.request.unit === 'hours' ? t('hours') : decision.request.unit === 'leave days' ? t('leave days') : decision.request.unit}</dd></div><div className="ops-full"><dt>{t("Dates")}</dt><dd>{formatDate(decision.request.start_date)} / {formatDate(decision.request.end_date)}</dd></div><div className="ops-full"><dt>{t("Reason")}</dt><dd>{decision.request.reason || '-'}</dd></div>{decision.request.kind === 'leave' && decision.request.has_document && <div className="ops-full"><dt>{t("Attachment")}</dt><dd><LeaveDocumentDownload leave={decision.request} /></dd></div>}</dl>
      {(decision.action === 'reject' || decision.request.kind === 'leave') && <label className="ow-field">{decision.action === 'approve' ? t("Comment (Optional)") : t("Rejection Reason")}<textarea rows={3} value={comment} required={decision.action === 'reject'} onChange={e => setComment(e.target.value)} /></label>}
      {decisionError && <p role="alert" className="request-rejection">{['Rejection reason is required.', 'Unable to save the decision. Try again.'].includes(decisionError) ? t(decisionError) : decisionError}</p>}
      <div className="request-decision-actions ph-form-actions"><button className="ow-button" disabled={busy} onClick={closeDecision}>{t("Cancel")}</button><button className="ow-button ow-primary" disabled={busy || (decision.action === 'reject' && !comment.trim())} onClick={() => void submitDecision()}>{busy ? t("Processing...") : decision.action === 'approve' ? t("Yes, Approve") : t("Yes, Reject")}</button></div>
      </div>
    </OperationalDialog>}
  </OperationalWorkspace>;
}
