import { t, useLocale } from '@/i18n';
import { Modal, ModalFooter } from '@/components/ui/Modal';

export function AccountDiscardDialog({ isOpen, busy, message, onCancel, onDiscard }: {
  isOpen: boolean; busy: boolean; message: string; onCancel: () => void; onDiscard: () => void;
}) {
  useLocale();
  return <Modal isOpen={isOpen} onClose={onCancel} busy={busy} role="alertdialog" size="sm"
    title={t("Tinggalkan perubahan?")} description={message} showCloseButton={false} className="settings-discard-dialog">
    <p className="ph-section-description">{t("Perubahan yang belum disimpan akan hilang.")}</p>
    <ModalFooter>
      <button type="button" autoFocus disabled={busy} onClick={onCancel} className="ph-button">{t("Tetap mengedit")}</button>
      <button type="button" disabled={busy} onClick={onDiscard} className="ph-button ph-button-primary">{t("Tinggalkan perubahan")}</button>
    </ModalFooter>
  </Modal>;
}
