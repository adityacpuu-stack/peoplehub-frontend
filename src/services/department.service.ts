import api from './api';
import type { ApiResponse, PaginatedResponse, Department, PaginationParams } from '@/types';

interface DepartmentListParams extends PaginationParams {
  company_id?: number;
  parent_id?: number;
  is_active?: boolean;
}

interface CreateDepartmentRequest {
  name: string;
  code?: string;
  description?: string;
  company_id: number;
  parent_id?: number;
  head_id?: number;
}

interface DepartmentHierarchy extends Department {
  children?: DepartmentHierarchy[];
}

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

export const departmentService = {
  // List departments
  getAll: async (params?: DepartmentListParams): Promise<PaginatedResponse<Department>> => {
    const response = await api.get<BackendPaginatedResponse<Department>>('/departments', { params });
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

  // Get departments by company
  getByCompany: async (companyId: number): Promise<Department[]> => {
    const response = await api.get<ApiResponse<Department[]>>(`/departments/company/${companyId}`);
    return response.data.data;
  },

  // Get department hierarchy by company
  getHierarchy: async (companyId: number): Promise<DepartmentHierarchy[]> => {
    const response = await api.get<ApiResponse<DepartmentHierarchy[]>>(`/departments/company/${companyId}/hierarchy`);
    return response.data.data;
  },

  // Get department by ID
  getById: async (id: number): Promise<Department> => {
    const response = await api.get<ApiResponse<Department>>(`/departments/${id}`);
    return response.data.data;
  },

  // Create department
  create: async (data: CreateDepartmentRequest): Promise<Department> => {
    const response = await api.post<ApiResponse<Department>>('/departments', data);
    return response.data.data;
  },

  // Update department
  update: async (id: number, data: Partial<CreateDepartmentRequest>): Promise<Department> => {
    const response = await api.put<ApiResponse<Department>>(`/departments/${id}`, data);
    return response.data.data;
  },

  // Delete department
  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
