import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, Network, Info, RefreshCw } from 'lucide-react';
import { OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { itAccountService, type ItSummary } from '@/services/it-account.service';
import { leaveService } from '@/services/leave.service';
import type { User } from '@/types';
import './it.css';

/** Default dashboard for IT Admin (alone or with Employee): IT work plus personal self-service links. */
export function ItDashboard({ user, greeting }: { user: User | null; greeting: () => string }) {
  useLocale();
  const leaveEnabled = user?.companyFeatures?.leave_enabled ?? true;
  const attendanceEnabled = user?.companyFeatures?.attendance_enabled ?? true;
  // Personal features (approvals, leave, attendance, documents) need a linked employee record;
  // an unlinked account still reaches the IT operations pages.
  const employeeId = user?.employee?.id ?? null;
  const linked = employeeId != null;
  const [summary, setSummary] = useState<ItSummary | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    // A new identity never shows the previous account's numbers.
    setSummary(null); setPending(null); setFailed(false);
    itAccountService.summary().then(data => { if (current) setSummary(data); }).catch(() => { if (current) setFailed(true); });
    // Only requests assigned to this account (current direct reports); never company-wide.
    if (leaveEnabled && linked) leaveService.getMyApprovals()
      .then(rows => { if (current) setPending(rows.filter(row => row.status === 'pending' && row.can_approve === true).length); })
      .catch(() => { if (current) setPending(null); });
    return () => { current = false; };
  }, [retry, leaveEnabled, linked, employeeId, user?.id]);
  const number = (value: number) => value.toLocaleString(intlLocale());
  const name = user?.employee?.name || user?.email || '';
  return <OperationalWorkspace module="operations" className="it-workspace it-home" title={name ? `${greeting()}, ${name}` : greeting()}
    description={t('Manage work accounts and leave approval routing across your companies.')}
    actions={<button className="ow-button" onClick={() => setRetry(v => v + 1)}><RefreshCw size={15} aria-hidden="true" />{t('Refresh')}</button>}
    summary={summary && <dl className="ow-metrics">
      <div><dt>{t('IT companies')}</dt><dd>{number(summary.companies)}</dd></div>
      <div><dt>{t('Without work email')}</dt><dd>{number(summary.without_mailbox)}</dd></div>
      <div><dt>{t('Needs attention')}</dt><dd>{number(summary.needs_attention)}</dd></div>
      <div><dt>{t('Created here')}</dt><dd>{number(summary.provisioned)}</dd></div>
      {leaveEnabled && linked && <div><dt>{t('Awaiting your approval')}</dt><dd>{pending == null ? '-' : number(pending)}</dd></div>}
    </dl>}>
    {/* Personal features and IT operational scope are independent: an unlinked account can have IT companies. */}
    {/* Server truth: the summary counts the companies of the current IT scope. */}
    {summary && summary.companies === 0 && <div className="it-notice" role="status" data-it-no-scope>
      <h3>{t('No companies are assigned to this IT account')}</h3>
      {/* No page is promised: account-level IT grants (which override Company Assignments) have no UI yet. */}
      <p>{t('The IT lists stay empty until companies are assigned to this IT account. Ask a system administrator.')}</p>
    </div>}
    {failed && <div className="it-notice it-warning" role="alert">{t('IT summary could not be loaded.')} <button className="ow-button" onClick={() => setRetry(v => v + 1)}>{t('Retry')}</button></div>}
    {!summary && !failed && <p className="it-notice" role="status">{t('Loading...')}</p>}
    {summary && !summary.m365_configured && <p className="it-notice it-warning" role="status">{t('Microsoft 365 is not configured. Accounts cannot be created yet.')}</p>}
    <nav className="it-links" aria-label={t('IT workspace')}>
      <div className="it-tasks">
        <Link className="it-task" to="/it/accounts" aria-label={t('Open Microsoft 365 accounts')}>
          <span className="it-task-icon"><Mail size={23} aria-hidden="true" /></span>
          <span className="it-task-copy"><strong>{t('Microsoft 365 accounts')}</strong><span>{t('Create work email accounts, choose licenses and review provisioning status.')}</span></span>
          <ArrowUpRight size={21} aria-hidden="true" />
        </Link>
        <Link className="it-task" to="/it/approval-settings" aria-label={t('Approval settings')}>
          <span className="it-task-icon"><Network size={23} aria-hidden="true" /></span>
          <span className="it-task-copy"><strong>{t('Approval settings')}</strong><span>{t('Set reporting managers and the person responsible for each employee’s leave approval.')}</span></span>
          <ArrowUpRight size={21} aria-hidden="true" />
        </Link>
      </div>
      <div className="it-personal-links">
      {leaveEnabled && linked && <Link className="ow-button" to="/requests">{t('My Approval')}</Link>}
      {leaveEnabled && linked && <Link className="ow-button" to="/my-leave">{t('My Leave')}</Link>}
      {attendanceEnabled && linked && <Link className="ow-button" to="/my-attendance">{t('My Attendance')}</Link>}
      {linked && <Link className="ow-button" to="/documents">{t('My Documents')}</Link>}
      <Link className="ow-button" to="/announcements">{t('Announcements')}</Link>
      </div>
    </nav>
    {!linked && <div className="it-profile-note" role="status" data-it-unlinked>
      <Info size={18} aria-hidden="true" /><div>
      <h3>{t('This account is not linked to an employee record')}</h3>
      <p>{t('Leave approvals and personal self-service (leave, attendance, documents) need a linked employee record, so they are not shown. IT operations are not affected.')}</p>
      </div>
    </div>}
  </OperationalWorkspace>;
}
