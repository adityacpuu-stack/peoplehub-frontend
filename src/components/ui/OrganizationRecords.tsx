import { t, useLocale } from '@/i18n';
import { Network, Pencil, Trash2, Building2, BriefcaseBusiness, CornerDownRight } from 'lucide-react';
import type { Department } from '@/types';
import type { Company } from '@/services/company.service';

export function DepartmentBoard({ departments, companies, canEdit, canDelete = canEdit, onEdit, onDelete }: {
  departments: Department[]; companies: Company[]; canEdit: (department: Department) => boolean;
  /** Defaults to canEdit (existing behaviour). */
  canDelete?: (department: Department) => boolean;
  onEdit: (department: Department) => void; onDelete: (department: Department) => void;
}) {
  useLocale();
  return <div className="md-department-board">{departments.map(department => <article className="md-department-card" data-master-record key={department.id}>
    <div className="md-record-top"><span className="md-record-symbol"><Network /></span><span className={`md-badge ${department.status === 'active' ? 'md-badge-active' : 'md-badge-inactive'}`}>{department.status === 'active' ? t("Active") : t("Inactive")}</span></div>
    <h3>{department.name}</h3><span className="md-record-code">{department.code || t('Kode belum diisi')}</span>
    <p className="md-record-description">{department.description || t('Deskripsi department belum ditambahkan.')}</p>
    <div className="md-record-parent"><CornerDownRight /><span>{department.company_id == null ? t("Global · Semua company") : department.company?.name || companies.find(company => company.id === department.company_id)?.name || t('Company {id}', { id: department.company_id })}</span></div>
    {(canEdit(department) || canDelete(department)) && <footer className="md-card-actions">{canEdit(department) && <button onClick={() => onEdit(department)} title={t("Edit")}><Pencil />{t("Edit")}</button>}{canDelete(department) && <button onClick={() => onDelete(department)} title={t("Delete")} className="md-delete-action"><Trash2 />{t("Delete")}</button>}</footer>}
  </article>)}</div>;
}

export type PositionRecord = { id: number; name: string; code: string | null; description: string | null; status: string | null; level: number | null; department_id: number | null; department?: { name: string }; min_salary: number | null; max_salary: number | null };
export function PositionCatalog<T extends PositionRecord>({ positions, departments, canManage, canDelete = canManage, onEdit, onDelete, getLevelName, formatCurrency }: {
  positions: T[]; departments: Department[]; canManage: boolean;
  /** Defaults to canManage (existing behaviour). */
  canDelete?: boolean;
  onEdit: (position: T) => void; onDelete: (position: T) => void;
  getLevelName: (level: number) => string; formatCurrency: (value: number | null) => string;
}) {
  useLocale();
  return <div className="md-position-catalog">{positions.map(position => <article key={position.id} className="md-position-record" data-master-record>
    <div className="md-position-level"><BriefcaseBusiness /><span>{position.level ? getLevelName(position.level) : t("Level belum diisi")}</span></div>
    <div className="md-position-body"><div className="md-record-top"><span className="md-record-code">{position.code || t('Tanpa kode')}</span><span className={`md-badge ${position.status === 'active' ? 'md-badge-active' : 'md-badge-inactive'}`}>{position.status === 'active' ? t("Active") : t("Inactive")}</span></div>
      <h3>{position.name}</h3><p className="md-position-department"><Building2 />{position.department?.name || departments.find(department => department.id === position.department_id)?.name || t('Department belum dipilih')}</p>
      {position.description && <p className="md-record-description">{position.description}</p>}
    </div>
    <div className="md-position-compensation"><span>{t("Rentang gaji")}</span><strong>{position.min_salary != null || position.max_salary != null ? `${formatCurrency(position.min_salary)} – ${formatCurrency(position.max_salary)}` : t("Belum ditentukan")}</strong>
      {(canManage || canDelete) && <div className="md-card-actions">{canManage && <button title={t("Edit")} onClick={() => onEdit(position)}><Pencil />{t("Edit")}</button>}{canDelete && <button title={t("Delete")} className="md-delete-action" onClick={() => onDelete(position)}><Trash2 />{t("Delete")}</button>}</div>}
    </div>
  </article>)}</div>;
}
