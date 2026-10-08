import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationList } from '@/components/layout/NotificationList';
import '@/components/layout/navbar.css';
import './notifications.css';

export function NotificationsPage() {
  useLocale();
  const [page, setPage] = useState(1);
  const [unread, setUnread] = useState(false);
  const feed = useNotifications(page, unread, 20);
  const totalPages = Math.max(1, feed.data?.pagination.total_pages ?? 1);
  useEffect(() => { if (feed.status === 'ready' && page > totalPages) setPage(totalPages); }, [feed.status, page, totalPages]);
  return <div className="ph-inbox ph-workflow ph-notifications-page">
    <header className="ph-inbox-header ph-page-header"><div><h1>{t("Notifikasi")}</h1><p>{t("Pemberitahuan untuk akun Anda.")}</p></div>
      <button className="ph-button" disabled={feed.status !== 'ready' || !feed.data?.unread_count || feed.busy !== null}
        onClick={() => feed.markRead('all')}><CheckCheck size={17} />{t("Tandai semua dibaca")}</button></header>
    <section className="ph-notifications-feed" aria-label={t("Daftar notifikasi")}>
      <nav className="ph-inbox-tabs ph-notifications-tabs" aria-label={t("Filter notifikasi")}>
        <button aria-pressed={!unread} disabled={feed.busy !== null} onClick={() => { setUnread(false); setPage(1); }}>{t("Semua")}</button>
        <button aria-pressed={unread} disabled={feed.busy !== null} onClick={() => { setUnread(true); setPage(1); }}>{t("Belum dibaca")}{feed.data ? ` (${feed.data.unread_count.toLocaleString(intlLocale())})` : ''}</button>
      </nav>
      <NotificationList feed={feed} />
      <footer className="ph-inbox-pagination"><span>{feed.status === 'ready' ? t('{count} notifikasi · Halaman {page} dari {pages}', { count: (feed.data?.pagination.total ?? 0).toLocaleString(intlLocale()), page: page.toLocaleString(intlLocale()), pages: totalPages.toLocaleString(intlLocale()) }) : feed.status === 'error' ? t("Daftar belum tersedia") : t("Memuat daftar")}</span>
        <div><button className="ph-button" disabled={page <= 1 || feed.status !== 'ready' || feed.busy !== null} onClick={() => setPage(value => value - 1)}>{t("Sebelumnya")}</button>
          <button className="ph-button" disabled={page >= totalPages || feed.status !== 'ready' || feed.busy !== null} onClick={() => setPage(value => value + 1)}>{t("Berikutnya")}</button></div></footer>
    </section>
  </div>;
}
