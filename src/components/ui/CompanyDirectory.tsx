import { t, useLocale, intlLocale } from '@/i18n';
import { Building2, Pencil, Trash2, Users, MapPin, Mail, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Company } from '@/services/company.service';
import { MasterDataPager } from './MasterDataFeedback';
import { DirectoryToggle, type DirectoryView } from './MasterDataWorkspace';

export function CompanyDirectory({ companies, onSelect, onEdit, onDelete }: {
  companies: Company[]; onSelect: (company: Company) => void;
  onEdit?: (company: Company) => void; onDelete?: (company: Company) => void;
}) {
  useLocale();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<DirectoryView>('table');
  const resultIds = companies.map(company => company.id).join(',');
  useEffect(() => { setPage(1); }, [resultIds]);
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(companies.length / 20)));
  const visible = companies.slice((visiblePage - 1) * 20, visiblePage * 20);
  return <><div className="md-company-viewbar"><span>{companies.length}{t("perusahaan dalam direktori")}</span><DirectoryToggle view={view} onChange={setView} /></div>
    {view === 'board' ? <div className="md-company-workspace"><div className="md-company-gallery">{visible.map((company, index) => <article className={`md-company-card md-company-tone-${index % 3}`} key={company.id} data-master-record>
      <div className="md-company-card-top"><span>{company.type}</span><span className={`md-badge ${company.is_active ? 'md-badge-active' : 'md-badge-inactive'}`}>{company.is_active ? t("Aktif") : t("Nonaktif")}</span></div>
      <div className="md-company-identity"><div className="md-company-mark"><Building2 /></div><span>{company.code}</span></div>
      <h3><button type="button" onClick={() => onSelect(company)}>{company.name}</button></h3>
      <div className="md-company-contact"><MapPin /><span>{company.city || company.address || 'Alamat belum ditambahkan'}</span></div>
      <div className="md-company-contact"><Mail /><span>{company.email || 'Email belum ditambahkan'}</span></div>
      <footer><span><Users />{(company.employee_count ?? 0).toLocaleString(intlLocale())}{t("karyawan")}</span><div>
        {onEdit && <button type="button" onClick={() => onEdit(company)} aria-label={t('Edit {name}', { name: company.name })}><Pencil /></button>}
        {onDelete && <button type="button" onClick={() => onDelete(company)} aria-label={t('Nonaktifkan {name}', { name: company.name })} className="md-delete-action"><Trash2 /></button>}
        <button type="button" onClick={() => onSelect(company)} aria-label={t('Lihat detail {name}', { name: company.name })}><ArrowUpRight /></button>
      </div></footer>
    </article>)}</div>
    </div> : <div className="overflow-x-auto"><table>
    <thead><tr><th className="text-left">{t("Company")}</th><th className="text-left">{t("Tipe")}</th>
      <th className="text-right">{t("Karyawan")}</th><th className="text-left">{t("Status")}</th>
      {(onEdit || onDelete) && <th className="text-right">{t("Actions")}</th>}
    </tr></thead>
    <tbody>{visible.map(company => <tr key={company.id} data-master-record>
      <td><div className="flex items-center gap-3">
        <div className="md-avatar"><Building2 aria-hidden="true" /></div>
        <div className="min-w-0"><button type="button" onClick={() => onSelect(company)} className="md-record-link">{company.name}</button>
          <p className="md-record-meta">{company.code}{company.address ? ` · ${company.address}` : ''}</p></div>
      </div></td>
      <td><span className="md-badge">{company.type}</span></td>
      <td className="text-right">{(company.employee_count ?? 0).toLocaleString(intlLocale())}</td>
      <td><span className={`md-badge ${company.is_active ? 'md-badge-active' : 'md-badge-inactive'}`}>{company.is_active ? t("Aktif") : t("Nonaktif")}</span></td>
      {(onEdit || onDelete) && <td><div className="flex justify-end gap-1">
        {onEdit && <button type="button" onClick={() => onEdit(company)} aria-label={t('Edit {name}', { name: company.name })} className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>}
        {onDelete && <button type="button" onClick={() => onDelete(company)} aria-label={t('Nonaktifkan {name}', { name: company.name })} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
      </div></td>}
    </tr>)}</tbody>
  </table></div>}<div className="px-5"><MasterDataPager page={visiblePage} total={companies.length} onChange={setPage} /></div></>;
}
