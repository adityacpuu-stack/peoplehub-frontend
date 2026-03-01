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
  MoreVertical,
  X,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  Badge,
} from '@/components/ui';
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

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    company: Company | null;
  }>({
    open: false,
    company: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await companyService.getAll({ page: 1, limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Gagal memuat data perusahaan');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.code.toLowerCase().includes(search.toLowerCase()) ||
      company.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalEmployees = companies.reduce((acc, c) => acc + (c.employee_count || 0), 0);
  const activeCompanies = companies.filter((c) => c.is_active).length;
  const subsidiaryCount = companies.filter((c) => c.type === 'Subsidiary').length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Holding':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'Subsidiary':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
      case 'Branch':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

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

    if (!formData.name.trim()) {
      toast.error('Nama perusahaan harus diisi');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Kode perusahaan harus diisi');
      return;
    }

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
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus perusahaan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Manajemen Perusahaan
              </h1>
              <p className="mt-2 text-slate-300 max-w-xl">
                Kelola entitas perusahaan dalam sistem multi-company PeopleHUB
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white text-slate-800 rounded-xl hover:bg-slate-100 transition-all duration-200 font-semibold shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Tambah Company</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Companies</p>
                <p className="text-3xl font-bold text-white mt-1">{companies.length}</p>
              </div>
              <Building2 className="h-10 w-10 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active</p>
                <p className="text-3xl font-bold text-white mt-1">{activeCompanies}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Employees</p>
                <p className="text-3xl font-bold text-white mt-1">{formatNumber(totalEmployees)}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Subsidiaries</p>
                <p className="text-3xl font-bold text-white mt-1">{subsidiaryCount}</p>
              </div>
              <Building2 className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, kode, atau tipe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-slate-600 animate-spin" />
            <p className="text-gray-500">Memuat data perusahaan...</p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className={`border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer ${
                !company.is_active ? 'opacity-60' : ''
              }`}
              onClick={() => setSelectedCompany(company)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-md">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{company.name}</h3>
                      <span className="text-xs font-mono text-gray-500">{company.code}</span>
                    </div>
                  </div>
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {company.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-1">{company.address}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span>{formatNumber(company.employee_count || 0)} karyawan</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getTypeColor(company.type)}`}>
                    {company.type}
                  </span>
                  <Badge variant={company.is_active ? 'success' : 'error'}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredCompanies.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Tidak ada perusahaan ditemukan</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Tambah Company Pertama
            </button>
          </CardContent>
        </Card>
      )}

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedCompany(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-700 to-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{selectedCompany.name}</h3>
                  <p className="text-slate-300 text-sm mt-1">{selectedCompany.code}</p>
                </div>
                <Badge
                  variant={selectedCompany.is_active ? 'success' : 'error'}
                  className="self-start"
                >
                  {selectedCompany.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tipe Perusahaan</p>
                  <p className="font-medium text-gray-900">{selectedCompany.type}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Karyawan</p>
                  <p className="font-medium text-gray-900">
                    {formatNumber(selectedCompany.employee_count || 0)} karyawan
                  </p>
                </div>
              </div>

              {selectedCompany.address && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Alamat</p>
                    <p className="font-medium text-gray-900">{selectedCompany.address}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectedCompany.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{selectedCompany.phone}</span>
                  </div>
                )}
                {selectedCompany.email && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate">{selectedCompany.email}</span>
                  </div>
                )}
              </div>

              {selectedCompany.website && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a
                    href={selectedCompany.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selectedCompany.website}
                  </a>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center pt-2">
                Dibuat pada {formatDate(selectedCompany.created_at)}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setSelectedCompany(null)}
                className="rounded-xl"
              >
                Tutup
              </Button>
              <div className="flex items-center gap-2">
                <button
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                  onClick={() => handleOpenEditModal(selectedCompany)}
                >
                  <Edit className="h-4 w-4 text-slate-600" />
                </button>
                <button
                  className="p-2.5 rounded-xl bg-red-100 hover:bg-red-200 transition-colors"
                  onClick={() => {
                    setSelectedCompany(null);
                    setDeleteModal({ open: true, company: selectedCompany });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseFormModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {formMode === 'create' ? 'Registrasi Company Baru' : 'Edit Company'}
                  </h3>
                  <p className="text-slate-300 text-sm mt-0.5">
                    {formMode === 'create' ? 'Tambahkan perusahaan baru ke sistem' : 'Perbarui informasi perusahaan'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseFormModal}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h4 className="font-bold text-gray-900">Informasi Dasar</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Nama Perusahaan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="PT Nama Perusahaan"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Kode Perusahaan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleFormChange}
                        placeholder="ABC"
                        maxLength={10}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Kode unik untuk identifikasi (maks 10 karakter)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tipe Perusahaan <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                        required
                      >
                        <option value="Holding">Holding (Induk)</option>
                        <option value="Subsidiary">Subsidiary (Anak Perusahaan)</option>
                        <option value="Branch">Branch (Cabang)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        NPWP Perusahaan
                      </label>
                      <input
                        type="text"
                        name="npwp"
                        value={formData.npwp}
                        onChange={handleFormChange}
                        placeholder="00.000.000.0-000.000"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="h-5 w-5 text-green-600" />
                    <h4 className="font-bold text-gray-900">Informasi Kontak</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="info@company.co.id"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Telepon
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleFormChange}
                        placeholder="+62 21 1234567"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Domain <span className="text-gray-400 font-normal">(untuk M365 auto-create)</span>
                      </label>
                      <div className="flex items-center gap-0">
                        <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">@</span>
                        <input
                          type="text"
                          name="email_domain"
                          value={formData.email_domain}
                          onChange={handleFormChange}
                          placeholder="pfigroups.com"
                          className="flex-1 px-4 py-2.5 rounded-r-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Domain email karyawan, misal: pfigroups.com, aggrecapital.com</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleFormChange}
                        placeholder="https://www.company.co.id"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Alamat
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Section */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <h4 className="font-bold text-gray-900">Status</h4>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleFormChange}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Aktif</span>
                      <p className="text-sm text-gray-500">Perusahaan aktif dan dapat digunakan dalam sistem</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseFormModal}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  Batal
                </Button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>{formMode === 'create' ? 'Simpan Company' : 'Update Company'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteModal({ open: false, company: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 border-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Hapus Perusahaan</h3>
                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus{' '}
              <span className="font-semibold text-gray-900">{deleteModal.company.name}</span>?
              {(deleteModal.company.employee_count || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  Peringatan: Perusahaan ini memiliki {deleteModal.company.employee_count} karyawan.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, company: null })}
                disabled={isDeleting}
                className="rounded-xl"
              >
                Batal
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
