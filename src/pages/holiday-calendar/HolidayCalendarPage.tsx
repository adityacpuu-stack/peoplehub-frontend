import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Moon,
  Star,
  RefreshCw,
  Settings,
  Briefcase,
  Loader2,
  Save,
  Database,
  Download,
} from 'lucide-react';
import { holidayService } from '../../services/holiday.service';
import { companyService, type Company } from '../../services/company.service';
import { payrollSettingService, type PayrollSetting } from '../../services/payroll-setting.service';
import type { Holiday, WorkingDaysConfig } from '../../services/holiday.service';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function HolidayCalendarPage() {
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
    lastSyncTime?: string;
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
  const [selectedCompanyForSettings, setSelectedCompanyForSettings] = useState<number | null>(null);
  const [_payrollSettings, setPayrollSettings] = useState<PayrollSetting | null>(null);
  const [configChanged, setConfigChanged] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'national' as Holiday['type'],
    is_recurring: false,
    company_id: '' as string | number,
    description: '',
  });

  // Fetch companies from API
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyService.getAll({ limit: 100, is_active: true });
      setCompanies(response.data);
      // Set first company as default for settings if not set
      if (!selectedCompanyForSettings && response.data.length > 0) {
        setSelectedCompanyForSettings(response.data[0].id);
      }
    } catch (error: any) {
      console.error('Failed to fetch companies:', error);
    }
  }, [selectedCompanyForSettings]);

  // Fetch payroll settings for selected company
  const fetchPayrollSettings = useCallback(async () => {
    if (!selectedCompanyForSettings) return;
    try {
      const settings = await payrollSettingService.getByCompany(selectedCompanyForSettings);
      setPayrollSettings(settings);
      if (settings.payroll_cutoff_date) {
        setCutoffDate(settings.payroll_cutoff_date);
      }
    } catch (error: any) {
      console.error('Failed to fetch payroll settings:', error);
    }
  }, [selectedCompanyForSettings]);

  // Fetch holidays from BACKEND DATABASE (not public API)
  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch from backend database - no auto-sync
      const backendHolidays = await holidayService.getFromBackend(filterYear);

      // Convert backend format to Holiday format
      const holidaysWithFormat: Holiday[] = (backendHolidays || []).map((h: any) => {
        // Handle date format - could be string or Date object
        let dateStr = '';
        if (typeof h.date === 'string') {
          dateStr = h.date.split('T')[0]; // Handle ISO date strings
        } else if (h.date instanceof Date) {
          dateStr = h.date.toISOString().split('T')[0];
        } else if (h.date) {
          dateStr = new Date(h.date).toISOString().split('T')[0];
        }

        return {
          id: h.id,
          name: h.name,
          date: dateStr,
          type: h.type as Holiday['type'],
          company_id: h.company_id,
          description: h.description,
          is_recurring: h.is_recurring || false,
          source: 'manual' as const,
          is_active: h.is_active !== false,
          created_at: h.created_at || new Date().toISOString(),
        };
      });

      // Apply type filter
      let filtered = holidaysWithFormat;
      if (filterType !== 'all') {
        filtered = filtered.filter(h => h.type === filterType);
      }

      setHolidays(filtered);

      // Update sync status - data is from database
      setSyncStatus({
        synced: true,
        created: filtered.length,
        skipped: 0,
        lastSyncTime: new Date().toLocaleTimeString(),
      });

    } catch (error: any) {
      console.error('Failed to fetch holidays from backend:', error);
      // Only show toast for actual errors, not for empty data
      if (error.response?.status === 401) {
        toast.error('Please login to view holidays');
      } else if (error.response?.status) {
        toast.error(`Failed to load holidays: ${error.response.status}`);
      }
      // Don't show toast if it's just network error - service already returns empty array
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterType]);

  // Fetch from Public API and sync to backend (manual action)
  const fetchFromPublicApiAndSync = useCallback(async () => {
    try {
      setSyncing(true);

      // Fetch AND sync to backend in one call
      const result = await holidayService.fetchAndSyncHolidays(filterYear);

      // Update sync status
      setSyncStatus({
        synced: result.synced,
        created: result.syncResult?.created || 0,
        skipped: result.syncResult?.skipped || 0,
        lastSyncTime: new Date().toLocaleTimeString(),
      });

      // Show toast
      if (result.synced && result.syncResult?.created && result.syncResult.created > 0) {
        toast.success(`${result.syncResult.created} holidays synced to database`);
      } else if (result.syncResult?.skipped && result.syncResult.skipped > 0) {
        toast.success(`${result.syncResult.skipped} holidays already exist in database`);
      }

      // Refresh from backend to show updated data
      await fetchHolidays();
    } catch (error: any) {
      console.error('Failed to sync holidays:', error);
      toast.error(error.message || 'Failed to sync holidays');
    } finally {
      setSyncing(false);
    }
  }, [filterYear, fetchHolidays]);

  // Save working days configuration to backend
  const saveWorkingDaysConfig = useCallback(async () => {
    if (!selectedCompanyForSettings) {
      toast.error('Please select a company first');
      return;
    }

    try {
      setSaving(true);
      await payrollSettingService.upsert(selectedCompanyForSettings, {
        payroll_cutoff_date: cutoffDate,
      });
      setConfigChanged(false);
      toast.success('Working days configuration saved');
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }, [selectedCompanyForSettings, cutoffDate]);

  // Initial data fetch - NO AUTO SYNC
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  useEffect(() => {
    fetchPayrollSettings();
  }, [fetchPayrollSettings]);

  // Calculate working days for each month
  const workingDaysData = useMemo(() => {
    const data: WorkingDaysConfig[] = [];
    for (let month = 1; month <= 12; month++) {
      const config = usePeriodCalculation
        ? holidayService.calculatePayrollPeriodWorkingDays(
            filterYear,
            month,
            holidays,
            cutoffDate,
            workingDaysPerWeek
          )
        : holidayService.calculateWorkingDays(
            filterYear,
            month,
            holidays,
            workingDaysPerWeek
          );
      data.push(config);
    }
    return data;
  }, [holidays, filterYear, workingDaysPerWeek, cutoffDate, usePeriodCalculation]);

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
  }, [currentDate, holidays]);

  function getHolidaysForDate(date: Date): Holiday[] {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.filter(h => h.date === dateStr && h.is_active);
  }

  // Filter holidays for list view
  const filteredHolidays = useMemo(() => {
    return holidays.filter(holiday => {
      const matchSearch = holiday.name.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || holiday.type === filterType;
      const matchCompany = filterCompany === 'all' ||
        (filterCompany === 'global' && holiday.company_id === null) ||
        holiday.company_id?.toString() === filterCompany;
      return matchSearch && matchType && matchCompany && holiday.is_active;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, search, filterType, filterCompany]);

  // Stats
  const stats = useMemo(() => {
    const yearHolidays = holidays.filter(h => h.date.startsWith(filterYear.toString()) && h.is_active);
    const totalWorkingDays = workingDaysData.reduce((sum, m) => sum + m.actual_working_days, 0);
    return {
      total: yearHolidays.length,
      national: yearHolidays.filter(h => h.type === 'national').length,
      religious: yearHolidays.filter(h => h.type === 'religious').length,
      company: yearHolidays.filter(h => h.type === 'company').length,
      totalWorkingDays,
    };
  }, [holidays, filterYear, workingDaysData]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
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
        company_id: '',
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
      toast.error('Please fill in required fields');
      return;
    }

    try {
      // Save to backend
      const holidayData = {
        name: formData.name,
        date: formData.date,
        type: formData.type,
        company_id: formData.company_id ? Number(formData.company_id) : undefined,
        description: formData.description || undefined,
        is_recurring: formData.is_recurring,
      };

      if (editingHoliday) {
        // Update in backend
        await holidayService.update(editingHoliday.id, holidayData);
        toast.success('Holiday updated successfully');
      } else {
        // Create in backend
        await holidayService.create(holidayData);
        toast.success('Holiday added successfully');
      }

      // Refresh from backend to show updated data
      await fetchHolidays();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save holiday');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      try {
        // Delete from backend
        await holidayService.delete(id);
        toast.success('Holiday deleted successfully');
        // Refresh from backend
        await fetchHolidays();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete holiday');
      }
    }
  };

  const handleSyncFromPublicApi = async () => {
    try {
      await fetchFromPublicApiAndSync();
      setShowSyncModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync holidays');
    }
  };

  // Handle cutoff date change
  const handleCutoffDateChange = (value: number) => {
    setCutoffDate(value);
    setConfigChanged(true);
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-rose-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <CalendarDays className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Holiday Calendar
                  </h1>
                  <p className="text-rose-100 text-sm mt-1">
                    Manage holidays and working days
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Data Status Badge */}
              <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-100">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3 h-3" />
                  {holidays.length} holidays from DB
                </span>
              </div>
              <button
                onClick={() => fetchHolidays()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2.5 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-200 font-semibold"
                title="Refresh from database"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setShowSyncModal(true)}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-200 font-semibold"
              >
                {syncing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>Import</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-rose-600 rounded-xl hover:bg-rose-50 transition-all duration-200 font-semibold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Add Holiday</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <select
              value={filterYear}
              onChange={(e) => {
                const year = Number(e.target.value);
                setFilterYear(year);
                // Also update calendar view to show that year
                setCurrentDate(new Date(year, currentDate.getMonth(), 1));
              }}
              className="text-xs font-semibold text-gray-500 border-0 bg-transparent focus:ring-0 p-0 pr-6"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Holidays</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg">
              National
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.national}</p>
          <p className="text-sm text-gray-500">National Holidays</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg">
              Religious
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.religious}</p>
          <p className="text-sm text-gray-500">Religious Holidays</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
              Company
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.company}</p>
          <p className="text-sm text-gray-500">Company Holidays</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
              Work Days
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalWorkingDays}</p>
          <p className="text-sm text-gray-500">Total Working Days</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* View Toggle & Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('working-days')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                    viewMode === 'working-days' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Working Days
                </button>
              </div>

              {viewMode === 'calendar' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    Today
                  </button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {viewMode === 'list' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search holidays..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-[200px]"
                  />
                </div>
              )}

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="all">All Types</option>
                <option value="national">National</option>
                <option value="religious">Religious</option>
                <option value="company">Company</option>
                <option value="cuti_bersama">Cuti Bersama</option>
              </select>

              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="all">All Companies</option>
                <option value="global">Global (All)</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-500">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-xs text-gray-600">National</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-xs text-gray-600">Religious</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-xs text-gray-600">Company</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span className="text-xs text-gray-600">Cuti Bersama</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        ) : viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="p-6">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day, idx) => (
                <div
                  key={day}
                  className={`text-center text-xs font-semibold py-2 ${
                    !workingDaysPerWeek.includes(idx) ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {day}
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
                    className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                      !day.isCurrentMonth
                        ? 'bg-gray-50 border-gray-100 text-gray-400'
                        : isToday
                        ? 'bg-rose-50 border-rose-200'
                        : day.holidays.length > 0
                        ? 'bg-amber-50 border-amber-200'
                        : isWeekend
                        ? 'bg-gray-50 border-gray-100'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        isToday ? 'w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center' : ''
                      }`}>
                        {day.date.getDate()}
                      </span>
                      {day.holidays.length > 0 && !isToday && (
                        <span className="text-[10px] font-bold text-amber-600">
                          {day.holidays.length} holiday{day.holidays.length > 1 ? 's' : ''}
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
                          +{day.holidays.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'working-days' ? (
          /* Working Days View */
          <div className="p-6">
            {/* Configuration */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Working Days Configuration</h3>
                </div>
                {configChanged && (
                  <button
                    onClick={saveWorkingDaysConfig}
                    disabled={saving || !selectedCompanyForSettings}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Configuration
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Company Selector for Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company (for Settings)</label>
                  <select
                    value={selectedCompanyForSettings || ''}
                    onChange={(e) => {
                      setSelectedCompanyForSettings(e.target.value ? Number(e.target.value) : null);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Settings will be saved for this company
                  </p>
                </div>

                {/* Working Days Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                  <div className="flex gap-1">
                    {dayNames.map((day, idx) => (
                      <button
                        key={day}
                        onClick={() => toggleWorkingDay(idx)}
                        className={`w-10 h-10 text-xs font-semibold rounded-lg transition ${
                          workingDaysPerWeek.includes(idx)
                            ? 'bg-rose-500 text-white'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Cutoff Date</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={cutoffDate}
                    onChange={(e) => handleCutoffDateChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Period: {cutoffDate + 1} prev month - {cutoffDate} current
                  </p>
                </div>

                {/* Calculation Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Calculation Method</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={usePeriodCalculation}
                        onChange={() => setUsePeriodCalculation(true)}
                        className="w-4 h-4 text-rose-600"
                      />
                      <span className="text-sm text-gray-700">Payroll Period</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!usePeriodCalculation}
                        onChange={() => setUsePeriodCalculation(false)}
                        className="w-4 h-4 text-rose-600"
                      />
                      <span className="text-sm text-gray-700">Calendar Month</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Working Days Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Days</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Working Days</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Holidays</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-green-50">Actual Working Days</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Holiday List</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workingDaysData.map((data, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{MONTHS[idx]}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {usePeriodCalculation
                          ? `${cutoffDate + 1}/${idx === 0 ? 12 : idx} - ${cutoffDate}/${idx + 1}`
                          : `1/${idx + 1} - ${new Date(filterYear, idx + 1, 0).getDate()}/${idx + 1}`
                        }
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{data.total_days}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{data.working_days}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                          data.holiday_count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {data.holiday_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center bg-green-50">
                        <span className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-lg">
                          {data.actual_working_days}
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
                            <span className="text-xs text-gray-500">+{data.holidays.length - 3} more</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-gray-900">Total {filterYear}</td>
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
                        {stats.totalWorkingDays}
                      </span>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="overflow-x-auto">
            {filteredHolidays.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No holidays found</h3>
                <p className="mt-1 text-gray-500 mb-4">
                  {holidays.length === 0
                    ? 'Database is empty. Import holidays from public API or add them manually.'
                    : 'Try adjusting your search or filters'}
                </p>
                {holidays.length === 0 && (
                  <button
                    onClick={() => setShowSyncModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Import Holidays for {filterYear}
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Holiday</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applies To</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recurring</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
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
                            {holiday.company?.name || 'Company'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                            <Sun className="w-3.5 h-3.5" />
                            All Companies
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {holiday.is_recurring ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(holiday)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(holiday.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseModal} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                      </h2>
                      <p className="text-rose-100 text-sm">
                        {editingHoliday ? 'Update holiday details' : 'Create a new holiday'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Holiday Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      placeholder="e.g., Independence Day"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Holiday['type'] }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="national">National Holiday</option>
                      <option value="religious">Religious Holiday</option>
                      <option value="company">Company Holiday</option>
                      <option value="cuti_bersama">Cuti Bersama</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="">All Companies (Global)</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      rows={2}
                      placeholder="Optional description..."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                      className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                    />
                    <label htmlFor="is_recurring" className="text-sm text-gray-700">
                      Recurring every year (same date)
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    {editingHoliday ? 'Update' : 'Add Holiday'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowSyncModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Import Holidays</h2>
                      <p className="text-blue-100 text-sm">Fetch from Public API (manual)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Current Data Status */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Current Data</h3>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p>
                      <strong>{holidays.length}</strong> holidays loaded from database for year <strong>{filterYear}</strong>
                    </p>
                    {syncStatus?.lastSyncTime && (
                      <p className="text-gray-500 mt-1">Last loaded: {syncStatus.lastSyncTime}</p>
                    )}
                  </div>
                </div>

                {/* Import from Public API */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h3 className="font-semibold text-blue-900 mb-2">Import Indonesian Holidays</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Fetch holidays from <code className="bg-blue-100 px-1 rounded">api-harilibur.vercel.app</code> and <strong>save to database</strong>.
                    This is a <strong>manual action</strong> - holidays are not auto-synced.
                  </p>
                  <button
                    onClick={handleSyncFromPublicApi}
                    disabled={syncing}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    Import Holidays for {filterYear}
                  </button>
                </div>

                {/* Manual Entry Info */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <h3 className="font-semibold text-green-900 mb-2">Manual Entry</h3>
                  <p className="text-sm text-green-700 mb-2">
                    You can also add holidays manually using the <strong>Add Holiday</strong> button.
                    Manual entries are saved directly to the database.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h3 className="font-semibold text-amber-900 mb-2">How it works</h3>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Holidays are stored in the database (no auto-sync)</li>
                    <li>• Use "Import" to fetch from public API when needed</li>
                    <li>• Payroll uses database holidays for prorate calculation</li>
                    <li>• Working days = total days - weekends - holidays</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
