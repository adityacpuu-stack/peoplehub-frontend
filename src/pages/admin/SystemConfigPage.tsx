import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Settings,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  Target,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from 'lucide-react';
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
      toast.error('Gagal memuat data perusahaan');
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
      toast.success(`${featureNames[feature]} ${newValue ? 'diaktifkan' : 'dinonaktifkan'} untuk ${company.name}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengubah pengaturan fitur');
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
      <p className="text-sm text-gray-500">
        Atur fitur yang aktif per perusahaan. Perubahan langsung tersimpan ke database.
      </p>

      {/* Company Tabs */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari perusahaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:bg-white transition-all"
          />
        </div>

        {/* Pills */}
        <div className="flex gap-2 flex-wrap">
          {filteredCompanies.map((company) => {
            const enabledCount = FEATURES.filter((f) => company[f.key]).length;
            const isActive = company.id === activeCompanyId;
            return (
              <button
                key={company.id}
                onClick={() => setActiveCompanyId(company.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {company.name}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {enabledCount}/{FEATURES.length}
                </span>
              </button>
            );
          })}
          {filteredCompanies.length === 0 && (
            <p className="text-sm text-gray-400">Tidak ada perusahaan ditemukan</p>
          )}
        </div>
      </div>

      {/* Feature Panel */}
      {activeCompany && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Panel Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
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
                    <span>{activeCompany._count?.employees || 0} karyawan</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">{activeEnabledCount} dari {FEATURES.length} fitur aktif</p>
          </div>

          {/* Features Grid */}
          <div className="p-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fitur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {FEATURES.map((feature) => {
                const enabled = activeCompany[feature.key];
                const isUpdating = updatingIds.has(`${activeCompany.id}-${feature.key}`);
                return (
                  <button
                    key={feature.key}
                    onClick={() => handleToggle(activeCompany.id, feature.key)}
                    disabled={isUpdating}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 ${
                      enabled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={enabled ? 'text-emerald-600' : 'text-gray-400'}>
                        {feature.icon}
                      </span>
                      <span>{feature.label}</span>
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
          </div>
        </div>
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
    toast.success('Konfigurasi menu disimpan');
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
        <p className="text-sm text-gray-500">Atur menu sidebar yang tampil per role pengguna</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Default
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 flex-wrap">
        {roles.map(role => {
          const total = ROLE_MENUS[role].length;
          const enabled = ROLE_MENUS[role].filter(i => config[role]?.[i.key]).length;
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeRole === role
                  ? 'bg-slate-800 text-white shadow'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {role}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeRole === role ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {enabled}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Menu Config Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{activeRole}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{enabledCount} dari {menuItems.length} menu aktif</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(activeRole, true)}
              className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Aktifkan Semua
            </button>
            <button
              onClick={() => toggleAll(activeRole, false)}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              Matikan Semua
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {sections.map(section => (
            <div key={section}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{section}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {menuItems.filter(i => i.section === section).map(item => {
                  const enabled = config[activeRole]?.[item.key] ?? true;
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggle(activeRole, item.key)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        enabled
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      <span>{item.label}</span>
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
        </div>
      </div>

      {isDirty && (
        <p className="text-xs text-amber-600 text-center">Ada perubahan yang belum disimpan</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'company-features' | 'menu-config';

export function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>('company-features');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'company-features', label: 'Company Features', icon: <Building2 className="w-4 h-4" /> },
    { id: 'menu-config', label: 'Menu Role Config', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-sm text-gray-500">Kelola fitur perusahaan dan tampilan menu per role</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'company-features' ? <CompanyFeaturesTab /> : <MenuRoleConfigTab />}
    </div>
  );
}
