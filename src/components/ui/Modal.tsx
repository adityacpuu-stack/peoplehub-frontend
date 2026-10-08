import { t, useLocale } from '@/i18n';
import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountDialog } from './AccountDialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
  busy?: boolean;
  role?: 'dialog' | 'alertdialog';
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md', showCloseButton = true, className, busy = false, role = 'dialog' }: ModalProps) {
  useLocale();
  const titleId = useId();
  const descriptionId = useId();
  if (!isOpen) return null;
  return <AccountDialog className={cn('ph-form-dialog', 'ph-modal-' + size, className)} labelledBy={titleId}
    describedBy={description ? descriptionId : undefined} role={role} toasterId="default" clearToastsOnClose={false}
    onClose={() => { if (!busy) onClose(); }}>
    {(title || showCloseButton) ? <header className="ph-dialog-header">
      <div><h2 id={titleId}>{title || 'Dialog'}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
      {showCloseButton && <button type="button" className="ph-dialog-close" aria-label={t("Close dialog")} disabled={busy} onClick={onClose}><X /></button>}
    </header> : <div className="sr-only"><h2 id={titleId}>{t("Dialog")}</h2>{description && <p id={descriptionId}>{description}</p>}</div>}
    <div className="ph-dialog-body">{children}</div>
  </AccountDialog>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  useLocale();
  return <div className={cn('ph-dialog-footer', className)}>{children}</div>;
}
