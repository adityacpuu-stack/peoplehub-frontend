import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { settingsService, type CompanySettings, type AttendanceSettings, type PayrollSettings, type NotificationPreferences } from '@/services/settings.service';
import { companyService } from '@/services/company.service';
import { profileService } from '@/services/profile.service';
import { PageSpinner } from '@/components/ui';

type SettingsTab = 'general' | 'attendance' | 'leave' | 'payroll' | 'notifications' | 'security';

interface Company {
  id: number;
  name: string;
  code: string;
}

export function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Company selector (for Group CEO / Super Admin)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Settings state
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(null);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationPreferences>({
    email_attendance_reminder: true,
    email_leave_request: true,
    email_leave_approval: true,
    email_payslip: true,
    email_birthday: true,
    email_contract_expiry: true,
    whatsapp_enabled: false,
    whatsapp_attendance: false,
    whatsapp_approval: false,
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check user roles
  const isSuperAdmin = user?.roles?.includes('Super Admin');
  const isGroupCEO = user?.roles?.includes('Group CEO');
  const isCEO = user?.roles?.includes('CEO');
  const isHRManager = user?.roles?.includes('HR Manager');
  const isHRStaff = user?.roles?.includes('HR Staff');
  const isManager = user?.roles?.includes('Manager');
  const isFinanceManager = user?.roles?.includes('Finance Manager');

  // Determine access levels
  const canManageCompanySettings = isSuperAdmin || isGroupCEO || isCEO || isHRManager;
  const canManageAttendanceSettings = isSuperAdmin || isGroupCEO || isCEO || isHRManager;
  const canManagePayrollSettings = isSuperAdmin || isGroupCEO || isCEO || isHRManager || isFinanceManager;
  const canSelectCompany = isSuperAdmin || isGroupCEO;
  const isEmployee = !isSuperAdmin && !isGroupCEO && !isCEO && !isHRManager && !isHRStaff && !isManager && !isFinanceManager;

  // CEO can view but not edit company settings (view-only mode)
  const _canEditCompanySettings = isSuperAdmin || isGroupCEO || isHRManager;
  const _canEditAttendanceSettings = isSuperAdmin || isGroupCEO || isHRManager;
  const _canEditPayrollSettings = isSuperAdmin || isGroupCEO || isHRManager || isFinanceManager;
  const isViewOnlyMode = isCEO && !isSuperAdmin && !isGroupCEO;

  // Get available tabs based on role
  const getAvailableTabs = () => {
    const tabs: { id: SettingsTab; label: string; icon: React.ReactElement }[] = [];

    // Everyone can access notification settings
    tabs.push({
      id: 'notifications',
      label: 'Notifikasi',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    });

    // Everyone can access security settings (password change)
    tabs.push({
      id: 'security',
      label: 'Keamanan',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    });

    // HR/Admin can access company settings
    if (canManageCompanySettings) {
      tabs.unshift({
        id: 'general',
        label: 'Umum',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      });
    }

    // HR/Admin can access attendance settings
    if (canManageAttendanceSettings) {
      tabs.splice(tabs.length - 1, 0, {
        id: 'attendance',
        label: 'Absensi',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      });
    }

    // HR/Admin/Finance can access payroll settings
    if (canManagePayrollSettings) {
      tabs.splice(tabs.length - 1, 0, {
        id: 'payroll',
        label: 'Payroll',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      });
    }

    return tabs;
  };

  const tabs = getAvailableTabs();

  // Set default active tab based on role
  useEffect(() => {
    if (canManageCompanySettings) {
      setActiveTab('general');
    } else {
      setActiveTab('notifications');
    }
  }, [canManageCompanySettings]);

  // Fetch companies for selector
  useEffect(() => {
    const fetchCompanies = async () => {
      if (canSelectCompany) {
        try {
          const data = await companyService.getCompanies();
          setCompanies(data);
          if (data.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(data[0].id);
          }
        } catch (error) {
          console.error('Failed to fetch companies:', error);
        }
      } else if (user?.employee?.company_id) {
        setSelectedCompanyId(user.employee.company_id);
      }
    };

    fetchCompanies();
  }, [canSelectCompany, user?.employee?.company_id, selectedCompanyId]);

  // Fetch settings when company is selected
  useEffect(() => {
    const fetchSettings = async () => {
      if (!selectedCompanyId && !isEmployee) return;

      setIsLoading(true);
      try {
        const promises: Promise<any>[] = [];

        // Fetch notification preferences for all users
        promises.push(settingsService.getNotificationPreferences());

        // Fetch company settings if user has access
        if (selectedCompanyId && canManageCompanySettings) {
          promises.push(settingsService.getCompanySettings(selectedCompanyId));
        }

        // Fetch attendance settings if user has access
        if (selectedCompanyId && canManageAttendanceSettings) {
          promises.push(settingsService.getAttendanceSettings(selectedCompanyId));
        }

        // Fetch payroll settings if user has access
        if (selectedCompanyId && canManagePayrollSettings) {
          promises.push(settingsService.getPayrollSettings(selectedCompanyId));
        }

        const results = await Promise.all(promises);

        let idx = 0;
        setNotificationSettings(results[idx++]);

        if (selectedCompanyId && canManageCompanySettings) {
          setCompanySettings(results[idx++]);
        }

        if (selectedCompanyId && canManageAttendanceSettings) {
          setAttendanceSettings(results[idx++]);
        }

        if (selectedCompanyId && canManagePayrollSettings) {
          setPayrollSettings(results[idx++]);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Gagal memuat pengaturan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [selectedCompanyId, canManageCompanySettings, canManageAttendanceSettings, canManagePayrollSettings, isEmployee]);

  const handleSave = async () => {
    if (!selectedCompanyId && !isEmployee) return;

    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];

      // Save based on active tab
      if (activeTab === 'general' && companySettings && selectedCompanyId) {
        promises.push(settingsService.updateCompanySettings(selectedCompanyId, companySettings));
      } else if (activeTab === 'attendance' && attendanceSettings && selectedCompanyId) {
        promises.push(settingsService.updateAttendanceSettings(selectedCompanyId, attendanceSettings));
      } else if (activeTab === 'payroll' && payrollSettings && selectedCompanyId) {
        promises.push(settingsService.updatePayrollSettings(selectedCompanyId, payrollSettings));
      } else if (activeTab === 'notifications') {
        promises.push(settingsService.updateNotificationPreferences(notificationSettings));
      }

      await Promise.all(promises);
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Semua field harus diisi');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password baru dan konfirmasi tidak cocok');
      return;
    }

    setIsChangingPassword(true);
    try {
      await profileService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password berhasil diubah');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const message = error.response?.data?.message || 'Gagal mengubah password';
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {isEmployee ? 'Preferensi' : 'Settings'}
                  </h1>
                  <p className="text-blue-100 text-sm mt-1">
                    {isEmployee ? 'Kelola preferensi notifikasi Anda' : 'Kelola pengaturan sistem P&C'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Company Selector for Group CEO / Super Admin */}
              {canSelectCompany && companies.length > 0 && (
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id} className="text-gray-900">
                      {company.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Show company name for CEO (can't switch) */}
              {isCEO && !canSelectCompany && (user?.employee as { company_name?: string })?.company_name && (
                <div className="px-4 py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl border border-white/20">
                  <span className="font-medium">{(user?.employee as { company_name?: string })?.company_name}</span>
                </div>
              )}

              {/* Show view-only badge for CEO on company settings tabs */}
              {isViewOnlyMode && (activeTab === 'general' || activeTab === 'attendance' || activeTab === 'payroll') && (
                <span className="px-3 py-1.5 bg-amber-400/20 text-amber-100 rounded-lg text-sm font-medium border border-amber-400/30">
                  View Only
                </span>
              )}

              {/* Save button - hidden for CEO on company settings tabs */}
              {!(isViewOnlyMode && (activeTab === 'general' || activeTab === 'attendance' || activeTab === 'payroll')) && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Simpan</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <nav className="p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* General Settings */}
            {activeTab === 'general' && companySettings && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Pengaturan Umum</h3>
                  <p className="text-sm text-gray-500">
                    {isViewOnlyMode ? 'Melihat informasi dasar perusahaan' : 'Konfigurasi informasi dasar perusahaan'}
                  </p>
                </div>

                {isViewOnlyMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-amber-800">
                        Anda dapat melihat pengaturan perusahaan. Untuk melakukan perubahan, silakan hubungi P&C Manager.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                    <input
                      type="text"
                      value={companySettings.name || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                      disabled={isViewOnlyMode}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode Perusahaan</label>
                    <input
                      type="text"
                      value={companySettings.code || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, code: e.target.value })}
                      disabled={isViewOnlyMode}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                    <textarea
                      value={companySettings.address || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                      disabled={isViewOnlyMode}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                    <input
                      type="tel"
                      value={companySettings.phone || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                      disabled={isViewOnlyMode}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={companySettings.email || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                      disabled={isViewOnlyMode}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Format & Regional</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                      <select
                        value={companySettings.timezone || 'Asia/Jakarta'}
                        onChange={(e) => setCompanySettings({ ...companySettings, timezone: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                        <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                        <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format Tanggal</label>
                      <select
                        value={companySettings.date_format || 'DD/MM/YYYY'}
                        onChange={(e) => setCompanySettings({ ...companySettings, date_format: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label>
                      <select
                        value={companySettings.currency || 'IDR'}
                        onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="IDR">IDR - Indonesian Rupiah</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="SGD">SGD - Singapore Dollar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bahasa</label>
                      <select
                        value={companySettings.language || 'id'}
                        onChange={(e) => setCompanySettings({ ...companySettings, language: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="id">Bahasa Indonesia</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Settings */}
            {activeTab === 'attendance' && attendanceSettings && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Pengaturan Absensi</h3>
                  <p className="text-sm text-gray-500">
                    {isViewOnlyMode ? 'Melihat konfigurasi jam kerja dan aturan kehadiran' : 'Konfigurasi jam kerja dan aturan kehadiran'}
                  </p>
                </div>

                {isViewOnlyMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-amber-800">
                        Anda dapat melihat pengaturan absensi. Untuk melakukan perubahan, silakan hubungi P&C Manager.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Jam Kerja</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jam Masuk</label>
                      <input
                        type="time"
                        value={attendanceSettings.work_start_time || '08:00'}
                        onChange={(e) => setAttendanceSettings({ ...attendanceSettings, work_start_time: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jam Pulang</label>
                      <input
                        type="time"
                        value={attendanceSettings.work_end_time || '17:00'}
                        onChange={(e) => setAttendanceSettings({ ...attendanceSettings, work_end_time: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Istirahat Mulai</label>
                      <input
                        type="time"
                        value={attendanceSettings.break_start_time || '12:00'}
                        onChange={(e) => setAttendanceSettings({ ...attendanceSettings, break_start_time: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Istirahat Selesai</label>
                      <input
                        type="time"
                        value={attendanceSettings.break_end_time || '13:00'}
                        onChange={(e) => setAttendanceSettings({ ...attendanceSettings, break_end_time: e.target.value })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Toleransi</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Toleransi Terlambat (menit)</label>
                      <input
                        type="number"
                        value={attendanceSettings.late_threshold_minutes || 15}
                        onChange={(e) => setAttendanceSettings({ ...attendanceSettings, late_threshold_minutes: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Toleransi Check-in (menit)</label>
                      <input
                        type="number"
                        value={attendanceSettings.check_in_tolerance_minutes || 15}
                        onChange={(e) => setAttendanceSettings({ ...attendanceSettings, check_in_tolerance_minutes: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pengaturan Lainnya</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Wajib Check Out</p>
                        <p className="text-sm text-gray-500">Karyawan harus check out sebelum pulang</p>
                      </div>
                      <label className={`relative inline-flex items-center ${isViewOnlyMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={attendanceSettings.require_check_out ?? true}
                          onChange={(e) => setAttendanceSettings({ ...attendanceSettings, require_check_out: e.target.checked })}
                          disabled={isViewOnlyMode}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isViewOnlyMode ? 'opacity-60' : ''}`}></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Izinkan Remote Check-in</p>
                        <p className="text-sm text-gray-500">Karyawan dapat check-in dari lokasi lain</p>
                      </div>
                      <label className={`relative inline-flex items-center ${isViewOnlyMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={attendanceSettings.allow_remote_check_in ?? false}
                          onChange={(e) => setAttendanceSettings({ ...attendanceSettings, allow_remote_check_in: e.target.checked })}
                          disabled={isViewOnlyMode}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isViewOnlyMode ? 'opacity-60' : ''}`}></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Terlambat Mempengaruhi Gaji</p>
                        <p className="text-sm text-gray-500">Potong gaji jika terlambat</p>
                      </div>
                      <label className={`relative inline-flex items-center ${isViewOnlyMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={attendanceSettings.late_affects_salary ?? false}
                          onChange={(e) => setAttendanceSettings({ ...attendanceSettings, late_affects_salary: e.target.checked })}
                          disabled={isViewOnlyMode}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isViewOnlyMode ? 'opacity-60' : ''}`}></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payroll Settings */}
            {activeTab === 'payroll' && payrollSettings && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Pengaturan Payroll</h3>
                  <p className="text-sm text-gray-500">
                    {isViewOnlyMode ? 'Melihat konfigurasi BPJS, pajak, dan lembur' : 'Konfigurasi BPJS, pajak, dan lembur'}
                  </p>
                </div>

                {isViewOnlyMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-amber-800">
                        Anda dapat melihat pengaturan payroll. Untuk melakukan perubahan, silakan hubungi P&C Manager atau Finance Manager.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Jadwal Payroll</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Cut Off</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={payrollSettings.payroll_cutoff_date || 25}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, payroll_cutoff_date: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={payrollSettings.payroll_payment_date || 25}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, payroll_payment_date: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">BPJS Kesehatan</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kontribusi Karyawan (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(payrollSettings.bpjs_kes_employee_rate || 0.01) * 100}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, bpjs_kes_employee_rate: Number(e.target.value) / 100 })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kontribusi Perusahaan (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(payrollSettings.bpjs_kes_company_rate || 0.04) * 100}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, bpjs_kes_company_rate: Number(e.target.value) / 100 })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Gaji Maksimal</label>
                      <input
                        type="number"
                        value={payrollSettings.bpjs_kes_max_salary || 12000000}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, bpjs_kes_max_salary: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">BPJS Ketenagakerjaan - JHT</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kontribusi Karyawan (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(payrollSettings.bpjs_jht_employee_rate || 0.02) * 100}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, bpjs_jht_employee_rate: Number(e.target.value) / 100 })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kontribusi Perusahaan (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(payrollSettings.bpjs_jht_company_rate || 0.037) * 100}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, bpjs_jht_company_rate: Number(e.target.value) / 100 })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Lembur</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate Hari Kerja</label>
                      <input
                        type="number"
                        step="0.1"
                        value={payrollSettings.overtime_rate_weekday || 1.5}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, overtime_rate_weekday: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate Weekend</label>
                      <input
                        type="number"
                        step="0.1"
                        value={payrollSettings.overtime_rate_weekend || 2.0}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, overtime_rate_weekend: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate Hari Libur</label>
                      <input
                        type="number"
                        step="0.1"
                        value={payrollSettings.overtime_rate_holiday || 3.0}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, overtime_rate_holiday: Number(e.target.value) })}
                        disabled={isViewOnlyMode}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isViewOnlyMode ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pajak</h4>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Gunakan Metode TER</p>
                      <p className="text-sm text-gray-500">Tarif Efektif Rata-rata untuk perhitungan PPh 21</p>
                    </div>
                    <label className={`relative inline-flex items-center ${isViewOnlyMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={payrollSettings.use_ter_method ?? true}
                        onChange={(e) => setPayrollSettings({ ...payrollSettings, use_ter_method: e.target.checked })}
                        disabled={isViewOnlyMode}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isViewOnlyMode ? 'opacity-60' : ''}`}></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Pengaturan Notifikasi</h3>
                  <p className="text-sm text-gray-500">Kelola preferensi notifikasi email dan WhatsApp</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Email Notifications</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'email_attendance_reminder', label: 'Pengingat Absensi', desc: 'Terima email pengingat clock in/out' },
                      { key: 'email_leave_request', label: 'Pengajuan Cuti', desc: 'Notifikasi saat ada pengajuan cuti' },
                      { key: 'email_leave_approval', label: 'Persetujuan Cuti', desc: 'Notifikasi tentang status cuti' },
                      { key: 'email_payslip', label: 'Slip Gaji', desc: 'Terima slip gaji via email' },
                      { key: 'email_birthday', label: 'Ucapan Ulang Tahun', desc: 'Terima email ucapan ulang tahun' },
                      { key: 'email_contract_expiry', label: 'Kontrak Akan Berakhir', desc: 'Notifikasi kontrak yang akan habis' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">WhatsApp Notifications</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Aktifkan WhatsApp</p>
                        <p className="text-sm text-gray-500">Terima notifikasi via WhatsApp</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.whatsapp_enabled}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, whatsapp_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {notificationSettings.whatsapp_enabled && (
                      <>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">Notifikasi Absensi</p>
                            <p className="text-sm text-gray-500">Pengingat clock in/out via WhatsApp</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationSettings.whatsapp_attendance}
                              onChange={(e) => setNotificationSettings({ ...notificationSettings, whatsapp_attendance: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">Notifikasi Approval</p>
                            <p className="text-sm text-gray-500">Notifikasi persetujuan via WhatsApp</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationSettings.whatsapp_approval}
                              onChange={(e) => setNotificationSettings({ ...notificationSettings, whatsapp_approval: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings - Password Change */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Keamanan Akun</h3>
                  <p className="text-sm text-gray-500">Kelola password dan keamanan akun Anda</p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Tips Keamanan</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol untuk password yang kuat. Jangan gunakan password yang sama dengan akun lain.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Ubah Password</h4>
                  <div className="space-y-4 max-w-md">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Masukkan password saat ini"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.current ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Masukkan password baru (min. 8 karakter)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {passwordForm.newPassword && passwordForm.newPassword.length < 8 && (
                        <p className="text-xs text-red-500 mt-1">Password minimal 8 karakter</p>
                      )}
                      {passwordForm.newPassword && passwordForm.newPassword.length >= 8 && (
                        <p className="text-xs text-green-600 mt-1">Panjang password sudah memenuhi syarat</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="Masukkan ulang password baru"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                      )}
                      {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length >= 8 && (
                        <p className="text-xs text-green-600 mt-1">Password cocok</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 8}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isChangingPassword ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span>Ubah Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informasi Sesi</h4>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Sesi Aktif</p>
                        <p className="text-sm text-gray-500">Anda sedang login dari perangkat ini</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
