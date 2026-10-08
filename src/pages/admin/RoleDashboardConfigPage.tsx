import { t, useLocale, intlLocale } from '@/i18n';
import { ReportPage, ReportHeader, ReportSection } from '@/pages/dashboard/ReportingLayout';
import './admin-workflows.css';
import { useState } from 'react';
import { Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const STORAGE_KEY = 'sidebar_role_config';

// All menu items per role with their paths
export const ROLE_MENUS: Record<string, { section: string; key: string; label: string }[]> = {
  'HR Manager': [
    { section: 'Operations', key: '/employees', label: 'Employees' },
    { section: 'Operations', key: '/attendance', label: 'Attendance' },
    { section: 'Operations', key: '/requests', label: 'My Approval' },
    { section: 'Operations', key: '/movement', label: 'Movement' },
    { section: 'Operations', key: '/org-chart', label: 'Org Chart' },
    { section: 'Leave', key: '/leave', label: 'Leave Requests' },
    { section: 'Leave', key: '/leave/policy', label: 'Leave Policy' },
    { section: 'Leave', key: '/leave/entitlements', label: 'Entitlements' },
    { section: 'Leave', key: '/leave/analytics', label: 'Leave Analytics' },
    { section: 'Payroll', key: '/payroll', label: 'Regular Employees' },
    { section: 'Payroll', key: '/payroll/freelance', label: 'Freelance & Internship' },
    { section: 'Compensation', key: '/overtime', label: 'Overtime' },
    { section: 'Compensation', key: '/allowances', label: 'Allowances' },
    { section: 'Compensation', key: '/deductions', label: 'Deductions' },
    { section: 'Master Data', key: '/companies', label: 'Companies' },
    { section: 'Master Data', key: '/departments', label: 'Departments' },
    { section: 'Master Data', key: '/positions', label: 'Positions' },
    { section: 'Master Data', key: '/work-locations', label: 'Work Locations' },
    { section: 'Master Data', key: '/holiday-calendar', label: 'Holiday Calendar' },
    { section: 'Documents', key: '/contracts', label: 'Contracts' },
    { section: 'Resources', key: '/templates', label: 'Templates' },
    { section: 'Resources', key: '/announcements', label: 'Announcements' },
  ],
  'HR Staff': [
    { section: 'Operations', key: '/employees', label: 'Employees' },
    { section: 'Operations', key: '/attendance', label: 'Attendance' },
    { section: 'Operations', key: '/org-chart', label: 'Org Chart' },
    { section: 'Leave', key: '/leave', label: 'Leave Requests' },
    { section: 'Leave', key: '/leave/policy', label: 'Leave Policy' },
    { section: 'Leave', key: '/leave/entitlements', label: 'Entitlements' },
    { section: 'Payroll', key: '/payroll', label: 'Regular Employees' },
    { section: 'Payroll', key: '/payroll/freelance', label: 'Freelance & Internship' },
    { section: 'Compensation', key: '/overtime', label: 'Overtime' },
    { section: 'Compensation', key: '/allowances', label: 'Allowances' },
    { section: 'Compensation', key: '/deductions', label: 'Deductions' },
    { section: 'Master Data', key: '/companies', label: 'Companies' },
    { section: 'Master Data', key: '/departments', label: 'Departments' },
    { section: 'Master Data', key: '/positions', label: 'Positions' },
    { section: 'Master Data', key: '/work-locations', label: 'Work Locations' },
    { section: 'Master Data', key: '/holiday-calendar', label: 'Holiday Calendar' },
    { section: 'Documents', key: '/contracts', label: 'Contracts' },
    { section: 'Resources', key: '/templates', label: 'Templates' },
    { section: 'Resources', key: '/announcements', label: 'Announcements' },
  ],
  'Manager': [
    { section: 'Team', key: '/my-team', label: 'My Team' },
    { section: 'Team', key: '/team-attendance', label: 'Team Attendance' },
    { section: 'Team', key: '/team-overtime', label: 'Team Overtime' },
    { section: 'Team', key: '/leave-approval', label: 'Leave Approval' },
    { section: 'Personal', key: '/manager/documents', label: 'My Documents' },
    { section: 'Resources', key: '/templates', label: 'Templates' },
    { section: 'Resources', key: '/announcements', label: 'Announcements' },
  ],
  'Employee': [
    { section: 'Personal', key: '/attendance', label: 'My Attendance' },
    { section: 'Personal', key: '/employee/documents', label: 'My Documents' },
    { section: 'Resources', key: '/templates', label: 'Templates' },
    { section: 'Resources', key: '/announcements', label: 'Announcements' },
  ],
};

const buildDefault = (): Record<string, Record<string, boolean>> => {
  const result: Record<string, Record<string, boolean>> = {};
  for (const role of Object.keys(ROLE_MENUS)) {
    result[role] = {};
    for (const item of ROLE_MENUS[role]) {
      result[role][item.key] = true;
    }
  }
  return result;
};

const DEFAULT_CONFIG = buildDefault();

export function getSidebarConfig(): Record<string, Record<string, boolean>> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_CONFIG;
    const parsed = JSON.parse(saved) as Record<string, Record<string, boolean>>;
    for (const [role, menus] of Object.entries(parsed)) {
      const legacy = role === 'Manager' ? '/manager/templates' : role === 'Employee' ? '/employee/templates' : '/resources/templates';
      if (menus['/templates'] === undefined && menus[legacy] !== undefined) menus['/templates'] = menus[legacy];
      const legacyAnnouncements = role === 'Manager' ? '/manager/announcements'
        : role === 'Employee' ? '/employee/announcements'
        : role === 'CEO' ? '/ceo/announcements' : '/resources/announcements';
      if (menus['/announcements'] === undefined && menus[legacyAnnouncements] !== undefined) {
        menus['/announcements'] = menus[legacyAnnouncements];
      }
    }
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function isMenuVisible(config: Record<string, Record<string, boolean>>, role: string, path: string): boolean {
  return config[role]?.[path] ?? true;
}

export function RoleDashboardConfigPage() {
  useLocale();
  const [config, setConfig] = useState<Record<string, Record<string, boolean>>>(() => getSidebarConfig());
  const [isDirty, setIsDirty] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('HR Staff');

  const roles = Object.keys(ROLE_MENUS);

  const toggle = (role: string, key: string) => {
    setConfig(prev => ({
      ...prev,
      [role]: { ...prev[role], [key]: !prev[role]?.[key] },
    }));
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
    window.dispatchEvent(new Event('navigation-config-changed'));
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
    <ReportPage  className="ph-admin-page">{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl font-bold text-gray-900">{t("Menu Role Config")}</h1><p className="text-sm text-gray-500">{t("Konfigurasi disimpan di browser ini. Kelola menu sidebar yang tampil per role. My Leave tersedia untuk semua akun dengan profil karyawan jika fitur cuti perusahaan aktif.")}</p></div>
<div className="report-header-context"><div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />{t("Reset Default")} </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="ph-button ph-button-primary flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />{t("Simpan")} </button>
        </div></div>
</ReportHeader>{/* Role Tabs */}<div className="ph-tabs">
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
      </div>{/* Menu Config Panel */}<ReportSection  className="overflow-hidden"><div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
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
        </div></ReportSection>{isDirty && (
        <p className="text-xs text-amber-600 text-center">{t("Ada perubahan yang belum disimpan")}</p>
      )}</ReportPage>
  );
}
