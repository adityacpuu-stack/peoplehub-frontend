import { intlLocale } from '@/i18n';
export const APPROVALS_CHANGED = 'leave-approvals-changed';
export function calendarDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.slice(0, 10) + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function timestamp(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
}
