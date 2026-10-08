import { executiveAlertCopy, executiveActivityCopy } from './executive-copy';
import { insightEnum, insightNumber, insightMonth } from '@/pages/ceo/insight-display';
import { t, useLocale, intlLocale } from '@/i18n';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GroupDashboard } from '@/services/dashboard.service';
import type { User } from '@/types';
import { getNavigation } from '@/components/layout/navigation';
import { formatNumber, formatCurrency } from '@/lib/utils';
import '../dashboard/hr-dashboard.css';
import './executive-workspace.css';

interface Props {
  user: User | null;
  data: GroupDashboard | null;
  failed: boolean;
  onRetry: () => void;
}

export function ExecutiveOverview({ user, data, failed, onRetry }: Props) {
  useLocale();
  const navigation = getNavigation(user);
  const group = navigation.isGroupCEO;
  const can = (path: string) => navigation.links.some(link => link.path === path);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const summary = data?.summary;
  const companies = data?.companies ?? [];
  const trend = data?.headcount_trend ?? [];
  const departments = data?.department_distribution ?? [];
  const payroll = data?.payroll_summary;
  const alerts = data?.alerts ?? [];
  const activities = data?.recent_activities ?? [];
  const rate = (value: number) => value < 0 ? t('N/A') : `${value.toLocaleString(intlLocale(), { maximumFractionDigits: 1 })}%`;

  return <div className="hr-home executive-home">
    <header className="hr-home-heading">
      <div><h1>{t(greeting)}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0] || t('there')}</h1>
        <p>{group ? t("People and payroll across your group.") : t("People and payroll across your companies.")}</p></div>
      <div className="hr-home-actions">
        <button className="hr-refresh" aria-label={t("Refresh dashboard")} onClick={onRetry}><RefreshCw size={16} /></button>
        {can('/ceo/payroll-report') && <Link className="hr-primary-action" to="/ceo/payroll-report">{t("Payroll report")} <ArrowUpRight size={15} /></Link>}
      </div>
    </header>
    <div className="hr-home-context"><span>{group ? t("Group overview") : t("Company overview")}</span>
      <time>{new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date())}</time></div>
    {failed || !summary ? <section className="hr-home-error" role="alert"><h2>{t("Dashboard belum bisa dimuat")}</h2>
      <p>{t("Coba muat ulang untuk melihat ringkasan terbaru.")}</p><button className="hr-primary-action" onClick={onRetry}>{t("Coba lagi")}</button></section> : <>
      <section className="hr-workforce-metrics" aria-label={t("Workforce summary")}>
        <div><span>{t("Total employees")}</span><strong>{formatNumber(summary.total_employees)}</strong><small>{insightNumber(summary.total_companies)}{' '}{t("companies ·")} {insightNumber(summary.total_departments)}{' '}{t("departments")}</small></div>
        <div><span>{t("Attendance today")}</span><strong>{rate(summary.avg_attendance_rate)}</strong><small>{t("Average across reporting companies")}</small></div>
        <div><span>{t("New hires")}</span><strong>{formatNumber(summary.new_hires_this_month)}</strong><small>{insightNumber(summary.terminations_this_month)}{' '}{t("exits this month")}</small></div>
        <div><span>{t("On leave today")}</span><strong>{formatNumber(summary.total_on_leave_today)}</strong><small>{insightNumber(summary.pending_approvals)}{' '}{t("pending requests in scope")}</small></div>
      </section>
      <div className="executive-main-grid">
        <section className="hr-home-panel executive-company-panel"><header className="hr-panel-heading"><div><h2>{t("Company overview")}</h2><p>{t("Workforce and attendance by company")}</p></div>
          {can('/companies') && <Link className="executive-text-link" to="/companies">{t("View companies")} <ArrowUpRight size={15} /></Link>}</header>
          <div className="executive-table-scroll"><table className="executive-table"><thead><tr><th>{t("Company")}</th><th>{t("Employees")}</th><th>{t("Attendance")}</th><th>{t("On leave")}</th><th>{t("New hires")}</th></tr></thead>
            <tbody>{companies.map(company => <tr key={company.id}><th scope="row">{company.name}</th><td>{formatNumber(company.employees)}</td><td>{rate(company.attendance_rate)}</td><td>{insightNumber(company.on_leave_today)}</td><td>{insightNumber(company.new_hires_this_month)}</td></tr>)}</tbody></table></div>
          {!companies.length && <p className="hr-empty">{t("No company data available.")}</p>}
        </section>
        <aside className="hr-home-panel hr-payroll-summary"><header className="hr-panel-heading"><div><h2>{t("Payroll overview")}</h2><p>{t("Latest summary from payroll records")}</p></div></header>
          {payroll ? <><div className="hr-payroll-total"><span>{t("Total monthly payroll")}</span><strong>{formatCurrency(payroll.total_monthly_payroll)}</strong></div>
            <dl className="hr-payroll-breakdown"><div><dt>{t("Average salary")}</dt><dd>{formatCurrency(payroll.avg_salary)}</dd></div>
              {payroll.by_company.map((company, index) => <div key={`${company.company_name}-${index}`}><dt>{company.company_name}<small className="executive-caption">{insightNumber(company.employee_count)}{' '}{t("employees")}</small></dt><dd>{formatCurrency(company.total_payroll)}</dd></div>)}</dl></>
            : data?.unavailable_sections?.includes('payroll') ? <div className="hr-empty" data-testid="payroll-unavailable"><strong>{t("Payroll figures unavailable")}</strong><p>{t("Your access does not include payroll totals.")}</p></div>
            : <p className="hr-empty">{t("No payroll summary available.")}</p>}
          {can('/ceo/payroll-report') && <Link className="hr-panel-link" to="/ceo/payroll-report">{t("View payroll report")} <ArrowUpRight size={15} /></Link>}
        </aside>
      </div>
      <div className="hr-home-bottom-grid">
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("Headcount trend")}</h2><p>{t("Employee movement over the reported period")}</p></div></header>
          {trend.length ? <div className="executive-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.map(item => ({ ...item, month: insightMonth(item.month) }))} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8eee9" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickFormatter={insightNumber} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => typeof value === 'number' ? insightNumber(value) : value} /><Area type="monotone" dataKey="headcount" name={t("Employees")} stroke="#187451" fill="#e6efd7" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div> : <p className="hr-empty">{t("No headcount trend available.")}</p>}
        </section>
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("Departments")}</h2><p>{t("Workforce distribution")}</p></div></header>
          <ul className="hr-department-list">{departments.map(department => <li key={department.name}><div><strong>{department.name}</strong><span>{insightNumber(department.employees)}{' '}{t("employees")}</span></div><div className="hr-department-track"><span style={{ width: `${Math.min(100, Math.max(0, department.percentage))}%` }} /></div></li>)}</ul>
          {!departments.length && <p className="hr-empty">{t("No department data available.")}</p>}
        </section>
      </div>
      <div className="hr-home-bottom-grid">
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("Needs attention")}</h2><p>{t("Alerts within your company scope")}</p></div></header>
          <ul className="executive-activity">{alerts.map(alert => { const copy = executiveAlertCopy(alert, companies); return <li key={alert.id}><strong>{copy.title}</strong><p>{copy.message}</p><small>{insightEnum(alert.category)}</small></li>; })}</ul>
          {!alerts.length && <p className="hr-empty">{t("No alerts at this time.")}</p>}
          {can('/requests') && <Link className="hr-panel-link" to="/requests">{t("Review pending approvals")} <ArrowUpRight size={15} /></Link>}
        </section>
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("Recent activity")}</h2><p>{t("Latest employee updates")}</p></div></header>
          <ul className="executive-activity">{activities.slice(0, 5).map(activity => <li key={activity.id}><strong>{executiveActivityCopy(activity)}</strong><p>{activity.employee_name} · {activity.company_name}</p><time>{new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(activity.created_at))}</time></li>)}</ul>
          {!activities.length && <p className="hr-empty">{t("No recent activity.")}</p>}
        </section>
      </div>
    </>}
  </div>;
}
