import { useEffect, useId, useRef, useState } from 'react';
import { FileText, LockKeyhole, Upload, X } from 'lucide-react';
import { t, useLocale } from '@/i18n';
import { formatDocumentSize, isSickLeave, LEAVE_DOCUMENT_ACCEPT, leaveDocumentError, leaveDocumentLabel } from './leave-document';
import './leave-document.css';

type LeaveTypeLike = { id?: number; code?: string | null; name?: string | null; requires_document?: boolean } | null | undefined;

/**
 * One supporting document for a leave request, shown only when the selected
 * leave type requires one. Validation here is a convenience; the server
 * re-checks size, type and file signature.
 *
 * Render it with `key={leaveTypeId}` (self-service My Leave) so its local state starts fresh for each
 * leave type. Errors (local and `error`) are catalog source keys rendered with
 * t(), so they follow a language switch.
 */
export function LeaveDocumentField({ leaveType, file, onChange, error, disabled }: {
  leaveType: LeaveTypeLike;
  file: File | null;
  onChange: (file: File | null) => void;
  /** Source key (or server text) from submit validation or the server. */
  error?: string | null;
  disabled?: boolean;
}) {
  useLocale();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  // A removed or replaced file must not linger in the native input.
  useEffect(() => { if (!file && input.current) input.current.value = ''; }, [file]);
  if (!leaveType?.requires_document) return null;

  const label = leaveDocumentLabel(leaveType);
  // The parent clears `error` on every pick, so a present `error` is the newest (submit/server).
  const shown = error ?? localError ?? null;
  const chooseLabel = isSickLeave(leaveType) ? t("Choose doctor's certificate") : t('Choose supporting document');
  return <div className="leave-document-field personal-full" data-testid="leave-document-field">
    <label htmlFor={id} className="leave-document-label">{label} <span className="leave-document-required">{t('(required)')}</span></label>
    <div className={`leave-document-surface${shown ? ' leave-document-surface-error' : ''}`}>
      {file ? <div className="leave-document-file" role="group" aria-label={t('Selected file')}>
        <FileText className="leave-document-file-icon" aria-hidden="true" />
        <div className="leave-document-file-info">
          <span className="leave-document-name" title={file.name}>{file.name}</span>
          <span className="leave-document-size">{formatDocumentSize(file.size)} · {t('Ready to attach')}</span>
        </div>
        <div className="leave-document-actions">
          <button type="button" className="leave-document-change" disabled={disabled} onClick={() => input.current?.click()}
            aria-describedby={`${id}-hint${shown ? ` ${id}-error` : ''}`}>{t('Change file')}</button>
          <button type="button" className="leave-document-remove" disabled={disabled} onClick={() => { setLocalError(null); onChange(null); }}
            aria-label={t('Remove {name}', { name: file.name })}><X aria-hidden="true" />{t('Remove')}</button>
        </div>
      </div> : <div className="leave-document-empty">
        <button type="button" className="leave-document-choose" disabled={disabled} onClick={() => input.current?.click()}
          aria-describedby={`${id}-hint${shown ? ` ${id}-error` : ''}`}><Upload aria-hidden="true" />{chooseLabel}</button>
        <span className="leave-document-empty-note">{t('Select a file from your device.')}</span>
      </div>}
      <p id={`${id}-hint`} className="leave-document-hint">{t('PDF, JPG, JPEG or PNG · Maximum 5 MB')}</p>
    </div>
    <p className="leave-document-privacy"><LockKeyhole aria-hidden="true" />{t('Private. Only you, your assigned approver and P&C can open this document.')}</p>
    <input ref={input} id={id} type="file" accept={LEAVE_DOCUMENT_ACCEPT} disabled={disabled} tabIndex={-1}
      aria-describedby={`${id}-hint${shown ? ` ${id}-error` : ''}`} aria-invalid={shown ? true : undefined}
      className="leave-document-input"
      onChange={event => {
        const picked = event.target.files?.[0] ?? null;
        if (!picked) return;
        const problem = leaveDocumentError(picked);
        setLocalError(problem);
        // An invalid replacement also discards the previous file: the user meant
        // to replace it, so it must never be submitted silently.
        onChange(problem ? null : picked);
        if (problem) event.target.value = '';
      }} />
    {shown && <p id={`${id}-error`} role="alert" className="leave-document-error">{t(shown)}</p>}
  </div>;
}
