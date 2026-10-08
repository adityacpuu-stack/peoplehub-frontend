import { t, useLocale } from '@/i18n';
export function MasterDataError({ onRetry }: { onRetry: () => void }) {
  useLocale();
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t("Data belum berhasil dimuat.")} <button type="button" onClick={onRetry} className="ml-2 font-semibold underline">{t("Coba lagi")}</button>
  </div>;
}

export function MasterDataPager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  useLocale();
  const pages = Math.max(1, Math.ceil(total / 20));
  if (pages <= 1) return null;
  return <nav aria-label={t("Halaman data")} className="md-pager">
    <span>{total}{t("data · Halaman")} {page}{t("dari")} {pages}</span>
    <div className="flex gap-3"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="disabled:opacity-40">{t("Sebelumnya")}</button>
    <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="disabled:opacity-40">{t("Berikutnya")}</button></div>
  </nav>;
}
