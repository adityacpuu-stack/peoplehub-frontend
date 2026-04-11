import { useState } from 'react';
import { Settings, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
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
    { section: 'Resources', key: '/resources/templates', label: 'Templates' },
    { section: 'Resources', key: '/resources/announcements', label: 'Announcements' },
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
    { section: 'Resources', key: '/resources/templates', label: 'Templates' },
    { section: 'Resources', key: '/resources/announcements', label: 'Announcements' },
  ],
  'Manager': [
    { section: 'Team', key: '/my-team', label: 'My Team' },
    { section: 'Team', key: '/team-attendance', label: 'Team Attendance' },
    { section: 'Team', key: '/team-overtime', label: 'Team Overtime' },
    { section: 'Team', key: '/leave-approval', label: 'Leave Approval' },
    { section: 'Personal', key: '/my-leave', label: 'My Leave' },
    { section: 'Personal', key: '/manager/documents', label: 'My Documents' },
    { section: 'Resources', key: '/manager/templates', label: 'Templates' },
    { section: 'Resources', key: '/manager/announcements', label: 'Announcements' },
  ],
  'Employee': [
    { section: 'Personal', key: '/attendance', label: 'My Attendance' },
    { section: 'Personal', key: '/my-leave', label: 'My Leave' },
    { section: 'Personal', key: '/employee/documents', label: 'My Documents' },
    { section: 'Resources', key: '/employee/templates', label: 'Templates' },
    { section: 'Resources', key: '/employee/announcements', label: 'Announcements' },
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
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function isMenuVisible(config: Record<string, Record<string, boolean>>, role: string, path: string): boolean {
  return config[role]?.[path] ?? true;
}

export function RoleDashboardConfigPage() {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Menu Role Config</h1>
            <p className="text-sm text-gray-500">Kelola menu sidebar yang tampil per role</p>
          </div>
        </div>
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
