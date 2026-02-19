import api from './api';

export interface WorkLocation {
  id: number;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  radius_meters?: number;
  enable_attendance?: boolean;
  enable_shift_system?: boolean;
  shift_schedules?: unknown;
  require_location_verification?: boolean;
  require_photo?: boolean;
  strict_location_check?: boolean;
  location_check_interval_minutes?: number;
  work_start_time?: string;
  work_end_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  late_tolerance_minutes?: number;
  is_active?: boolean;
  company_id: number;
  created_by?: number;
  settings?: unknown;
  created_at?: string;
  updated_at?: string;
  company?: { id: number; name: string; code?: string };
  _count?: { employees: number; attendances: number };
}

export interface CreateWorkLocationRequest {
  name: string;
  code?: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  enable_attendance?: boolean;
  enable_shift_system?: boolean;
  require_location_verification?: boolean;
  require_photo?: boolean;
  strict_location_check?: boolean;
  work_start_time?: string;
  work_end_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  late_tolerance_minutes?: number;
  is_active?: boolean;
  company_id: number;
}

interface BackendPaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface WorkLocationListParams {
  page?: number;
  limit?: number;
  company_id?: number;
  is_active?: boolean;
}

export const workLocationService = {
  getAll: async (params?: WorkLocationListParams): Promise<{ data: WorkLocation[]; total: number }> => {
    const response = await api.get<BackendPaginatedResponse<WorkLocation>>('/work-locations', { params });
    return {
      data: response.data.data,
      total: response.data.pagination?.total || response.data.data.length,
    };
  },

  getByCompany: async (companyId: number): Promise<WorkLocation[]> => {
    const response = await api.get<BackendPaginatedResponse<WorkLocation>>('/work-locations', {
      params: { company_id: companyId, limit: 1000 },
    });
    return response.data.data;
  },

  getById: async (id: number): Promise<WorkLocation> => {
    const response = await api.get<WorkLocation>(`/work-locations/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkLocationRequest): Promise<WorkLocation> => {
    const response = await api.post<WorkLocation>('/work-locations', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateWorkLocationRequest>): Promise<WorkLocation> => {
    const response = await api.put<WorkLocation>(`/work-locations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/work-locations/${id}`);
  },
};
