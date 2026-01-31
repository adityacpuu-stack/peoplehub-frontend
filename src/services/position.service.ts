import api from './api';
import type { ApiResponse, PaginatedResponse, Position, PaginationParams } from '@/types';

interface PositionListParams extends PaginationParams {
  company_id?: number;
  department_id?: number;
  status?: string;
  search?: string;
}

interface CreatePositionRequest {
  name: string;
  code?: string;
  description?: string;
  company_id: number;
  department_id?: number;
  level?: number;
  min_salary?: number;
  max_salary?: number;
  status?: string;
}

// Level mapping (matches backend)
export const POSITION_LEVELS: Record<number, string> = {
  1: 'Entry',
  2: 'Junior',
  3: 'Mid',
  4: 'Senior',
  5: 'Lead',
  6: 'Manager',
  7: 'Director',
};

export const getLevelName = (level: number | null): string => {
  if (!level) return '-';
  return POSITION_LEVELS[level] || '-';
};

// Backend response uses 'meta' for pagination
interface BackendPaginatedResponse<T> {
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const positionService = {
  // List positions
  getAll: async (params?: PositionListParams): Promise<PaginatedResponse<Position>> => {
    const response = await api.get<BackendPaginatedResponse<Position>>('/positions', { params });
    // Transform backend response to frontend format
    return {
      success: true,
      data: response.data.data,
      pagination: {
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        total: response.data.meta.total,
        totalPages: response.data.meta.totalPages,
      },
    };
  },

  // Get positions by company
  getByCompany: async (companyId: number): Promise<Position[]> => {
    const response = await api.get<ApiResponse<Position[]>>(`/positions/company/${companyId}`);
    return response.data.data;
  },

  // Get position by ID
  getById: async (id: number): Promise<Position> => {
    const response = await api.get<ApiResponse<Position>>(`/positions/${id}`);
    return response.data.data;
  },

  // Create position
  create: async (data: CreatePositionRequest): Promise<Position> => {
    const response = await api.post<ApiResponse<Position>>('/positions', data);
    return response.data.data;
  },

  // Update position
  update: async (id: number, data: Partial<CreatePositionRequest>): Promise<Position> => {
    const response = await api.put<ApiResponse<Position>>(`/positions/${id}`, data);
    return response.data.data;
  },

  // Delete position
  delete: async (id: number): Promise<void> => {
    await api.delete(`/positions/${id}`);
  },
};
