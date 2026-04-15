import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function usePresence(token: string | null) {
  const location = useLocation();

  useEffect(() => {
    if (!token) return;

    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/?$/, '');

    const send = () => {
      fetch(`${apiBase}/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page: location.pathname }),
      }).catch(() => {});
    };

    send(); // send immediately on mount / page change
    const interval = setInterval(send, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [token, location.pathname]);
}
