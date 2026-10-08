import { t, useLocale } from '@/i18n';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './master-data.css';
import './master-data-workspace.css';
import './master-data-refresh.css';
import { lockBodyScroll } from './scroll-lock';

export function MasterDataHeader({ title, description, actions }: { title: string; description: ReactNode; actions?: ReactNode }) {
  useLocale();
  return <header className="md-page-header">
    <div><h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="md-page-actions">{actions}</div>}
  </header>;
}

export function MasterDataSummary({ items, loading = false }: { items: { label: string; value: ReactNode; tone?: 'active' }[]; loading?: boolean }) {
  useLocale();
  return <dl className="md-summary" aria-label={t("Ringkasan data")} aria-busy={loading}>
    {items.map(item => <div key={item.label}>
      <dt>{item.tone === 'active' && <span className="md-status-dot" />}{item.label}</dt>
      <dd>{loading ? '—' : item.value}</dd>
    </div>)}
  </dl>;
}

/** Shared dialog for Master Data; keeps existing forms and their mutation guards. */
export function MasterDataDialog({ children, onClose, labelledBy, wide = false, busy = false }: {
  children: ReactNode; onClose: () => void; labelledBy: string; wide?: boolean; busy?: boolean;
}) {
  useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = () => { if (!busy) onClose(); }; });
  useLayoutEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const previousInert = root?.inert;
    const unlockScroll = lockBodyScroll();
    if (root) root.inert = true;
    ref.current?.focus();
    return () => {
      if (root) root.inert = previousInert ?? false;
      unlockScroll();
      queueMicrotask(() => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); });
    };
  }, []);
  return createPortal(<div className="md-dialog-backdrop" onClick={event => {
    if (event.target === event.currentTarget) closeRef.current();
  }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}
      className={`master-data ph-workflow md-dialog master-refresh-dialog${wide ? ' md-dialog-wide' : ''}`} onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
        if (event.key !== 'Tab') return;
        const items = Array.from(ref.current!.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]'))
          .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
        const first = items[0]; const last = items[items.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      {children}
    </div>
  </div>, document.body);
}
