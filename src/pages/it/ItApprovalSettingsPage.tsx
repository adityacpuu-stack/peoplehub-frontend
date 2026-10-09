import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/employees/operations-workflows.css';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Pencil } from 'lucide-react';
import { OperationalWorkspace, OperationalDialog } from '@/components/ui/OperationalWorkspace';
import { itAccountService, type ItCompany } from '@/services/it-account.service';
import { itApprovalService, type ApprovalCandidate, type ApprovalRow, type RelationView, type RoutingField } from '@/services/it-approval.service';
import './it.css';

const ROUTE_LABEL: Record<ApprovalRow['effective_route'], string> = {
  leave_approver: 'Leave approver', managers: 'Manager and direct manager', hr_fallback: 'HR fallback (no approver set)',
};
const ERRORS: Record<string, string> = {
  IT_ASSIGNMENT_CHANGED: 'This employee was changed by someone else. Reload and try again.',
  IT_SELF_ASSIGNMENT: 'An employee cannot be their own manager or approver.',
  IT_ASSIGNEE_OUT_OF_SCOPE: 'The selected person is not available in your companies.',
  IT_ASSIGNEE_CANNOT_APPROVE: 'The selected person cannot approve leave (needs an active account with a manager-level role).',
  IT_APPROVER_NOT_DIRECT_MANAGER: 'An IT Admin can only approve leave for direct reports: set them as manager or direct manager too.',
  IT_ASSIGNMENT_CYCLE: 'This would create a reporting cycle.',
  IT_ROUTING_UNAPPROVABLE: 'Nobody in the resulting routing could approve this employee\'s leave.',
  IT_ROUTING_TOO_DEEP: 'The reporting chain is too long to verify.',
  IT_OWN_RECORD: 'You cannot change your own approval routing.',
  IT_NOT_ACTIVE: 'Only active employees can be configured.',
  NOT_FOUND: 'Employee not found in your assigned companies.',
  VALIDATION_ERROR: 'Check the selected values.',
  FORBIDDEN: 'You do not have access to this action.',
};
const FIELDS: { field: RoutingField; key: 'manager' | 'direct_manager' | 'leave_approver'; label: string; help: string }[] = [
  { field: 'manager_id', key: 'manager', label: 'Manager',
    help: 'Approves leave when no leave approver is set. Changing it also changes other manager-based workflows: a manager-level person set here can also approve this employee\'s overtime, and team views and the org chart follow it.' },
  { field: 'direct_manager_id', key: 'direct_manager', label: 'Direct manager',
    help: 'A separate reporting field kept from earlier data. Like the manager, it approves leave when no leave approver is set and affects overtime approval, team views and the org chart.' },
  { field: 'leave_approver_id', key: 'leave_approver', label: 'Leave approver', help: 'When set, only this person approves leave. Clearing it returns approval to the manager and direct manager.' },
];

export function RelationText({ view }: { view: RelationView }) {
  useLocale();
  if (view.state === 'none') return <span className="it-muted">{t('Not set')}</span>;
  if (view.state === 'out_of_scope') return <span className="it-muted">{t('Outside your companies')}</span>;
  return <>{view.name}{view.state === 'unavailable' && <small className="it-warning">{t('Cannot approve leave')}</small>}</>;
}

export function ItApprovalSettingsPage() {
  useLocale();
  const [page, setPage] = useState(1);
  const [companyId, setCompanyId] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [companies, setCompanies] = useState<ItCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<ApprovalRow | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    itAccountService.companies().then(setCompanies).catch(() => setCompanies([]));
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setError(false);
    itApprovalService.list({ page, limit: 20, company_id: companyId, search: query })
      .then(result => { if (!current) return; setRows(result.data); setTotal(result.pagination.total); setPages(result.pagination.totalPages); })
      .catch(() => { if (current) setError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, companyId, query, revision]);
  const onSearch = (value: string) => {
    setSearch(value); clearTimeout(timer.current);
    timer.current = setTimeout(() => { setPage(1); setQuery(value); }, 350);
  };
  const number = (value: number) => value.toLocaleString(intlLocale());

  return <OperationalWorkspace module="operations" className="it-workspace it-approvals" title={t('Approval settings')}
    description={t('Manage reporting lines and leave approvers for your assigned companies.')}
    actions={<button className="ow-button" disabled={loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={15} aria-hidden="true" />{t('Refresh')}</button>}
    filters={<>
      <label className="ow-field">{t('Search employees')}<input value={search} maxLength={100} placeholder={t('Name or employee ID')} onChange={e => onSearch(e.target.value)} /></label>
      <label className="ow-field">{t('Company')}<select aria-label={t('Company')} value={companyId ?? ''} onChange={e => { setPage(1); setCompanyId(e.target.value ? Number(e.target.value) : undefined); }}>
        <option value="">{t('All assigned companies')}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    </>}>
    <section className="ow-register">
      <div className="ow-toolbar"><p>{loading ? t('Loading employees...') : t('{count} employees', { count: number(total) })}</p></div>
      {loading ? <div className="ow-feedback" role="status">{t('Loading employees...')}</div>
        : error ? <div className="ow-feedback" role="alert">{t('Unable to load employees.')} <button className="ow-button" onClick={() => setRevision(v => v + 1)}>{t('Retry')}</button></div>
        : rows.length === 0 ? <div className="ow-feedback"><h3>{t('No employees in this view')}</h3><p>{t('Only active employees of your assigned companies are listed.')}</p></div>
        : <div className="ow-table-scroll"><table className="ow-table it-table">
          <thead><tr><th>{t('Employee')}</th><th>{t('Company')}</th><th>{t('Manager')}</th><th>{t('Direct manager')}</th><th>{t('Leave approver')}</th><th>{t('Decides leave now')}</th><th><span className="sr-only">{t('Action')}</span></th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id} data-approval-row={row.id}>
            <td><strong>{row.name}</strong><small>{[row.employee_id, row.title].filter(Boolean).join(' · ') || '-'}</small></td>
            <td>{row.company.name}{row.department && <small>{row.department}</small>}</td>
            <td><RelationText view={row.manager} /></td>
            <td><RelationText view={row.direct_manager} /></td>
            <td><RelationText view={row.leave_approver} /></td>
            <td><span className="it-route-label" data-route={row.effective_route}>{t(ROUTE_LABEL[row.effective_route])}</span></td>
            <td className="it-action">{row.editable
              ? <button className="ow-button" onClick={() => setEditing(row)}><Pencil size={14} aria-hidden="true" />{t('Edit')}</button>
              : <small>{t('Your own routing: ask another administrator')}</small>}</td>
          </tr>)}</tbody></table></div>}
      {!loading && !error && <div className="ow-pagination"><span>{t('Page {page} of {pages}', { page: number(page), pages: number(pages) })}</span><nav>
        <button className="ow-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Previous')}</button>
        <button className="ow-button" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{t('Next')}</button></nav></div>}
    </section>
    {editing && <RoutingDialog row={editing} onClose={saved => { setEditing(null); if (saved) setRevision(v => v + 1); }} />}
  </OperationalWorkspace>;
}

/** 'keep' = unchanged (not sent), 'clear' = explicit null, otherwise a candidate id. */
type Choice = 'keep' | 'clear' | number;

type CandidatePage = { status: 'loading' | 'ready' | 'error'; items: ApprovalCandidate[]; page: number; totalPages: number; total: number; search: string; more: boolean };

function RoutingDialog({ row, onClose }: { row: ApprovalRow; onClose: (saved: boolean) => void }) {
  useLocale();
  const [choices, setChoices] = useState<Record<RoutingField, Choice>>({ manager_id: 'keep', direct_manager_id: 'keep', leave_approver_id: 'keep' });
  const [search, setSearch] = useState('');
  const [list, setList] = useState<CandidatePage>({ status: 'loading', items: [], page: 0, totalPages: 1, total: 0, search: '', more: false });
  const [busy, setBusy] = useState(false);
  // The error code is kept, not its text, so a language switch re-translates an open failure.
  const [failure, setFailure] = useState<string | null>(null);
  const submitting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Each request takes a generation; a response from an older search or a closed dialog is dropped.
  const generation = useRef(0);
  const load = (value: string, page: number) => {
    const id = ++generation.current;
    setList(previous => page === 1
      ? { status: 'loading', items: [], page: 0, totalPages: 1, total: 0, search: value, more: false }
      : { ...previous, more: true, status: 'ready' });
    itApprovalService.candidates(row.id, value, page)
      .then(result => {
        if (id !== generation.current) return;
        setList(previous => ({ status: 'ready', items: page === 1 ? result.data : [...previous.items, ...result.data], page: result.pagination.page,
          totalPages: result.pagination.totalPages, total: result.pagination.total, search: value, more: false }));
      })
      .catch(() => { if (id === generation.current) setList(previous => ({ ...previous, status: 'error', more: false })); });
  };
  useEffect(() => {
    load('', 1);
    return () => { generation.current++; clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onSearch = (value: string) => { setSearch(value); clearTimeout(timer.current); timer.current = setTimeout(() => load(value, 1), 350); };
  const changes = Object.fromEntries(Object.entries(choices).filter(([, choice]) => choice !== 'keep')
    .map(([field, choice]) => [field, choice === 'clear' ? null : choice])) as Partial<Record<RoutingField, number | null>>;
  const changed = Object.keys(changes).length > 0;
  // Selected people stay listed even when a later search no longer returns them.
  const picked = useRef(new Map<number, ApprovalCandidate>());
  const options = [...new Map([...list.items, ...picked.current.values()].map(c => [c.id, c])).values()];
  const save = async () => {
    if (submitting.current || !changed) return;
    submitting.current = true; setBusy(true); setFailure(null);
    try {
      await itApprovalService.update(row.id, row.updated_at, changes);
      toast.success(t('Approval routing saved.'));
      onClose(true);
    } catch (error) {
      const code = (error as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
      setFailure(code && ERRORS[code] ? code : 'UNKNOWN');
    } finally { submitting.current = false; setBusy(false); }
  };
  const number = (value: number) => value.toLocaleString(intlLocale());
  return <OperationalDialog title={t('Edit approval routing')} subtitle={`${row.name} · ${row.company.name}`} busy={busy} className="it-dialog it-routing-dialog" onClose={() => onClose(false)}>
    <div className="ow-dialog-body">
      <div className="it-routing-note"><p className="it-hint">{t('A designated leave approver takes priority. Without one, both the manager and the direct manager can approve.')}</p>
      <p className="it-hint">{t('Changes apply immediately, including to leave requests that are still pending: they move to the new approver. Request status and leave balances do not change.')}</p></div>
      <label className="ow-field">{t('Find a person')}<input value={search} maxLength={100} placeholder={t('Name or employee ID')} onChange={e => onSearch(e.target.value)} /></label>
      <div className="it-candidates" data-candidate-state={list.status}>
        {list.status === 'loading' && <p className="it-hint" role="status">{t('Loading people...')}</p>}
        {list.status === 'error' && <p className="it-error" role="alert">{t('People could not be loaded.')}{' '}
          <button className="ow-button" onClick={() => list.items.length ? load(list.search, list.page + 1) : load(list.search, 1)}>{t('Retry')}</button></p>}
        {list.status === 'ready' && list.total === 0 && <p className="it-hint" role="status">{list.search.trim()
          ? t('No one who can approve leave matches this search.') : t('No one in your companies can approve leave yet.')}</p>}
        {list.status !== 'loading' && list.total > 0 && <p className="it-hint" data-candidate-count>
          {t('Showing {shown} of {total} people who can approve leave.', { shown: number(list.items.length), total: number(list.total) })}{' '}
          {list.page < list.totalPages && list.status === 'ready' && <button className="ow-button" disabled={list.more} onClick={() => load(list.search, list.page + 1)}>
            {list.more ? t('Loading people...') : t('Load more')}</button>}
        </p>}
      </div>
      <div className="it-routing-fields">{FIELDS.map(({ field, key, label, help }) => {
        const current = row[key];
        return <div key={field} className="it-routing-field">
          <label className="ow-field">{t(label)}
            <select aria-label={t(label)} value={String(choices[field])} onChange={e => {
              const value = e.target.value;
              const choice: Choice = value === 'keep' || value === 'clear' ? value : Number(value);
              if (typeof choice === 'number') { const c = options.find(o => o.id === choice); if (c) picked.current.set(c.id, c); }
              setChoices(previous => ({ ...previous, [field]: choice }));
            }}>
              <option value="keep">{t('Keep current')}</option>
              {current.state !== 'none' && <option value="clear">{t('Clear (not set)')}</option>}
              {options.map(c => <option key={c.id} value={c.id}>{c.name}{c.employee_id ? ` · ${c.employee_id}` : ''} · {c.company.name}{c.capability === 'direct_reports_only' ? ` · ${t('direct reports only')}` : ''}</option>)}
            </select></label>
          <p className="it-current">{t('Current')}: <RelationText view={current} /></p>
          <p className="it-hint">{t(help)}</p>
        </div>;
      })}</div>
      {choices.leave_approver_id === 'clear' && <p className="it-hint" role="status">{t('After clearing, the manager and direct manager approve this employee\'s leave.')}</p>}
      {failure && <p className="it-error" role="alert">{t(ERRORS[failure] ?? 'The routing could not be saved. Try again.')}</p>}
      <div className="ph-form-actions">
        <button className="ow-button" disabled={busy} onClick={() => onClose(false)}>{t('Cancel')}</button>
        <button className="ow-button ow-primary" disabled={busy || !changed} onClick={() => void save()}>{busy ? t('Saving...') : t('Save routing')}</button>
      </div>
    </div>
  </OperationalDialog>;
}
