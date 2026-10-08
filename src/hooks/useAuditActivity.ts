import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Client-reported navigation/runtime failures complement authoritative server logs.
// No form data, query strings, error messages, stack traces or response bodies are sent.
export function useAuditActivity(token: string | null) {
  const { pathname } = useLocation();
  const lastPage = useRef('');
  const lastError = useRef(0);
  useEffect(() => {
    if (!token) { lastPage.current = ''; return; }
    const path = pathname.split('?')[0].replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 200);
    const base = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
    const send = (kind: string, error_name?: string) => {
      void fetch(`${base}/audit-logs/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind, path, ...(error_name ? { error_name } : {}) }) }).catch(() => {});
    };
    // Token + path prevents duplicate StrictMode effects; navigation away/back still logs.
    const key = `${token}:${path}`;
    if (lastPage.current !== key) { lastPage.current = key; send('page_view'); }
    const reportError = (kind: string, name: string) => {
      if (Date.now() - lastError.current < 5000) return;
      lastError.current = Date.now(); send(kind, name);
    };
    const onError = (event: ErrorEvent) => {
      const name = event.error?.name;
      reportError('client_error', ['TypeError', 'ReferenceError', 'RangeError', 'SyntaxError'].includes(name) ? name : 'Error');
    };
    const onRejection = () => reportError('client_error', 'UnhandledRejection');
    const onNetwork = () => reportError('network_error', 'NetworkError');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('peoplehub:network-error', onNetwork);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('peoplehub:network-error', onNetwork);
    };
  }, [token, pathname]);
}
