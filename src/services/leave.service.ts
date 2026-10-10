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

function leaveBody(data: object, document?: File | null): object | FormData {
  if (!document) return data;
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  form.append('document', document, document.name);
  return form;
}
// Same as the other upload services: a FormData body must not inherit the JSON default.
const leaveConfig = (body: object | FormData) => body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

export const leaveService = {
  // ==========================================
  // LEAVE TYPE ROUTES
  // ==========================================

  // List leave types.
  // The limit is explicit on purpose: the backend defaults to 10
  // (leave.controller.ts), so without it any policy past the tenth simply does
  // not exist as far as the UI is concerned — it vanishes from this page's list,
  // from every request dropdown, and from the CSV export, with no error.
  getTypes: async (): Promise<LeaveType[]> => {
    const response = await api.get<ApiResponse<LeaveType[]>>('/leaves/types', {
      params: { limit: 200 },
    });
    return response.data.data;
  },

  // Lightweight dropdown options ({id, name, code}, no pagination).
  // Prefer this over getTypes() when populating a select.
  getTypeOptions: async (): Promise<Array<{ id: number; name: string; code?: string }>> => {
    // BE has NO /leave-types/options route → it falls through to
    // /leave-types/:id with id="options" → NaN → 500 Prisma error + empty
    // dropdown. Reuse the working /leaves/types list and project to options.
    const response = await api.get<ApiResponse<LeaveType[]>>('/leaves/types', {
      params: { limit: 200 },
    });
    const list = (response.data?.data ?? response.data ?? []) as LeaveType[];
    return list.map((t) => ({ id: t.id, name: t.name, code: t.code }));
  },

  // Create leave type
  createType: async (data: Partial<LeaveType> & { name: string; code: string }): Promise<LeaveType> => {
    const response = await api.post<ApiResponse<LeaveType>>('/leave-types', data);
    return response.data.data;
  },

  // Update leave type
  updateType: async (id: number, data: Partial<LeaveType>): Promise<LeaveType> => {
    const response = await api.put<ApiResponse<LeaveType>>(`/leave-types/${id}`, data);
    return response.data.data;
  },

  // Delete leave type (backend will soft-deactivate if referenced, else hard-delete)
  deleteType: async (id: number): Promise<void> => {
    await api.delete(`/leave-types/${id}`);
  },

  // ==========================================
  // SELF-SERVICE ROUTES
  // ==========================================

  // Active policies for the employee's own company, independent of HR assignments.
  getMyTypes: async (): Promise<LeaveType[]> => {
    const response = await api.get<ApiResponse<LeaveType[]>>('/leaves/me/types');
    return response.data.data;
  },

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

  // Create leave request FOR YOURSELF.
  // The backend deliberately ignores any employee_id in this payload and uses
  // the caller's own employee record, so this can never be used to file on
  // someone else's behalf — use createForEmployee for that.
  // With a supporting document the request and file go in ONE multipart call
  // (`data` = the same JSON body, `document` = the file); otherwise plain JSON.
  create: async (data: CreateLeaveRequest, document?: File | null): Promise<LeaveRequest> => {
    const body = leaveBody(data, document);
    const response = await api.post<ApiResponse<LeaveRequest>>('/leaves', body, leaveConfig(body));
    return response.data.data;
  },

  // Create a leave request ON BEHALF OF an employee (HR Staff or higher).
  // Matters most for maternity and sick leave, where the employee frequently
  // cannot file for themselves.
  createForEmployee: async (
    data: CreateLeaveRequest & { employee_id: number },
    document?: File | null,
  ): Promise<LeaveRequest> => {
    const body = leaveBody(data, document);
    const response = await api.post<ApiResponse<LeaveRequest>>('/leaves/employee', body, leaveConfig(body));
    return response.data.data;
  },

  // Authorized short-lived forced-download link for a leave's supporting document.
  getDocumentDownload: async (id: number): Promise<{ url: string; expires_in: number; file_name: string }> => {
    const response = await api.get<ApiResponse<{ url: string; expires_in: number; file_name: string }>>(`/leaves/${id}/document`);
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

  // Personal approval inbox/history. Server limits rows to assigned employees.
  getMyApprovals: async (): Promise<LeaveRequest[]> => {
    const response = await api.get<ApiResponse<LeaveRequest[]>>('/leaves/my-approvals');
    return response.data.data;
  },

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

  // Approve leave request. Backend expects `approval_notes` (not `comment`).
  approve: async (id: number, approvalNotes?: string): Promise<LeaveRequest> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(`/leaves/${id}/approve`, {
      approval_notes: approvalNotes,
    });
    return response.data.data;
  },

  // Reject leave request. Backend expects `rejection_reason` (not `reason`).
  reject: async (id: number, rejectionReason: string): Promise<LeaveRequest> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(`/leaves/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
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

  // Excel workbook of every matching employee (all pages, all leave types) for one year.
  // Read-only on the server; the caller names and saves the file.
  exportBalances: async (params: LeaveBalanceExportParams): Promise<Blob> => {
    const response = await api.get<Blob>('/leaves/balances/export', { params, responseType: 'blob' });
    return response.data;
  },

  // Use the same insert-only calculator as the nightly allocation job.
  allocateDefaults: async (data: LeaveAllocationRequest): Promise<LeaveAllocationResult> => {
    const response = await api.post<ApiResponse<LeaveAllocationResult>>('/leaves/balances/allocate-defaults', data);
    return response.data.data;
  },

  // Explicit legacy allocation override; default allocation UI uses allocateDefaults.
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

export interface LeaveBalanceExportParams {
  year: number;
  employment_status: 'all' | 'active';
  locale: 'en' | 'id';
  company_id?: number;
  department_id?: number;
  search?: string;
}

export interface LeaveAllocationRequest {
  year?: number;
  dry_run: boolean;
  company_id?: number;
  department_id?: number;
  employee_id?: number;
  leave_type_ids?: number[];
  search?: string;
}

export interface LeaveAllocationResult {
  year: number;
  dryRun: boolean;
  employeesConsidered: number;
  created: number;
  skippedBalanceExists: number;
  skippedHasLeaveHistory: number;
  skippedNotEntitledThisYear: number;
  totalDaysGranted: number;
  leaveTypes: Array<{ id: number; name: string; code: string | null; default_days: number | null }>;
  lines: Array<{
    employee_id: number;
    leave_type_id: number;
    leave_type: string;
    probation_end_date: string;
    days: number;
    outcome: 'created' | 'skipped_balance_exists' | 'skipped_has_leave_history' | 'skipped_not_entitled_this_year';
  }>;
}
