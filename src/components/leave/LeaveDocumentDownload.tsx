import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Download, Loader2 } from 'lucide-react';
import { t, useLocale } from '@/i18n';
import { leaveService } from '@/services/leave.service';
import { isSickLeave } from './leave-document';
import './leave-document.css';

type LeaveLike = { id: number; has_document?: boolean; leaveType?: { code?: string | null; name?: string | null } | null };

/**
 * Opens a leave's supporting document through the authorized endpoint. The
 * server returns a 60-second forced-download link; nothing is cached or kept.
 */
export function LeaveDocumentDownload({ leave, className }: { leave: LeaveLike; className?: string }) {
  useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!leave.has_document) return null;

  const download = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const { url } = await leaveService.getDocumentDownload(leave.id);
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (cause) {
      const status = isAxiosError(cause) ? cause.response?.status : undefined;
      setError(status === 403 ? t('You do not have access to this document.')
        : status === 404 ? t('This document is not available.')
          : t('The document could not be opened. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return <div className={`leave-document-download ${className ?? ''}`} data-testid="leave-document-download">
    <button type="button" className="ph-button leave-document-button" onClick={() => void download()} disabled={loading} aria-busy={loading || undefined}>
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
      {loading ? t('Preparing download…') : isSickLeave(leave.leaveType) ? t("Download doctor's certificate") : t('Download supporting document')}
    </button>
    {error && <p role="alert" className="leave-document-error">{error}</p>}
  </div>;
}
