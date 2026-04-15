import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  AlertCircle,
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
};

const TYPE_COLORS: Record<string, string> = {
  Holding: 'bg-purple-100 text-purple-700',
  Subsidiary: 'bg-blue-100 text-blue-700',
  Branch: 'bg-cyan-100 text-cyan-700',
};

export function CompaniesPage() {
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
    setIsLoading(true);
    try {
      const response = await companyService.getAll({ page: 1, limit: 100 });
      setCompanies(response.data);
    } catch {
      toast.error('Gagal memuat data perusahaan');
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

  const handleOpenEditModal = (company: Company) => {
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
      npwp: (company as any).npwp || '',
      is_active: company.is_active,
    });
    setEditingCompanyId(company.id);
    setSelectedCompany(null);
    setShowFormModal(true);
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
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Nama perusahaan harus diisi'); return; }
    if (!formData.code.trim()) { toast.error('Kode perusahaan harus diisi'); return; }
    setIsSaving(true);
    try {
      if (formMode === 'create') {
        await companyService.create(formData);
        toast.success('Perusahaan berhasil ditambahkan');
      } else if (editingCompanyId) {
        await companyService.update(editingCompanyId, formData);
        toast.success('Perusahaan berhasil diperbarui');
      }
      handleCloseFormModal();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan perusahaan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.company) return;
    setIsDeleting(true);
    try {
      await companyService.delete(deleteModal.company.id);
      toast.success('Perusahaan berhasil dihapus');
      setDeleteModal({ open: false, company: null });
      if (selectedCompany?.id === deleteModal.company.id) setSelectedCompany(null);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus perusahaan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Manajemen Perusahaan</h1>
            <p className="text-sm text-gray-500">Kelola entitas perusahaan dalam sistem</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Tambah Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Company', value: companies.length, icon: <Building2 className="w-4 h-4" />, color: 'text-slate-600 bg-slate-100' },
          { label: 'Aktif', value: activeCompanies, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total Karyawan', value: formatNumber(totalEmployees), icon: <Users className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Subsidiaries', value: subsidiaryCount, icon: <Building2 className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, kode, atau tipe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:bg-white transition-all"
            />
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filteredCompanies.length} perusahaan</span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">Tidak ada perusahaan ditemukan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left ${
                  selectedCompany?.id === company.id ? 'bg-gray-50' : ''
                } ${!company.is_active ? 'opacity-60' : ''}`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-bold text-sm">{company.name.charAt(0)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                    <span className="text-xs font-mono text-gray-400 shrink-0">{company.code}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {company.address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-xs">{company.address}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3" />
                      {formatNumber(company.employee_count || 0)} karyawan
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[company.type] || 'bg-gray-100 text-gray-600'}`}>
                    {company.type}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${company.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {company.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEditModal(company); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-gray-400 hover:text-slate-600" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, company }); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Company Detail Drawer / Side Panel */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCompany(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow">
                  <span className="text-white font-bold">{selectedCompany.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedCompany.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedCompany.code}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Detail rows */}
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipe</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[selectedCompany.type] || 'bg-gray-100 text-gray-600'}`}>
                  {selectedCompany.type}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${selectedCompany.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {selectedCompany.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Karyawan</span>
                <span className="text-sm font-semibold text-gray-900">{formatNumber(selectedCompany.employee_count || 0)}</span>
              </div>
              {selectedCompany.email && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Mail className="w-3 h-3" />Email</span>
                  <span className="text-sm text-gray-700">{selectedCompany.email}</span>
                </div>
              )}
              {selectedCompany.email_domain && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Domain M365</span>
                  <span className="text-sm font-mono text-gray-700">@{selectedCompany.email_domain}</span>
                </div>
              )}
              {selectedCompany.phone && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Phone className="w-3 h-3" />Telepon</span>
                  <span className="text-sm text-gray-700">{selectedCompany.phone}</span>
                </div>
              )}
              {selectedCompany.website && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" />Website</span>
                  <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-48">
                    {selectedCompany.website}
                  </a>
                </div>
              )}
              {selectedCompany.address && (
                <div className="flex items-start justify-between py-2 border-b border-gray-50 gap-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 shrink-0"><MapPin className="w-3 h-3" />Alamat</span>
                  <span className="text-sm text-gray-700 text-right">{selectedCompany.address}</span>
                </div>
              )}
              <p className="text-xs text-gray-300 pt-1">Dibuat {formatDate(selectedCompany.created_at)}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => { setSelectedCompany(null); setDeleteModal({ open: true, company: selectedCompany }); }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
              <button
                onClick={() => handleOpenEditModal(selectedCompany)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseFormModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {formMode === 'create' ? 'Tambah Company Baru' : 'Edit Company'}
                  </h3>
                  <p className="text-xs text-gray-400">{formMode === 'create' ? 'Isi data perusahaan baru' : 'Perbarui informasi perusahaan'}</p>
                </div>
              </div>
              <button onClick={handleCloseFormModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">
                {/* Basic Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informasi Dasar</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Perusahaan <span className="text-red-500">*</span></label>
                      <input type="text" name="name" value={formData.name} onChange={handleFormChange}
                        placeholder="PT Nama Perusahaan"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all"
                        required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Kode <span className="text-red-500">*</span></label>
                      <input type="text" name="code" value={formData.code} onChange={handleFormChange}
                        placeholder="ABC" maxLength={10}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all uppercase"
                        required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe <span className="text-red-500">*</span></label>
                      <select name="type" value={formData.type} onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all bg-white">
                        <option value="Holding">Holding</option>
                        <option value="Subsidiary">Subsidiary</option>
                        <option value="Branch">Branch</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">NPWP</label>
                      <input type="text" name="npwp" value={formData.npwp} onChange={handleFormChange}
                        placeholder="00.000.000.0-000.000"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Kontak</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleFormChange}
                        placeholder="info@company.co.id"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Telepon</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleFormChange}
                        placeholder="+62 21 1234567"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Domain <span className="text-gray-400 font-normal text-xs">(untuk M365)</span>
                      </label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-400">@</span>
                        <input type="text" name="email_domain" value={formData.email_domain} onChange={handleFormChange}
                          placeholder="pfigroups.com"
                          className="flex-1 px-3 py-2 rounded-r-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
                      <input type="url" name="website" value={formData.website} onChange={handleFormChange}
                        placeholder="https://www.company.co.id"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label>
                      <textarea name="address" value={formData.address} onChange={handleFormChange}
                        placeholder="Jl. Contoh No. 123, Kota"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all resize-none" />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleFormChange}
                      className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" />
                    <span className="text-sm font-medium text-gray-700">Perusahaan aktif</span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <Button type="button" variant="outline" onClick={handleCloseFormModal} disabled={isSaving} className="rounded-xl">
                  Batal
                </Button>
                <button type="submit" disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</> : <><CheckCircle className="h-4 w-4" />{formMode === 'create' ? 'Simpan' : 'Update'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && deleteModal.company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteModal({ open: false, company: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hapus Perusahaan</h3>
                <p className="text-xs text-gray-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Hapus <span className="font-semibold text-gray-900">{deleteModal.company.name}</span>?
            </p>
            {(deleteModal.company.employee_count || 0) > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
                ⚠ Perusahaan ini memiliki {deleteModal.company.employee_count} karyawan
              </p>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDeleteModal({ open: false, company: null })} disabled={isDeleting} className="rounded-xl">
                Batal
              </Button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" />Menghapus...</> : <><Trash2 className="h-4 w-4" />Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
