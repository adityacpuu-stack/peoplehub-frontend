import { t } from '@/i18n';

/** Mirrors the server rule (leave-document.ts): one PDF/JPG/JPEG/PNG up to 5 MiB. The server re-checks bytes. */
export const LEAVE_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const LEAVE_DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const ALLOWED = [
  { ext: ['.pdf'], mime: ['application/pdf'] },
  { ext: ['.jpg', '.jpeg'], mime: ['image/jpeg'] },
  { ext: ['.png'], mime: ['image/png'] },
];

type LeaveTypeLike = { code?: string | null; name?: string | null; requires_document?: boolean } | null | undefined;

/** Sick leave (code SICK/SL or a name containing sick/sakit) asks for a doctor's certificate. */
export function isSickLeave(type: LeaveTypeLike): boolean {
  const code = type?.code?.trim().toUpperCase() ?? '';
  const name = type?.name?.toLowerCase() ?? '';
  return code === 'SICK' || code === 'SL' || name.includes('sick') || name.includes('sakit');
}

export const leaveDocumentLabel = (type: LeaveTypeLike) => isSickLeave(type) ? t("Doctor's certificate") : t('Supporting document');

/**
 * Errors are returned as catalog SOURCE keys (render with t()), so a stored
 * error follows a later language switch.
 */
export function leaveDocumentError(file: File): string | null {
  const name = file.name.toLowerCase();
  const kind = ALLOWED.find(entry => entry.ext.some(ext => name.endsWith(ext)));
  if (!kind || (file.type && !kind.mime.includes(file.type))) return 'Use a PDF, JPG, JPEG or PNG file.';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > LEAVE_DOCUMENT_MAX_BYTES) return 'The file is larger than 5 MB.';
  return null;
}

/** Missing-file message key for the selected leave type. */
export const leaveDocumentMissing = (type: LeaveTypeLike) =>
  isSickLeave(type) ? "Attach the doctor's certificate before submitting." : 'Attach the supporting document before submitting.';

export const formatDocumentSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Server error codes for a document upload, as catalog source keys (render with t()). */
export function leaveDocumentServerError(code: unknown): string | null {
  switch (code) {
    case 'LEAVE_DOCUMENT_REQUIRED': return 'This leave type requires a supporting document.';
    case 'LEAVE_DOCUMENT_TOO_LARGE': return 'The file is larger than 5 MB.';
    case 'LEAVE_DOCUMENT_INVALID_TYPE':
    case 'LEAVE_DOCUMENT_INVALID': return 'Use a PDF, JPG, JPEG or PNG file.';
    case 'LEAVE_DOCUMENT_STORAGE_FAILED': return 'The document could not be uploaded. Your request was not sent; try again.';
    case 'LEAVE_DOCUMENT_NOT_ALLOWED': return 'This leave type does not take a supporting document.';
    default: return null;
  }
}
