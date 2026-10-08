import { t, useLocale } from '@/i18n';
import { useEffect, useRef, useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';

type ReportCopy = string | { source: string; params?: Record<string, string | number> };
type Question = { message: ReportCopy; kind: 'confirm' | 'prompt' };

/** Application-owned copy only; pass substitutions separately from the source. */
export function useReportConfirmation() {
  useLocale();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const pending = useRef<((value: string | boolean | null) => void) | null>(null);

  useEffect(() => () => { pending.current?.(null); }, []);

  const ask = (message: ReportCopy, kind: Question['kind']) => {
    pending.current?.(null);
    setAnswer('');
    setQuestion({ message, kind });
    return new Promise<string | boolean | null>(resolve => { pending.current = resolve; });
  };

  const finish = (value: string | boolean | null) => {
    const resolve = pending.current;
    pending.current = null;
    setQuestion(null);
    resolve?.(value);
  };

  return {
    confirm: async (message: ReportCopy) => Boolean(await ask(message, 'confirm')),
    prompt: async (message: ReportCopy) => await ask(message, 'prompt') as string | null,
    dialog: question && <Modal isOpen onClose={() => finish(null)}
      title={question.kind === 'prompt' ? t("Reject request") : t("Konfirmasi tindakan")}
      description={typeof question.message === 'string' ? t(question.message) : t(question.message.source, question.message.params)} role={question.kind === 'confirm' ? 'alertdialog' : 'dialog'} size="md">
      <form onSubmit={event => { event.preventDefault(); finish(question.kind === 'prompt' ? answer : true); }}>
        {question.kind === 'prompt' && <div className="ph-field">
          <label htmlFor="report-rejection-reason">{t("Rejection reason")}</label>
          <textarea id="report-rejection-reason" value={answer} onChange={event => setAnswer(event.target.value)} rows={4} required />
        </div>}
        <ModalFooter>
          <button type="button" className="ph-button" onClick={() => finish(null)}>{t("Batal")}</button>
          <button type="submit" className="ph-button ph-button-primary">{question.kind === 'prompt' ? t("Reject") : t("Lanjutkan")}</button>
        </ModalFooter>
      </form>
    </Modal>,
  };
}
