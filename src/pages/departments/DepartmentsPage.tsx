import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/leave/domain-workflows.css';
import { DepartmentBoard } from '@/components/ui/OrganizationRecords';
import { CompanyScopePanel, DirectorySearch, DirectoryToggle, type DirectoryView } from '@/components/ui/MasterDataWorkspace';
import { MasterDataHeader, MasterDataSummary, MasterDataDialog } from '@/components/ui/MasterDataLayout';
import { collectPages, hasMasterRole } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import { MasterDataError, MasterDataPager } from '@/components/ui/MasterDataFeedback';
import { useEffect, useState, useRef } from 'react';
import { departmentService } from '@/services/department.service';
import { companyService, type Company } from '@/services/company.service';
import type { Department } from '@/types';
import toast from 'react-hot-toast';

export function DepartmentsPage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  const roles = user?.roles;
  const isEditorRole = hasMasterRole(roles);
  const isSuperAdmin = roles?.includes('Super Admin') ?? false;
  // Editor role is the ceiling; each mutation also needs its covered action.
  const canCreate = isEditorRole && canAction(user, 'department.create');
  const canManage = canCreate || (isEditorRole && canAction(user, 'department.update'));
  const inScope = (department: Department) => department.company_id != null || isSuperAdmin;
  const canEdit = (department: Department) => isEditorRole && canAction(user, 'department.update') && inScope(department);
  const canDelete = (department: Department) => isEditorRole && canAction(user, 'department.delete') && inScope(department);
  const requestId = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [directoryView, setDirectoryView] = useState<DirectoryView>('table');
  const [statusFilter, setStatusFilter] = useState('all');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    company_id: null as number | null,
    head_id: undefined as number | undefined,
    parent_id: undefined as number | undefined,
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => { fetchDepartments(); return () => { requestId.current++; }; }, []);
  useEffect(() => { setPage(1); }, [selectedCompanyId, search, statusFilter]);
  const fetchDepartments = async () => {
    const request = ++requestId.current;
    setIsLoading(true); setLoadError(false);
    try {
      const [companyRows, departmentRows] = await Promise.all([
        collectPages((page, limit) => companyService.getAll({ page, limit })),
        collectPages((page, limit) => departmentService.getAll({ page, limit })),
      ]);
      if (request !== requestId.current) return;
      setCompanies(companyRows); setDepartments(departmentRows); setPage(1);
    } catch {
      if (request !== requestId.current) return;
      setLoadError(true); setDepartments([]);
    } finally { if (request === requestId.current) setIsLoading(false); }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredDepartments = departments.filter(dept =>
    (!selectedCompanyId || dept.company_id == null || dept.company_id === selectedCompanyId) &&
    (dept.name.toLowerCase().includes(search.toLowerCase()) || dept.code?.toLowerCase().includes(search.toLowerCase()))
  );

  const visibleDepartments = filteredDepartments.filter(item => statusFilter === 'all' || (statusFilter === 'active' ? item.status === 'active' : item.status !== 'active'));

  const stats = {
    total: filteredDepartments.length,
    active: filteredDepartments.filter(d => d.status === 'active').length,
    inactive: filteredDepartments.filter(d => d.status === 'inactive').length,
  };

  const handleOpenModal = (department?: Department) => {
    if (department ? !canEdit(department) : !canCreate) return;
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name,
        code: department.code || '',
        description: department.description || '',
        company_id: department.company_id ?? null,
        head_id: department.head_id,
        parent_id: department.parent_id,
        status: department.status,
      });
    } else {
      setEditingDepartment(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        company_id: selectedCompanyId ?? (companies.length === 1 ? companies[0].id : null),
        head_id: undefined,
        parent_id: undefined,
        status: 'active' as 'active' | 'inactive',
      });
    }
    setShowModal(true);
  };

  const canSubmitDialog = editingDepartment ? canEdit(editingDepartment) : canCreate;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin && !formData.company_id) {
      toast.error(t("Pilih company dulu untuk department ini"));
      return;
    }
    // Re-check the current operation: access may have changed while the dialog was open.
    if (isSaving || !canSubmitDialog) return;
    setIsSaving(true);
    try {
      if (editingDepartment) {
        await departmentService.update(editingDepartment.id, formData);
        toast.success(t("Department updated successfully"));
      } else {
        await departmentService.create(formData);
        toast.success(t("Department created successfully"));
      }
      setShowModal(false);
      fetchDepartments();
    } catch {
      toast.error(t("Gagal menyimpan department"), { id: 'api-error' });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingDepartment || !canDelete(deletingDepartment) || isSaving) return;
    setIsSaving(true);
    try {
      await departmentService.delete(deletingDepartment.id);
      toast.success(t("Department deleted successfully"));
      setShowDeleteModal(false);
      setDeletingDepartment(null);
      fetchDepartments();
    } catch {
      toast.error(t("Gagal menonaktifkan department"), { id: 'api-error' });
    } finally { setIsSaving(false); }
  };

  const openDeleteModal = (dept: Department) => {
    setDeletingDepartment(dept);
    setShowDeleteModal(true);
  };



  return (
    <div className="master-data md-page master-refresh">
      {loadError && <MasterDataError onRetry={fetchDepartments} />}
      <MasterDataHeader title={t("Departments")} description={t("Struktur department per company, termasuk department global.")} actions={
        canCreate && !loadError && !isLoading && <button onClick={() => handleOpenModal()} className="md-button md-button-primary"><span aria-hidden="true" className="text-lg leading-none">+</span>{' '}{t("Add Department")}</button>
      } />


      <div className="md-explorer">
        <CompanyScopePanel companies={companies} value={selectedCompanyId} onChange={setSelectedCompanyId} allowAll
          status={statusFilter} onStatusChange={setStatusFilter} counts={stats} loading={isLoading || loadError}>{t("Department global tetap ikut ditampilkan saat memilih company.")}</CompanyScopePanel>
        <section className="md-directory-results" aria-label={t("Direktori department")}>
          <div className="md-results-toolbar"><DirectorySearch value={search} onChange={setSearch} label={t("Cari department")} placeholder={t("Search department...")} />
            <DirectoryToggle view={directoryView} onChange={setDirectoryView} />
          </div>
          <div className="md-results-heading"><div><h2>{selectedCompany?.name || t('Seluruh department')}</h2><p>{isLoading ? t("Memuat data…") : loadError ? t("Data belum tersedia") : t("{count} department ditemukan", { count: visibleDepartments.length.toLocaleString(intlLocale()) })}</p></div></div>
          {isLoading ? <div className="md-directory-empty" role="status">{t("Memuat department…")}</div>
            : loadError ? <div className="md-directory-empty">{t("Data belum tersedia. Gunakan Coba lagi untuk memuat ulang.")}</div>
            : visibleDepartments.length === 0 ? <div className="md-directory-empty"><h3>{t("Tidak ada department ditemukan")}</h3><p>{t("Coba ubah company, status, atau kata pencarian.")}</p></div>
            : directoryView === 'board' ? <DepartmentBoard departments={visibleDepartments.slice((page - 1) * 20, page * 20)} companies={companies} canEdit={canEdit} canDelete={canDelete} onEdit={handleOpenModal} onDelete={openDeleteModal} />
            : <div className="md-panel overflow-x-auto"><table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Department")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Code")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Description")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Status")}</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleDepartments.slice((page - 1) * 20, page * 20).map(dept => (
                  <tr data-master-record key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="md-avatar">
                          {dept.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{dept.name}</p>
                          <p className="text-xs text-gray-500">{dept.company_id == null ? t("Global · Semua company") : dept.company?.name ?? companies.find(company => company.id === dept.company_id)?.name ?? t("Company {id}", { id: dept.company_id })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm font-mono rounded-lg">
                        {dept.code || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {dept.description || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dept.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{' '}{t("Active")} </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>{' '}{t("Inactive")} </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit(dept) && (<button
                          onClick={() => handleOpenModal(dept)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={t("Edit")}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>)}
                        {canDelete(dept) && (<button
                          onClick={() => openDeleteModal(dept)}
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
          <MasterDataPager page={page} total={visibleDepartments.length} onChange={setPage} />
        </section>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <MasterDataDialog busy={isSaving} labelledBy="md-departments-dialog-0" onClose={() => setShowModal(false)}>
              <div className="md-dialog-header">
                <div className="flex items-center justify-between">
                  <h2 id="md-departments-dialog-0" className="text-xl font-bold text-slate-900">
                    {editingDepartment ? t("Edit Department") : t("Add Department")}
                  </h2>
                  <button disabled={isSaving}
                    onClick={() => setShowModal(false)}
                    className="md-avatar"
                   aria-label={t("Tutup dialog")}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="ph-workflow dw-form"><div className="dw-form-content"><section className="ph-section dw-section"><h3>{t("Department & company")}</h3><div className="dw-fields"><div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-departments-field-0">{t("Company")} <span className="text-red-500">*</span>
                  </label>
                  <select id="md-departments-field-0"
                    disabled={!!editingDepartment} aria-label={t("Company department")} value={formData.company_id ?? ''}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    required={!isSuperAdmin}
                  >
                    <option value="">{isSuperAdmin ? t("Global (semua company)") : t("-- Pilih company --")}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div><div className="ph-form-grid dw-form-grid"><div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-departments-field-1">{t("Department Name")} <span className="text-red-500">*</span>
                  </label>
                  <input id="md-departments-field-1"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder={t("e.g., Engineering")}
                    required
                  />
                </div><div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-departments-field-2">{t("Code")} </label>
                  <input id="md-departments-field-2"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    placeholder={t("e.g., ENG")}
                    maxLength={10}
                  />
                </div></div></div></section><section className="ph-section dw-section"><h3>{t("Description & status")}</h3><div className="dw-fields"><div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="md-departments-field-3">{t("Description")} </label>
                  <textarea id="md-departments-field-3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder={t("Department description...")}
                    rows={3}
                  />
                </div><div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("Status")} </label>
                  <div className="dw-checks">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.status === 'active'}
                        onChange={() => setFormData({ ...formData, status: 'active' })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{t("Active")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.status === 'inactive'}
                        onChange={() => setFormData({ ...formData, status: 'inactive' })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{t("Inactive")}</span>
                    </label>
                  </div>
                </div></div></section></div>{!canSubmitDialog && <p role="status" className="text-sm text-amber-700 px-1" data-testid="access-changed">{t("Your access changed; this action is no longer available. Your input is kept until you close the dialog.")}</p>}<div className="ph-form-actions dw-actions">
                  <button disabled={isSaving}
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    disabled={isSaving || !canSubmitDialog} type="submit"
                    className="ph-button ph-button-primary"
                  >
                    {editingDepartment ? t("Update") : t("Save")}
                  </button>
                </div></form>
            </MasterDataDialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingDepartment && (
        <MasterDataDialog busy={isSaving} labelledBy="md-departments-dialog-1" onClose={() => setShowDeleteModal(false)}>
              <div className="ph-workflow dw-confirm">

                <h3 id="md-departments-dialog-1" className="text-lg font-bold text-gray-900 mb-2">{t("Delete Department?")}</h3>
                <p className="text-gray-500 text-sm mb-6">{t("Are you sure you want to delete department")} <span className="font-semibold text-gray-700">{deletingDepartment.name}</span>{t("? This action cannot be undone.")} </p>
                <div className="ph-form-actions dw-actions">
                  <button disabled={isSaving}
                    onClick={() => setShowDeleteModal(false)}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  <button
                    disabled={isSaving || !canDelete(deletingDepartment)} onClick={handleDelete}
                    className="ph-button dw-danger"
                  >{t("Delete")} </button>
                </div>
              </div>
            </MasterDataDialog>
      )}
    </div>
  );
}
