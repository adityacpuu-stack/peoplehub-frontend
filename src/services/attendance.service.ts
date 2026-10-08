import api from './api';
import type { ApiResponse, PaginatedResponse, Attendance, PaginationParams } from '@/types';

interface AttendanceListParams extends PaginationParams {
  company_id?: number;
  employee_id?: number;
  department_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface CheckInRequest {
  latitude?: number;
  longitude?: number;
  notes?: string;
  photo?: string;
  location_accuracy_meters?: number;
}

export interface AttendanceClockSession {
  business_date: string;
  server_time: string;
  attendance: Attendance | null;
  policy: { location_required: boolean; location_enabled: boolean; photo_check_in: boolean; photo_check_out: boolean; track_break: boolean; work_location: string | null };
}

export interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  leave_days: number;
  holiday_days: number;
  wfh_days: number;
  total_hours: number;
  total_overtime_hours: number;
  average_check_in: string | null;
  average_check_out: string | null;
}

export const attendanceService = {
  getMyClock: async (): Promise<AttendanceClockSession> => {
    const response = await api.get<ApiResponse<AttendanceClockSession>>('/attendance/me/clock');
    return response.data.data;
  },
  // ==========================================
  // SELF-SERVICE ROUTES
  // ==========================================

  // Get my today's attendance
  getMyToday: async (): Promise<Attendance | null> => {
    const response = await api.get<ApiResponse<Attendance | null>>('/attendance/me/today');
    return response.data.data;
  },

  // Get my attendance history
  getMyAttendance: async (params?: { start_date?: string; end_date?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Attendance>> => {
    const response = await api.get<PaginatedResponse<Attendance>>('/attendance/me/history', { params });
    return response.data;
  },

  // Get my attendance summary
  getMySummary: async (params: { start_date: string; end_date: string }): Promise<AttendanceSummary> => {
    const response = await api.get<ApiResponse<AttendanceSummary>>('/attendance/me/summary', { params });
    return response.data.data;
  },

  // Check-in
  checkIn: async (data?: CheckInRequest): Promise<Attendance> => {
    const response = await api.post<ApiResponse<Attendance>>('/attendance/check-in', data);
    return response.data.data;
  },

  // Check-out
  checkOut: async (data?: CheckInRequest): Promise<Attendance> => {
    const response = await api.post<ApiResponse<Attendance>>('/attendance/check-out', data);
    return response.data.data;
  },

  // Start break
  startBreak: async (): Promise<Attendance> => {
    const response = await api.post<ApiResponse<Attendance>>('/attendance/break/start');
    return response.data.data;
  },

  // End break
  endBreak: async (): Promise<Attendance> => {
    const response = await api.post<ApiResponse<Attendance>>('/attendance/break/end');
    return response.data.data;
  },

  // ==========================================
  // MANAGER ROUTES
  // ==========================================

  // Get team attendance
  getTeamAttendance: async (params?: { date?: string }): Promise<Attendance[]> => {
    const response = await api.get<ApiResponse<Attendance[]>>('/attendance/team', { params });
    return response.data.data;
  },

  // ==========================================
  // HR ROUTES
  // ==========================================

  // List all attendance records
  getAll: async (params?: AttendanceListParams): Promise<PaginatedResponse<Attendance>> => {
    const response = await api.get<PaginatedResponse<Attendance>>('/attendance', { params });
    return response.data;
  },

  // Get attendance by ID
  getById: async (id: number): Promise<Attendance> => {
    const response = await api.get<ApiResponse<Attendance>>(`/attendance/${id}`);
    return response.data.data;
  },

  // Create manual attendance (HR Staff+)
  create: async (data: {
    employee_id: number;
    date: string;
    check_in?: string;
    check_out?: string;
    status?: string;
    notes?: string;
  }): Promise<Attendance> => {
    const response = await api.post<ApiResponse<Attendance>>('/attendance', data);
    return response.data.data;
  },

  // Update attendance (HR Staff+)
  update: async (id: number, data: Partial<Attendance>): Promise<Attendance> => {
    const response = await api.put<ApiResponse<Attendance>>(`/attendance/${id}`, data);
    return response.data.data;
  },

  // Delete attendance (HR Staff+)
  delete: async (id: number): Promise<void> => {
    await api.delete(`/attendance/${id}`);
  },
};
