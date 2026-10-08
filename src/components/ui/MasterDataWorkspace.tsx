import { t, useLocale } from '@/i18n';
import type { ReactNode } from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import type { Company } from '@/services/company.service';

export type DirectoryView = 'board' | 'table';
export function DirectoryToggle({ view, onChange }: { view: DirectoryView; onChange: (view: DirectoryView) => void }) {
  useLocale();
  return <div className="md-view-switch" aria-label={t("Tampilan data")}>
    <button type="button" aria-pressed={view === 'board'} onClick={() => onChange('board')}><LayoutGrid />{t("Kartu")}</button>
    <button type="button" aria-pressed={view === 'table'} onClick={() => onChange('table')}><List />{t("Tabel")}</button>
  </div>;
}

export function DirectorySearch({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  useLocale();
  return <div className="md-directory-search"><Search aria-hidden="true" /><input type="search" aria-label={label} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

export function CompanyScopePanel({ companies, value, onChange, allowAll = false, status, onStatusChange, counts, loading, children }: {
  companies: Company[]; value: number | null; onChange: (value: number | null) => void; allowAll?: boolean;
  status: string; onStatusChange: (value: string) => void; counts: { total: number; active: number; inactive: number }; loading: boolean; children?: ReactNode;
}) {
  useLocale();
  return <div className="md-scope-panel" role="group" aria-label={t("Filter direktori")}>
    <label className="md-scope-company">{t("Company")} <select aria-label={t("Filter company")} value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      {allowAll && <option value="">{t("Semua company yang dapat diakses")}</option>}
      {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
    </select></label>
    <div className="md-status-filters" role="group" aria-label={t("Status data")}>
      {[['all', 'Semua', counts.total], ['active', 'Active', counts.active], ['inactive', 'Inactive', counts.inactive]].map(([key, label, count]) =>
        <button type="button" key={key} aria-pressed={status === key} onClick={() => onStatusChange(String(key))}><span>{t(String(label))}</span><span>{loading ? '—' : count}</span></button>)}
    </div>
    {children && <div className="md-scope-note">{children}</div>}
  </div>;
}
