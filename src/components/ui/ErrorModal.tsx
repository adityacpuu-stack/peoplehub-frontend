import { t, useLocale } from '@/i18n';
import { AlertTriangle, WifiOff, ShieldX, RefreshCw } from 'lucide-react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

interface ErrorModalProps { isOpen: boolean; onClose: () => void; title?: string; message: string; type?: 'error' | 'warning' | 'network'; onRetry?: () => void; }

export function ErrorModal({ isOpen, onClose, title, message, type = 'error', onRetry }: ErrorModalProps) {
  useLocale();
  const Icon = type === 'network' ? WifiOff : type === 'warning' ? AlertTriangle : ShieldX;
  const heading = title || (type === 'network' ? 'Connection Error' : type === 'warning' ? 'Warning' : 'Login Failed');
  return <Modal isOpen={isOpen} onClose={onClose} title={t(heading)} size="sm" role="alertdialog">
    <div className="ph-error-message" data-tone={type}><Icon aria-hidden="true" /><p>{t(message)}</p></div>
    <ModalFooter>{onRetry && <Button variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />{t("Retry")}</Button>}<Button onClick={onClose}>{t("OK, Got it")}</Button></ModalFooter>
  </Modal>;
}
