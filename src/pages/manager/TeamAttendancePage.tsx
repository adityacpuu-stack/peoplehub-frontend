import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { intlLocale, useLocale } from '@/i18n';
import { OperationalDialog, OperationalWorkspace } from '@/components/ui/OperationalWorkspace';
import { attendanceService } from '@/services/attendance.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Attendance } from '@/types';
import { TeamFeedback, TeamPagination } from './team-management';
import { calendarDate } from './team-management-utils';
import { teamTimeText as t } from './team-time.catalog';
import './team-management.css';
import './team-time.css';

const statuses: Record<string, string> = { present: 'Present', late: 'Late', absent: 'Absent', on_leave: 'On Leave', work_from_home: 'WFH', half_day: 'Half Day', holiday: 'Holiday', weekend: 'Weekend' };
const normalizedStatus = (value: string) => value === 'wfh' ? 'work_from_home' : value;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
function hours(value: Attendance['total_hours']) {
  return value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : `${Number(value).toLocaleString(intlLocale(), { maximumFractionDigits: 2 })} ${t('h')}`;
}
function time(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString(intlLocale(), { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
}
function Status({ value }: { value: string }) {
  return <span className="tm-status" data-status={value === 'on_leave' ? 'leave' : normalizedStatus(value)}>{t(statuses[normalizedStatus(value)] || 'Unavailable')}</span>;
}

export function TeamAttendancePage() {
  useLocale();
  const userId = useAuthStore(state => state.user?.id);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Attendance | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false); setRecords([]); setSelected(null);
      try {
        const result = await attendanceService.getTeamAttendance({ date });
        if (!cancelled) setRecords(result ?? []);
      } catch { if (!cancelled) setFailed(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [date, retry, userId]);

  const query = search.trim().toLowerCase();
  const filtered = records.filter(row => (!query || [row.employee?.name, row.employee?.employee_id].some(value => value?.toLowerCase().includes(query))) && (status === 'all' || normalizedStatus(row.status) === status));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const changeDate = (value: string) => { if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { setDate(value); setPage(1); } };
  const moveDate = (days: number) => {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    changeDate(next.toISOString().slice(0, 10));
  };

  return <OperationalWorkspace module="operations" className="tm-page tt-page" title={t('Team Attendance')} description={t('Recorded attendance for your team. Missing records are not counted as absences.')}
    actions={<button className="ow-button" disabled={loading} onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} />{t('Refresh')}</button>}
    filters={<>
      <label className="tm-search"><Search size={17} /><input aria-label={t('Search team')} placeholder={t('Search by name or employee ID...')} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="ow-field">{t('Date')}<input aria-label={t('Date')} type="date" value={date} onChange={event => changeDate(event.target.value)} /></label>
      <div className="tt-date-actions"><button className="ow-button" aria-label={t('Previous day')} onClick={() => moveDate(-1)}><ChevronLeft size={16} /></button><button className="ow-button" aria-label={t('Next day')} disabled={date >= today()} onClick={() => moveDate(1)}><ChevronRight size={16} /></button><button className="ow-button" disabled={date === today()} onClick={() => changeDate(today())}>{t('Today')}</button></div>
      <label className="ow-field">{t('Status')}<select aria-label={t('Status')} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">{t('All')}</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
    </>}>
    <div className="tt-register-heading"><h2>{calendarDate(date)}</h2><span>{t('Times shown in WIB')}</span></div>
    {loading || failed || !filtered.length ? <TeamFeedback loading={loading} failed={failed} empty={records.length ? t('No matching attendance records') : t('No attendance records for this date')} onRetry={() => setRetry(value => value + 1)} /> :
      <div className="tm-table-scroll"><table className="tm-table tt-table"><thead><tr><th>{t('Employee')}</th><th>{t('Status')}</th><th>{t('Check In')}</th><th>{t('Check Out')}</th><th>{t('Work Hours')}</th><th>{t('Overtime')}</th><th><span className="sr-only">{t('Actions')}</span></th></tr></thead><tbody>
        {filtered.slice((currentPage - 1) * 20, currentPage * 20).map(row => <tr key={row.id}>
          <td><div className="tm-person"><span className="tm-avatar" aria-hidden="true">{row.employee?.name?.split(' ').map(part => part[0]).join('').slice(0, 2) || '—'}</span><div><strong>{row.employee?.name || t('Unknown')}</strong><small>{row.employee?.employee_id || '—'}{row.employee?.department?.name && ` · ${row.employee.department.name}`}</small></div></div></td>
          <td data-label={t('Status')}><Status value={row.status} /></td><td data-label={t('Check In')}>{time(row.check_in)}</td><td data-label={t('Check Out')}>{time(row.check_out)}</td><td data-label={t('Work Hours')}>{hours(row.total_hours)}</td><td data-label={t('Overtime')}>{hours(row.overtime_hours)}</td>
          <td><button className="ow-button" aria-label={t('View {name}', { name: row.employee?.name || t('Unknown') })} onClick={() => setSelected(row)}>{t('View Details')}</button></td>
        </tr>)}
      </tbody></table></div>}
    {!loading && !failed && <><div className="tm-summary"><span><strong>{records.length}</strong>{t('recorded entries')}</span><span><strong>{records.filter(row => !!row.check_in).length}</strong>{t('checked in')}</span><span><strong>{records.filter(row => row.status === 'late').length}</strong>{t('late entries')}</span></div><TeamPagination page={currentPage} total={filtered.length} onPage={setPage} /></>}
    {selected && <OperationalDialog title={selected.employee?.name || t('Unknown')} subtitle={`${selected.employee?.employee_id || '—'} · ${calendarDate(selected.date)}`} onClose={() => setSelected(null)} className="operations-refresh-dialog tm-dialog tt-dialog">
      <div className="ow-dialog-body"><div className="tm-detail-status"><strong>{t('Attendance details')}</strong><Status value={selected.status} /></div><dl className="tm-details">
        <div><dt>{t('Check In')} (WIB)</dt><dd>{time(selected.check_in)}</dd></div><div><dt>{t('Check Out')} (WIB)</dt><dd>{time(selected.check_out)}</dd></div>
        <div><dt>{t('Work Hours')}</dt><dd>{hours(selected.total_hours)}</dd></div><div><dt>{t('Overtime')}</dt><dd>{hours(selected.overtime_hours)}</dd></div>
        <div className="tm-wide"><dt>{t('Notes')}</dt><dd>{selected.notes || '—'}</dd></div>
      </dl></div><footer className="tm-dialog-actions"><button className="ow-button" onClick={() => setSelected(null)}>{t('Close')}</button></footer>
    </OperationalDialog>}
  </OperationalWorkspace>;
}
