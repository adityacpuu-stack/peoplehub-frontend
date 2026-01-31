import api from './api';
import type { ApiResponse, PaginatedResponse } from '@/types';

export interface CompanyAssignment {
  id: number;
  employee_id: number;
  company_id: number;
  status: string;
  permissions: Record<string, boolean> | null;
  notes: string | null;
  assigned_by: number | null;
  assigned_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  employee: {
    id: number;
    employee_id: string;
    name: string;
    email: string;
    position: { id: number; name: string } | null;
    department: { id: number; name: string } | null;
  };
  company: {
    id: number;
    name: string;
    code: string;
    company_type: string;
  };
  assigner: {
    id: number;
    name: string;
  } | null;
}

export interface AvailableEmployee {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  position: { id: number; name: string } | null;
  department: { id: number; name: string } | null;
  company: { id: number; name: string } | null;
}

export interface CreateAssignmentDTO {
  employee_id: number;
  company_id: number;
  permissions?: Record<string, boolean>;
  notes?: string;
  expires_at?: string;
}

export interface BulkAssignDTO {
  employee_id: number;
  company_ids: number[];
  permissions?: Record<string, boolean>;
  notes?: string;
  expires_at?: string;
}

export interface UpdateAssignmentDTO {
  status?: string;
  permissions?: Record<string, boolean>;
  notes?: string;
  expires_at?: string | null;
}

interface ListParams {
  page?: number;
  limit?: number;
  employee_id?: number;
  company_id?: number;
  status?: string;
  search?: string;
}

export const companyAssignmentService = {
  // List all assignments
  getAll: async (params?: ListParams): Promise<PaginatedResponse<CompanyAssignment>> => {
    const response = await api.get<PaginatedResponse<CompanyAssignment>>('/company-assignments', { params });
    return response.data;
  },

  // Get assignment by ID
  getById: async (id: number): Promise<CompanyAssignment> => {
    const response = await api.get<ApiResponse<CompanyAssignment>>(`/company-assignments/${id}`);
    return response.data.data;
  },

  // Get assignments by employee ID
  getByEmployeeId: async (employeeId: number): Promise<CompanyAssignment[]> => {
    const response = await api.get<ApiResponse<CompanyAssignment[]>>(`/company-assignments/employee/${employeeId}`);
    return response.data.data;
  },

  // Get my assignments
  getMyAssignments: async (): Promise<CompanyAssignment[]> => {
    const response = await api.get<ApiResponse<CompanyAssignment[]>>('/company-assignments/me');
    return response.data.data;
  },

  // Get available employees for a company
  getAvailableEmployees: async (companyId: number): Promise<AvailableEmployee[]> => {
    const response = await api.get<ApiResponse<AvailableEmployee[]>>(`/company-assignments/available-employees/${companyId}`);
    return response.data.data;
  },

  // Create new assignment
  create: async (data: CreateAssignmentDTO): Promise<CompanyAssignment> => {
    const response = await api.post<ApiResponse<CompanyAssignment>>('/company-assignments', data);
    return response.data.data;
  },

  // Bulk assign companies
  bulkAssign: async (data: BulkAssignDTO): Promise<{ created: number; skipped: number; assignments: CompanyAssignment[] }> => {
    const response = await api.post<ApiResponse<{ created: number; skipped: number; assignments: CompanyAssignment[] }>>('/company-assignments/bulk', data);
    return response.data.data;
  },

  // Update assignment
  update: async (id: number, data: UpdateAssignmentDTO): Promise<CompanyAssignment> => {
    const response = await api.put<ApiResponse<CompanyAssignment>>(`/company-assignments/${id}`, data);
    return response.data.data;
  },

  // Delete assignment
  delete: async (id: number): Promise<void> => {
    await api.delete(`/company-assignments/${id}`);
  },
};
