import { companyTypeLabel } from './localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { ReportSummary, ReportPage, ReportHeader } from '@/pages/dashboard/ReportingLayout';
import './admin-workflows.css';
import { useState, useEffect } from 'react';
import { Building2, Search, Users, Clock, CalendarDays, Wallet, Target, Loader2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui';
import { companyService, type CompanyWithFeatures } from '@/services/company.service';

interface FeatureToggleProps {
  enabled: boolean;
  isLoading: boolean;
  onToggle: () => void;
  label: string;
  icon: React.ReactNode;
}

function FeatureToggle({ enabled, isLoading, onToggle, label, icon }: FeatureToggleProps) {
  useLocale();
  return (
    <button
      onClick={onToggle}
      disabled={isLoading}
      aria-pressed={enabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
        enabled
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
      ) : enabled ? (
        <ToggleRight className="h-5 w-5 ml-auto" />
      ) : (
        <ToggleLeft className="h-5 w-5 ml-auto" />
      )}
    </button>
  );
}

export function CompanyFeaturesPage() {
  useLocale();
  const [companies, setCompanies] = useState<CompanyWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await companyService.getFeatureTogglesList();
      setCompanies(data);
    } catch (error) {
      setLoadError(true);
      console.error('Failed to fetch companies:', error);
      toast.error(t("Gagal memuat data perusahaan"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (
    companyId: number,
    feature: 'attendance_enabled' | 'leave_enabled' | 'payroll_enabled' | 'performance_enabled'
  ) => {
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;

    const key = `${companyId}-${feature}`;
    if (updatingIds.has(key)) return;

    setUpdatingIds((prev) => new Set(prev).add(key));

    try {
      const newValue = !company[feature];
      await companyService.updateFeatureToggles(companyId, { [feature]: newValue });

      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, [feature]: newValue } : c))
      );

      const featureNames: Record<string, string> = {
        attendance_enabled: 'Attendance',
        leave_enabled: 'Leave',
        payroll_enabled: 'Payroll',
        performance_enabled: 'Performance',
      };
      toast.success(t(newValue ? "{feature} diaktifkan untuk {company}" : "{feature} dinonaktifkan untuk {company}", { feature: t(featureNames[feature]), company: company.name }));
    } catch (error: any) {
      console.error('Failed to update feature toggle:', error);
      toast.error(error.response?.data?.error?.message || t('Gagal mengubah pengaturan fitur'), { id: 'api-error' });
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.code.toLowerCase().includes(search.toLowerCase())
  );

  const getCompanyTypeColor = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'holding':
        return 'bg-purple-100 text-purple-700';
      case 'subsidiary':
        return 'bg-blue-100 text-blue-700';
      case 'branch':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Stats
  const attendanceEnabled = companies.filter((c) => c.attendance_enabled).length;
  const leaveEnabled = companies.filter((c) => c.leave_enabled).length;
  const payrollEnabled = companies.filter((c) => c.payroll_enabled).length;
  const performanceEnabled = companies.filter((c) => c.performance_enabled).length;

  return (
    <ReportPage  className="ph-admin-page">{/* Header Banner */}<ReportHeader>
<div className="report-heading"><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("Company Feature Settings")} </h1></div>
<div className="report-header-context"><p className="max-w-xl">{t("Kelola fitur mana yang aktif untuk setiap perusahaan. Fitur yang dinonaktifkan tidak akan muncul di menu karyawan.")} </p></div>
</ReportHeader>{/* Stats Cards */}<ReportSummary><div className="report-metric"><div className="report-metric-context"><div>
                <p className="report-metric-label">{t("Attendance Active")}</p>
                <p className="report-metric-value">{isLoading || loadError ? '—' : `${attendanceEnabled.toLocaleString(intlLocale())}/${companies.length.toLocaleString(intlLocale())}`}</p>
              </div><Clock className="h-10 w-10 text-green-200" /></div></div><div className="report-metric"><div className="report-metric-context"><div>
                <p className="report-metric-label">{t("Leave Active")}</p>
                <p className="report-metric-value">{isLoading || loadError ? '—' : `${leaveEnabled.toLocaleString(intlLocale())}/${companies.length.toLocaleString(intlLocale())}`}</p>
              </div><CalendarDays className="h-10 w-10 text-blue-200" /></div></div><div className="report-metric"><div className="report-metric-context"><div>
                <p className="report-metric-label">{t("Payroll Active")}</p>
                <p className="report-metric-value">{isLoading || loadError ? '—' : `${payrollEnabled.toLocaleString(intlLocale())}/${companies.length.toLocaleString(intlLocale())}`}</p>
              </div><Wallet className="h-10 w-10 text-amber-200" /></div></div><div className="report-metric"><div className="report-metric-context"><div>
                <p className="report-metric-label">{t("Performance Active")}</p>
                <p className="report-metric-value">{isLoading || loadError ? '—' : `${performanceEnabled.toLocaleString(intlLocale())}/${companies.length.toLocaleString(intlLocale())}`}</p>
              </div><Target className="h-10 w-10 text-purple-200" /></div></div></ReportSummary>{/* Search */}<section className="report-record"><div className="report-section-body"><div className="relative report-search">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("Cari perusahaan berdasarkan nama atau kode...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
            />
          </div></div></section>{/* Info Banner */}<div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-800 font-medium">{t("Catatan Penting")}</p>
          <p className="text-sm text-amber-700 mt-1">{t("Mengnonaktifkan fitur akan menyembunyikan menu terkait dari karyawan perusahaan tersebut. Data yang sudah ada tetap tersimpan dan dapat diakses kembali saat fitur diaktifkan.")} </p>
        </div>
      </div>{/* Companies Grid */}{isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
            <p className="text-gray-500">{t("Memuat data perusahaan...")}</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="admin-load-error" role="alert"><h3>{t("Data perusahaan belum bisa dimuat")}</h3><p>{t("Coba muat ulang untuk melihat pengaturan fitur.")}</p><button className="ph-button" onClick={fetchCompanies}>{t("Coba lagi")}</button></div>
      ) : (
        <div className="admin-company-features">
          {filteredCompanies.map((company) => (
            <section key={company.id} className="report-record"><div className="report-section-body"><div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Company Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0 report-avatar">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-gray-500">{company.code}</span>
                        {company.company_type && (
                          <Badge className={getCompanyTypeColor(company.company_type)}>
                            {companyTypeLabel(company.company_type)}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          <span>{(company._count?.employees || 0).toLocaleString(intlLocale())}{' '}{t("karyawan")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:flex-shrink-0">
                    <FeatureToggle
                      enabled={company.attendance_enabled}
                      isLoading={updatingIds.has(`${company.id}-attendance_enabled`)}
                      onToggle={() => handleToggle(company.id, 'attendance_enabled')}
                      label={t("Attendance")}
                      icon={<Clock className="h-4 w-4" />}
                    />
                    <FeatureToggle
                      enabled={company.leave_enabled}
                      isLoading={updatingIds.has(`${company.id}-leave_enabled`)}
                      onToggle={() => handleToggle(company.id, 'leave_enabled')}
                      label={t("Leave")}
                      icon={<CalendarDays className="h-4 w-4" />}
                    />
                    <FeatureToggle
                      enabled={company.payroll_enabled}
                      isLoading={updatingIds.has(`${company.id}-payroll_enabled`)}
                      onToggle={() => handleToggle(company.id, 'payroll_enabled')}
                      label={t("Payroll")}
                      icon={<Wallet className="h-4 w-4" />}
                    />
                    <FeatureToggle
                      enabled={company.performance_enabled}
                      isLoading={updatingIds.has(`${company.id}-performance_enabled`)}
                      onToggle={() => handleToggle(company.id, 'performance_enabled')}
                      label={t("Performance")}
                      icon={<Target className="h-4 w-4" />}
                    />
                  </div>
                </div></div></section>
          ))}
        </div>
      )}{!isLoading && !loadError && filteredCompanies.length === 0 && (
        <section className="report-record"><div className="report-section-body"><Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">{t("Tidak ada perusahaan ditemukan")}</p></div></section>
      )}</ReportPage>
  );
}
