import api from './api';

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: 'national' | 'company' | 'religious' | 'cuti_bersama';
  company_id: number | null;
  description?: string;
  is_recurring: boolean;
  source: 'manual' | 'api' | 'import';
  is_active: boolean;
  created_at: string;
  company?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface HolidayListQuery {
  page?: number;
  limit?: number;
  company_id?: number;
  year?: number;
  month?: number;
  type?: string;
  is_active?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateHolidayDTO {
  name: string;
  date: string;
  type: string;
  company_id?: number | null;
  description?: string;
  is_recurring?: boolean;
}

export interface UpdateHolidayDTO {
  name?: string;
  date?: string;
  type?: string;
  description?: string;
  is_recurring?: boolean;
  is_active?: boolean;
}

export interface WorkingDaysConfig {
  year: number;
  month: number;
  total_days: number;        // Total calendar days
  working_days: number;      // Working days (excluding weekends)
  holiday_count: number;     // Number of holidays
  actual_working_days: number; // Working days - holidays
  holidays: Holiday[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// External Holiday API (same as Laravel uses)
const HOLIDAY_API_BASE = 'https://api-harilibur.vercel.app/api';

// Backend API base (from axios instance)
class HolidayService {
  // ==========================================
  // BACKEND API CALLS
  // ==========================================

  /**
   * Sync holidays to backend database
   * This ensures holidays are available for payroll calculations
   */
  async syncToBackend(holidays: CreateHolidayDTO[], company_id?: number): Promise<{
    success: boolean;
    created: number;
    skipped: number;
    errors: string[];
  }> {
    const response = await api.post('/holidays/bulk', { holidays, company_id });
    const errors = (response.data.errorDetails ?? []).map((item: { error: string }) => item.error);
    return { success: response.data.errors === 0, created: response.data.created ?? 0, skipped: response.data.skipped ?? 0, errors };
  }

  /**
   * Fetch holidays from public API and sync to backend
   * Returns both the holidays and sync status
   */
  async fetchAndSyncHolidays(year: number, company_id?: number): Promise<{
    holidays: CreateHolidayDTO[];
    synced: boolean;
    syncResult?: { created: number; skipped: number; errors: string[] };
  }> {
    // 1. Fetch from public API
    const holidays = await this.fetchPublicHolidaysIndonesia(year);

    // 2. Try to sync to backend
    const syncResult = await this.syncToBackend(holidays, company_id);

    return {
      holidays,
      synced: syncResult.success,
      syncResult: {
        created: syncResult.created,
        skipped: syncResult.skipped,
        errors: syncResult.errors,
      },
    };
  }

  /**
   * Get holidays from backend database
   * Used to verify what's actually stored for payroll calculations
   * Uses the authenticated API client and propagates failures to the page.
   */
  async getFromBackend(year: number, company_id?: number): Promise<Holiday[]> {
    const response = await api.get('/holidays/calendar', { params: { year, company_id } });
    if (!Array.isArray(response.data.holidays)) throw new Error('Respons kalender tidak valid');
    return response.data.holidays.map((holiday: Holiday) => ({ ...holiday, date: holiday.date.split('T')[0] }));
  }

  async list(query: HolidayListQuery = {}): Promise<PaginatedResponse<Holiday>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/holidays?${params.toString()}`);
    return response.data;
  }

  async getById(id: number): Promise<Holiday> {
    const response = await api.get(`/holidays/${id}`);
    return response.data;
  }

  async create(data: CreateHolidayDTO): Promise<Holiday> {
    const response = await api.post('/holidays', data);
    return response.data;
  }

  async update(id: number, data: UpdateHolidayDTO): Promise<Holiday> {
    const response = await api.put(`/holidays/${id}`, data);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`/holidays/${id}`);
  }

  async bulkCreate(holidays: CreateHolidayDTO[], company_id?: number): Promise<{ created: number; errors: string[] }> {
    const response = await api.post('/holidays/bulk', { holidays, company_id });
    return response.data;
  }

  async seedNationalHolidays(year: number): Promise<{ created: number }> {
    const response = await api.post(`/holidays/seed/${year}`);
    return response.data;
  }

  async getCalendar(year: number, month?: number, company_id?: number): Promise<Holiday[]> {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.append('month', String(month));
    if (company_id) params.append('company_id', String(company_id));

    const response = await api.get(`/holidays/calendar?${params.toString()}`);
    return response.data;
  }

  async getUpcoming(days: number = 30, company_id?: number): Promise<Holiday[]> {
    const params = new URLSearchParams({ days: String(days) });
    if (company_id) params.append('company_id', String(company_id));

    const response = await api.get(`/holidays/upcoming?${params.toString()}`);
    return response.data;
  }

  // ==========================================
  // WORKING DAYS CALCULATION
  // ==========================================

  /**
   * Format date to YYYY-MM-DD string in local timezone
   * This avoids timezone issues with toISOString()
   */
  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Normalize holiday date to YYYY-MM-DD format
   */
  private normalizeHolidayDate(dateStr: string): string {
    // Handle various date formats
    if (dateStr.includes('T')) {
      // ISO format: "2026-01-20T00:00:00.000Z" -> "2026-01-20"
      return dateStr.split('T')[0];
    }
    return dateStr;
  }

  /**
   * Calculate working days for a given month
   * Considers weekends (Sat, Sun) and holidays
   */
  calculateWorkingDays(
    year: number,
    month: number,
    holidays: Holiday[],
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5] // Mon-Fri by default (0=Sun, 1=Mon, etc.)
  ): WorkingDaysConfig {
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();

    // Get holidays for this month - normalize dates for comparison
    const monthHolidays = holidays.filter(h => {
      const normalizedDate = this.normalizeHolidayDate(h.date);
      const [hYear, hMonth] = normalizedDate.split('-').map(Number);
      return hYear === year && hMonth === month && h.is_active;
    });

    // Create a set of normalized holiday dates for quick lookup
    const holidayDates = new Set(monthHolidays.map(h => this.normalizeHolidayDate(h.date)));

    let workingDays = 0;
    let actualWorkingDays = 0;

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = this.formatDateLocal(date);

      // Check if it's a working day (based on workingDaysPerWeek)
      if (workingDaysPerWeek.includes(dayOfWeek)) {
        workingDays++;

        // Check if it's not a holiday
        if (!holidayDates.has(dateStr)) {
          actualWorkingDays++;
        }
      }
    }

    return {
      year,
      month,
      total_days: totalDays,
      working_days: workingDays,
      holiday_count: workingDays - actualWorkingDays,
      actual_working_days: actualWorkingDays,
      holidays: monthHolidays,
    };
  }

  /**
   * Calculate working days for payroll period (using cutoff dates)
   * e.g., cutoff 20 means period is 21st prev month to 20th current month
   */
  calculatePayrollPeriodWorkingDays(
    year: number,
    month: number,
    holidays: Holiday[],
    cutoffDate: number = 20,
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5]
  ): WorkingDaysConfig {
    // Period start: (cutoff + 1) of previous month
    // Period end: cutoff of current month
    const startDate = new Date(year, month - 2, cutoffDate + 1);
    const endDate = new Date(year, month - 1, cutoffDate);

    const startDateStr = this.formatDateLocal(startDate);
    const endDateStr = this.formatDateLocal(endDate);

    // Get holidays in this period - compare normalized date strings
    const periodHolidays = holidays.filter(h => {
      const normalizedDate = this.normalizeHolidayDate(h.date);
      return normalizedDate >= startDateStr &&
             normalizedDate <= endDateStr &&
             h.is_active;
    });

    // Create a set of normalized holiday dates for quick lookup
    const holidayDates = new Set(periodHolidays.map(h => this.normalizeHolidayDate(h.date)));

    let totalDays = 0;
    let workingDays = 0;
    let actualWorkingDays = 0;

    const current = new Date(startDate);
    while (current <= endDate) {
      totalDays++;
      const dayOfWeek = current.getDay();
      const dateStr = this.formatDateLocal(current);

      if (workingDaysPerWeek.includes(dayOfWeek)) {
        workingDays++;
        if (!holidayDates.has(dateStr)) {
          actualWorkingDays++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return {
      year,
      month,
      total_days: totalDays,
      working_days: workingDays,
      holiday_count: workingDays - actualWorkingDays,
      actual_working_days: actualWorkingDays,
      holidays: periodHolidays,
    };
  }


  // ==========================================
  // PUBLIC HOLIDAY API (api-harilibur.vercel.app)
  // Same API that Laravel HRIS uses
  // ==========================================

  /**
   * Fetch Indonesian public holidays from api-harilibur.vercel.app
   * This is the same API that Laravel HRIS uses
   */
  async fetchPublicHolidaysIndonesia(year: number): Promise<CreateHolidayDTO[]> {
    const response = await fetch(`${HOLIDAY_API_BASE}?year=${year}`);
    if (!response.ok) throw new Error('Sumber hari libur tidak tersedia. Belum ada data yang diimpor.');
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Respons sumber hari libur tidak valid');
    return data.filter(h => h.is_national_holiday === true).map(h => {
      if (typeof h.holiday_name !== 'string' || typeof h.holiday_date !== 'string') throw new Error('Data hari libur tidak valid');
      const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(h.holiday_date);
      if (!match) throw new Error('Tanggal hari libur tidak valid');
      const [, y, m, d] = match;
      const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (Number(y) !== year || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Tanggal hari libur tidak valid');
      return { name: h.holiday_name, date, type: this.detectHolidayType(h.holiday_name), is_recurring: false };
    });
  }

  /**
   * Detect holiday type based on name (same logic as Laravel)
   */
  private detectHolidayType(name: string): string {
    const lowercaseName = name.toLowerCase();

    if (lowercaseName.includes('cuti bersama')) {
      return 'cuti_bersama';
    }

    if (
      lowercaseName.includes('idul') ||
      lowercaseName.includes('natal') ||
      lowercaseName.includes('waisak') ||
      lowercaseName.includes('nyepi') ||
      lowercaseName.includes('imlek') ||
      lowercaseName.includes('maulid') ||
      lowercaseName.includes('isra') ||
      lowercaseName.includes('wafat') ||
      lowercaseName.includes('kenaikan')
    ) {
      return 'religious';
    }

    return 'national';
  }

}

export const holidayService = new HolidayService();
