import { companyTypeLabel } from '../admin/localization';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/pages/leave/domain-workflows.css';
import { CompanyDirectory } from '@/components/ui/CompanyDirectory';
import { MasterDataHeader, MasterDataSummary, MasterDataDialog } from '@/components/ui/MasterDataLayout';
import { collectPages } from '@/services/master-data';
import { MasterDataError } from '@/components/ui/MasterDataFeedback';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { companyService, type Company } from '@/services/company.service';

export function CompaniesPage() {
  useLocale();
  const [loadError, setLoadError] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true); setLoadError(false);
    try {
      const rows = await collectPages((page, limit) => companyService.getAll({ page, limit }));
      setCompanies(rows);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setLoadError(true); setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies.filter((company) => {
    const matchSearch =
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || company.type === filterType;
    return matchSearch && matchType && company.is_active;
  });

  const stats = {
    total: companies.filter(c => c.is_active).length,
    holding: companies.filter(c => c.type === 'Holding' && c.is_active).length,
    subsidiary: companies.filter(c => c.type === 'Subsidiary' && c.is_active).length,
    branch: companies.filter(c => c.type === 'Branch' && c.is_active).length,
    totalEmployees: companies.filter(c => c.is_active).reduce((acc, c) => acc + (c.employee_count || 0), 0),
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Holding':
        return (
          <div className="md-avatar">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        );
      case 'Subsidiary':
        return (
          <div className="md-avatar">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
        );
      case 'Branch':
        return (
          <div className="md-avatar">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="md-avatar">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Holding':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Subsidiary':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Branch':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="master-data md-page master-refresh">
      {loadError && <MasterDataError onRetry={fetchCompanies} />}
      <MasterDataHeader title={t("Companies")} description={t("Direktori perusahaan dan informasi organisasi yang dapat Anda akses.")} actions={
        <Link to="/employees" className="md-button">{t("View Employees")}</Link>
      } />
      <div className="md-surface">
      <MasterDataSummary loading={isLoading || loadError} items={[
        { label: t('Company aktif'), value: (stats.total).toLocaleString(intlLocale()) },
        { label: t('Holding'), value: (stats.holding).toLocaleString(intlLocale()) },
        { label: t('Subsidiary'), value: (stats.subsidiary).toLocaleString(intlLocale()) },
        { label: t('Branch'), value: (stats.branch).toLocaleString(intlLocale()) },
        { label: t('Karyawan'), value: stats.totalEmployees.toLocaleString(intlLocale()) },
      ]} />

      <div className="md-panel">
        <div className="md-toolbar">
          <div className="md-search"><input type="search" aria-label={t("Cari company")} placeholder={t("Search company...")} value={search}
            onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2" /></div>
          <label className="md-filter">{t("Tipe")} <select aria-label={t("Tipe company")} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">{t("Semua tipe")}</option><option value="Holding">{t("Holding")}</option>
              <option value="Subsidiary">{t("Subsidiary")}</option><option value="Branch">{t("Branch")}</option>
            </select>
          </label>
        </div>
        {isLoading ? <div className="py-16 text-center text-slate-500" role="status">{t("Memuat company…")}</div>
          : filteredCompanies.length === 0 ? <div className="py-16 px-6 text-center"><h2 className="font-semibold">{t("Tidak ada company ditemukan")}</h2><p className="mt-2 text-slate-500">{t("Coba ubah pencarian atau filter tipe.")}</p></div>
          : <CompanyDirectory companies={filteredCompanies} onSelect={setSelectedCompany} />}
      </div>

      </div>

      {/* Company Detail Modal */}
      {selectedCompany && (
        <MasterDataDialog labelledBy="md-companies-dialog-0" onClose={() => setSelectedCompany(null)}>
            {/* Modal Header */}
            <div className="md-dialog-header">
              <div className="dw-checks">

                <div className="flex-1">
                  <h3 id="md-companies-dialog-0" className="text-xl font-bold text-slate-900">{selectedCompany.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-slate-900 text-sm font-mono">{selectedCompany.code}</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-slate-900 font-medium">
                      {companyTypeLabel(selectedCompany.type)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                 aria-label={t("Tutup dialog")}>
                  <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="ph-workflow dw-detail">
              <div className="dw-inline"><div><span className="dw-note">{t("Total Employees")}</span><p><strong>{(selectedCompany.employee_count || 0).toLocaleString()}</strong></p></div><Link to={`/employees?company=${selectedCompany.id}`} className="ph-button">{t("View All")}</Link></div>
              <dl className="dw-kv">
                {selectedCompany.address && <div><dt>{t("Address")}</dt><dd>{selectedCompany.address}</dd></div>}
                {selectedCompany.email && <div><dt>{t("Email")}</dt><dd>{selectedCompany.email}</dd></div>}
                {selectedCompany.phone && <div><dt>{t("Phone")}</dt><dd>{selectedCompany.phone}</dd></div>}
                {selectedCompany.website && <div><dt>{t("Website")}</dt><dd><a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">{selectedCompany.website}</a></dd></div>}
              </dl>
              <p className="dw-note mt-4">{t("Registered since")} {formatDate(selectedCompany.created_at)}</p>
              <div className="ph-form-actions dw-actions"><button onClick={() => setSelectedCompany(null)} className="ph-button">{t("Close")}</button></div>
            </div>
          </MasterDataDialog>
      )}
    </div>
  );
}
