import { t, useLocale, intlLocale } from '@/i18n';
import { ArrowRight, CalendarDays, Clock3, FileCheck2, RefreshCw, UserPlus, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardOverview } from '@/services/dashboard.service';
import type { DashboardStats, User } from '@/types';
import { getNavigation } from '@/components/layout/navigation';
import { useNavigationConfig } from '@/components/layout/useNavigationConfig';
import { canAction } from '@/lib/actions';
import './hr-dashboard.css';

interface PayrollSummaryData {
  current_period: {
    period: string;
    status: string;
    total_employees: number;
    total_gross: number;
    total_deductions: number;
    total_net: number;
  } | null;
  pending_adjustments: number;
  pending_overtime: number;
}
interface Props {
  user: User | null;
  stats: DashboardStats | null;
  overview: DashboardOverview | null;
  payrollSummary: PayrollSummaryData | null;
  /** Payroll figures withheld for this account (no payroll.view / denied); shown as unavailable, never zero. */
  payrollUnavailable?: boolean;
  greeting: () => string;
  failed?: boolean;
  onRetry: () => void;
}
const payrollStatuses: Record<string, string> = { draft: 'Draft', generated: 'Generated', pending: 'Pending', approved: 'Approved', paid: 'Paid', processed: 'Processed', finalized: 'Finalized', cancelled: 'Cancelled' };
const numeric = (value: unknown) => value != null && Number.isFinite(Number(value)) ? Number(value) : null;
const count = (value: unknown) => numeric(value)?.toLocaleString(intlLocale()) ?? '\u2014';
const money = (value: unknown) => numeric(value) == null ? '\u2014' : new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
const calendarDate = (value: string) => {
  const date = new Date(value.slice(0, 10) + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? '\u2014' : date.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export function HRDashboard({ user, stats, overview, payrollSummary, payrollUnavailable = false, greeting, failed, onRetry }: Props) {
  useLocale();
  useNavigationConfig();
  const navigation = getNavigation(user);
  const can = (path: string) => navigation.links.some(link => link.path === path);
  const canCreate = can('/employees') && user?.roles.some(role => ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff'].includes(role))
    && canAction(user, 'employee.create');
  const name = user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0] || t('there');
  const header = <header className="hr-home-heading"><div><span className="hr-home-eyebrow">{t("People & Culture")}</span><h1>{greeting()}, {name}.</h1><p>{t("Your workforce and daily priorities, at a glance.")}</p></div><div className="hr-home-actions"><button className="hr-refresh" onClick={onRetry} aria-label={t("Refresh dashboard")}><RefreshCw size={17} /></button>{canCreate && <Link className="hr-primary-action" to="/employees/create"><UserPlus size={17} />{t("Add employee")}</Link>}</div></header>;
  if (failed || !stats || !overview || (!payrollSummary && !payrollUnavailable)) return <div className="hr-home">{header}<section className="hr-home-error" role="alert"><h2>{t("Dashboard data could not be loaded")}</h2><p>{t("Try again to load workforce, request and payroll summaries.")}</p><button className="hr-primary-action" onClick={onRetry}><RefreshCw size={16} />{t("Try again")}</button></section></div>;
  const payroll = payrollSummary?.current_period ?? null;
  const departments = overview.employee.by_department;
  const largestDepartment = Math.max(0, ...departments.map(item => numeric(item.count) ?? 0));
  const pending = [
    { label: 'Leave requests', detail: 'Review submitted leave', value: overview.leave.pending_requests ?? stats.pending_requests.leave, path: '/leave', icon: CalendarDays },
    { label: 'Overtime requests', detail: 'Review overtime submissions', value: stats.pending_requests.overtime, path: '/overtime', icon: Clock3 },
    // Without payroll figures the count renders as "—" (count(undefined)), never 0.
    { label: 'Payroll adjustments', detail: 'Review pending adjustments', value: payrollSummary?.pending_adjustments, path: '/payroll', icon: FileCheck2 },
  ].filter(item => can(item.path) && (item.path !== '/payroll' || payrollSummary));
  return <div className="hr-home">
    {header}
    <div className="hr-home-context"><span><span className="hr-scope-dot" />{t("Assigned company scope")}</span><time>{new Date().toLocaleDateString(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}{' '}{t("/ WIB")}</time></div>
    <section className="hr-workforce-metrics" aria-label={t("Workforce summary")}>
      <div><span>{t("Active employees")}</span><strong>{count(stats.active_employees)}</strong>{can('/employees') ? <Link to="/employees">{t("Open employee directory")} <ArrowRight size={13} /></Link> : <small>{t("Within your assigned scope")}</small>}</div>
      <div><span>{t("New joiners")}</span><strong>{count(stats.new_hires_this_month)}</strong><small>{t("This month")}</small></div>
      <div><span>{t("Departments")}</span><strong>{count(stats.departments_count)}</strong><small>{t("Across your assigned companies")}</small></div>
      {can('/leave') && <div><span>{t("On leave today")}</span><strong>{count(overview.leave.on_leave_today)}</strong><small>{t("Approved leave")}</small></div>}
    </section>
    <div className="hr-home-top-grid">
      <section className="hr-home-panel hr-priorities" aria-labelledby="hr-priorities"><div className="hr-panel-heading"><div><h2 id="hr-priorities">{t("Needs attention")}</h2><p>{t("Pending work across your assigned companies")}</p></div><span className="hr-section-symbol"><FileCheck2 size={20} /></span></div>
        {pending.length ? <div className="hr-priority-list">{pending.map(item => <Link key={item.path} to={item.path}><span className="hr-priority-icon"><item.icon size={19} /></span><span className="hr-priority-label"><strong>{t(item.label)}</strong><small>{t(item.detail)}</small></span><b data-pending={(numeric(item.value) ?? 0) > 0}>{count(item.value)}</b><ArrowRight size={16} /></Link>)}</div> : <p className="hr-empty">{t("No review modules are enabled for your account.")}</p>}
        {can('/requests') && <Link className="hr-panel-link" to="/requests">{t("Open My Approval")} <ArrowRight size={15} /></Link>}
      </section>
      {can('/payroll') && <section className="hr-home-panel hr-payroll-summary" aria-labelledby="hr-payroll"><div className="hr-panel-heading"><div><h2 id="hr-payroll">{t("Payroll summary")}</h2><p>{payroll ? t('Period {period} / {count} employees', { period: payroll.period, count: count(payroll.total_employees) }) : t("Current payroll period")}</p></div><span className="hr-section-symbol"><Wallet size={20} /></span></div>
        {!payrollSummary ? <div className="hr-empty" data-testid="payroll-unavailable"><strong>{t("Payroll figures unavailable")}</strong><p>{t("Your access does not include payroll totals.")}</p></div>
        : payroll ? <><div className="hr-payroll-total"><span>{t("Net payroll")}</span><strong>{money(payroll.total_net)}</strong><span className="hr-payroll-status">{payrollStatuses[payroll.status] ? t(payrollStatuses[payroll.status]) : payroll.status}</span></div><dl className="hr-payroll-breakdown"><div><dt>{t("Gross salary")}</dt><dd>{money(payroll.total_gross)}</dd></div><div><dt>{t("Deductions")}</dt><dd>{money(payroll.total_deductions)}</dd></div></dl></> : <div className="hr-empty"><strong>{t("No payroll for this period")}</strong><p>{t("The summary will appear after payroll is generated.")}</p></div>}
        <Link className="hr-panel-link" to="/payroll">{t("Open payroll")} <ArrowRight size={15} /></Link>
      </section>}
    </div>
    <div className="hr-home-bottom-grid">
      <section className="hr-home-panel" aria-labelledby="hr-departments"><div className="hr-panel-heading"><div><h2 id="hr-departments">{t("Workforce by department")}</h2><p>{t("Headcount in your assigned company scope")}</p></div><Users size={19} /></div>
        {departments.length ? <ul className="hr-department-list">{departments.map((department, index) => <li key={`${department.department}-${index}`}><div><span>{department.department}</span><strong>{count(department.count)}</strong></div><div className="hr-department-track" aria-hidden="true"><span style={{ width: `${largestDepartment > 0 ? Math.min(100, Math.max(0, (numeric(department.count) ?? 0) / largestDepartment * 100)) : 0}%` }} /></div></li>)}</ul> : <p className="hr-empty">{t("No department data available.")}</p>}
        {can('/departments') && <Link className="hr-panel-link" to="/departments">{t("Manage departments")} <ArrowRight size={15} /></Link>}
      </section>
      {can('/leave') && <section className="hr-home-panel" aria-labelledby="hr-upcoming"><div className="hr-panel-heading"><div><h2 id="hr-upcoming">{t("Upcoming leave")}</h2><p>{t("Plan ahead for approved time off")}</p></div><CalendarDays size={19} /></div>
        {overview.leave.upcoming_leaves.length ? <ul className="hr-upcoming-list">{overview.leave.upcoming_leaves.map((leave, index) => <li key={`${leave.employee_name}-${leave.start_date}-${index}`}><span className="hr-person-initial" aria-hidden="true">{leave.employee_name.trim().charAt(0)}</span><div><strong>{leave.employee_name}</strong><span>{leave.leave_type}</span><time>{calendarDate(leave.start_date)}{' – '} {calendarDate(leave.end_date)}</time></div></li>)}</ul> : <p className="hr-empty">{t("No upcoming approved leave in this overview.")}</p>}
        <Link className="hr-panel-link" to="/leave">{t("View leave requests")} <ArrowRight size={15} /></Link>
      </section>}
    </div>
    <footer className="hr-home-footer"><span>{t("PeopleHub / PFIGroups")}</span><span>{t("People & Culture workspace")}</span></footer>
  </div>;
}
