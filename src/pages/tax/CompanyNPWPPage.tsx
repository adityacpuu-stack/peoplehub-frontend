import { insightNumber, insightDate } from '@/pages/ceo/insight-display';
import { t, useLocale } from '@/i18n';
import './tax-workflows.css';
import { Modal } from '@/components/ui';
import { useState, useEffect } from 'react';
import { Building2, Search, Plus, Edit2, Eye, CheckCircle, AlertCircle, MapPin, Calendar, FileText, Save } from 'lucide-react';
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
  useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyLoadError, setCompanyLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNPWP, setSelectedNPWP] = useState<CompanyNPWP | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setCompanyLoadError(false);
      const res = await companyService.getAll();
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanyLoadError(true);
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
            <CheckCircle className="w-3 h-3" />{t("Active")} </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <AlertCircle className="w-3 h-3" />{t("Inactive")} </span>
        );
      default:
        return null;
    }
  };

  const getTaxStatusBadge = (status: string) => {
    switch (status) {
      case 'PKP':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{t("PKP")}</span>
        );
      case 'Non-PKP':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{t("Non-PKP")}</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="ph-workflow tax-workflow">
      {/* Header */}
      <header className="ph-page-header tax-page-header"><div><h1>{t("Company NPWP")}</h1><p>{t("Kelola data NPWP perusahaan")}</p></div><div className="ph-actions tax-header-actions"><button type="button"
            onClick={() => setShowAddModal(true)}
            className="ph-button tax-button ph-button-primary"
          >
            <Plus className="w-4 h-4" />{t("Tambah NPWP")} </button></div></header>
      <p className="ph-callout tax-notice" role="note">{t("Pratinjau NPWP dengan data contoh. Form tambah dapat ditinjau; penyimpanan dan perubahan NPWP belum tersedia.")}</p>

      {/* Stats Cards */}
      <div className="tax-toolbar">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input aria-label={t("Cari nama perusahaan atau NPWP...")}
            type="text"
            placeholder={t("Cari nama perusahaan atau NPWP...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent tax-control"
          />
        </div>
      </div>
<div className="tax-summary">
        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Total Perusahaan")}</p>
<p className="text-2xl font-bold text-gray-900 mt-1">{insightNumber(mockCompanyNPWP.length)}</p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Status PKP")}</p>
<p className="text-2xl font-bold text-blue-600 mt-1">
                {insightNumber(mockCompanyNPWP.filter((n) => n.taxStatus === 'PKP').length)}
              </p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Status Non-PKP")}</p>
<p className="text-2xl font-bold text-gray-600 mt-1">
                {insightNumber(mockCompanyNPWP.filter((n) => n.taxStatus === 'Non-PKP').length)}
              </p></div>

        <div className="tax-summary-item"><p className="text-sm text-gray-500">{t("Aktif")}</p>
<p className="text-2xl font-bold text-emerald-600 mt-1">
                {insightNumber(mockCompanyNPWP.filter((n) => n.status === 'active').length)}
              </p></div>
      </div>

      {/* Search */}

      {/* NPWP Cards */}
      {filteredNPWP.length === 0 && <p className="ph-callout">{t("Tidak ada NPWP yang cocok dengan pencarian.")}</p>}
      <div className="tax-npwp-list">
        {filteredNPWP.map((npwp) => (
          <div key={npwp.id} className="ph-section tax-section tax-register">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center font-bold tax-initials">
                    {npwp.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{npwp.company}</h3>
                    <p className="text-sm tabular-nums text-gray-500">{npwp.npwp}</p>
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
                  <span className="text-sm text-gray-600">{t("Penandatangan:")} {npwp.signatory} ({npwp.signatoryPosition})
                  </span>
                </div>
              </div>

              {npwp.taxStatus === 'PKP' && npwp.pkpDate && (
                <div className="ph-section tax-section">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700">{t("PKP sejak:")} {insightDate(npwp.pkpDate)}</span>
                  </div>
                  {npwp.skpkpNumber && (
                    <p className="text-xs text-blue-600 mt-1 tabular-nums">{t("No. SKPKP:")} {npwp.skpkpNumber}</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{t("Diperbarui:")} {insightDate(npwp.updatedAt)}</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={t("Detail")}
                  onClick={() => setSelectedNPWP(npwp)}
                  className="ph-button tax-button"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button type="button" disabled title={t("Belum tersedia")} aria-label={t("Edit NPWP (belum tersedia)")} className="ph-button tax-button">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedNPWP && (
        <Modal isOpen={true} onClose={() => setSelectedNPWP(null)} title={t("Detail NPWP Perusahaan")} size="xl">
<div className="ph-workflow tax-workflow tax-detail"><p className="ph-callout tax-notice">{t("Pratinjau NPWP dengan data contoh. Form tambah dapat ditinjau; penyimpanan dan perubahan NPWP belum tersedia.")}</p><div className="tax-dialog-body">
              {/* Company Header */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 flex items-center justify-center font-bold text-xl tax-initials">
                  {selectedNPWP.company.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedNPWP.company}</h4>
                  <p className="text-lg tabular-nums text-blue-600">{selectedNPWP.npwp}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getTaxStatusBadge(selectedNPWP.taxStatus)}
                    {getStatusBadge(selectedNPWP.status)}
                  </div>
                </div>
              </div>

              {/* NPWP Details */}
              <div className="ph-section tax-section tax-stack">
                <h5 className="font-medium text-gray-900">{t("Informasi NPWP")}</h5>
                <div className="space-y-2">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Nama WP")}</dt><dd>{selectedNPWP.npwpName}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Alamat")}</dt><dd>{selectedNPWP.npwpAddress}</dd></dl>
                </div>
              </div>

              {/* KPP Details */}
              <div className="ph-section tax-section tax-stack">
                <h5 className="font-medium text-blue-900">{t("Kantor Pelayanan Pajak")}</h5>
                <div className="space-y-2">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Kode KPP")}</dt><dd>{selectedNPWP.kpp}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Nama KPP")}</dt><dd>{selectedNPWP.kppName}</dd></dl>
                </div>
              </div>

              {/* PKP Info */}
              {selectedNPWP.taxStatus === 'PKP' && (
                <div className="ph-section tax-section tax-stack">
                  <h5 className="font-medium text-emerald-900">{t("Informasi PKP")}</h5>
                  <div className="space-y-2">
                    <dl className="ph-kv tax-kv-row"><dt>{t("Tanggal PKP")}</dt><dd>{insightDate(selectedNPWP.pkpDate)}</dd></dl>
                    {selectedNPWP.skpkpNumber && (
                      <dl className="ph-kv tax-kv-row"><dt>{t("No. SKPKP")}</dt><dd>{selectedNPWP.skpkpNumber}</dd></dl>
                    )}
                  </div>
                </div>
              )}

              {/* Signatory */}
              <div className="ph-section tax-section tax-stack">
                <h5 className="font-medium text-purple-900">{t("Penandatangan SPT")}</h5>
                <div className="space-y-2">
                  <dl className="ph-kv tax-kv-row"><dt>{t("Nama")}</dt><dd>{selectedNPWP.signatory}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("Jabatan")}</dt><dd>{selectedNPWP.signatoryPosition}</dd></dl>
                  <dl className="ph-kv tax-kv-row"><dt>{t("NPWP")}</dt><dd>{selectedNPWP.signatoryNpwp}</dd></dl>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-sm text-gray-500 space-y-1">
                <p>{t("Dibuat:")} {insightDate(selectedNPWP.createdAt)}</p>
                <p>{t("Terakhir diperbarui:")} {insightDate(selectedNPWP.updatedAt)}</p>
              </div>
            </div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setSelectedNPWP(null)}
                className="ph-button tax-button"
              >{t("Tutup")} </button>
              <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                <Edit2 className="w-4 h-4" />{t("Edit NPWP")} </button>
            </div></div>
</Modal>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title={t("Tambah NPWP Perusahaan")} size="xl">
<div className="ph-workflow tax-workflow tax-create">{loading && <p role="status" className="tax-period">{t("Memuat pilihan perusahaan...")}</p>}{companyLoadError && <div role="alert" className="ph-callout" data-tone="error">{t("Pilihan perusahaan tidak dapat dimuat.")} <button type="button" className="ph-button tax-button" onClick={() => void fetchCompanies()}>{t("Coba lagi")}</button></div>}<p className="ph-callout tax-notice">{t("Pratinjau NPWP dengan data contoh. Form tambah dapat ditinjau; penyimpanan dan perubahan NPWP belum tersedia.")}</p><div className="tax-dialog-body">
<section className="tax-form-section"><h3>{t("Identitas wajib pajak")}</h3><div className="ph-form-grid tax-form-fields"><div className="ph-field">
                <label htmlFor="companynpwp-field-1" className="block text-sm font-medium text-gray-700 mb-1">{t("Perusahaan")}</label>
                <select id="companynpwp-field-1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 tax-control">
                  <option value="">{t("Pilih Perusahaan")}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
<div className="ph-field">
                <label htmlFor="companynpwp-field-2" className="block text-sm font-medium text-gray-700 mb-1">{t("NPWP")}</label>
                <input id="companynpwp-field-2"
                  type="text"
                  placeholder="00.000.000.0-000.000"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 tax-control"
                />
              </div>
<div className="ph-field tax-field-wide">
                <label htmlFor="companynpwp-field-3" className="block text-sm font-medium text-gray-700 mb-1">{t("Nama WP (sesuai NPWP)")}</label>
                <input id="companynpwp-field-3"
                  type="text"
                  placeholder={t("PT NAMA PERUSAHAAN")}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 tax-control"
                />
              </div>
<div className="ph-field tax-field-wide">
                <label htmlFor="companynpwp-field-4" className="block text-sm font-medium text-gray-700 mb-1">{t("Alamat (sesuai NPWP)")}</label>
                <textarea id="companynpwp-field-4"
                  rows={2}
                  placeholder={t("Jl. ...")}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 tax-control"
                />
              </div></div></section>
<section className="tax-form-section"><h3>{t("Kantor pajak dan status")}</h3><div className="ph-form-grid tax-form-fields"><div className="ph-field">
                  <label htmlFor="companynpwp-field-5" className="block text-sm font-medium text-gray-700 mb-1">{t("Kode KPP")}</label>
                  <input id="companynpwp-field-5"
                    type="text"
                    placeholder="000"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 tax-control"
                  />
                </div>
<div className="ph-field">
                  <label htmlFor="companynpwp-field-6" className="block text-sm font-medium text-gray-700 mb-1">{t("Status Pajak")}</label>
                  <select id="companynpwp-field-6" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 tax-control">
                    <option value="PKP">{t("PKP")}</option>
                    <option value="Non-PKP">{t("Non-PKP")}</option>
                  </select>
                </div></div></section>
</div><div className="ph-dialog-footer tax-dialog-actions">
              <button type="button"
                onClick={() => setShowAddModal(false)}
                className="ph-button tax-button"
              >{t("Batal")} </button>
              <button type="button" disabled title={t("Belum tersedia")} className="ph-button tax-button ph-button-primary">
                <Save className="w-4 h-4" />{t("Simpan")} </button>
            </div></div>
</Modal>
      )}
    </div>
  );
}
