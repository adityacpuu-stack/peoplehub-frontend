import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Eye,
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { companyService, type Company } from '@/services/company.service';

interface CompanyNPWP {
  id: string;
  company: string;
  companyId: string;
  npwp: string;
  npwpName: string;
  npwpAddress: string;
  kpp: string;
  kppName: string;
  taxStatus: 'PKP' | 'Non-PKP';
  pkpDate?: string;
  skpkpNumber?: string;
  signatory: string;
  signatoryPosition: string;
  signatoryNpwp: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockCompanyNPWP: CompanyNPWP[] = [
  {
    id: '1',
    company: 'PT Teknologi Maju',
    companyId: '1',
    npwp: '01.234.567.8-901.000',
    npwpName: 'PT TEKNOLOGI MAJU',
    npwpAddress: 'Jl. Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12190',
    kpp: '061',
    kppName: 'KPP Pratama Jakarta Setiabudi',
    taxStatus: 'PKP',
    pkpDate: '2020-01-15',
    skpkpNumber: 'S-1234/WPJ.04/KP.01/2020',
    signatory: 'Ahmad Sulaiman',
    signatoryPosition: 'Direktur',
    signatoryNpwp: '12.345.678.9-012.000',
    status: 'active',
    createdAt: '2020-01-01',
    updatedAt: '2024-12-15',
  },
  {
    id: '2',
    company: 'PT Digital Solusi',
    companyId: '2',
    npwp: '02.345.678.9-012.000',
    npwpName: 'PT DIGITAL SOLUSI',
    npwpAddress: 'Jl. Gatot Subroto No. 456, Jakarta Selatan, DKI Jakarta 12950',
    kpp: '062',
    kppName: 'KPP Pratama Jakarta Kebayoran Baru',
    taxStatus: 'PKP',
    pkpDate: '2021-06-20',
    skpkpNumber: 'S-2345/WPJ.04/KP.02/2021',
    signatory: 'Budi Santoso',
    signatoryPosition: 'Direktur Utama',
    signatoryNpwp: '23.456.789.0-123.000',
    status: 'active',
    createdAt: '2021-01-01',
    updatedAt: '2024-11-20',
  },
  {
    id: '3',
    company: 'PT Inovasi Global',
    companyId: '3',
    npwp: '03.456.789.0-123.000',
    npwpName: 'PT INOVASI GLOBAL',
    npwpAddress: 'Jl. HR Rasuna Said No. 789, Jakarta Selatan, DKI Jakarta 12940',
    kpp: '063',
    kppName: 'KPP Pratama Jakarta Tebet',
    taxStatus: 'Non-PKP',
    signatory: 'Citra Dewi',
    signatoryPosition: 'Direktur',
    signatoryNpwp: '34.567.890.1-234.000',
    status: 'active',
    createdAt: '2022-03-15',
    updatedAt: '2024-10-10',
  },
];

export function CompanyNPWPPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNPWP, setSelectedNPWP] = useState<CompanyNPWP | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await companyService.getAll();
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNPWP = mockCompanyNPWP.filter(
    (npwp) =>
      npwp.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      npwp.npwp.includes(searchTerm) ||
      npwp.npwpName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <AlertCircle className="w-3 h-3" />
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  const getTaxStatusBadge = (status: string) => {
    switch (status) {
      case 'PKP':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">PKP</span>
        );
      case 'Non-PKP':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Non-PKP</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 via-slate-700 to-zinc-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Company NPWP</h1>
              <p className="text-slate-300">Kelola data NPWP perusahaan</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Tambah NPWP
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Perusahaan</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{mockCompanyNPWP.length}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Status PKP</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {mockCompanyNPWP.filter((n) => n.taxStatus === 'PKP').length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Status Non-PKP</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">
                {mockCompanyNPWP.filter((n) => n.taxStatus === 'Non-PKP').length}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-xl">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aktif</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {mockCompanyNPWP.filter((n) => n.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama perusahaan atau NPWP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* NPWP Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredNPWP.map((npwp) => (
          <div key={npwp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center text-white font-bold">
                    {npwp.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{npwp.company}</h3>
                    <p className="text-sm font-mono text-gray-500">{npwp.npwp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTaxStatusBadge(npwp.taxStatus)}
                  {getStatusBadge(npwp.status)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{npwp.npwpAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{npwp.kppName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Penandatangan: {npwp.signatory} ({npwp.signatoryPosition})
                  </span>
                </div>
              </div>

              {npwp.taxStatus === 'PKP' && npwp.pkpDate && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700">PKP sejak: {npwp.pkpDate}</span>
                  </div>
                  {npwp.skpkpNumber && (
                    <p className="text-xs text-blue-600 mt-1 font-mono">No. SKPKP: {npwp.skpkpNumber}</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Diperbarui: {npwp.updatedAt}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedNPWP(npwp)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedNPWP && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detail NPWP Perusahaan</h3>
                <button
                  onClick={() => setSelectedNPWP(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Company Header */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center text-white font-bold text-xl">
                  {selectedNPWP.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedNPWP.company}</h4>
                  <p className="text-lg font-mono text-blue-600">{selectedNPWP.npwp}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getTaxStatusBadge(selectedNPWP.taxStatus)}
                    {getStatusBadge(selectedNPWP.status)}
                  </div>
                </div>
              </div>

              {/* NPWP Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h5 className="font-medium text-gray-900">Informasi NPWP</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama WP</span>
                    <span className="font-medium">{selectedNPWP.npwpName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alamat</span>
                    <span className="font-medium text-right max-w-xs">{selectedNPWP.npwpAddress}</span>
                  </div>
                </div>
              </div>

              {/* KPP Details */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <h5 className="font-medium text-blue-900">Kantor Pelayanan Pajak</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kode KPP</span>
                    <span className="font-medium">{selectedNPWP.kpp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama KPP</span>
                    <span className="font-medium">{selectedNPWP.kppName}</span>
                  </div>
                </div>
              </div>

              {/* PKP Info */}
              {selectedNPWP.taxStatus === 'PKP' && (
                <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                  <h5 className="font-medium text-emerald-900">Informasi PKP</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal PKP</span>
                      <span className="font-medium">{selectedNPWP.pkpDate}</span>
                    </div>
                    {selectedNPWP.skpkpNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">No. SKPKP</span>
                        <span className="font-mono font-medium">{selectedNPWP.skpkpNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Signatory */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                <h5 className="font-medium text-purple-900">Penandatangan SPT</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama</span>
                    <span className="font-medium">{selectedNPWP.signatory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jabatan</span>
                    <span className="font-medium">{selectedNPWP.signatoryPosition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NPWP</span>
                    <span className="font-mono font-medium">{selectedNPWP.signatoryNpwp}</span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-sm text-gray-500 space-y-1">
                <p>Dibuat: {selectedNPWP.createdAt}</p>
                <p>Terakhir diperbarui: {selectedNPWP.updatedAt}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedNPWP(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
                <Edit2 className="w-4 h-4" />
                Edit NPWP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Tambah NPWP Perusahaan</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perusahaan</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="">Pilih Perusahaan</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NPWP</label>
                <input
                  type="text"
                  placeholder="00.000.000.0-000.000"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama WP (sesuai NPWP)</label>
                <input
                  type="text"
                  placeholder="PT NAMA PERUSAHAAN"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat (sesuai NPWP)</label>
                <textarea
                  rows={2}
                  placeholder="Jl. ..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode KPP</label>
                  <input
                    type="text"
                    placeholder="000"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Pajak</label>
                  <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
                    <option value="PKP">PKP</option>
                    <option value="Non-PKP">Non-PKP</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
                <Save className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
