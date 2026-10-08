import { payrollNumber } from '@/components/payroll/localization';
import { payrollEnumLabel } from '@/components/payroll/localization';
import { t, useLocale } from '@/i18n';
import { type ReactNode, useState, useId } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { AccountDialog } from '@/components/ui/AccountDialog';
import './compensation.css';
import './compensation-refresh.css';

export function CompensationWorkspace({ title, description, actions, filters, metrics, search, onSearch, searchLabel = 'Cari nama atau ID karyawan…', loading, error, onRetry, page, totalPages, onPage, count, children }: {
  title: string; description: string; actions: ReactNode; filters: ReactNode;
  metrics: { label: string; value: ReactNode; note?: string }[];
  search: string; onSearch: (value: string) => void; searchLabel?: string;
  loading: boolean; error: boolean; onRetry: () => void;
  page: number; totalPages: number; onPage: (page: number) => void; count: ReactNode; children: ReactNode;
}) {
  useLocale();
  return <div className="cp-page compensation-refresh">
    <header className="cp-header"><div><h1>{title}</h1><p>{description}</p></div><div className="cp-actions">{actions}</div></header>
    <div className="cp-workspace">
      <div className="cp-filters" role="group" aria-label={t("Filter compensation")}>{filters}</div>
      <section className="cp-content" aria-label={t("Daftar {value0}", { value0: title })}>
        <div className="cp-register">
          <div className="cp-toolbar"><label className="cp-search"><Search size={17} /><input aria-label={t("Cari data")} value={search} onChange={event => onSearch(event.target.value)} placeholder={t(searchLabel)} /></label><span>{loading ? t("Memuat…") : error ? t("Belum tersedia") : count}</span></div>
          {loading ? <div className="cp-feedback" role="status"><Loader2 className="animate-spin" size={25} /><h3>{t("Memuat data…")}</h3></div> : error ? <div className="cp-feedback" role="alert"><h3>{t("Data belum dapat dimuat")}</h3><p>{t("Coba muat ulang untuk melihat data terbaru.")}</p><button className="cp-button" onClick={onRetry}>{t("Coba lagi")}</button></div> : children}
          <div className="cp-metrics">{metrics.map(metric => <div key={metric.label}><span>{metric.label}</span><strong>{loading || error ? '—' : metric.value}</strong>{metric.note && <small>{loading || error ? t("Menunggu data terbaru") : metric.note}</small>}</div>)}</div>
          {!loading && !error && <footer className="cp-pagination"><span>{count}</span><nav aria-label={t("Halaman data")}><button className="cp-icon-button" aria-label={t("Halaman sebelumnya")} disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={17} /></button><span>{payrollNumber(Number(page))} / {payrollNumber(Number(Math.max(1, totalPages)))}</span><button className="cp-icon-button" aria-label={t("Halaman berikutnya")} disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={17} /></button></nav></footer>}
        </div>
      </section>
    </div>
  </div>;
}

export function CompensationStatus({ status, label }: { status: string; label?: string }) {
  useLocale();
  return <span className="cp-status" data-status={status}><i aria-hidden="true" />{label || payrollEnumLabel(status)}</span>;
}

export function CompensationEmpty() {
  useLocale();
  return <div className="cp-feedback"><h3>{t("Belum ada data yang cocok")}</h3><p>{t("Coba ubah pencarian atau filter yang dipilih.")}</p></div>;
}

export function CompensationDialog({ title, subtitle, busy = false, onClose, children }: {
  title: string; subtitle?: string; busy?: boolean; onClose: () => void; children: ReactNode;
}) {
  useLocale();
  const titleId = useId();
  return <AccountDialog className="cp-dialog ph-workflow compensation-refresh-dialog" labelledBy={titleId} toasterId="compensation-dialog" onClose={() => { if (!busy) onClose(); }}>
    <header><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" disabled={busy} className="cp-icon-button" aria-label={t("Tutup dialog")} onClick={onClose}><X size={20} /></button></header>
    {children}
  </AccountDialog>;
}

// Local, keyboard-accessible picker; preserves the existing form's value/onChange contract.
export function CompensationEmployeeSelect({ options, value, onChange, placeholder = 'Pilih karyawan', searchPlaceholder = 'Cari karyawan', disabled, loading, emptyMessage }: {
  options: { value: string | number; label: string; sublabel?: string }[];
  value: string | number; onChange: (value: string | number) => void;
  placeholder?: string; searchPlaceholder?: string; disabled?: boolean; loading?: boolean; emptyMessage?: string;
}) {
  useLocale();
  const [search, setSearch] = useState('');
  const visible = options.filter(option => String(option.value) === String(value) || `${option.label} ${option.sublabel || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="cp-employee-picker"><input aria-label={t("Cari karyawan")} disabled={disabled || loading} placeholder={t(searchPlaceholder)} value={search} onChange={event => setSearch(event.target.value)} /><select aria-label={t("Karyawan")} disabled={disabled || loading} value={value} onChange={event => onChange(event.target.value)}><option value="">{loading ? t("Memuat karyawan…") : t(placeholder)}</option>{visible.map(option => <option key={option.value} value={option.value}>{option.label}{option.sublabel ? ` · ${option.sublabel}` : ''}</option>)}</select>{!loading && !visible.length && <small>{emptyMessage || t('Tidak ada karyawan yang cocok.')}</small>}</div>;
}
