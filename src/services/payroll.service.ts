import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types';

// ==========================================
// TYPES
// ==========================================

export const PAYROLL_STATUS = {
  DRAFT: 'draft',
  PROCESSING: 'processing',
  VALIDATED: 'validated',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export type PayrollStatus = typeof PAYROLL_STATUS[keyof typeof PAYROLL_STATUS];

export interface PayrollEmployee {
  id: number;
  name: string;
  employee_id: string;
  employment_type?: string;
  department?: { id: number; name: string };
  position?: { id: number; name: string };
}

export interface Payroll {
  id: number;
  employee_id: number;
  company_id?: number;
  payroll_number: string;
  period: string;
  period_start?: string;
  period_end?: string;
  pay_type: 'gross' | 'net' | 'gross_up';
  basic_salary: number;
  gross_salary: number;
  // Allowances
  transport_allowance?: number;
  meal_allowance?: number;
  position_allowance?: number;
  other_allowances?: number;
  allowances_detail?: Record<string, any>;
  // Overtime
  overtime_hours?: number;
  overtime_rate?: number;
  overtime_pay?: number;
  // Bonus & incentives
  bonus?: number;
  thr?: number;
  incentive?: number;
  commission?: number;
  back_pay?: number;
  // Deductions
  total_deductions: number;
  loan_deduction?: number;
  absence_deduction?: number;
  late_deduction?: number;
  other_deductions?: number;
  deductions_detail?: Record<string, any>;
  // Tax & Gross Up Calculation
  taxable_income?: number;
  pph21: number;
  pph21_paid_by_company?: boolean;
  ter_rate?: number;
  ter_rate_initial?: number;      // TER rate sebelum gross up iteration
  ter_category?: string;
  ptkp_status?: string;
  ptkp_amount?: number;
  // Gross Up values (for NET/NETT pay type)
  gross_up_initial?: number;      // Gross up step 1
  final_gross_up?: number;        // Gross up step 2 (final)
  total_gross?: number;           // Total gross (basic + allowances + overtime)
  bpjs_object_pph21?: number;     // BPJS yang jadi objek PPh21
  thp?: number;                   // Take Home Pay (target for NET)
  total_cost_company?: number;    // Total biaya perusahaan
  // BPJS Employee
  bpjs_kes_employee?: number;
  bpjs_jht_employee?: number;
  bpjs_jp_employee?: number;
  bpjs_employee_total?: number;
  // BPJS Company
  bpjs_kes_company?: number;
  bpjs_jht_company?: number;
  bpjs_jp_company?: number;
  bpjs_jkk_company?: number;
  bpjs_jkm_company?: number;
  bpjs_company_total?: number;
  // Results
  net_salary: number;
  take_home_pay?: number;
  total_cost_to_company?: number;
  // Attendance
  working_days?: number;
  actual_working_days?: number;
  absent_days?: number;
  late_days?: number;
  leave_days?: number;
  // Prorate
  is_prorated?: boolean;
  prorate_factor?: number;
  prorate_reason?: string;
  // Status & workflow
  status: PayrollStatus;
  validated_by?: number;
  validated_at?: string;
  submitted_by?: number;
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  paid_by?: number;
  paid_at?: string;
  payment_reference?: string;
  payment_method?: string;
  // Notes
  notes?: string;
  hr_notes?: string;
  // Relations
  employee: PayrollEmployee;
  details?: PayrollDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface PayrollDetail {
  id: number;
  component_type: string;
  component_name: string;
  component_code?: string;
  description?: string;
  amount: number;
  is_taxable?: boolean;
  is_bpjs_object?: boolean;
  calculation_base?: string;
  calculation_value?: number;
  sort_order?: number;
}

export interface PayrollSummary {
  total_employees: number;
  pending_count: number;
  processing_count: number;
  validated_count: number;
  approved_count: number;
  paid_count: number;
  total_gross: number;
  total_net: number;
  total_tax: number;
  total_bpjs_employee: number;
  total_bpjs_company: number;
}

export interface BPJSCalculation {
  bpjs_kes_employee: number;
  bpjs_jht_employee: number;
  bpjs_jp_employee: number;
  bpjs_employee_total: number;
  bpjs_kes_company: number;
  bpjs_jht_company: number;
  bpjs_jp_company: number;
  bpjs_jkk_company: number;
  bpjs_jkm_company: number;
  bpjs_company_total: number;
}

export interface TaxCalculation {
  taxable_income: number;
  pph21: number;
  pph21_paid_by_company: boolean;
  ter_rate?: number;
  ter_category?: string;
  ptkp_status?: string;
  ptkp_amount?: number;
}

export interface ProrateCalculation {
  is_prorated: boolean;
  prorate_factor: number;
  actual_days: number;
  total_days: number;
  prorate_reason?: string;
  unpaid_leave_days: number;
}

export interface DeductionDetail {
  type: string;
  description: string;
  amount: number;
  reference_id?: number;
}

export interface DeductionCalculation {
  absence_deduction: number;
  late_deduction: number;
  loan_deduction: number;
  advance_deduction: number;
  leave_deduction: number;
  penalty_deduction: number;
  other_deductions: number;
  total_deductions: number;
  deduction_details: DeductionDetail[];
}

export interface PayrollCalculationResult {
  basic_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  take_home_pay: number;
  total_cost_to_company: number;
  bpjs: BPJSCalculation;
  tax: TaxCalculation;
  prorate?: ProrateCalculation;
  deductions?: DeductionCalculation;
}

// ==========================================
// QUERY PARAMS
// ==========================================

export interface PayrollListParams {
  page?: number;
  limit?: number;
  search?: string;
  company_id?: number;
  employee_id?: number;
  department_id?: number;
  period?: string;
  status?: PayrollStatus;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ==========================================
// REQUEST DTOs
// ==========================================

export interface GeneratePayrollRequest {
  company_id: number;
  period: string; // YYYY-MM format
  employee_ids?: number[];
}

export interface CalculatePayrollRequest {
  employee_id: number;
  period: string;
  pay_type?: 'gross' | 'net' | 'gross_up';
  basic_salary?: number;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
  overtime_hours?: number;
  working_days?: number;
  actual_working_days?: number;
  absent_days?: number;
  late_days?: number;
  leave_days?: number;
}

export interface UpdatePayrollRequest {
  basic_salary?: number;
  transport_allowance?: number;
  meal_allowance?: number;
  position_allowance?: number;
  other_allowances?: number;
  overtime_hours?: number;
  overtime_pay?: number;
  bonus?: number;
  thr?: number;
  incentive?: number;
  loan_deduction?: number;
  absence_deduction?: number;
  late_deduction?: number;
  other_deductions?: number;
  notes?: string;
  hr_notes?: string;
}

export interface ApprovePayrollRequest {
  approval_notes?: string;
}

export interface RejectPayrollRequest {
  rejection_reason: string;
}

export interface MarkAsPaidRequest {
  payment_reference?: string;
  payment_method?: string;
}

// ==========================================
// RESPONSE TYPES
// ==========================================

export interface GeneratePayrollResponse {
  generated: number;
  errors: number;
  results: Payroll[];
  errorDetails: Array<{ employee_id: number; error: string }>;
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

// ==========================================
// SERVICE
// ==========================================

export const payrollService = {
  // ==========================================
  // PAYROLL CRUD
  // ==========================================

  // Get paginated list of payrolls
  getAll: async (params?: PayrollListParams): Promise<PaginatedResponse<Payroll>> => {
    // Backend returns { message, data, pagination } directly (not wrapped in 'meta')
    interface PayrollListResponse {
      message: string;
      data: Payroll[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
    const response = await api.get<PayrollListResponse>('/payroll', { params });
    return {
      success: true,
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Get payroll by ID
  getById: async (id: number): Promise<Payroll> => {
    const response = await api.get<ApiResponse<Payroll>>(`/payroll/${id}`);
    return response.data.data;
  },

  // Update payroll
  update: async (id: number, data: UpdatePayrollRequest): Promise<Payroll> => {
    const response = await api.put<ApiResponse<Payroll>>(`/payroll/${id}`, data);
    return response.data.data;
  },

  // ==========================================
  // SELF-SERVICE
  // ==========================================

  // Get my payrolls
  getMyPayrolls: async (params?: Partial<PaginationParams>): Promise<PaginatedResponse<Payroll>> => {
    // Backend returns { message, data, pagination } directly
    interface PayrollListResponse {
      message: string;
      data: Payroll[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
    const response = await api.get<PayrollListResponse>('/payroll/me', { params });
    return {
      success: true,
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Get my payslip
  getMyPayslip: async (id: number): Promise<Payroll> => {
    const response = await api.get<ApiResponse<Payroll>>(`/payroll/me/${id}`);
    return response.data.data;
  },

  // ==========================================
  // PAYROLL GENERATION & CALCULATION
  // ==========================================

  // Generate payroll for company/period
  generate: async (data: GeneratePayrollRequest): Promise<GeneratePayrollResponse> => {
    // Backend returns result directly without wrapping in 'data' property
    const response = await api.post<GeneratePayrollResponse & { message: string }>('/payroll/generate', data);
    return {
      generated: response.data.generated,
      errors: response.data.errors,
      results: response.data.results,
      errorDetails: response.data.errorDetails,
    };
  },

  // Calculate payroll (preview without saving)
  calculate: async (data: CalculatePayrollRequest): Promise<PayrollCalculationResult> => {
    const response = await api.post<ApiResponse<PayrollCalculationResult>>('/payroll/calculate', data);
    return response.data.data;
  },

  // ==========================================
  // WORKFLOW ACTIONS
  // ==========================================

  // Validate payroll (draft -> validated)
  validate: async (id: number): Promise<Payroll> => {
    const response = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/validate`);
    return response.data.data;
  },

  // Submit payroll for approval (validated -> submitted)
  submit: async (id: number): Promise<Payroll> => {
    const response = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/submit`);
    return response.data.data;
  },

  // Approve payroll (submitted -> approved)
  approve: async (id: number, data?: ApprovePayrollRequest): Promise<Payroll> => {
    const response = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/approve`, data || {});
    return response.data.data;
  },

  // Reject payroll (submitted -> rejected)
  reject: async (id: number, data: RejectPayrollRequest): Promise<Payroll> => {
    const response = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/reject`, data);
    return response.data.data;
  },

  // Mark as paid (approved -> paid)
  markAsPaid: async (id: number, data?: MarkAsPaidRequest): Promise<Payroll> => {
    const response = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/paid`, data || {});
    return response.data.data;
  },

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================

  // Validate multiple payrolls
  validateBatch: async (ids: number[]): Promise<{ success: number; failed: number }> => {
    const results = await Promise.allSettled(ids.map(id => payrollService.validate(id)));
    return {
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  },

  // Submit multiple payrolls (bulk endpoint)
  submitBatch: async (ids: number[]): Promise<{ success: number; failed: number; errors?: string[] }> => {
    const response = await api.post<ApiResponse<{ success: number; failed: number; errors: string[] }>>('/payroll/bulk/submit', { ids });
    return response.data.data;
  },

  // Approve multiple payrolls (bulk endpoint)
  approveBatch: async (ids: number[], approval_notes?: string): Promise<{ success: number; failed: number; errors?: string[] }> => {
    const response = await api.post<ApiResponse<{ success: number; failed: number; errors: string[] }>>('/payroll/bulk/approve', { ids, approval_notes });
    return response.data.data;
  },

  // Reject multiple payrolls (bulk endpoint)
  rejectBatch: async (ids: number[], rejection_reason: string): Promise<{ success: number; failed: number; errors?: string[] }> => {
    const response = await api.post<ApiResponse<{ success: number; failed: number; errors: string[] }>>('/payroll/bulk/reject', { ids, rejection_reason });
    return response.data.data;
  },

  // Mark multiple as paid
  markAsPaidBatch: async (ids: number[], data?: MarkAsPaidRequest): Promise<{ success: number; failed: number }> => {
    const results = await Promise.allSettled(ids.map(id => payrollService.markAsPaid(id, data)));
    return {
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  },

  // ==========================================
  // EXPORT
  // ==========================================

  // Export payroll to Excel
  // If companyId is null, exports all accessible companies
  exportExcel: async (companyId: number | null, period: string): Promise<void> => {
    const params: { period: string; company_id?: number } = { period };
    if (companyId) {
      params.company_id = companyId;
    }

    const response = await api.get('/payroll/export', {
      params,
      responseType: 'blob',
    });

    // Create download link
    const filename = companyId
      ? `Payroll_${period}_Company${companyId}.xlsx`
      : `Payroll_${period}_AllCompanies.xlsx`;

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  // Format currency (convert to number in case Prisma Decimal comes as string)
  formatCurrency: (amount: number | string | null | undefined): string => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  },

  // Get status color for UI
  getStatusColor: (status: PayrollStatus): string => {
    const colors: Record<PayrollStatus, string> = {
      draft: 'gray',
      processing: 'blue',
      validated: 'indigo',
      submitted: 'yellow',
      approved: 'green',
      rejected: 'red',
      paid: 'emerald',
      cancelled: 'gray',
    };
    return colors[status] || 'gray';
  },

  // Get status label
  getStatusLabel: (status: PayrollStatus): string => {
    const labels: Record<PayrollStatus, string> = {
      draft: 'Draft',
      processing: 'Processing',
      validated: 'Validated',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Paid',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  },

  // Calculate summary from payroll list
  calculateSummary: (payrolls: Payroll[]): PayrollSummary => {
    return payrolls.reduce(
      (summary, p) => {
        summary.total_employees++;
        // Convert to numbers (Prisma Decimal comes as string)
        summary.total_gross += Number(p.gross_salary) || 0;
        summary.total_net += Number(p.net_salary) || 0;
        summary.total_tax += Number(p.pph21) || 0;
        summary.total_bpjs_employee += Number(p.bpjs_employee_total) || 0;
        summary.total_bpjs_company += Number(p.bpjs_company_total) || 0;

        switch (p.status) {
          case 'draft':
          case 'processing':
            summary.pending_count++;
            break;
          case 'validated':
            summary.validated_count++;
            break;
          case 'submitted':
          case 'approved':
            summary.approved_count++;
            break;
          case 'paid':
            summary.paid_count++;
            break;
        }

        return summary;
      },
      {
        total_employees: 0,
        pending_count: 0,
        processing_count: 0,
        validated_count: 0,
        approved_count: 0,
        paid_count: 0,
        total_gross: 0,
        total_net: 0,
        total_tax: 0,
        total_bpjs_employee: 0,
        total_bpjs_company: 0,
      } as PayrollSummary
    );
  },
};
