import { t, useLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { OperationalDialog, OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { dashboardService, type TeamDashboard, type TeamMember } from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth.store';
import { canOpenEmployee } from '@/lib/actions';
import { TeamFeedback, TeamPagination, TeamStatus } from './team-management';
import { calendarDate } from './team-management-utils';
import './team-management.css';

export function MyTeamPage() {
  useLocale();
  const { user } = useAuthStore();
  const [data, setData] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [member, setMember] = useState<TeamMember | null>(null);
  const attendanceEnabled = user?.companyFeatures?.attendance_enabled ?? true;
  const leaveEnabled = user?.companyFeatures?.leave_enabled ?? true;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false); setMember(null);
      try { const result = await dashboardService.getTeamDashboard(); if (!cancelled) setData(result); }
      catch { if (!cancelled) { setFailed(true); setData(null); } }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [retry, user?.id]);

  const query = search.trim().toLowerCase();
  const filtered = (data?.team_members ?? []).filter(row =>
    [row.name, row.employee_id, row.position, row.department].some(value => value?.toLowerCase().includes(query)) &&
    (status === 'all' || row.status_today === status));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  return <OperationalWorkspace module="operations" className="tm-page" title={t("My Team")} description={t("People reporting to you, with their role and contact details.")}
    actions={<button className="ow-button" onClick={() => setRetry(value => value + 1)} disabled={loading}><RefreshCw size={15} />{t("Refresh")}</button>}
    filters={<><label className="tm-search"><Search size={17} /><input aria-label={t("Search team")} placeholder={t("Search name, employee ID or role…")} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="ow-field">{t("Status")}<select aria-label={t("Status")} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">{t("All team members")}</option>{attendanceEnabled && <><option value="present">{t("Present")}</option><option value="late">{t("Late")}</option><option value="not_checked_in">{t("Not checked in")}</option><option value="absent">{t("Absent")}</option></>}{leaveEnabled && <option value="leave">{t("On leave")}</option>}</select></label></>}>
    {loading || failed || !filtered.length ? <TeamFeedback loading={loading} failed={failed} empty={data?.team_members.length ? t("No matching team members") : t("No team members assigned")} onRetry={() => setRetry(value => value + 1)} /> :
      <div className="tm-table-scroll"><table className="tm-table"><thead><tr><th>{t("Employee")}</th><th>{t("Role & department")}</th><th>{t("Contact")}</th>{attendanceEnabled && <th>{t("Today")}</th>}<th><span className="sr-only">{t("Actions")}</span></th></tr></thead><tbody>
        {filtered.slice((currentPage - 1) * 20, currentPage * 20).map(row => <tr key={row.id}>
          <td><div className="tm-person"><span className="tm-avatar" aria-hidden="true">{row.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{row.name}</strong><small>{row.employee_id}</small></div></div></td>
          <td><strong>{row.position || '—'}</strong><small>{row.department || '—'}</small></td><td className="tm-contact">{row.email || '—'}<small>{row.phone || '—'}</small></td>
          {attendanceEnabled && <td><TeamStatus status={row.status_today} />{row.check_in_time && <small>{t("In at")} {row.check_in_time}</small>}</td>}
          <td><button className="ow-button" aria-label={t('View {name}', { name: row.name })} onClick={() => setMember(row)}>{t("View profile")}</button></td>
        </tr>)}
      </tbody></table></div>}
    {!loading && !failed && <><div className="tm-summary"><span><strong>{data?.team_size ?? 0}</strong>{' '}{t("team members")}</span>{attendanceEnabled && <span><strong>{data?.present_today ?? 0}</strong>{' '}{t("checked in today")}</span>}{leaveEnabled && <span><strong>{data?.on_leave_today ?? 0}</strong>{' '}{t("on leave today")}</span>}</div><TeamPagination page={currentPage} total={filtered.length} onPage={setPage} /></>}
    {member && <OperationalDialog title={member.name} subtitle={`${member.employee_id} · ${member.position || t("Team member")}`} onClose={() => setMember(null)} className="operations-refresh-dialog tm-dialog">
      <div className="ow-dialog-body"><dl className="tm-details"><div><dt>{t("Department")}</dt><dd>{member.department || '—'}</dd></div><div><dt>{t("Join date")}</dt><dd>{calendarDate(member.join_date)}</dd></div><div><dt>{t("Email")}</dt><dd>{member.email || '—'}</dd></div><div><dt>{t("Phone")}</dt><dd>{member.phone || '—'}</dd></div>
        {attendanceEnabled && <><div><dt>{t("Today’s status")}</dt><dd><TeamStatus status={member.status_today} /></dd></div><div><dt>{t("Check-in")}</dt><dd>{member.check_in_time || '—'}</dd></div></>}
        {leaveEnabled && <div><dt>{t("Pending leave requests")}</dt><dd>{member.pending_leaves}</dd></div>}
      </dl></div>
      <footer className="tm-dialog-actions"><button className="ow-button" onClick={() => setMember(null)}>{t("Close")}</button>{canOpenEmployee(user, member.id) && <Link className="ow-button ow-primary" to={`/employees/${member.id}`}>{t("Full profile")}</Link>}</footer>
    </OperationalDialog>}
  </OperationalWorkspace>;
}
