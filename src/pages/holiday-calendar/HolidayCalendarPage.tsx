import { holidayTypeLabel } from '../admin/localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { useDomainConfirmation } from '@/pages/leave/useDomainConfirmation';
import '@/pages/leave/domain-workflows.css';
import { MasterDataHeader, MasterDataSummary, MasterDataDialog } from '@/components/ui/MasterDataLayout';
import { collectPages, hasMasterRole, calendarLocationEditors } from '@/services/master-data';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import { MasterDataError } from '@/components/ui/MasterDataFeedback';
import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Building,
  Sun,
  RefreshCw,
  Settings,
  Loader2,
  Database,
  Download,
} from 'lucide-react';
import { holidayService } from '../../services/holiday.service';
import { companyService, type Company } from '../../services/company.service';
import { payrollSettingService } from '../../services/payroll-setting.service';
import type { Holiday, WorkingDaysConfig } from '../../services/holiday.service';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function HolidayCalendarPage() {
  useLocale();
  const { requestDecision, decisionDialog } = useDomainConfirmation('master-refresh-dialog master-refresh-confirmation');
  const authUser = useAuthStore(state => state.user);
  const roles = authUser?.roles;
  const isSuperAdmin = roles?.includes('Super Admin') ?? false;
  // Editor role is the ceiling; each mutation also needs its covered action.
  const isEditorRole = hasMasterRole(roles, calendarLocationEditors);
  const canManage = isEditorRole && canAction(authUser, 'holiday.create');
  const inScope = (holiday: Holiday) => holiday.company_id != null || isSuperAdmin;
  const canEdit = (holiday: Holiday) => isEditorRole && canAction(authUser, 'holiday.update') && inScope(holiday);
  const canDelete = (holiday: Holiday) => isEditorRole && canAction(authUser, 'holiday.delete') && inScope(holiday);
  // Company payroll settings read is a payroll.view read on the server.
  const canReadSettings = hasMasterRole(roles, ['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff', 'Finance Manager'])
    && canAction(authUser, 'payroll.view');
  const canManageSettings = hasMasterRole(roles, ['Super Admin', 'HR Manager', 'Finance Manager']);
  const requestId = useRef(0);
  const settingsRequestId = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [companyError, setCompanyError] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [previousHolidays, setPreviousHolidays] = useState<Holiday[]>([]);

  // Data state
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    synced: boolean;
    created: number;
    skipped: number;
    lastSyncTime?: number;
  } | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // View state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'working-days'>('calendar');
  const [showModal, setShowModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Working days config
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [cutoffDate, setCutoffDate] = useState(20);
  const [usePeriodCalculation, setUsePeriodCalculation] = useState(true);
  const selectedCompanyForSettings = Number(filterCompany) > 0 ? Number(filterCompany) : null;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'national' as Holiday['type'],
    is_recurring: false,
    company_id: '' as string | number,
    description: '',
  });

  const fetchCompanies = useCallback(async () => {
    setCompanyError(false);
    try { setCompanies(await collectPages((page, limit) => companyService.getAll({ page, limit }))); }
    catch { setCompanyError(true); }
  }, []);

  const fetchPayrollSettings = useCallback(async () => {
    const request = ++settingsRequestId.current;
    setSettingsError(false); setSettingsLoading(false);
    if (!selectedCompanyForSettings || !canReadSettings || viewMode !== 'working-days') return;
    setSettingsLoading(true);
    try {
      const settings = await payrollSettingService.getByCompany(selectedCompanyForSettings);
      if (request !== settingsRequestId.current) return;
      if (!settings || !Number.isInteger(settings.payroll_cutoff_date)) throw new Error('Cutoff belum tersedia');
      setCutoffDate(settings.payroll_cutoff_date);
    } catch { if (request === settingsRequestId.current) setSettingsError(true); }
    finally { if (request === settingsRequestId.current) setSettingsLoading(false); }
  }, [selectedCompanyForSettings, canReadSettings, viewMode]);

  const fetchHolidays = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true); setLoadError(false); setSyncStatus(null);
    const companyId = Number(filterCompany) > 0 ? Number(filterCompany) : undefined;
    try {
      const [rows, previous] = await Promise.all([
        holidayService.getFromBackend(filterYear, companyId),
        holidayService.getFromBackend(filterYear - 1, companyId),
      ]);
      if (request !== requestId.current) return;
      setHolidays(rows); setPreviousHolidays(previous.filter(holiday => holiday.date.startsWith(`${filterYear - 1}-12-`)));
    } catch {
      if (request !== requestId.current) return;
      setLoadError(true); setHolidays([]); setPreviousHolidays([]);
    } finally { if (request === requestId.current) setLoading(false); }
  }, [filterYear, filterCompany]);

  // Fetch from Public API and sync to backend (manual action)
  const fetchFromPublicApiAndSync = useCallback(async () => {
    if (!isSuperAdmin || syncing) return;
    try {
      setSyncing(true);

      // Fetch AND sync to backend in one call
      const result = await holidayService.fetchAndSyncHolidays(filterYear);

      if (!result.synced) throw new Error(result.syncResult?.errors.join('; ') || t('Import belum berhasil'));
      // Refresh data first, then retain the actual import result.
      await fetchHolidays();
      setSyncStatus({
        synced: result.synced,
        created: result.syncResult?.created || 0,
        skipped: result.syncResult?.skipped || 0,
        lastSyncTime: Date.now(),
      });

      // Show toast
      if (result.synced && result.syncResult?.created && result.syncResult.created > 0) {
        toast.success(t("{count} holidays synced to database", { count: result.syncResult.created.toLocaleString(intlLocale()) }));
      } else if (result.syncResult?.skipped && result.syncResult.skipped > 0) {
        toast.success(t("{count} holidays already exist in database", { count: result.syncResult.skipped.toLocaleString(intlLocale()) }));
      }

      return true;
    } catch (error: any) {
      console.error('Failed to sync holidays:', error);
      toast.error(error.response?.data?.message || error.message || t('Failed to sync holidays'), { id: 'api-error' });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [filterYear, fetchHolidays, isSuperAdmin, syncing]);

  // Initial data fetch - NO AUTO SYNC
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchHolidays();
    return () => { requestId.current++; };
  }, [fetchHolidays]);

  useEffect(() => {
    fetchPayrollSettings();
    return () => { settingsRequestId.current++; };
  }, [fetchPayrollSettings]);

  // Calculate working days for each month
  const workingDaysData = useMemo(() => {
    const data: WorkingDaysConfig[] = [];
    if (!selectedCompanyForSettings || loadError || loading || settingsLoading || settingsError) return data;
    const scopedHolidays = [...holidays, ...previousHolidays].filter(h => h.company_id == null || h.company_id === selectedCompanyForSettings);
    for (let month = 1; month <= 12; month++) {
      const config = usePeriodCalculation
        ? holidayService.calculatePayrollPeriodWorkingDays(
            filterYear,
            month,
            scopedHolidays,
            cutoffDate,
            workingDaysPerWeek
          )
        : holidayService.calculateWorkingDays(
            filterYear,
            month,
            scopedHolidays,
            workingDaysPerWeek
          );
      data.push(config);
    }
    return data;
  }, [holidays, previousHolidays, selectedCompanyForSettings, loadError, loading, settingsLoading, settingsError, filterYear, workingDaysPerWeek, cutoffDate, usePeriodCalculation]);

  // Filter holidays for list view
  const filteredHolidays = useMemo(() => {
    return holidays.filter(holiday => {
      const matchSearch = holiday.name.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || holiday.type === filterType;
      const matchCompany = filterCompany === 'all' ||
        holiday.company_id == null ||
        holiday.company_id?.toString() === filterCompany;
      return matchSearch && matchType && matchCompany && holiday.is_active;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, search, filterType, filterCompany]);

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean; holidays: Holiday[] }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        holidays: getHolidaysForDate(date),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        holidays: getHolidaysForDate(date),
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        holidays: getHolidaysForDate(date),
      });
    }

    return days;
  }, [currentDate, filteredHolidays]);

  function getHolidaysForDate(date: Date): Holiday[] {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return filteredHolidays.filter(h => h.date === dateStr && h.is_active);
  }

  // Stats
  const stats = useMemo(() => {
    const yearHolidays = holidays.filter(h => (filterCompany !== 'global' || h.company_id == null) && h.date.startsWith(filterYear.toString()) && h.is_active);
    const totalWorkingDays = workingDaysData.reduce((sum, m) => sum + m.actual_working_days, 0);
    return {
      total: yearHolidays.length,
      national: yearHolidays.filter(h => h.type === 'national').length,
      religious: yearHolidays.filter(h => h.type === 'religious').length,
      company: yearHolidays.filter(h => h.type === 'company').length,
      totalWorkingDays,
    };
  }, [holidays, filterYear, filterCompany, workingDaysData]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(1);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));

    setCurrentDate(newDate);

    // Update filterYear if the year changes to load holidays for that year
    if (newDate.getFullYear() !== filterYear) {
      setFilterYear(newDate.getFullYear());
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);

    // Sync filterYear to today's year
    if (today.getFullYear() !== filterYear) {
      setFilterYear(today.getFullYear());
    }
  };

  const handleOpenModal = (holiday?: Holiday) => {
    if (holiday ? !canEdit(holiday) : !canManage) return;
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        is_recurring: holiday.is_recurring,
        company_id: holiday.company_id || '',
        description: holiday.description || '',
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: '',
        type: 'national',
        is_recurring: false,
        company_id: selectedCompanyForSettings ?? (isSuperAdmin ? '' : companies.find(c => c.is_active)?.id ?? ''),
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHoliday(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.date) {
      toast.error(t("Please fill in required fields"));
      return;
    }

    if ((editingHoliday ? !canEdit(editingHoliday) : !canManage) || saving) return;
    if (!isSuperAdmin && !formData.company_id) { toast.error(t("Pilih company terlebih dahulu")); return; }
    setSaving(true);
    try {
      // Save to backend
      const holidayData = {
        name: formData.name,
        date: formData.date,
        type: formData.type,
        company_id: formData.company_id ? Number(formData.company_id) : null,
        description: formData.description,
        is_recurring: formData.is_recurring,
      };

      if (editingHoliday) {
        // Update in backend
        await holidayService.update(editingHoliday.id, holidayData);
        toast.success(t("Holiday updated successfully"));
      } else {
        // Create in backend
        await holidayService.create(holidayData);
        toast.success(t("Holiday added successfully"));
      }

      // Refresh from backend to show updated data
      await fetchHolidays();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message || t('Failed to save holiday'), { id: 'api-error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    const holiday = holidays.find(h => h.id === id);
    if (!holiday || !canDelete(holiday) || saving) return;
    if ((await requestDecision({ title: t("Delete holiday"), message: t("Are you sure you want to delete this holiday?"), confirmLabel: t("Delete") }))) {
      // Access may have changed while the confirmation was open: re-check the
      // current session (not this render's closure) before mutating.
      const current = useAuthStore.getState().user;
      if (!hasMasterRole(current?.roles, calendarLocationEditors) || !canAction(current, 'holiday.delete') || !inScope(holiday)) {
        toast.error(t("Your access changed; this action is no longer available."));
        return;
      }
      try {
        // Delete from backend
        await holidayService.delete(id);
        toast.success(t("Holiday deleted successfully"));
        // Refresh from backend
        await fetchHolidays();
      } catch (error: any) {
        toast.error(error.message || t('Failed to delete holiday'));
      }
    }
  };

  const handleSyncFromPublicApi = async () => {
    try {
      if (await fetchFromPublicApiAndSync()) setShowSyncModal(false);
    } catch (error: any) {
      toast.error(error.message || t('Failed to sync holidays'));
    }
  };

  // Handle cutoff date change
  const handleCutoffDateChange = (value: number) => {
    if (Number.isInteger(value) && value >= 1 && value <= 28) setCutoffDate(value);
  };

  const toggleWorkingDay = (day: number) => {
    setWorkingDaysPerWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const getTypeColor = (type: Holiday['type']) => {
    switch (type) {
      case 'national':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'religious':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'company':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cuti_bersama':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeDot = (type: Holiday['type']) => {
    switch (type) {
      case 'national':
        return 'bg-red-500';
      case 'religious':
        return 'bg-purple-500';
      case 'company':
        return 'bg-blue-500';
      case 'cuti_bersama':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(intlLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const displayedMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const monthAgenda = filteredHolidays.filter(holiday => holiday.date.startsWith(displayedMonth)).sort((a, b) => a.date.localeCompare(b.date));

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="master-data md-page master-refresh">
      {companyError && <MasterDataError onRetry={fetchCompanies} />}
      <MasterDataHeader title={t("Holiday Calendar")} description={t("Hari libur nasional, cuti bersama, dan kalender tiap perusahaan.")} actions={<>
        <select aria-label={t("Tahun kalender")} value={filterYear} onChange={e => { const year = Number(e.target.value); setFilterYear(year); setCurrentDate(new Date(year, currentDate.getMonth(), 1)); }}>
          {[2024, 2025, 2026, 2027].map(year => <option key={year} value={year}>{year}</option>)}
        </select>
        <button onClick={() => fetchHolidays()} disabled={loading} className="md-button" title={t("Refresh from database")}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}</button>
        {isSuperAdmin && <button onClick={() => setShowSyncModal(true)} disabled={syncing} className="md-button">{syncing ? <Loader2 className="animate-spin" /> : <Download />}{' '}{t("Import")}</button>}
        {canManage && !companyError && !loadError && !loading && <button onClick={() => handleOpenModal()} className="md-button md-button-primary"><Plus />{t("Add Holiday")}</button>}
      </>} />
      <div className="md-surface">
      <MasterDataSummary loading={loading || loadError} items={[
        { label: t('Total Holidays'), value: (stats.total).toLocaleString(intlLocale()) },
        { label: t('National'), value: (stats.national).toLocaleString(intlLocale()) },
        { label: t('Religious'), value: (stats.religious).toLocaleString(intlLocale()) },
        { label: t('Company'), value: (stats.company).toLocaleString(intlLocale()) },
        { label: t('Hari kerja simulasi'), value: workingDaysData.length ? stats.totalWorkingDays.toLocaleString(intlLocale()) : '—' },
      ]} />

      {/* Main Content */}
      <div className="md-panel">
        {/* Toolbar */}
        <div className="md-calendar-toolbar">
          <div className="flex flex-col gap-4">
            {/* View Toggle & Navigation */}
            <div className="md-calendar-views">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >{t("Calendar")} </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >{t("List")} </button>
                <button
                  onClick={() => setViewMode('working-days')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    viewMode === 'working-days' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >{t("Working Days")} </button>
              </div>

              {viewMode === 'calendar' && (
                <div className="flex items-center gap-2">
                  <button
                    aria-label={t("Bulan sebelumnya")} onClick={() => navigateMonth('prev')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
                    {currentDate.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    aria-label={t("Bulan berikutnya")} onClick={() => navigateMonth('next')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >{t("Today")} </button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="md-calendar-filters">
              {viewMode === 'list' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("Search holidays...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-[200px]"
                  />
                </div>
              )}

              <select
                aria-label={t("Tipe hari libur")} value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">{t("All Types")}</option>
                <option value="national">{t("National")}</option>
                <option value="religious">{t("Religious")}</option>
                <option value="company">{t("Company")}</option>
                <option value="cuti_bersama">{t("Cuti Bersama")}</option>
              </select>

              <select
                aria-label={t("Filter company")} value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">{t("All Companies")}</option>
                <option value="global">{t("Global (All)")}</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500">{t("Legend:")}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-xs text-gray-600">{t("National")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-xs text-gray-600">{t("Religious")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-xs text-gray-600">{t("Company")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span className="text-xs text-gray-600">{t("Cuti Bersama")}</span>
            </div>
          </div>
        </div>

        {loadError ? <MasterDataError onRetry={fetchHolidays} /> : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        ) : viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="md-calendar-layout"><div>
            <p className="md-calendar-help">{t("Geser kalender untuk melihat seluruh minggu, atau pilih List.")}</p>
            <div className="overflow-x-auto p-3 sm:p-5" tabIndex={0} role="region" aria-label={t("Kalender bulanan")}>
            <div className="md-calendar-grid">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day, idx) => (
                <div
                  key={day}
                  className={`text-center text-xs font-semibold py-2 ${
                    !workingDaysPerWeek.includes(idx) ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t(day)}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((day, index) => {
                const isToday = day.date.toDateString() === new Date().toDateString();
                const isWeekend = !workingDaysPerWeek.includes(day.date.getDay());

                return (
                  <div
                    key={index}
                    className={`md-calendar-cell transition-colors ${
                      !day.isCurrentMonth
                        ? 'bg-gray-50 border-gray-100 text-gray-400'
                        : isToday
                        ? 'bg-indigo-50 border-indigo-200'
                        : day.holidays.length > 0
                        ? 'bg-amber-50 border-amber-200'
                        : isWeekend
                        ? 'bg-gray-50 border-gray-100'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        isToday ? 'w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center' : ''
                      }`}>
                        {day.date.getDate()}
                      </span>
                      {day.holidays.length > 0 && !isToday && (
                        <span className="text-[10px] font-bold text-amber-600">
                          {t(day.holidays.length === 1 ? "{count} holiday" : "{count} holidays", { count: day.holidays.length.toLocaleString(intlLocale()) })}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {day.holidays.slice(0, 2).map(holiday => (
                        <div
                          key={holiday.id}
                          onClick={() => handleOpenModal(holiday)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80 ${getTypeColor(holiday.type)}`}
                          title={holiday.name}
                        >
                          {holiday.name}
                        </div>
                      ))}
                      {day.holidays.length > 2 && (
                        <div className="text-[10px] text-gray-500 font-medium">
                          +{day.holidays.length - 2}{' '}{t("more")} </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            </div>
          </div><aside className="md-calendar-agenda" aria-label={t("Agenda bulan terpilih")}>
            <h2>{t("Agenda bulan ini")}</h2><p>{currentDate.toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' })}</p>
            <div className="md-agenda-list">{monthAgenda.length === 0 ? <p className="text-xs text-slate-500 leading-relaxed">{t("Tidak ada hari libur yang sesuai filter pada bulan ini.")}</p> : monthAgenda.map(holiday => <article key={holiday.id} className="md-agenda-item">
              <div className="md-agenda-date"><strong>{Number(holiday.date.slice(8, 10))}</strong><span>{new Date(`${holiday.date}T00:00:00`).toLocaleDateString(intlLocale(), { weekday: 'short' })}</span></div>
              <div><h3>{holiday.name}</h3><p>{holiday.company_id == null ? t("Semua company") : holiday.company?.name || companies.find(company => company.id === holiday.company_id)?.name || t('Company')}</p>
                <span className={`inline-flex rounded px-2 py-0.5 text-[10px] ${getTypeColor(holiday.type)}`}>{holidayTypeLabel(holiday.type)}</span>
              </div>
            </article>)}</div>
          </aside></div>
        ) : viewMode === 'working-days' ? (
          /* Working Days View */
          <div className="p-6">
            {/* Configuration */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">{t("Simulasi hari kerja")}</h3>
                </div>
                {canManageSettings && <Link to="/payroll-settings" className="text-sm font-medium text-rose-700 underline">{t("Buka Payroll Settings")}</Link>}

              </div>

              <p className="text-sm text-gray-600">{t("Pilihan hari kerja dan cutoff di sini hanya untuk simulasi. Perubahan tidak mengubah jadwal kerja atau perhitungan payroll yang tersimpan.")}</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Company Selector for Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="md-holiday-calendar-field-0">{t("Company simulasi")}</label>
                  <select id="md-holiday-calendar-field-0"
                    value={selectedCompanyForSettings || ''}
                    onChange={(e) => {
                      setFilterCompany(e.target.value || 'all');
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">{t("Select Company")}</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t("Menggunakan hari libur company ini dan hari libur global")} </p>
                </div>

                {/* Working Days Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Working Days")}</label>
                  <div className="flex flex-wrap gap-1">
                    {dayNames.map((day, idx) => (
                      <button
                        key={day}
                        aria-label={t(day)} aria-pressed={workingDaysPerWeek.includes(idx)} onClick={() => toggleWorkingDay(idx)}
                        className={`w-10 h-10 text-xs font-semibold rounded-lg transition ${
                          workingDaysPerWeek.includes(idx)
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {day.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cutoff Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="md-holiday-calendar-field-1">{t("Cutoff simulasi")}</label>
                  <input id="md-holiday-calendar-field-1"
                    type="number"
                    min="1"
                    max="28"
                    value={cutoffDate}
                    onChange={(e) => handleCutoffDateChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("Period:")} {cutoffDate + 1}{' '}{t("prev month -")} {cutoffDate}{' '}{t("current")} </p>
                </div>

                {/* Calculation Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("Calculation Method")}</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={usePeriodCalculation}
                        onChange={() => setUsePeriodCalculation(true)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{t("Payroll Period")}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!usePeriodCalculation}
                        onChange={() => setUsePeriodCalculation(false)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{t("Calendar Month")}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Working Days Table */}
            {!selectedCompanyForSettings ? <p className="text-sm text-gray-600">{t("Pilih satu company untuk menghitung hari kerja.")}</p> : settingsLoading ? <p>{t("Memuat cutoff tersimpan...")}</p> : settingsError ? <MasterDataError onRetry={fetchPayrollSettings} /> : <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Month")}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Period")}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Total Days")}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Working Days")}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Holidays")}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-green-50">{t("Actual Working Days")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Holiday List")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workingDaysData.map((data, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{t(MONTHS[idx])}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {usePeriodCalculation
                          ? `${cutoffDate + 1}/${idx === 0 ? 12 : idx} - ${cutoffDate}/${idx + 1}`
                          : `1/${idx + 1} - ${new Date(filterYear, idx + 1, 0).getDate()}/${idx + 1}`
                        }
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{(data.total_days).toLocaleString(intlLocale())}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{(data.working_days).toLocaleString(intlLocale())}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                          data.holiday_count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {(data.holiday_count).toLocaleString(intlLocale())}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center bg-green-50">
                        <span className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-lg">
                          {(data.actual_working_days).toLocaleString(intlLocale())}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {data.holidays.slice(0, 3).map(h => (
                            <span
                              key={h.id}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getTypeColor(h.type)}`}
                              title={`${h.name} - ${h.date}`}
                            >
                              {h.name.length > 15 ? h.name.substring(0, 15) + '...' : h.name}
                            </span>
                          ))}
                          {data.holidays.length > 3 && (
                            <span className="text-xs text-gray-500">+{data.holidays.length - 3}{' '}{t("more")}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-gray-900">{t("Total")} {filterYear}</td>
                    <td className="px-4 py-3 text-center"></td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {workingDaysData.reduce((sum, d) => sum + d.total_days, 0)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {workingDaysData.reduce((sum, d) => sum + d.working_days, 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-amber-200 text-amber-800 rounded-lg text-xs font-medium">
                        {workingDaysData.reduce((sum, d) => sum + d.holiday_count, 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center bg-green-100">
                      <span className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm font-bold rounded-lg">
                        {workingDaysData.length ? stats.totalWorkingDays : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>}
          </div>
        ) : (
          /* List View */
          <div className="overflow-x-auto">
            {filteredHolidays.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t("No holidays found")}</h3>
                <p className="mt-1 text-gray-500 mb-4">
                  {holidays.length === 0
                    ? t("Database is empty. Import holidays from public API or add them manually.")
                    : t("Try adjusting your search or filters")}
                </p>
                {holidays.length === 0 && isSuperAdmin && (
                  <button
                    onClick={() => setShowSyncModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />{t("Import Holidays for")} {filterYear}
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Holiday")}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Date")}</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Type")}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Applies To")}</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Recurring")}</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHolidays.map(holiday => (
                    <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${getTypeDot(holiday.type)}`}></div>
                          <div>
                            <p className="font-semibold text-gray-900">{holiday.name}</p>
                            {holiday.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{holiday.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{formatDate(holiday.date)}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(holiday.type)}`}>
                          {holiday.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {holiday.company_id ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <Building className="w-3.5 h-3.5" />
                            {holiday.company?.name || t('Company')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                            <Sun className="w-3.5 h-3.5" />{t("All Companies")} </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {holiday.is_recurring ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">{t("Yes")} </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">{t("No")} </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={!canEdit(holiday)} onClick={() => handleOpenModal(holiday)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t("Edit")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {canDelete(holiday) && (<button
                            onClick={() => handleDelete(holiday.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t("Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <MasterDataDialog busy={saving} labelledBy="md-holiday-calendar-dialog-0" onClose={handleCloseModal}>
              <div className="md-dialog-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">

                    <div>
                      <h2 id="md-holiday-calendar-dialog-0" className="text-xl font-bold text-slate-900">
                        {editingHoliday ? t("Edit Holiday") : t("Add Holiday")}
                      </h2>
                      <p className="text-slate-500 text-sm">
                        {editingHoliday ? t("Update holiday details") : t("Create a new holiday")}
                      </p>
                    </div>
                  </div>
                  <button disabled={saving}
                    onClick={handleCloseModal}
                    className="md-avatar"
                   aria-label={t("Tutup dialog")}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="ph-workflow dw-form">
                <div><div className="dw-form-content"><section className="ph-section dw-section"><h3>{t("Holiday")}</h3><div className="dw-fields"><div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="md-holiday-calendar-field-2">{t("Holiday Name")} <span className="text-red-500">*</span>
                    </label>
                    <input id="md-holiday-calendar-field-2"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder={t("e.g., Independence Day")}
                      required
                    />
                  </div><div className="ph-form-grid dw-form-grid"><div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="md-holiday-calendar-field-3">{t("Date")} <span className="text-red-500">*</span>
                    </label>
                    <input id="md-holiday-calendar-field-3"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div><div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="md-holiday-calendar-field-4">{t("Type")}</label>
                    <select id="md-holiday-calendar-field-4"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Holiday['type'] }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="national">{t("National Holiday")}</option>
                      <option value="religious">{t("Religious Holiday")}</option>
                      <option value="company">{t("Company Holiday")}</option>
                      <option value="cuti_bersama">{t("Cuti Bersama")}</option>
                    </select>
                  </div></div></div></section><section className="ph-section dw-section"><h3>{t("Scope & recurrence")}</h3><div className="dw-fields"><div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="md-holiday-calendar-field-5">{t("Applies To")}</label>
                    <select id="md-holiday-calendar-field-5"
                      required={!isSuperAdmin} disabled={!!editingHoliday} aria-label={t("Company holiday")} value={formData.company_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">{isSuperAdmin ? t("All Companies (Global)") : t("Pilih company")}</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div><div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="is_recurring" className="text-sm text-gray-700">{t("Recurring every year (same date)")} </label>
                  </div></div></section><section className="ph-section dw-section"><h3>{t("Description")}</h3><div className="dw-fields"><div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="md-holiday-calendar-field-6">{t("Description")}</label>
                    <textarea id="md-holiday-calendar-field-6"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      rows={2}
                      placeholder={t("Optional description...")}
                    />
                  </div></div></section></div></div>

                <div className="ph-form-actions dw-actions">
                  <button disabled={saving}
                    type="button"
                    onClick={handleCloseModal}
                    className="ph-button"
                  >{t("Cancel")} </button>
                  {!(editingHoliday ? canEdit(editingHoliday) : canManage) && <p role="status" className="text-sm text-amber-700" data-testid="access-changed">{t("Your access changed; this action is no longer available. Your input is kept until you close the dialog.")}</p>}
                  <button
                    disabled={saving || !(editingHoliday ? canEdit(editingHoliday) : canManage)} type="submit"
                    className="ph-button ph-button-primary"
                  >
                    {editingHoliday ? t("Update") : t("Add Holiday")}
                  </button>
                </div>
              </form>
            </MasterDataDialog>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <MasterDataDialog busy={syncing} labelledBy="md-holiday-calendar-dialog-1" onClose={() => setShowSyncModal(false)}>
              <div className="md-dialog-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">

                    <div>
                      <h2 id="md-holiday-calendar-dialog-1" className="text-xl font-bold text-slate-900">{t("Import Holidays")}</h2>
                      <p className="text-slate-500 text-sm">{t("Tambahkan hari libur untuk tahun yang dipilih.")}</p>
                    </div>
                  </div>
                  <button disabled={syncing}
                    onClick={() => setShowSyncModal(false)}
                    className="md-avatar"
                   aria-label={t("Tutup dialog")}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="ph-workflow dw-detail dw-fields">
                <div className="dw-inline">
                  <div><p className="text-sm font-medium">{t("Kalender")} {filterYear}</p><p className="mt-1 text-xs text-slate-500">{t("Hari libur yang sudah tersimpan")}</p></div>
                  <strong className="text-2xl font-semibold">{(holidays.length).toLocaleString(intlLocale())}</strong>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{t("Tambahkan hari libur Indonesia dari sumber kalender publik. Hari libur yang sudah ada akan dilewati. Anda juga bisa menambahkan hari libur melalui Add Holiday.")}</p>
                {syncStatus?.lastSyncTime && <p className="text-xs text-slate-500">{t("Impor terakhir:")} {new Date(syncStatus.lastSyncTime).toLocaleTimeString(intlLocale())}</p>}
                <div className="ph-form-actions dw-actions">
                  <button disabled={syncing} onClick={() => setShowSyncModal(false)} className="md-button">{t("Close")}</button>
                  <button onClick={handleSyncFromPublicApi} disabled={syncing} className="md-button md-button-primary">
                    {syncing ? <Loader2 className="animate-spin" /> : <Download />}{' '}{t("Import Holidays for")} {filterYear}
                  </button>
                </div>
              </div>
            </MasterDataDialog>
      )}
    {decisionDialog}
</div>
  );
}
