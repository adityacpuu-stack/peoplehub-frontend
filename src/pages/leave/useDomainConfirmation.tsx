import { t, useLocale } from '@/i18n';
import { useEffect, useRef, useState } from 'react';
import { OperationalDialog } from '@/components/ui/OperationalWorkspace';
import './domain-workflows.css';

type Copy = string | (() => string);
type Decision = { title: Copy; message: Copy; confirmLabel: Copy; reasonLabel?: Copy };
// Callers with application copy may pass a renderer; strings can contain user data.
const renderCopy = (copy: Copy) => typeof copy === 'function' ? copy() : copy;

/** Presentation adapter for the existing confirm/prompt cancellation contracts. */
export function useDomainConfirmation(className = '') {
  useLocale();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const resolver = useRef<((value: string | null) => void) | null>(null);

  useEffect(() => () => { resolver.current?.(null); }, []);

  const requestDecision = (next: Decision) => new Promise<string | null>(resolve => {
    resolver.current?.(null);
    resolver.current = resolve;
    setReason('');
    setDecision(next);
  });

  const finish = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setDecision(null);
  };

  const decisionDialog = decision && <OperationalDialog title={renderCopy(decision.title)} onClose={() => finish(null)} className={className}>
    <form className="ph-workflow dw-confirm" onSubmit={event => { event.preventDefault(); finish(decision.reasonLabel ? reason : 'confirmed'); }}>
      <p>{renderCopy(decision.message)}</p>
      {decision.reasonLabel && <label className="ph-field">{renderCopy(decision.reasonLabel)}
        <textarea value={reason} onChange={event => setReason(event.target.value)} rows={4} />
      </label>}
      <div className="ph-form-actions dw-actions">
        <button type="button" className="ph-button" onClick={() => finish(null)}>{t("Cancel")}</button>
        <button type="submit" className="ph-button dw-danger">{renderCopy(decision.confirmLabel)}</button>
      </div>
    </form>
  </OperationalDialog>;

  return { requestDecision, decisionDialog };
}
