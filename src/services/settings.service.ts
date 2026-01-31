import api from './api';
import type { ApiResponse } from '@/types';

// Company Settings (General)
export interface CompanySettings {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  timezone: string | null;
  date_format: string | null;
  currency: string | null;
  language: string | null;
}

// Attendance Settings
export interface AttendanceSettings {
  id?: number;
  company_id: number;
  work_start_time: string | null;
  work_end_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  working_hours_per_day: number | null;
  working_days_per_week: number | null;
  working_days: string[] | null;
  check_in_tolerance_minutes: number | null;
  check_out_tolerance_minutes: number | null;
  require_check_out: boolean | null;
  allow_remote_check_in: boolean | null;
  max_remote_distance_km: number | null;
  late_threshold_minutes: number | null;
  late_affects_salary: boolean | null;
  late_deduction_per_minute: number | null;
  late_deduction_percentage: number | null;
  max_late_minutes_per_month: number | null;
  accumulate_late_minutes: boolean | null;
  absent_affects_salary: boolean | null;
  absent_deduction_per_day: number | null;
  absent_deduction_percentage: number | null;
  allow_half_day_absent: boolean | null;
  half_day_threshold_hours: number | null;
}

// Payroll Settings
export interface PayrollSettings {
  id?: number;
  company_id: number;
  // BPJS Kesehatan
  bpjs_kes_employee_rate: number | null;
  bpjs_kes_company_rate: number | null;
  bpjs_kes_max_salary: number | null;
  // BPJS Ketenagakerjaan
  bpjs_jht_employee_rate: number | null;
  bpjs_jht_company_rate: number | null;
  bpjs_jp_employee_rate: number | null;
  bpjs_jp_company_rate: number | null;
  bpjs_jp_max_salary: number | null;
  bpjs_jkk_rate: number | null;
  bpjs_jkm_rate: number | null;
  // Tax Settings
  use_ter_method: boolean | null;
  position_cost_rate: number | null;
  position_cost_max: number | null;
  // Overtime
  overtime_rate_weekday: number | null;
  overtime_rate_weekend: number | null;
  overtime_rate_holiday: number | null;
  overtime_base: string | null;
  // Payroll Schedule
  payroll_cutoff_date: number | null;
  payroll_payment_date: number | null;
  payroll_period_type: string | null;
}

// User Notification Preferences (personal settings)
export interface NotificationPreferences {
  email_attendance_reminder: boolean;
  email_leave_request: boolean;
  email_leave_approval: boolean;
  email_payslip: boolean;
  email_birthday: boolean;
  email_contract_expiry: boolean;
  whatsapp_enabled: boolean;
  whatsapp_attendance: boolean;
  whatsapp_approval: boolean;
}

export const settingsService = {
  // ==========================================
  // COMPANY SETTINGS (GENERAL)
  // ==========================================

  // Get company settings
  getCompanySettings: async (companyId: number): Promise<CompanySettings> => {
    const response = await api.get<ApiResponse<CompanySettings>>(`/companies/${companyId}/settings`);
    return response.data.data;
  },

  // Update company settings
  updateCompanySettings: async (companyId: number, data: Partial<CompanySettings>): Promise<CompanySettings> => {
    const response = await api.put<ApiResponse<CompanySettings>>(`/companies/${companyId}/settings`, data);
    return response.data.data;
  },

  // ==========================================
  // ATTENDANCE SETTINGS
  // ==========================================

  // Get attendance settings
  getAttendanceSettings: async (companyId: number): Promise<AttendanceSettings> => {
    const response = await api.get<ApiResponse<AttendanceSettings>>(`/attendance-settings/company/${companyId}/init`);
    return response.data.data;
  },

  // Update attendance settings
  updateAttendanceSettings: async (companyId: number, data: Partial<AttendanceSettings>): Promise<AttendanceSettings> => {
    const response = await api.patch<ApiResponse<AttendanceSettings>>(`/attendance-settings/company/${companyId}`, data);
    return response.data.data;
  },

  // ==========================================
  // PAYROLL SETTINGS
  // ==========================================

  // Get payroll settings
  getPayrollSettings: async (companyId: number): Promise<PayrollSettings> => {
    const response = await api.get<ApiResponse<PayrollSettings>>(`/payroll-settings/company/${companyId}/init`);
    return response.data.data;
  },

  // Update payroll settings
  updatePayrollSettings: async (companyId: number, data: Partial<PayrollSettings>): Promise<PayrollSettings> => {
    const response = await api.patch<ApiResponse<PayrollSettings>>(`/payroll-settings/company/${companyId}`, data);
    return response.data.data;
  },

  // ==========================================
  // USER NOTIFICATION PREFERENCES
  // ==========================================

  // Get user notification preferences
  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    try {
      const response = await api.get<ApiResponse<NotificationPreferences>>('/users/me/preferences');
      return response.data.data;
    } catch {
      // Return defaults if endpoint not found
      return {
        email_attendance_reminder: true,
        email_leave_request: true,
        email_leave_approval: true,
        email_payslip: true,
        email_birthday: true,
        email_contract_expiry: true,
        whatsapp_enabled: false,
        whatsapp_attendance: false,
        whatsapp_approval: false,
      };
    }
  },

  // Update user notification preferences
  updateNotificationPreferences: async (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await api.put<ApiResponse<NotificationPreferences>>('/users/me/preferences', data);
    return response.data.data;
  },

  // ==========================================
  // COMBINED SETTINGS
  // ==========================================

  // Get all settings for a company (for admin/HR views)
  getAllSettings: async (companyId: number): Promise<{
    company: CompanySettings;
    attendance: AttendanceSettings;
    payroll: PayrollSettings;
  }> => {
    const [company, attendance, payroll] = await Promise.all([
      settingsService.getCompanySettings(companyId),
      settingsService.getAttendanceSettings(companyId),
      settingsService.getPayrollSettings(companyId),
    ]);
    return { company, attendance, payroll };
  },
};
