import { t } from '@/i18n';
import type { CompanyOverview, DashboardAlert, GroupActivity } from '@/services/dashboard.service';
import { insightNumber } from './insight-display';

/** Rebuild only known system alerts from structured fields; leave custom content intact. */
export function executiveAlertCopy(alert: DashboardAlert, companies: CompanyOverview[]) {
  const attendance = /^attendance-(\d+)$/.exec(alert.id);
  const pending = /^pending-leaves-(\d+)$/.exec(alert.id);
  const company = companies.find(item => item.id === Number(attendance?.[1] ?? pending?.[1]));
  if (attendance && company) return {
    title: t('Low Attendance Alert'),
    message: t('{company} has {rate}% attendance rate today', { company: company.name, rate: insightNumber(company.attendance_rate) }),
  };
  if (pending && company && alert.count !== undefined) return {
    title: t('Pending Leave Requests'),
    message: t('{company} has {count} pending leave requests', { company: company.name, count: insightNumber(alert.count) }),
  };
  if (alert.id === 'expiring-contracts' && alert.count !== undefined) return {
    title: t('Contracts Expiring Soon'),
    message: t('{count} employee contracts expiring within 30 days', { count: insightNumber(alert.count) }),
  };
  return { title: alert.title, message: alert.message };
}

export function executiveActivityCopy(activity: GroupActivity): string {
  switch (activity.type) {
    case 'hire': return t('New employee onboarded');
    case 'exit': return t('Employee resigned/terminated');
    case 'leave': return t('Leave approved');
    default: return activity.action;
  }
}
