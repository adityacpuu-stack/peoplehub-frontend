import { t, useLocale, intlLocale } from '@/i18n';
import { ReportSection, ReportPage, ReportHeader } from '@/pages/dashboard/ReportingLayout';
import './admin-workflows.css';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Search, Users, Clock, CalendarDays, Wallet, Target, Loader2, ToggleLeft, ToggleRight, Eye, EyeOff, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, Badge } from '@/components/ui';
import { companyService, type CompanyWithFeatures } from '@/services/company.service';
import {
  ROLE_MENUS,
  getSidebarConfig,
  STORAGE_KEY,
} from './RoleDashboardConfigPage';

// ─── Company Features Tab ─────────────────────────────────────────────────────

type FeatureKey = 'attendance_enabled' | 'leave_enabled' | 'payroll_enabled' | 'performance_enabled';

const FEATURES: { key: FeatureKey; label: string; icon: React.ReactNode }[] = [
  { key: 'attendance_enabled', label: 'Attendance', icon: <Clock className="w-4 h-4" /> },
  { key: 'leave_enabled', label: 'Leave', icon: <CalendarDays className="w-4 h-4" /> },
  { key: 'payroll_enabled', label: 'Payroll', icon: <Wallet className="w-4 h-4" /> },
  { key: 'performance_enabled', label: 'Performance', icon: <Target className="w-4 h-4" /> },
];

function CompanyFeaturesTab() {
  useLocale();
  const [companies, setCompanies] = useState<CompanyWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await companyService.getFeatureTogglesList();
      setCompanies(data);
      if (data.length > 0) setActiveCompanyId(data[0].id);
    } catch {
      toast.error(t("Gagal memuat data perusahaan"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (companyId: number, feature: FeatureKey) => {
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
      const featureNames: Record<FeatureKey, string> = {
        attendance_enabled: 'Attendance',
        leave_enabled: 'Leave',
        payroll_enabled: 'Payroll',
        performance_enabled: 'Performance',
      };
      toast.success(t(newValue ? "{feature} diaktifkan untuk {company}" : "{feature} dinonaktifkan untuk {company}", { feature: t(featureNames[feature]), company: company.name }));
    } catch (error: any) {
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
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;
  const activeEnabledCount = activeCompany
    ? FEATURES.filter((f) => activeCompany[f.key]).length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-gray-500">{t("Atur fitur yang aktif per perusahaan. Perubahan langsung tersimpan ke database.")} </p>

      {/* Company Tabs */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative w-72 report-search">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("Cari perusahaan...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:bg-white transition-all"
          />
        </div>

        {/* Pills */}
        <div className="ph-tabs">
          {filteredCompanies.map((company) => {
            const enabledCount = FEATURES.filter((f) => company[f.key]).length;
            const isActive = company.id === activeCompanyId;
            return (
              <button aria-selected={activeCompanyId === company.id}
                key={company.id}
                onClick={() => setActiveCompanyId(company.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {company.name}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {(enabledCount).toLocaleString(intlLocale())}/{(FEATURES.length).toLocaleString(intlLocale())}
                </span>
              </button>
            );
          })}
          {filteredCompanies.length === 0 && (
            <p className="text-sm text-gray-400">{t("Tidak ada perusahaan ditemukan")}</p>
          )}
        </div>
      </div>

      {/* Feature Panel */}
      {activeCompany && (
        <ReportSection  className="overflow-hidden">{/* Panel Header */}<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 report-avatar">
                {activeCompany.logo ? (
                  <img src={activeCompany.logo} alt={activeCompany.name} className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <Building2 className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{activeCompany.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-gray-400">{activeCompany.code}</span>
                  <span className="text-gray-300">·</span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="h-3 w-3" />
                    <span>{activeCompany._count?.employees || 0}{' '}{t("karyawan")}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">{(activeEnabledCount).toLocaleString(intlLocale())}{' '}{t("dari")} {(FEATURES.length).toLocaleString(intlLocale())}{' '}{t("fitur aktif")}</p>
          </div>{/* Features Grid */}<div className="p-6">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">{t("Fitur")}</h3>
            <div className="admin-feature-options">
              {FEATURES.map((feature) => {
                const enabled = activeCompany[feature.key];
                const isUpdating = updatingIds.has(`${activeCompany.id}-${feature.key}`);
                return (
                  <button
                    key={feature.key}
                    aria-pressed={enabled} onClick={() => handleToggle(activeCompany.id, feature.key)}
                    disabled={isUpdating}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 ${
                      enabled
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={enabled ? "text-emerald-600" : "text-gray-400"}>
                        {feature.icon}
                      </span>
                      <span>{t(feature.label)}</span>
                    </div>
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : enabled ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div></ReportSection>
      )}
    </div>
  );
}

// ─── Menu Role Config Tab ─────────────────────────────────────────────────────

function buildDefault(): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {};
  for (const role of Object.keys(ROLE_MENUS)) {
    result[role] = {};
    for (const item of ROLE_MENUS[role]) {
      result[role][item.key] = true;
    }
  }
  return result;
}

const DEFAULT_CONFIG = buildDefault();

function MenuRoleConfigTab() {
  useLocale();
  const [config, setConfig] = useState<Record<string, Record<string, boolean>>>(() => getSidebarConfig());
  const [isDirty, setIsDirty] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('HR Staff');

  const roles = Object.keys(ROLE_MENUS);

  const toggle = (role: string, key: string) => {
    setConfig(prev => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role]?.[key] } }));
    setIsDirty(true);
  };

  const toggleAll = (role: string, on: boolean) => {
    setConfig(prev => ({
      ...prev,
      [role]: Object.fromEntries(ROLE_MENUS[role].map(i => [i.key, on])),
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setIsDirty(false);
    toast.success(t("Konfigurasi menu disimpan"));
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setIsDirty(true);
  };

  const menuItems = ROLE_MENUS[activeRole] || [];
  const sections = [...new Set(menuItems.map(i => i.section))];
  const enabledCount = menuItems.filter(i => config[activeRole]?.[i.key]).length;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t("Atur menu sidebar yang tampil per role pengguna. Konfigurasi ini disimpan di browser ini.")}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />{t("Reset Default")} </button>
          <button onClick={handleSave} disabled={!isDirty} className="ph-button ph-button-primary flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Save className="w-4 h-4" />{t("Simpan")} </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="ph-tabs">
        {roles.map(role => {
          const total = ROLE_MENUS[role].length;
          const enabled = ROLE_MENUS[role].filter(i => config[role]?.[i.key]).length;
          return (
            <button aria-selected={activeRole === role}
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeRole === role
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t(role)}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeRole === role ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {(enabled).toLocaleString(intlLocale())}/{(total).toLocaleString(intlLocale())}
              </span>
            </button>
          );
        })}
      </div>

      {/* Menu Config Panel */}
      <ReportSection  className="overflow-hidden"><div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{t(activeRole)}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{(enabledCount).toLocaleString(intlLocale())}{' '}{t("dari")} {(menuItems.length).toLocaleString(intlLocale())}{' '}{t("menu aktif")}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(activeRole, true)}
              className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
            >{t("Aktifkan Semua")} </button>
            <button
              onClick={() => toggleAll(activeRole, false)}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >{t("Matikan Semua")} </button>
          </div>
        </div><div className="p-6 space-y-6">
          {sections.map(section => (
            <div key={section} className="admin-permission-group">
              <h3 className="text-xs font-semibold text-gray-400 mb-3">{t(section)}</h3>
              <div className="admin-permission-options">
                {menuItems.filter(i => i.section === section).map(item => {
                  const enabled = config[activeRole]?.[item.key] ?? true;
                  return (
                    <button
                      key={item.key}
                      aria-pressed={enabled} onClick={() => toggle(activeRole, item.key)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        enabled
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-gray-50 border-gray-200 text-gray-400"
                      }`}
                    >
                      <span>{t(item.label)}</span>
                      {enabled
                        ? <Eye className="w-4 h-4 text-emerald-500" />
                        : <EyeOff className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div></ReportSection>

      {isDirty && (
        <p className="text-xs text-amber-600 text-center">{t("Ada perubahan yang belum disimpan")}</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'company-features' | 'menu-config';

export function SystemConfigPage() {
  useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: Tab = searchParams.get('tab') === 'menu-config' ? 'menu-config' : 'company-features';

  const setActiveTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'company-features', label: 'Company Features', icon: <Building2 className="w-4 h-4" /> },
    { id: 'menu-config', label: 'Menu Role Config', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <ReportPage  className="ph-admin-page">{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl font-bold text-gray-900">{t("System Configuration")}</h1><p className="text-sm text-gray-500">{t("Kelola fitur perusahaan, tampilan menu, dan akses karyawan")}</p></div>

</ReportHeader>{/* Tabs */}<div className="ph-tabs">
        {tabs.map(tab => (
          <button aria-selected={activeTab === tab.id}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {t(tab.label)}
          </button>
        ))}
      </div>{/* Tab Content */}{activeTab === 'company-features' && <CompanyFeaturesTab />}{activeTab === 'menu-config' && <MenuRoleConfigTab />}</ReportPage>
  );
}
