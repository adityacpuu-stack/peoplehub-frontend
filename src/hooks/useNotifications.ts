import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { notificationService, NOTIFICATIONS_CHANGED, type NotificationListResponse } from '@/services/notification.service';

export function useUnreadNotifications() {
  const userId = useAuthStore(state => state.user?.id);
  const [state, setState] = useState<{ userId?: number; count: number | null }>({ count: null });
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      try {
        const count = await notificationService.getUnreadCount();
        if (!disposed && current === request) setState({ userId, count });
      } catch { if (!disposed && current === request) setState({ userId, count: null }); }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = setInterval(onVisible, 30000);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener(NOTIFICATIONS_CHANGED, refresh); document.removeEventListener('visibilitychange', onVisible); };
  }, [userId]);
  return state.userId === userId ? state.count : null;
}

export function useNotifications(page: number, unreadOnly: boolean, limit: number, enabled = true) {
  const userId = useAuthStore(state => state.user?.id);
  const key = JSON.stringify([userId, page, unreadOnly, limit, enabled]);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; data?: NotificationListResponse }>({ key: '', status: 'loading' });
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const [actionError, setActionError] = useState(false);
  const writing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
  }, [refresh]);
  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    setState({ key, status: 'loading' }); setActionError(false);
    notificationService.getMyNotifications({ page, limit, ...(unreadOnly ? { is_read: false } : {}) })
      .then(data => { if (!cancelled) setState({ key, status: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ key, status: 'error' }); });
    return () => { cancelled = true; };
  }, [key, revision]);
  const markRead = async (id: number | 'all') => {
    if (writing.current) return false;
    writing.current = true; setBusy(id); setActionError(false);
    try {
      if (id === 'all') await notificationService.markAllAsRead();
      else await notificationService.markAsRead(id);
      return true;
    } catch { if (mounted.current) setActionError(true); return false; }
    finally { writing.current = false; if (mounted.current) setBusy(null); }
  };
  return { status: state.key === key ? state.status : 'loading', data: state.key === key ? state.data : undefined,
    busy, actionError, markRead, refresh };
}
