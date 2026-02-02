import api from './api';
import type { ApiResponse, PaginatedResponse, LeaveRequest, LeaveBalance, LeaveType, PaginationParams } from '@/types';

interface LeaveListParams extends PaginationParams {
  company_id?: number;
  employee_id?: number;
  status?: string;
  leave_type_id?: number;
  start_date?: string;
  end_date?: string;
}

interface CreateLeaveRequest {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
  work_handover?: string;
  contact_during_leave?: string;
}

export const leaveService = {
  // ==========================================
  // LEAVE TYPE ROUTES
  // ==========================================

  // List leave types
  getTypes: async (): Promise<LeaveType[]> => {
    const response = await api.get<ApiResponse<LeaveType[]>>('/leaves/types');
    return response.data.data;
  },

  // ==========================================
  // SELF-SERVICE ROUTES
  // ==========================================

  // Get my leaves
  getMyLeaves: async (params?: PaginationParams): Promise<PaginatedResponse<LeaveRequest>> => {
    const response = await api.get<PaginatedResponse<LeaveRequest>>('/leaves/me', { params });
    return response.data;
  },

  // Get my leave balances
  getMyBalance: async (): Promise<LeaveBalance[]> => {
    const response = await api.get<ApiResponse<LeaveBalance[]>>('/leaves/me/balances');
    return response.data.data;
  },

  // Create leave request
  create: async (data: CreateLeaveRequest): Promise<LeaveRequest> => {
    const response = await api.post<ApiResponse<LeaveRequest>>('/leaves', data);
    return response.data.data;
  },

  // Cancel own leave request
  cancel: async (id: number): Promise<LeaveRequest> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(`/leaves/${id}/cancel`);
    return response.data.data;
  },

  // ==========================================
  // MANAGER ROUTES
  // ==========================================

  // Get pending approvals (or all team leaves with status filter)
  getPendingApprovals: async (status?: string): Promise<LeaveRequest[]> => {
    const params = status ? { status } : {};
    const response = await api.get<ApiResponse<LeaveRequest[]>>('/leaves/pending-approvals', { params });
    return response.data.data;
  },

  // Get all team leaves
  getTeamLeaves: async (status?: string): Promise<LeaveRequest[]> => {
    const params = status && status !== 'all' ? { status } : {};
    const response = await api.get<ApiResponse<LeaveRequest[]>>('/leaves/pending-approvals', { params });
    return response.data.data;
  },

  // Approve leave request
  approve: async (id: number, comment?: string): Promise<LeaveRequest> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(`/leaves/${id}/approve`, { comment });
    return response.data.data;
  },

  // Reject leave request
  reject: async (id: number, reason: string): Promise<LeaveRequest> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(`/leaves/${id}/reject`, { reason });
    return response.data.data;
  },

  // ==========================================
  // HR ROUTES
  // ==========================================

  // List all leaves
  getAll: async (params?: LeaveListParams): Promise<PaginatedResponse<LeaveRequest>> => {
    const response = await api.get<PaginatedResponse<LeaveRequest>>('/leaves', { params });
    return response.data;
  },

  // Get leave by ID
  getById: async (id: number): Promise<LeaveRequest> => {
    const response = await api.get<ApiResponse<LeaveRequest>>(`/leaves/${id}`);
    return response.data.data;
  },

  // Update leave request
  update: async (id: number, data: Partial<CreateLeaveRequest>): Promise<LeaveRequest> => {
    const response = await api.put<ApiResponse<LeaveRequest>>(`/leaves/${id}`, data);
    return response.data.data;
  },

  // Delete leave (HR only)
  delete: async (id: number): Promise<void> => {
    await api.delete(`/leaves/${id}`);
  },

  // ==========================================
  // LEAVE BALANCE ROUTES
  // ==========================================

  // Get all leave balances (HR/Manager)
  getBalances: async (params?: {
    company_id?: number;
    department_id?: number;
    employee_id?: number;
    year?: number;
    leave_type_id?: number;
  }): Promise<LeaveBalance[]> => {
    const response = await api.get<ApiResponse<LeaveBalance[]>>('/leaves/balances/list', { params });
    return response.data.data || [];
  },

  // Allocate leave to employee
  allocateLeave: async (data: {
    employee_id: number;
    leave_type_id: number;
    year: number;
    allocated_days: number;
    carried_forward_days?: number;
    expires_at?: string;
  }): Promise<LeaveBalance> => {
    const response = await api.post<ApiResponse<LeaveBalance>>('/leaves/balances/allocate', data);
    return response.data.data;
  },

  // Adjust leave balance
  adjustBalance: async (data: {
    employee_id: number;
    leave_type_id: number;
    year: number;
    adjustment_days: number;
    adjustment_reason: string;
  }): Promise<LeaveBalance> => {
    const response = await api.post<ApiResponse<LeaveBalance>>('/leaves/balances/adjust', data);
    return response.data.data;
  },
};
