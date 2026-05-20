import { Info } from 'lucide-react';

interface PreviewBannerProps {
  /**
   * Message to display. Default explains data is mock.
   */
  message?: string;
}

/**
 * Honest preview-data banner. Use on pages that display mock data
 * (e.g., CEO OKR/Succession/Budget/Talent dashboards that haven't been
 * wired to the real backend yet). Makes it explicit that figures shown
 * are placeholders so executives don't make decisions on fake numbers.
 */
export function PreviewBanner({
  message = 'Data yang ditampilkan adalah preview/contoh. Integrasi dengan data real belum tersedia — tidak untuk pengambilan keputusan.',
}: PreviewBannerProps) {
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
    >
      <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-semibold">Preview Data</p>
        <p className="mt-0.5 text-amber-800">{message}</p>
      </div>
    </div>
  );
}
