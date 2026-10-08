import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/leave/domain-workflows.css';
import { PositionCatalog } from '@/components/ui/OrganizationRecords';
import { CompanyScopePanel, DirectorySearch, DirectoryToggle, type DirectoryView } from '@/components/ui/MasterDataWorkspace';
import { MasterDataHeader, MasterDataSummary, MasterDataDialog } from '@/components/ui/MasterDataLayout';
import { collectPages, hasMasterRole } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import { MasterDataError, MasterDataPager } from '@/components/ui/MasterDataFeedback';
import { useEffect, useState, useRef } from 'react';
import { companyService, type Company } from '@/services/company.service';
import { departmentService } from '@/services/department.service';
import { positionService, POSITION_LEVELS, getLevelName } from '@/services/position.service';
import type { Department } from '@/types';
import toast from 'react-hot-toast';

interface Position {
  id: number;
  company_id: number;
  department_id: number | null;
  name: string;
  code: string | null;
  description: string | null;
  level: number | null;
  min_salary: number | null;
  max_salary: number | null;
  status: string | null;
  created_at: string;
  department?: {
    id: number;
    name: string;
  };
  company?: {
    id: number;
    name: string;
  };
}

export function PositionsPage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  const roles = user?.roles;
  const isEditorRole = hasMasterRole(roles);
  // Editor role is the ceiling; each mutation also needs its covered action.
  const canCreate = isEditorRole && canAction(user, 'position.create');
  const canUpdate = isEditorRole && canAction(user, 'position.update');
  const canDelete = isEditorRole && canAction(user, 'position.delete');
  const canManage = canCreate || canUpdate;
  const requestId = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [directoryView, setDirectoryView] = useState<DirectoryView>('table');
  const [statusFilter, setStatusFilter] = useState('all');

  const [positions, setPositions] = useState<Position[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department_id: undefined as number | undefined,
    level: '' as string,
    min_salary: '',
    max_salary: '',
    status: 'active',
  });

  useEffect(() => { fetchPositions(); return () => { requestId.current++; }; }, []);
  useEffect(() => { setPage(1); }, [selectedCompanyId, search, statusFilter]);
  const fetchPositions = async () => {
    const request = ++requestId.current;
    setIsLoading(true); setLoadError(false);
    try {
      const [companyRows, departmentRows, positionRows] = await Promise.all([
        collectPages((page, limit) => companyService.getAll({ page, limit })),
        collectPages((page, limit) => departmentService.getAll({ page, limit })),
        collectPages((page, limit) => positionService.getAll({ page, limit })),
      ]);
      if (request !== requestId.current) return;
      setCompanies(companyRows); setDepartments(departmentRows);
      setPositions(positionRows as unknown as Position[]); setPage(1);
      setSelectedCompanyId(current => current ?? companyRows[0]?.id ?? null);
    } catch {
      if (request !== requestId.current) return;
      setLoadError(true); setPositions([]);
    } finally { if (request === requestId.current) setIsLoading(false); }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredPositions = positions.filter(pos =>
    (!selectedCompanyId || pos.company_id === selectedCompanyId) && (
    pos.name.toLowerCase().includes(search.toLowerCase()) ||
    (pos.code && pos.code.toLowerCase().includes(search.toLowerCase())) ||
    (pos.department?.name && pos.department.name.toLowerCase().includes(search.toLowerCase())))
  );

  const visiblePositions = filteredPositions.filter(item => statusFilter === 'all' || (statusFilter === 'active' ? item.status === 'active' : item.status !== 'active'));

  const stats = {
    total: filteredPositions.length,
    active: filteredPositions.filter(p => p.status === 'active').length,
    inactive: filteredPositions.filter(p => p.status !== 'active').length,
  };

  const handleOpenModal = (position?: Position) => {
    if (position ? !canUpdate : !canCreate) return;
    if (position) {
      setEditingPosition(position);
      setFormData({
        name: position.name,
        code: position.code || '',
        description: position.description || '',
        department_id: position.department_id || undefined,
        level: position.level?.toString() || '',
        min_salary: position.min_salary?.toString() || '',
        max_salary: position.max_salary?.toString() || '',
        status: position.status || 'active',
      });
    } else {
      setEditingPosition(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        department_id: undefined,
        level: '',
        min_salary: '',
        max_salary: '',
        status: 'active',
      });
    }
    setShowModal(true);
  };

  // Re-check the current operation: access may have changed while the dialog was open.
  const canSubmitDialog = editingPosition ? canUpdate : canCreate;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || isSubmitting || !canSubmitDialog) return;

    if (formData.min_salary && formData.max_salary && Number(formData.min_salary) > Number(formData.max_salary)) {
      toast.error(t("Gaji minimum tidak boleh melebihi maksimum")); return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        company_id: editingPosition?.company_id ?? selectedCompanyId,
        department_id: formData.department_id ?? null,
        level: formData.level ? parseInt(formData.level) : null,
        min_salary: formData.min_salary ? parseFloat(formData.min_salary) : null,
        max_salary: formData.max_salary ? parseFloat(formData.max_salary) : null,
        status: formData.status,
      };

      if (editingPosition) {
        await positionService.update(editingPosition.id, payload);
        toast.success(t("Position updated successfully"));
      } else {
        await positionService.create(payload);
        toast.success(t("Position created successfully"));
      }
      setShowModal(false);
      fetchPositions();
    } catch {
      toast.error(t("Failed to save position"), { id: 'api-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPosition || !canDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await positionService.delete(deletingPosition.id);
      toast.success(t("Position deleted successfully"));
      setShowDeleteModal(false);
      setDeletingPosition(null);
      fetchPositions();
    } catch {
      toast.error(t("Failed to delete position"), { id: 'api-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (pos: Position) => {
    setDeletingPosition(pos);
    setShowDeleteModal(true);
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };



  const getLevelBadge = (level: number | null) => {
    if (!level) return null;
    const levelName = getLevelName(level);
    const levelStyles: Record<string, string> = {
      'Entry': 'bg-gray-100 text-gray-700',
      'Junior': 'bg-blue-100 text-blue-700',
      'Mid': 'bg-cyan-100 text-cyan-700',
      'Senior': 'bg-purple-100 text-purple-700',
      'Lead': 'bg-indigo-100 text-indigo-700',
      'Manager': 'bg-teal-100 text-teal-700',
      'Director': 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelStyles[levelName] || 'bg-gray-100 text-gray-600'}`}>
        {t(levelName)}
      </span>
    );
  };

  return (
    <div className="master-data md-page master-refresh">
      {loadError && <MasterDataError onRetry={fetchPositions} />}
      <MasterDataHeader title={t("Positions")} description={t("Jabatan, level, dan rentang gaji dalam struktur perusahaan.")} actions={
        canCreate && !!selectedCompanyId && !isLoading && !loadError && <button onClick={() => handleOpenModal()} className="md-button md-button-primary"><span aria-hidden="true" className="text-lg leading-none">+</span>{' '}{t("Add Position")}</button>
      } />


      <div className="md-explorer">
        <CompanyScopePanel companies={companies} value={selectedCompanyId} onChange={setSelectedCompanyId}
          status={statusFilter} onStatusChange={setStatusFilter} counts={stats} loading={isLoading || loadError}>{t("Pilih company untuk melihat jabatan, level, dan rentang gajinya.")}</CompanyScopePanel>
        <section className="md-directory-results" aria-label={t("Direktori position")}>
          <div className="md-results-toolbar"><DirectorySearch value={search} onChange={setSearch} label={t("Cari position")} placeholder={t("Search position...")} />
            <DirectoryToggle view={directoryView} onChange={setDirectoryView} />
          </div>
          <div className="md-results-heading"><div><h2>{selectedCompany?.name || t('Pilih company')}</h2><p>{isLoading ? t("Memuat data…") : loadError ? t("Data belum tersedia") : t("{count} position ditemukan", { count: visiblePositions.length.toLocaleString(intlLocale()) })}</p></div></div>
          {isLoading ? <div className="md-directory-empty" role="status">{t("Memuat position…")}</div>
            : loadError ? <div className="md-directory-empty">{t("Data belum tersedia. Gunakan Coba lagi untuk memuat ulang.")}</div>
            : visiblePositions.length === 0 ? <div className="md-directory-empty"><h3>{t("Tidak ada position ditemukan")}</h3><p>{t("Coba ubah company, status, atau kata pencarian.")}</p></div>
            : directoryView === 'board' ? <PositionCatalog positions={visiblePositions.slice((page - 1) * 20, page * 20)} departments={departments} canManage={canUpdate} canDelete={canDelete} onEdit={handleOpenModal} onDelete={openDeleteModal} getLevelName={getLevelName} formatCurrency={formatCurrency} />
            : <div className="md-panel overflow-x-auto"><table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Position")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Department")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Level")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Salary Range")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Status")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiblePositions.slice((page - 1) * 20, page * 20).map(pos => (
                  <tr data-master-record key={pos.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="md-avatar">
                          {pos.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{pos.name}</p>
                          {pos.code && (
                            <span className="text-xs text-gray-500 font-mono">{pos.code}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {pos.department ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {pos.department.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getLevelBadge(pos.level) || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {pos.min_salary != null || pos.max_salary != null ? (
                          <>
                            <p className="text-gray-900 font-medium">{formatCurrency(pos.min_salary)}</p>
                            <p className="text-gray-500">{t("to")} {formatCurrency(pos.max_salary)}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {pos.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{' '}{t("Active")} </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>{' '}{t("Inactive")} </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {canUpdate && (<button
                          onClick={() => handleOpenModal(pos)}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title={t("Edit")}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>)}
                        {canDelete && (<button
                          onClick={() => openDeleteModal(pos)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t("Delete")}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>}
          <MasterDataPager page={page} total={visiblePositions.length} onChange={setPage} />
        </section>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <MasterDataDialog busy={isSubmitting} labelledBy="md-positions-dialog-0" onClose={() => setShowModal(false)}>
              <div className="md-dialog-header">
                <div className="flex items-center justify-between">
                  <h2 id="md-positions-dialog-0" className="text-xl font-bold text-slate-900">
                    {editingPosition ? t("Edit Position") : t("Add Position")}
                  </h2>
                  <button disabled={isSubmitting}
                    onClick={() => setShowModal(false)}
                    className="md-avatar"
                   aria-label={t("Tutup dialog")}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="ph-workflow dw-form"><div className="dw-form-content"><section className="ph-section dw-section"><h3>{t("Position & department")}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid"><div className="dw-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-positions-field-0">{t("Position Name")} <span className="text-red-500">*</span>
                    </label>
                    <input id="md-positions-field-0"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      placeholder={t("e.g., Software Engineer")}
                      required
                    />
                  </div>
<div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-positions-field-1">{t("Code")} </label>
                    <input id="md-positions-field-1"
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                      placeholder={t("e.g., SE")}
                      maxLength={10}
                    />
                  </div>
<div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-positions-field-2">{t("Level")} </label>
                    <select id="md-positions-field-2"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="">{t("Select Level")}</option>
                      {Object.entries(POSITION_LEVELS).map(([value, label]) => (
                        <option key={value} value={value}>{t(label)}</option>
                      ))}
                    </select>
                  </div>
<div className="dw-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-positions-field-3">{t("Department")} </label>
                    <select id="md-positions-field-3"
                      value={formData.department_id || ''}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="">{t("Select Department")}</option>
                      {departments.filter(dept => (dept.company_id == null || dept.company_id === (editingPosition?.company_id ?? selectedCompanyId)) && (dept.status === 'active' || dept.id === formData.department_id)).map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div></div></div></section><section className="ph-section dw-section"><h3>{t("Salary range")}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid"><div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-positions-field-4">{t("Minimum Salary")} </label>
                    <input id="md-positions-field-4"
                      type="number"
                      value={formData.min_salary}
                      onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      placeholder="0"
                    />
                  </div>
<div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-positions-field-5">{t("Maximum Salary")} </label>
                    <input id="md-positions-field-5"
                      type="number"
                      value={formData.max_salary}
                      onChange={(e) => setFormData({ ...formData, max_salary: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      placeholder="0"
                    />
                  </div></div></div></section><section className="ph-section dw-section"><h3>{t("Description & status")}</h3><div className="dw-fields"><div className="dw-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-positions-field-6">{t("Description")} </label>
                    <textarea id="md-positions-field-6"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                      placeholder={t("Position description...")}
                      rows={3}
                    />
                  </div>
<div className="dw-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("Status")} </label>
                    <div className="dw-checks">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.status === 'active'}
                          onChange={() => setFormData({ ...formData, status: 'active' })}
                          className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{t("Active")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.status === 'inactive'}
                          onChange={() => setFormData({ ...formData, status: 'inactive' })}
                          className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{t("Inactive")}</span>
                      </label>
                    </div>
                  </div></div></section></div>{!canSubmitDialog && <p role="status" className="text-sm text-amber-700 px-1" data-testid="access-changed">{t("Your access changed; this action is no longer available. Your input is kept until you close the dialog.")}</p>}<div className="ph-form-actions dw-actions">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !canSubmitDialog}
                    className="ph-button ph-button-primary"
                  >
                    {isSubmitting && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {editingPosition ? t("Update") : t("Save")}
                  </button>
                </div></form>
            </MasterDataDialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingPosition && (
        <MasterDataDialog busy={isSubmitting} labelledBy="md-positions-dialog-1" onClose={() => setShowDeleteModal(false)}>
              <div className="ph-workflow dw-confirm">

                <h3 id="md-positions-dialog-1" className="text-lg font-bold text-gray-900 mb-2">{t("Delete Position?")}</h3>
                <p className="text-gray-500 text-sm mb-6">{t("Are you sure you want to delete position")} <span className="font-semibold text-gray-700">{deletingPosition.name}</span>{t("? This action cannot be undone.")} </p>
                <div className="ph-form-actions dw-actions">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isSubmitting}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting || !canDelete}
                    className="ph-button dw-danger"
                  >
                    {isSubmitting && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}{' '}{t("Delete")} </button>
                </div>
              </div>
            </MasterDataDialog>
      )}
    </div>
  );
}
