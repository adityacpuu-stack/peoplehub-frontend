import { t, useLocale } from '@/i18n';
import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AccountDialog } from './AccountDialog';
import './operational-workspace.css';
import './operations-refresh.css';

export function OperationalWorkspace({ module, title, description, actions, filters, summary, children, className = '' }: {
  module: 'operations' | 'leave' | 'payroll'; title: string; description: string; actions?: ReactNode;
  filters?: ReactNode; summary?: ReactNode; children: ReactNode; className?: string;
}) {
  useLocale();
  return <div className={`ow-page ow-${module} ${className}`}>
    <header className="ow-header"><div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="ow-actions">{actions}</div>}</header>
    <div className={`ow-workspace${module === 'operations' ? ' operations-surface' : ''}${filters ? ' ow-with-filters' : ''}`}>
      {filters && <div className="ow-filters" role="group" aria-label={t('Filter {title}', { title })}>{filters}</div>}
      <div className="ow-content">{summary && <div className="ow-summary">{summary}</div>}{children}</div>
    </div>
  </div>;
}

export function OperationalDialog({ title, subtitle, onClose, busy = false, children, className = '' }: {
  title: string; subtitle?: string; onClose: () => void; busy?: boolean; children: ReactNode; className?: string;
}) {
  useLocale();
  const titleId = useId();
  return <AccountDialog className={`ow-dialog ph-workflow ${className}`} labelledBy={titleId} toasterId="operational-dialog" onClose={() => { if (!busy) onClose(); }}>
    <header className="ow-dialog-header"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="ow-icon-button" disabled={busy} aria-label={t("Tutup dialog")} onClick={onClose}><X size={20} /></button></header>
    {children}
  </AccountDialog>;
}
