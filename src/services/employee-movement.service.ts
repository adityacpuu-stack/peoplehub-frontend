import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

export interface EmployeeMovement {
  id: number;
  employee_id: number;
  company_id: number;
  movement_type: string;
  effective_date: string;
  // Previous state
  previous_position_id?: number;
  previous_position_name?: string;
  previous_department_id?: number;
  previous_department_name?: string;
  previous_company_id?: number;
  previous_company_name?: string;
  previous_salary?: number;
  previous_grade?: string;
  previous_status?: string;
  // New state
  new_position_id?: number;
  new_position_name?: string;
  new_department_id?: number;
  new_department_name?: string;
  new_company_id?: number;
  new_company_name?: string;
  new_salary?: number;
  new_grade?: string;
  new_status?: string;
  // Details
  salary_change?: number;
  salary_change_percentage?: number;
  reason?: string;
  attachment?: string;
  notes?: string;
  // Approval
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'applied';
  requested_by?: number;
  requested_at?: string;
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  approval_notes?: string;
  rejection_reason?: string;
  // Application
  is_applied: boolean;
  applied_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  employee?: {
    id: number;
    employee_id: string;
    name: string;
    basic_salary?: number;
    department?: { id: number; name: string };
    position?: { id: number; name: string };
    company?: { id: number; name: string };
  };
  requester?: { id: number; name: string };
  approver?: { id: number; name: string };
}

export interface EmployeeMovementListParams extends PaginationParams {
  company_id?: number;
  employee_id?: number;
  movement_type?: string;
  status?: string;
  effective_from?: string;
  effective_to?: string;
  is_applied?: boolean;
  search?: string;
}

export interface CreateEmployeeMovementRequest {
  employee_id: number;
  company_id?: number;
  movement_type: string;
  effective_date: string;
  new_position_id?: number;
  new_department_id?: number;
  new_company_id?: number;
  new_salary?: number;
  new_grade?: string;
  new_status?: string;
  reason?: string;
  attachment?: string;
  notes?: string;
}

interface BackendPaginatedResponse<T> {
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface MovementStatistics {
  total_movements: number;
  avg_salary_change_percentage: number | null;
  by_type: { type: string; count: number }[];
  by_status: { status: string; count: number }[];
}

export const employeeMovementService = {
  // List all movements
  getAll: async (params?: EmployeeMovementListParams): Promise<PaginatedResponse<EmployeeMovement>> => {
    const response = await api.get<BackendPaginatedResponse<EmployeeMovement>>('/employee-movements', { params });
    return {
      success: true,
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Get by ID
  getById: async (id: number): Promise<EmployeeMovement> => {
    const response = await api.get<ApiResponse<EmployeeMovement>>(`/employee-movements/${id}`);
    return response.data.data;
  },

  // Get by employee
  getByEmployeeId: async (employeeId: number, params?: { status?: string }): Promise<EmployeeMovement[]> => {
    const response = await api.get<ApiResponse<EmployeeMovement[]>>(`/employee-movements/employee/${employeeId}`, { params });
    return response.data.data;
  },

  // Get pending approvals
  getPendingApprovals: async (companyId?: number): Promise<EmployeeMovement[]> => {
    const response = await api.get<ApiResponse<EmployeeMovement[]>>('/employee-movements/pending', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data.data;
  },

  // Get approved movements ready to apply
  getReadyToApply: async (companyId?: number): Promise<EmployeeMovement[]> => {
    const response = await api.get<ApiResponse<EmployeeMovement[]>>('/employee-movements/ready-to-apply', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data.data;
  },

  // Get statistics
  getStatistics: async (companyId?: number): Promise<MovementStatistics> => {
    const response = await api.get<ApiResponse<MovementStatistics>>('/employee-movements/statistics', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data.data;
  },

  // Create movement
  create: async (data: CreateEmployeeMovementRequest): Promise<EmployeeMovement> => {
    const response = await api.post<ApiResponse<EmployeeMovement>>('/employee-movements', data);
    return response.data.data;
  },

  // Update movement
  update: async (id: number, data: Partial<CreateEmployeeMovementRequest>): Promise<EmployeeMovement> => {
    const response = await api.put<ApiResponse<EmployeeMovement>>(`/employee-movements/${id}`, data);
    return response.data.data;
  },

  // Delete movement
  delete: async (id: number): Promise<void> => {
    await api.delete(`/employee-movements/${id}`);
  },

  // Approve movement
  approve: async (id: number, notes?: string): Promise<EmployeeMovement> => {
    const response = await api.post<ApiResponse<EmployeeMovement>>(`/employee-movements/${id}/approve`, {
      approval_notes: notes,
    });
    return response.data.data;
  },

  // Reject movement
  reject: async (id: number, reason: string): Promise<EmployeeMovement> => {
    const response = await api.post<ApiResponse<EmployeeMovement>>(`/employee-movements/${id}/reject`, {
      rejection_reason: reason,
    });
    return response.data.data;
  },

  // Apply movement (update employee data)
  apply: async (id: number): Promise<EmployeeMovement> => {
    const response = await api.post<ApiResponse<EmployeeMovement>>(`/employee-movements/${id}/apply`);
    return response.data.data;
  },
};
