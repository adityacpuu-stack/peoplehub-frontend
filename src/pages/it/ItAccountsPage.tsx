import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, MailPlus } from 'lucide-react';
import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { itAccountService, type ItAccountRow, type ItCompany, type ItLicense, type ItListParams, type ItSummary, type ProvisionResult } from '@/services/it-account.service';
import { reasonLabel, statusLabel, failureLabel, errorMessage, mailboxNote } from './it-labels';
import './it.css';

const USERNAME = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
export const usernameProblem = (value: string) => !value ? 'Enter a username.'
  : !USERNAME.test(value) || value.includes('..') ? 'Use lowercase letters, numbers, dots, hyphens or underscores, starting and ending with a letter or number.' : '';

export function ItAccountsPage() {
  useLocale();
  const [filters, setFilters] = useState<ItListParams>({ page: 1, limit: 20, status: 'all' });
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ItAccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [companies, setCompanies] = useState<ItCompany[]>([]);
  const [summary, setSummary] = useState<ItSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [target, setTarget] = useState<ItAccountRow | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let current = true;
    itAccountService.companies().then(data => { if (current) setCompanies(data); }).catch(() => { if (current) setCompanies([]); });
    return () => { current = false; clearTimeout(searchTimer.current); };
  }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setError(false);
    Promise.all([itAccountService.list(filters), itAccountService.summary()])
      .then(([list, stats]) => { if (!current) return; setRows(list.data); setTotal(list.pagination.total); setPages(list.pagination.totalPages); setSummary(stats); })
      .catch(() => { if (current) setError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filters, revision]);
  const onSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setFilters(previous => ({ ...previous, page: 1, search: value })), 350);
  };
  const number = (value: number) => value.toLocaleString(intlLocale());

  return <OperationalWorkspace module="operations" className="it-workspace it-accounts" title={t('Microsoft 365 accounts')}
    description={t('Manage work email accounts and licenses for employees in your assigned companies.')}
    actions={<button className="ow-button" disabled={loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={15} aria-hidden="true" />{t('Refresh')}</button>}
    filters={<>
      <label className="ow-field">{t('Search employees')}<input value={search} maxLength={100} placeholder={t('Name or employee ID')} onChange={e => onSearch(e.target.value)} /></label>
      <label className="ow-field">{t('Company')}<select aria-label={t('Company')} value={filters.company_id ?? ''} onChange={e => setFilters(p => ({ ...p, page: 1, company_id: e.target.value ? Number(e.target.value) : undefined }))}>
        <option value="">{t('All assigned companies')}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="ow-field">{t('Account status')}<select aria-label={t('Account status')} value={filters.status} onChange={e => setFilters(p => ({ ...p, page: 1, status: e.target.value as ItListParams['status'] }))}>
        <option value="all">{t('All employees')}</option><option value="no_mailbox">{t('Without work email')}</option>
        <option value="needs_attention">{t('Needs attention')}</option><option value="provisioned">{t('Created here')}</option></select></label>
    </>}
    summary={summary && !error && <dl className="ow-metrics">
      <div><dt>{t('Without work email')}</dt><dd>{number(summary.without_mailbox)}</dd></div>
      <div><dt>{t('Created here')}</dt><dd>{number(summary.provisioned)}</dd></div>
      <div><dt>{t('Needs attention')}</dt><dd>{number(summary.needs_attention)}</dd></div>
      {!summary.m365_configured && <div className="it-span"><dt>{t('Microsoft 365')}</dt><dd className="it-warning">{t('Not configured. Accounts cannot be created yet.')}</dd></div>}
    </dl>}>
    <section className="ow-register">
      <div className="ow-toolbar"><p>{loading ? t('Loading employees...') : t('{count} employees', { count: number(total) })}</p></div>
      {loading ? <div className="ow-feedback" role="status">{t('Loading employees...')}</div>
        : error ? <div className="ow-feedback" role="alert">{t('Unable to load employees.')} <button className="ow-button" onClick={() => setRevision(v => v + 1)}>{t('Retry')}</button></div>
        : rows.length === 0 ? <div className="ow-feedback"><h3>{t('No employees in this view')}</h3><p>{t('Only active employees of your assigned companies are listed.')}</p></div>
        : <div className="ow-table-scroll"><table className="ow-table it-table">
          <thead><tr><th>{t('Employee')}</th><th>{t('Company')}</th><th>{t('Work email')}</th><th>{t('Microsoft 365')}</th><th><span className="sr-only">{t('Action')}</span></th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id} data-it-row={row.id}>
            <td><div className="it-person"><span className="it-avatar" aria-hidden="true">{row.name.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</span><div><strong>{row.name}</strong><small>{row.employee_id || '-'}</small></div></div></td>
            <td>{row.company.name}</td>
            <td>{row.work_email || <span className="it-muted">{t('None')}</span>}</td>
            <td><span className="ow-status" data-status={row.mailbox.status === 'completed' ? 'approved' : row.mailbox.status === 'needs_attention' ? 'rejected' : row.mailbox.status === 'creating' ? 'pending' : 'none'}>{statusLabel(row.mailbox.status)}</span>
              {row.mailbox.failure_code ? <small>{failureLabel(row.mailbox.failure_code)}</small> : mailboxNote(row.mailbox) && <small>{mailboxNote(row.mailbox)}</small>}</td>
            <td className="it-action">{row.can_provision
              ? <button className="ow-button ow-primary" disabled={summary?.m365_configured === false} onClick={() => setTarget(row)}><MailPlus size={15} aria-hidden="true" />{t('Create account')}</button>
              : <small>{reasonLabel(row.ineligible_reason)}</small>}</td>
          </tr>)}</tbody></table></div>}
      {!loading && !error && <div className="ow-pagination"><span>{t('Page {page} of {pages}', { page: number(filters.page), pages: number(pages) })}</span><nav>
        <button className="ow-button" disabled={filters.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>{t('Previous')}</button>
        <button className="ow-button" disabled={filters.page >= pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>{t('Next')}</button></nav></div>}
    </section>
    {target && <ProvisionDialog row={target} onClose={changed => { setTarget(null); if (changed) setRevision(v => v + 1); }} />}
  </OperationalWorkspace>;
}

function ProvisionDialog({ row, onClose }: { row: ItAccountRow; onClose: (changed: boolean) => void }) {
  useLocale();
  const [username, setUsername] = useState('');
  const [licenses, setLicenses] = useState<ItLicense[] | null>(null);
  const [licenseError, setLicenseError] = useState(false);
  const [license, setLicense] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ code?: string; message?: string } | null>(null);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const submitting = useRef(false);
  // Any server attempt may have recorded a status (e.g. a failed, retryable attempt): refresh the list on close.
  const attempted = useRef(false);
  useEffect(() => { itAccountService.licenses().then(setLicenses).catch(() => setLicenseError(true)); }, []);
  const problem = usernameProblem(username);
  const submit = async () => {
    if (submitting.current || problem || result) return;
    submitting.current = true; attempted.current = true; setBusy(true); setFailure(null);
    try {
      const outcome = await itAccountService.provision({ employee_id: row.id, username, ...(license ? { license_sku_id: license } : {}) });
      setResult(outcome);
      if (outcome.status === 'completed') toast.success(t('Microsoft 365 account created.'));
    } catch (error) {
      const data = (error as { response?: { data?: { error?: { code?: string; message?: string } } } }).response?.data?.error;
      setFailure({ code: data?.code, message: data?.message });
    } finally { submitting.current = false; setBusy(false); }
  };
  const licensed = !!result && result.license_requested && result.license_assigned;
  return <OperationalDialog title={result ? t('Account request result') : t('Create Microsoft 365 account')} subtitle={`${row.name} · ${row.company.name}`} busy={busy} className="it-dialog it-provision-dialog" onClose={() => onClose(attempted.current)}>
    <div className="ow-dialog-body">
      {result ? <div className="it-result" role="status">
        <p className="it-address">{result.email}</p>
        {result.status === 'completed'
          ? <p>{t('The Microsoft 365 account was created. The temporary password was handed to the email service for the employee\'s personal address; inbox delivery is not confirmed. You will not see the password.')}</p>
          : <p className="it-warning">{t('The account needs attention:')} {failureLabel(result.failure_code)} {t('Ask a Microsoft 365 administrator to finish it; do not create another account.')}</p>}
        {result.status === 'completed' && !licensed && <p className="it-warning" data-it-license-followup>{t('No license was assigned: the work email is not active yet. Ask a Microsoft 365 administrator to assign a license.')}</p>}
        <ul className="it-checks">
          <li data-ok={!result.license_requested || result.license_assigned}>{result.license_requested ? (result.license_assigned ? t('License assigned') : t('License not assigned')) : t('No license requested')}</li>
          {/* false only proves "none configured" on a completed result; otherwise the step is unconfirmed. */}
          <li data-ok={result.groups_added || result.status === 'completed'}>{result.groups_added ? t('Added to the configured company group') : result.status === 'completed' ? t('No company group configured') : t('Company group setup not confirmed')}</li>
          <li data-ok={result.credential_sent}>{result.credential_sent ? t('Sign-in details handed to the email service') : t('Sign-in details not sent')}</li>
        </ul>
        <div className="ph-form-actions"><button className="ow-button ow-primary" onClick={() => onClose(true)}>{t('Done')}</button></div>
      </div> : <>
        <div className="it-form-section">
        <label className="ow-field">{t('Username')}
          <span className="it-username"><input value={username} autoComplete="off" spellCheck={false} maxLength={64} aria-invalid={!!username && !!problem}
            onChange={e => setUsername(e.target.value.trim().toLowerCase())} /><span aria-hidden="true">@{row.domain}</span></span></label>
        <p className="it-hint">{t('Address')}: <strong>{username || '…'}@{row.domain}</strong></p>
        {username && problem && <p className="it-error" role="alert">{t(problem)}</p>}
        </div><div className="it-form-section">
        <label className="ow-field">{t('Microsoft 365 license')}
          <select value={license} onChange={e => setLicense(e.target.value)} disabled={!licenses}>
            <option value="">{t('No license now (assign later)')}</option>
            {licenses?.map(l => <option key={l.sku_id} value={l.sku_id} disabled={l.available <= 0}>{l.name} · {t('{count} available', { count: l.available.toLocaleString(intlLocale()) })}</option>)}
          </select></label>
        {!license && <p className="it-hint">{t('Without a license the account has no working mailbox until a license is assigned.')}</p>}
        {licenseError && <p className="it-hint">{t('Licenses could not be loaded. You can still create the account without a license.')}</p>}
        </div>
        <ul className="it-notes">
          <li>{t('The temporary password is sent only to the employee\'s personal email')}{row.personal_email_hint ? ` (${row.personal_email_hint})` : ''}. {t('It is never shown to you.')}</li>
          <li>{t('An existing Microsoft 365 account is never reused. If the address is taken, choose another username.')}</li>
          <li>{t('The employee\'s PeopleHub sign-in and password do not change.')}</li>
        </ul>
        {failure && <p className="it-error" role="alert">{errorMessage(failure.code, failure.message)}</p>}
        <div className="ph-form-actions">
          <button className="ow-button" disabled={busy} onClick={() => onClose(attempted.current)}>{t('Cancel')}</button>
          <button className="ow-button ow-primary" disabled={busy || !!problem} onClick={() => void submit()}>{busy ? t('Creating...') : t('Create account')}</button>
        </div>
      </>}
    </div>
  </OperationalDialog>;
}
