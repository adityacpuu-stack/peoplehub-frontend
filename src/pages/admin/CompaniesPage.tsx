import { companyTypeLabel } from './localization';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/leave/domain-workflows.css';
import { CompanyDirectory } from '@/components/ui/CompanyDirectory';
import { MasterDataHeader, MasterDataSummary, MasterDataDialog } from '@/components/ui/MasterDataLayout';
import { collectPages } from '@/services/master-data';
import { MasterDataError } from '@/components/ui/MasterDataFeedback';
import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui';
import { companyService, type Company } from '@/services/company.service';
import { formatDate, formatNumber } from '@/lib/utils';

interface CompanyFormData {
  name: string;
  code: string;
  type: 'Holding' | 'Subsidiary' | 'Branch';
  address: string;
  phone: string;
  email: string;
  email_domain: string;
  website: string;
  npwp: string;
  is_active: boolean;
  parent_company_id: number | null;
}

const initialFormData: CompanyFormData = {
  name: '',
  code: '',
  type: 'Subsidiary',
  address: '',
  phone: '',
  email: '',
  email_domain: '',
  website: '',
  npwp: '',
  is_active: true,
  parent_company_id: null,
};

export function CompaniesPage() {
  useLocale();
  const [loadError, setLoadError] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; company: Company | null }>({ open: false, company: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setIsLoading(true); setLoadError(false);
    try {
      const rows = await collectPages((page, limit) => companyService.getAll({ page, limit }));
      setCompanies(rows);
    } catch {
      setLoadError(true); setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalEmployees = companies.reduce((acc, c) => acc + (c.employee_count || 0), 0);
  const activeCompanies = companies.filter((c) => c.is_active).length;
  const subsidiaryCount = companies.filter((c) => c.type === 'Subsidiary').length;

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setFormData(initialFormData);
    setEditingCompanyId(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = async (summary: Company) => {
    try {
    const company = await companyService.getById(summary.id);
    setFormMode('edit');
    setFormData({
      name: company.name,
      code: company.code,
      type: company.type,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      email_domain: company.email_domain || '',
      website: company.website || '',
      npwp: company.npwp || '',
      is_active: company.is_active,
      parent_company_id: company.parent_company_id ?? null,
    });
    setEditingCompanyId(company.id);
    setSelectedCompany(null);
    setShowFormModal(true);
    } catch { toast.error(t("Gagal memuat detail perusahaan"), { id: 'api-error' }); }
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setFormData(initialFormData);
    setEditingCompanyId(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'parent_company_id' ? (value ? Number(value) : null) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error(t("Nama perusahaan harus diisi")); return; }
    if (!formData.code.trim()) { toast.error(t("Kode perusahaan harus diisi")); return; }
    setIsSaving(true);
    try {
      // companyService handles FE→BE field-name mapping (type→company_type, npwp→tax_id, is_active→status).
      if (formMode === 'create') {
        await companyService.create(formData);
        toast.success(t("Perusahaan berhasil ditambahkan"));
      } else if (editingCompanyId) {
        await companyService.update(editingCompanyId, formData);
        toast.success(t("Perusahaan berhasil diperbarui"));
      }
      handleCloseFormModal();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('Gagal menyimpan perusahaan'), { id: 'api-error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.company) return;
    setIsDeleting(true);
    try {
      await companyService.delete(deleteModal.company.id);
      toast.success(t("Perusahaan berhasil dinonaktifkan"));
      setDeleteModal({ open: false, company: null });
      if (selectedCompany?.id === deleteModal.company.id) setSelectedCompany(null);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('Gagal menghapus perusahaan'), { id: 'api-error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="master-data md-page master-refresh">
      {loadError && <MasterDataError onRetry={fetchCompanies} />}
      <MasterDataHeader title={t("Manajemen Perusahaan")} description={t("Kelola entitas, hubungan perusahaan, dan informasi kontak.")} actions={
        <button onClick={handleOpenCreateModal} className="md-button md-button-primary"><Plus className="w-4 h-4" />{t("Tambah Company")}</button>
      } />
      <div className="md-surface">
      <MasterDataSummary loading={isLoading || loadError} items={[
        { label: t('Total Company'), value: (companies.length).toLocaleString(intlLocale()) },
        { label: t('Aktif'), value: (activeCompanies).toLocaleString(intlLocale()), tone: 'active' },
        { label: t('Karyawan'), value: formatNumber(totalEmployees) },
        { label: t('Subsidiaries'), value: (subsidiaryCount).toLocaleString(intlLocale()) },
      ]} />

      {/* Main Panel */}
      <div className="md-panel">
        {/* Toolbar */}
        <div className="md-toolbar">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("Cari nama, kode, atau tipe...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:bg-white transition-all"
            />
          </div>
          <span className="text-xs text-gray-400 ml-auto">{(filteredCompanies.length).toLocaleString(intlLocale())}{' '}{t("perusahaan")}</span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">{t("Tidak ada perusahaan ditemukan")}</p>
          </div>
        ) : (
          <CompanyDirectory companies={filteredCompanies} onSelect={setSelectedCompany} onEdit={handleOpenEditModal}
            onDelete={company => setDeleteModal({ open: true, company })} />
        )}
      </div>

      </div>

      {/* Company Detail Drawer / Side Panel */}
      {selectedCompany && (
        <MasterDataDialog labelledBy="md-admin-dialog-0" onClose={() => setSelectedCompany(null)}>
            {/* Header */}
            <div className="md-dialog-header">
              <div className="flex items-center gap-3">
                <div>
                  <h3 id="md-admin-dialog-0" className="font-semibold text-gray-900">{selectedCompany.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedCompany.code}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label={t("Tutup dialog")}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="ph-workflow dw-detail">
              <dl className="dw-kv">
                <div><dt>{t("Tipe")}</dt><dd>{companyTypeLabel(selectedCompany.type)}</dd></div>
                <div><dt>{t("Status")}</dt><dd>{selectedCompany.is_active ? t("Aktif") : t("Nonaktif")}</dd></div>
                <div><dt>{t("Karyawan")}</dt><dd>{formatNumber(selectedCompany.employee_count || 0)}</dd></div>
                {selectedCompany.email && <div><dt>{t("Email")}</dt><dd>{selectedCompany.email}</dd></div>}
                {selectedCompany.email_domain && <div><dt>{t("Domain M365")}</dt><dd>@{selectedCompany.email_domain}</dd></div>}
                {selectedCompany.phone && <div><dt>{t("Telepon")}</dt><dd>{selectedCompany.phone}</dd></div>}
                {selectedCompany.website && <div><dt>{t("Website")}</dt><dd><a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">{selectedCompany.website}</a></dd></div>}
                {selectedCompany.address && <div><dt>{t("Alamat")}</dt><dd>{selectedCompany.address}</dd></div>}
              </dl>
              <p className="dw-note mt-4">{t("Dibuat")} {formatDate(selectedCompany.created_at)}</p>
                          {/* Footer */}
            <div className="ph-form-actions dw-actions">
              <button
                onClick={() => { setSelectedCompany(null); setDeleteModal({ open: true, company: selectedCompany }); }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />{t("Hapus")} </button>
              <button
                onClick={() => handleOpenEditModal(selectedCompany)}
                className="ph-button ph-button-primary"
              >
                <Edit className="w-3.5 h-3.5" />{t("Edit")} </button>
            </div>

            </div>
          </MasterDataDialog>
      )}

      {/* Create/Edit Modal */}
      {showFormModal && (
        <MasterDataDialog busy={isSaving} labelledBy="md-admin-dialog-1" onClose={handleCloseFormModal} wide>
            {/* Header */}
            <div className="md-dialog-header">
              <div className="flex items-center gap-3">

                <div>
                  <h3 id="md-admin-dialog-1" className="font-semibold text-gray-900">
                    {formMode === 'create' ? t("Tambah Company Baru") : t("Edit Company")}
                  </h3>
                  <p className="text-xs text-gray-400">{formMode === 'create' ? t("Isi data perusahaan baru") : t("Perbarui informasi perusahaan")}</p>
                </div>
              </div>
              <button disabled={isSaving} onClick={handleCloseFormModal} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label={t("Tutup dialog")}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="ph-workflow dw-form">
              <div><div className="dw-form-content"><section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Informasi Dasar")}</h3>
                  <div className="ph-form-grid dw-form-grid">
                    <div className="dw-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="parent-company">{t("Parent Company")}</label>
                    <select id="parent-company" name="parent_company_id" value={formData.parent_company_id ?? ''} onChange={handleFormChange} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                      <option value="">{t("Tidak ada (perusahaan mandiri)")}</option>
                      {companies.filter(company => company.id !== editingCompanyId).map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{t("Hubungan perusahaan ini menentukan cakupan akses grup.")}</p>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-0">{t("Nama Perusahaan")} <span className="text-red-500">*</span></label>
                      <input id="md-admin-field-0" type="text" name="name" value={formData.name} onChange={handleFormChange}
                        placeholder={t("PT Nama Perusahaan")}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all"
                        required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-1">{t("Kode")} <span className="text-red-500">*</span></label>
                      <input id="md-admin-field-1" type="text" name="code" value={formData.code} onChange={handleFormChange}
                        placeholder={"ABC"} maxLength={10}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all uppercase"
                        required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-2">{t("Tipe")} <span className="text-red-500">*</span></label>
                      <select id="md-admin-field-2" name="type" value={formData.type} onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all bg-white">
                        <option value="Holding">{t("Holding")}</option>
                        <option value="Subsidiary">{t("Subsidiary")}</option>
                        <option value="Branch">{t("Branch")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-3">{t("NPWP")}</label>
                      <input id="md-admin-field-3" type="text" name="npwp" value={formData.npwp} onChange={handleFormChange}
                        placeholder="00.000.000.0-000.000"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                  </div>
                </section>
<section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Kontak")}</h3>
                  <div className="ph-form-grid dw-form-grid">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-4">{t("Email")}</label>
                      <input id="md-admin-field-4" type="email" name="email" value={formData.email} onChange={handleFormChange}
                        placeholder={"info@company.co.id"}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-5">{t("Telepon")}</label>
                      <input id="md-admin-field-5" type="tel" name="phone" value={formData.phone} onChange={handleFormChange}
                        placeholder="+62 21 1234567"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                    <div>
                      <label htmlFor="company-email-domain" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Email Domain")} <span className="text-gray-400 font-normal text-xs">{t("(untuk M365)")}</span>
                      </label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-400">@</span>
                        <input id="company-email-domain" type="text" name="email_domain" value={formData.email_domain} onChange={handleFormChange}
                          placeholder={"pfigroups.com"}
                          className="flex-1 px-3 py-2 rounded-r-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">{t("Domain ini digunakan tombol Office Email di Users. Masukkan tanpa @.")}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-6">{t("Website")}</label>
                      <input id="md-admin-field-6" type="url" name="website" value={formData.website} onChange={handleFormChange}
                        placeholder="https://www.company.co.id"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                    <div className="dw-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="md-admin-field-7">{t("Alamat")}</label>
                      <textarea id="md-admin-field-7" name="address" value={formData.address} onChange={handleFormChange}
                        placeholder={t("Jl. Contoh No. 123, Kota")}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all resize-none" />
                    </div>
                  </div>
                </section>
<section className="ph-section dw-section">
                  <h3 className="dw-section-heading">{t("Status")}</h3>
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleFormChange}
                      className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" />
                    <span className="text-sm font-medium text-gray-700">{t("Perusahaan aktif")}</span>
                  </label>
                </section></div></div>

              {/* Footer */}
              <div className="ph-form-actions dw-actions">
                <Button type="button" variant="outline" onClick={handleCloseFormModal} disabled={isSaving} className="ph-button">{t("Batal")} </Button>
                <button type="submit" disabled={isSaving}
                  className="ph-button ph-button-primary">
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />{t("Menyimpan...")}</> : <><CheckCircle className="h-4 w-4" />{formMode === 'create' ? t("Simpan") : t("Update")}</>}
                </button>
              </div>
            </form>
          </MasterDataDialog>
      )}

      {/* Delete Modal */}
      {deleteModal.open && deleteModal.company && (
        <MasterDataDialog busy={isDeleting} labelledBy="md-admin-dialog-2" onClose={() => !isDeleting && setDeleteModal({ open: false, company: null })}><div className="ph-workflow dw-confirm">
            <div className="flex items-center gap-3 mb-4">

              <div>
                <h3 id="md-admin-dialog-2" className="font-semibold text-gray-900">{t("Hapus Perusahaan")}</h3>
                <p className="text-xs text-gray-400">{t("Tindakan ini tidak dapat dibatalkan")}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{t("Hapus")} <span className="font-semibold text-gray-900">{deleteModal.company.name}</span>?
            </p>
            {(deleteModal.company.employee_count || 0) > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">{t("⚠ Perusahaan ini memiliki")} {(deleteModal.company.employee_count ?? 0).toLocaleString(intlLocale())}{' '}{t("karyawan")} </p>
            )}
            <div className="ph-form-actions dw-actions">
              <Button variant="outline" onClick={() => setDeleteModal({ open: false, company: null })} disabled={isDeleting} className="ph-button">{t("Batal")} </Button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="ph-button dw-danger">
                {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" />{t("Menghapus...")}</> : <><Trash2 className="h-4 w-4" />{t("Hapus")}</>}
              </button>
            </div>
          </div></MasterDataDialog>
      )}
    </div>
  );
}
