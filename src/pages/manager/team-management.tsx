import { t, useLocale } from '@/i18n';
import { Loader2 } from 'lucide-react';

export function TeamStatus({ status }: { status: string }) {
  useLocale();
  const labels: Record<string, string> = { present: 'Present', late: 'Late', leave: 'On leave', not_checked_in: 'Not checked in', absent: 'Absent', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
  return <span className="tm-status" data-status={status}>{t(labels[status] || 'Unavailable')}</span>;
}
export function TeamFeedback({ loading, failed, empty, onRetry }: { loading: boolean; failed: boolean; empty: string; onRetry: () => void }) {
  useLocale();
  return <div className="ow-feedback" role={failed ? 'alert' : 'status'}>
    {loading ? <><Loader2 size={24} className="animate-spin" /><p>{t("Loading records…")}</p></> : failed ? <><h3>{t("Records could not be loaded")}</h3><p>{t("Please try again. The list is unavailable until loading succeeds.")}</p><button className="ow-button" onClick={onRetry}>{t("Try again")}</button></> : <><h3>{empty}</h3><p>{t("Check your filters or reporting assignments.")}</p></>}
  </div>;
}
export function TeamPagination({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  useLocale();
  const pages = Math.max(1, Math.ceil(total / 20));
  return <div className="ow-pagination"><span>{total ? t('{start}–{end} of {total}', { start: (page - 1) * 20 + 1, end: Math.min(page * 20, total), total }) : t("0 records")}</span><nav aria-label={t("Record pages")}><button className="ow-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t("Previous")}</button><span>{page} / {pages}</span><button className="ow-button" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t("Next")}</button></nav></div>;
}
