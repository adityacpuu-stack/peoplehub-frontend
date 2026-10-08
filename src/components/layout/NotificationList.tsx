import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useRef } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/services/notification.service';
import { useNotifications } from '@/hooks/useNotifications';

export function notificationPath(link?: string): string | null {
  if (!link?.startsWith('/') || link.startsWith('//') || link.includes('\\')) return null;
  try { const url = new URL(link, window.location.origin); return url.origin === window.location.origin ? url.pathname + url.search + url.hash : null; }
  catch { return null; }
}

export function NotificationList({ feed, onNavigate }: { feed: ReturnType<typeof useNotifications>; onNavigate?: () => void }) {
  useLocale();
  const navigate = useNavigate();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const open = async (notification: Notification) => {
    if (feed.busy !== null) return;
    if (!notification.is_read && !await feed.markRead(notification.id)) return;
    const path = notificationPath(notification.link);
    if (path && mounted.current) { onNavigate?.(); navigate(path); }
  };
  if (feed.status === 'loading') return <div className="ph-navbar-state" role="status"><Loader2 size={19} className="animate-spin" />{t("Memuat notifikasi…")}</div>;
  if (feed.status === 'error') return <div className="ph-navbar-state" role="alert">{t("Notifikasi gagal dimuat.")}<button onClick={feed.refresh}>{t("Coba lagi")}</button></div>;
  return <>
    {feed.actionError && <p className="ph-navbar-error" role="alert">{t("Gagal menandai notifikasi. Silakan coba lagi.")}</p>}
    {!feed.data?.data.length ? <div className="ph-navbar-state"><Bell size={22} aria-hidden="true" />{t("Tidak ada notifikasi pada daftar ini.")}</div>
      : <ul className="ph-notification-list">{feed.data.data.map(notification => <li key={notification.id}>
        <button className="ph-notification-row" data-unread={!notification.is_read} disabled={feed.busy !== null} onClick={() => open(notification)}>
          <span className="ph-notification-indicator" aria-hidden="true">{notification.is_read ? <CheckCheck size={17} /> : <Bell size={17} />}</span>
          <span className="ph-notification-copy"><strong>{notification.title}</strong><span>{notification.message}</span>
            <small>{new Date(notification.created_at).toLocaleString(intlLocale(), { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} {t("WIB ·")} {notification.is_read ? t("Sudah dibaca") : t("Belum dibaca")}</small></span>
        </button>
      </li>)}</ul>}
  </>;
}
