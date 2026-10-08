import { t, useLocale } from '@/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { AccountDialog } from '@/components/ui/AccountDialog';

// Resolves false when dismissed or unmounted, preserving the caller's cancel path.
export function useResourceConfirmation() {
  useLocale();
  const [prompt, setPrompt] = useState<(() => string) | null>(null);
  const answer = useRef<((accepted: boolean) => void) | null>(null);
  const titleId = useId();
  useEffect(() => () => { answer.current?.(false); answer.current = null; }, []);
  const confirm = (message: () => string) => new Promise<boolean>(resolve => {
    if (answer.current) { resolve(false); return; }
    answer.current = resolve; setPrompt(() => message);
  });
  const settle = (accepted: boolean) => {
    const resolve = answer.current;
    answer.current = null; setPrompt(null); resolve?.(accepted);
  };
  const confirmation = prompt && <AccountDialog labelledBy={titleId} toasterId="resource-confirmation" className="ph-workflow resource-confirmation resources-refresh-dialog" onClose={() => settle(false)}>
    <header className="ph-dialog-header"><h2 id={titleId}>{t("Konfirmasi tindakan")}</h2></header>
    <div className="ph-dialog-body"><p>{prompt()}</p></div>
    <footer className="ph-dialog-footer ph-form-actions"><button className="ph-button" autoFocus onClick={() => settle(false)}>{t("Batal")}</button><button className="ph-button ph-button-primary" onClick={() => settle(true)}>{t("Lanjutkan")}</button></footer>
  </AccountDialog>;
  return { confirm, confirmation };
}
