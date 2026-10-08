import { t, useLocale, intlLocale } from '@/i18n';
import { ArrowRight, CalendarDays, CheckCircle2, RefreshCw, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNavigation } from '@/components/layout/navigation';
import { useNavigationConfig } from '@/components/layout/useNavigationConfig';
import type { TeamDashboard } from '@/services/dashboard.service';
import type { LeaveRequest, User } from '@/types';
import './hr-dashboard.css';
import './manager-dashboard.css';

interface Props {
  user: User | null;
  teamDashboard: TeamDashboard | null;
  pendingApprovals: LeaveRequest[];
  greeting: () => string;
  failed?: boolean;
  onRetry: () => void;
}

const dateLabel = (value: string) => {
  const date = new Date(value.slice(0, 10) + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(intlLocale(), {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
};
const statusLabels: Record<string, string> = {
  present: 'Present', late: 'Late', wfh: 'WFH', leave: 'On leave',
  on_leave: 'On leave', absent: 'Absent', not_checked_in: 'Not checked in',
};

export function ManagerDashboard({ user, teamDashboard, pendingApprovals, greeting, failed, onRetry }: Props) {
  useLocale();
  useNavigationConfig();
  const navigation = getNavigation(user);
  const can = (path: string) => navigation.links.some(link => link.path === path);
  const attendanceEnabled = user?.companyFeatures?.attendance_enabled ?? true;
  const leaveEnabled = user?.companyFeatures?.leave_enabled ?? true;
  const name = user?.employee?.name?.trim().split(' ')[0] || user?.email?.split('@')[0] || t('there');
  const header = <header className="hr-home-heading">
    <div><span className="hr-home-eyebrow">{t("Team workspace")}</span><h1>{greeting()}, {name}.</h1><p>{t("Your team, time off and requests that need your attention.")}</p></div>
    <div className="hr-home-actions"><button className="hr-refresh" onClick={onRetry} aria-label={t("Refresh dashboard")}><RefreshCw size={17} /></button>
      {can('/my-team') && <Link className="hr-primary-action" to="/my-team"><UsersRound size={17} />{t("View my team")}</Link>}
    </div>
  </header>;

  if (failed || !teamDashboard) return <div className="hr-home manager-home">{header}
    <section className="hr-home-error" role="alert"><h2>{t("Team dashboard could not be loaded")}</h2><p>{t("Try again to load your team and assigned approvals.")}</p>
      <button className="hr-primary-action" onClick={onRetry}><RefreshCw size={16} />{t("Try again")}</button>
    </section>
  </div>;

  const teamMembers = teamDashboard.team_members;
  return <div className="hr-home manager-home">
    {header}
    <div className="hr-home-context"><span><span className="hr-scope-dot" />{t("Your reporting team & assigned approvals")}</span>
      <time>{new Date().toLocaleDateString(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}{' '}{t("/ WIB")}</time>
    </div>
    <section className="hr-workforce-metrics" aria-label={t("Team summary")}>
      <div><span>{t("Team members")}</span><strong>{(teamDashboard.team_size).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</strong><small>{t("Active reporting team")}</small></div>
      {attendanceEnabled && <div><span>{t("Checked in today")}</span><strong>{(teamDashboard.present_today).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</strong><small>{t("Includes late check-ins")}</small></div>}
      {leaveEnabled && <div><span>{t("On leave today")}</span><strong>{(teamDashboard.on_leave_today).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</strong><small>{t("Approved team leave")}</small></div>}
      {leaveEnabled && <div><span>{t("Awaiting your approval")}</span><strong>{(pendingApprovals.length).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</strong><small>{t("Assigned pending leave only")}</small></div>}
    </section>

    <div className="manager-home-grid" data-with-approvals={leaveEnabled}>
      <section className="hr-home-panel" aria-labelledby="manager-team-heading">
        <div className="hr-panel-heading"><div><h2 id="manager-team-heading">{t("My team")}</h2><p>{t("People reporting to you")}</p></div><UsersRound size={20} /></div>
        {teamMembers.length ? <ul className="manager-team-list">{teamMembers.slice(0, 6).map(member => <li key={member.id}>
          <span className="manager-person-avatar" aria-hidden="true">{member.name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2)}</span>
          <div className="manager-person-info"><strong>{member.name}</strong><span>{member.position || member.department || member.employee_id}</span></div>
          {attendanceEnabled && <div className="manager-person-status"><span className="manager-status" data-status={member.status_today}>{t(statusLabels[member.status_today] || 'Unavailable')}</span>
            {member.check_in_time && <small>{t("In at")} {member.check_in_time}</small>}
          </div>}
        </li>)}</ul> : <div className="hr-empty"><strong>{t("No team members yet")}</strong><p>{t("Your reporting team will appear once employee assignments are set.")}</p></div>}
        {can('/my-team') && <Link className="hr-panel-link" to="/my-team">{t("View all team members")} <ArrowRight size={15} /></Link>}
      </section>

      {leaveEnabled && <section className="hr-home-panel" aria-labelledby="manager-approvals-heading">
        <div className="hr-panel-heading"><div><h2 id="manager-approvals-heading">{t("Needs your approval")}</h2><p>{t("Leave requests assigned to you")}</p></div><CalendarDays size={20} /></div>
        {pendingApprovals.length ? <ul className="manager-approval-list">{pendingApprovals.slice(0, 3).map(approval => <li key={approval.id}>
          <div><strong>{approval.employee?.name || t('Employee')}</strong><span className="manager-status" data-status="pending">{t("Pending")}</span></div>
          <p>{approval.leaveType?.name || t('Leave')}<span aria-hidden="true"> · </span>{(approval.total_days).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}{' '}{t("day(s)")}</p>
          <time>{dateLabel(approval.start_date)} – {dateLabel(approval.end_date)}</time>
          {approval.reason && <p className="manager-approval-reason">{approval.reason}</p>}
        </li>)}</ul> : <div className="hr-empty manager-approvals-empty"><CheckCircle2 size={26} /><strong>{t("You're all caught up")}</strong><p>{t("No pending leave requests assigned to you.")}</p></div>}
        {can('/leave-approval') && <Link className="hr-panel-link" to="/leave-approval">{t("Review leave approvals")} <ArrowRight size={15} /></Link>}
      </section>}
    </div>
    <footer className="hr-home-footer"><span>{t("PeopleHub / PFIGroups")}</span><span>{t("Team workspace")}</span></footer>
  </div>;
}
