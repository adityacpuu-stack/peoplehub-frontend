import { t, useLocale, intlLocale } from '@/i18n';
import { useState } from 'react';
import { OwnLeaveBalanceDialog } from '@/components/leave/LeaveBalanceDialog';
import { ArrowRight, Info, CalendarDays, Clock3, FileText, Megaphone, RefreshCw, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyDashboard } from '@/services/dashboard.service';
import type { User } from '@/types';
import { getNavigation } from '@/components/layout/navigation';
import { useNavigationConfig } from '@/components/layout/useNavigationConfig';
import './employee-dashboard.css';

interface Props {
  user: User | null;
  myDashboard: MyDashboard | null;
  greeting: () => string;
  failed?: boolean;
  onRetry: () => void;
}

const number = (value: unknown) => value == null || !Number.isFinite(Number(value)) ? '\u2014' : Number(value).toLocaleString(intlLocale());
const dateLabel = (value: string) => {
  const date = new Date(value.slice(0, 10) + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? '\u2014' : date.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
const timeLabel = (value: string | null | undefined) => {
  if (!value) return '\u2014';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '\u2014' : date.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
};
const statuses: Record<string, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', present: 'Present', late: 'Late', absent: 'Absent', on_leave: 'On leave', wfh: 'WFH', holiday: 'Holiday', half_day: 'Half day', early_leave: 'Early departure' };
function Status({ value }: { value: string }) {
  useLocale();
  return <span className="ess-status" data-status={value}>{statuses[value] ? t(statuses[value]) : value || t('Unknown')}</span>;
}

export function EmployeeDashboard({ user, myDashboard, greeting, failed, onRetry }: Props) {
  useLocale();
  const [showBalances, setShowBalances] = useState(false);
  useNavigationConfig();
  const navigation = getNavigation(user);
  const can = (path: string) => navigation.links.some(item => item.path === path);
  const name = user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0] || t('there');
  const quickLinks = [
    { path: '/my-leave', label: 'My leave', detail: 'Balance & requests', icon: CalendarDays },
    { path: '/my-attendance', label: 'My attendance', detail: 'Your attendance history', icon: Clock3 },
    { path: '/documents', label: 'My documents', detail: 'Files & personal uploads', icon: FileText },
    { path: '/settings', label: 'My profile', detail: 'Details & account settings', icon: UserRound },
  ].filter(item => can(item.path));
  const heading = <div className="ess-home-heading"><div><p>{t("My workspace")}</p><h1>{greeting()}, {name}.</h1><span>{t("Everything you need for your workday, in one place.")}</span></div>
    <div className="ess-home-actions">{user?.employee && can('/my-leave') && <button className="ess-balance-button" aria-haspopup="dialog" onClick={() => setShowBalances(true)}><Info size={16} />{t("Lihat saldo cuti")}</button>}<time dateTime={new Date().toISOString()}>{new Date().toLocaleDateString(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}<small>{t("Waktu Indonesia Barat")}</small></time></div></div>;
  if (!user?.employee) return <div className="ess-home">{heading}<section className="ess-home-state" role="status"><UserRound size={28} /><h2>{t("Employee profile not linked")}</h2><p>{t("Contact People & Culture to connect your account to your employee profile.")}</p><Link to="/settings">{t("Open account settings")} <ArrowRight size={16} /></Link></section></div>;
  if (failed || !myDashboard) return <div className="ess-home">{heading}<section className="ess-home-state" role="alert"><h2>{t("Your dashboard could not be loaded")}</h2><p>{t("Please try again to see your latest requests and balances.")}</p><button onClick={onRetry}><RefreshCw size={16} />{t("Try again")}</button></section>{showBalances && can('/my-leave') && <OwnLeaveBalanceDialog key={user.employee.id} onClose={() => setShowBalances(false)} />}</div>;
  const attendance = myDashboard.attendance;
  const requests = myDashboard.recent_requests.filter(request => request.type === 'leave' ? can('/my-leave') : user.companyFeatures?.attendance_enabled !== false);
  const showAttendance = can('/my-attendance');
  const showLeave = can('/my-leave');
  return <div className="ess-home">
    {heading}
    <nav className="ess-quick-links" aria-label={t("Personal shortcuts")}>{quickLinks.map(item => <Link key={item.path} to={item.path}><span className="ess-quick-icon"><item.icon size={21} /></span><span><strong>{t(item.label)}</strong><small>{t(item.detail)}</small></span><ArrowRight size={16} /></Link>)}</nav>
    <div className="ess-home-columns" data-has-primary={showLeave || showAttendance || user.companyFeatures?.attendance_enabled !== false}>
      <div className="ess-home-primary">
        {showAttendance && <section className="ess-home-section ess-day-summary" aria-labelledby="ess-today"><div className="ess-section-heading"><h2 id="ess-today">{t("Your workday")}</h2><Link to="/my-attendance">{t("View attendance")} <ArrowRight size={14} /></Link></div>
          <div className="ess-day-status"><span className="ess-day-icon"><Clock3 size={23} /></span><div><strong>{attendance.today_status === 'checked_in' ? t("Checked in") : attendance.today_status === 'checked_out' ? t("Workday completed") : attendance.today_status === 'on_leave' ? t("On leave today") : t("No check-in recorded today")}</strong><p>{attendance.today_status === 'checked_out' ? t('Checked out at {time}', { time: timeLabel(attendance.check_out_time) }) : attendance.today_status === 'checked_in' ? t('Checked in at {time}', { time: timeLabel(attendance.check_in_time) }) : t("Your attendance record will appear here.")}</p></div></div>
          <dl className="ess-month-summary"><div><dt>{t("Days present")}</dt><dd>{number(attendance.this_month.present_days)}</dd></div><div><dt>{t("Days late")}</dt><dd>{number(attendance.this_month.late_days)}</dd></div><div><dt>{t("Leave calendar days")}</dt><dd>{number(attendance.this_month.leave_days)}</dd></div></dl><p className="ess-section-note">{t("Attendance summary for this month")}</p>
        </section>}
        {(showLeave || user.companyFeatures?.attendance_enabled !== false) && <section className="ess-home-section" aria-labelledby="ess-requests"><div className="ess-section-heading"><h2 id="ess-requests">{t("Recent requests")}</h2>{showLeave && <Link to="/my-leave">{t("My leave")} <ArrowRight size={14} /></Link>}</div>
          <p className="ess-section-note">{showLeave && t('{count} leave requests pending', { count: number(myDashboard.pending_requests.leave) })}{showLeave && user.companyFeatures?.attendance_enabled !== false && ' / '}{user.companyFeatures?.attendance_enabled !== false && t('{count} overtime requests pending', { count: number(myDashboard.pending_requests.overtime) })}</p>
          {requests.length ? <ul className="ess-request-list">{requests.map(request => <li key={`${request.type}-${request.id}`}><span className="ess-list-icon">{request.type === 'leave' ? <CalendarDays size={18} /> : <Clock3 size={18} />}</span><div><strong>{request.detail}</strong><p>{request.type === 'leave' ? t("Leave") : t("Overtime")} <span aria-hidden="true">/</span> {dateLabel(request.date)}</p></div><Status value={request.status} /></li>)}</ul> : <p className="ess-empty">{t("No requests yet. Your submitted requests will appear here.")}</p>}
        </section>}
        {showAttendance && <section className="ess-home-section" aria-labelledby="ess-history"><div className="ess-section-heading"><h2 id="ess-history">{t("Recent attendance")}</h2><Link to="/my-attendance">{t("View all")} <ArrowRight size={14} /></Link></div>
          {myDashboard.attendance_history.length ? <div className="ess-attendance-scroll"><table><caption className="sr-only">{t("Recent personal attendance records")}</caption><thead><tr><th>{t("Date")}</th><th>{t("Check in")}</th><th>{t("Check out")}</th><th>{t("Status")}</th></tr></thead><tbody>{myDashboard.attendance_history.map((row, index) => <tr key={`${row.date}-${index}`}><td>{dateLabel(row.date)}</td><td>{row.check_in || '\u2014'}</td><td>{row.check_out || '\u2014'}</td><td><Status value={row.status} /></td></tr>)}</tbody></table></div> : <p className="ess-empty">{t("No attendance records yet.")}</p>}
        </section>}
      </div>
      <div className="ess-home-secondary">
        {can('/announcements') && <section className="ess-home-section" aria-labelledby="ess-news"><div className="ess-section-heading"><h2 id="ess-news">{t("Announcements")}</h2><Megaphone size={18} /></div>
          {myDashboard.announcements.length ? <ul className="ess-news-list">{myDashboard.announcements.map(item => <li key={item.id}><span className="ess-news-meta">{item.category || t('Announcement')}{item.is_new && <b>{t("New")}</b>}</span><Link to="/announcements">{item.title}<ArrowRight size={14} /></Link><time dateTime={item.date}>{dateLabel(item.date)}</time></li>)}</ul> : <p className="ess-empty">{t("You're up to date. No announcements to show.")}</p>}
          <Link className="ess-section-action" to="/announcements">{t("All announcements")} <ArrowRight size={16} /></Link>
        </section>}
      </div>
    </div>
    {showBalances && showLeave && <OwnLeaveBalanceDialog key={user.employee.id} onClose={() => setShowBalances(false)} />}
    <footer className="ess-home-footer"><span>{t("PeopleHub / PFIGroups")}</span><span>{t("Employee Self-Service")}</span></footer>
  </div>;
}
