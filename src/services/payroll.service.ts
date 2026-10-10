import api from './api';
import type { ApiResponse, Decimalish, PaginatedResponse, PaginationParams } from '@/types';
import { savedThp } from '@/components/payroll/saved-payroll';

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
  employment_status?: string;
  department?: { id: number; name: string };
  position?: { id: number; name: string };
}

// HR decisions apply to one employee and period. Omitted fields retain server defaults.
export interface PayrollPreparationInput {
  reason: string;
  work_days_per_week?: 5 | 6;
  tax_allowance_mode?: 'gross_up' | 'fixed' | 'none';
  fixed_tax_allowance?: number;
  bpjs_paid_by_company?: boolean;
  bpjs_base?: number;
  external_bpjs?: PayrollExternalBPJS;
  rounding?: 'legacy' | 'final_cent' | 'final_cash';
  paid_basic_salary?: number;
  external_tax?: { amount: number; reference: string };
  payment_hold_reason?: string;
  bonus?: { amount: number; external_total_tax?: { amount: number; reference: string } };
  annual_tax?: PayrollAnnualTaxInput;
}

/** Explicit inputs for the final (annual) PPh 21 period; the server validates and calculates. */
export interface PayrollAnnualTaxInput {
  reference: string;
  final_period?: 'this_period' | 'next_period';
  ptkp_status_start_of_year?: typeof SIMULATION_PTKP[number];
  residency?: { mode: 'partial_year_subjective'; months: number };
  other_deductions?: { amount: number; description: string };
  /** Calendar employment months when the employment dates cannot tell. */
  employment_months?: number;
  other_company_income?: 'separate_employer';
  include_rows_before_join?: true;
  opening?: { periods: string[]; gross: number; deductible_contributions: number; tax_withheld: number; replaces_unfinalized?: boolean };
  corrections?: Array<{ period: string; gross?: number; deductible_contributions?: number; tax_withheld?: number }>;
}

/** Frozen final-period worksheet (backend payroll-annual-history.ts AnnualTaxSnapshot). Display only. */
export interface PayrollAnnualTax {
  version: 1;
  tax_year: number;
  period?: string;
  final_reason: 'december' | 'cessation' | 'cross_year_cessation';
  explicit_choice?: 'this_period' | 'next_period' | null;
  source: 'calculated' | 'external_override';
  policy_source?: 'preparation' | 'salary_status_default';
  reference?: string | null;
  ptkp?: { status: string; amount: number; basis: 'explicit_input' | 'consistent_saved_status'; evidence: string[] } | null;
  residency?: { mode: 'full_year' } | { mode: 'partial_year_subjective'; months: number };
  /** Calendar employment months (occupational cap). */
  months?: number | null;
  months_basis?: 'employment_dates' | 'explicit_input' | null;
  /** Payroll periods covered by saved history, opening and this period. */
  payroll_periods_covered?: number | null;
  history?: {
    rows: Array<{ id: number; period: string; status: string; gross: number; tax: number; deductible_contributions: number;
      funding: string; ptkp_status: string | null; corrected: string[] }>;
    excluded: Array<{ id: number; period: string; status: string; reason: string }>;
    opening: { periods: string[]; gross: number; deductible_contributions: number; tax_withheld: number;
      replaces_unfinalized?: boolean } | null;
    corrections: PayrollAnnualTaxInput['corrections'] | null;
    expected_periods: string[];
    totals: { gross: number; deductible_contributions: number; tax: number };
  } | null;
  current?: { dpp_before_tax_allowance: number; bonus?: number; deductible_contributions: number } | null;
  other_deductions?: { amount: number; description: string } | null;
  worksheet?: {
    annual_gross: number; tax_allowance: number; occupational_deduction: number; deductible_contributions: number;
    other_deductions: number; net_income: number; annualized_net_income: number | null; ptkp: number; pkp: number;
    pasal17_full_year: number; annual_liability: number; prior_tax: number; period_tax: number;
  } | null;
  settlement: {
    mode: 'gross_up' | 'fixed' | 'none'; period_tax: number; tax_allowance: number; employee_tax: number; company_tax: number;
    iterations?: number;
    /** Share of period_tax attributable to a separate preparation bonus. */
    bonus_tax?: number;
  };
}

export interface PayrollAutomationTreatment {
  tax_allowance_mode: 'gross_up' | 'fixed_position' | 'none';
  bpjs_paid_by_company: boolean;
}

// Company rules recur from the effective period; employee exceptions never recur.
export interface PayrollAutomationInput {
  reason: string;
  work_days_per_week: 5 | 6;
  rounding: 'legacy' | 'final_cent' | 'final_cash';
  existing: PayrollAutomationTreatment;
  new_gross: PayrollAutomationTreatment;
}

export interface PayrollAutomation {
  company_id: number;
  period: string;
  effective_from: string | null;
  input: PayrollAutomationInput | null;
}

export interface PayrollExternalBPJS {
  reference: string;
  bpjs_kes_employee: number;
  bpjs_jht_employee: number;
  bpjs_jp_employee: number;
  bpjs_kes_company: number;
  bpjs_jht_company: number;
  bpjs_jp_company: number;
  bpjs_jkk_company: number;
  bpjs_jkm_company: number;
}

export interface PayrollPreparationRow {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  salary_status: string | null;
  basic_salary: Decimalish | null;
  input: PayrollPreparationInput | null;
  locked: boolean;
}

export type PayrollPreparationSaved = Pick<PayrollPreparationRow, 'employee_id' | 'input'>
  & Partial<Omit<PayrollPreparationRow, 'employee_id' | 'input'>> & { period?: string };

export interface PayrollCalculationSnapshot {
  version: 2;
  automation?: { effective_from: string; rule: 'existing' | 'new_gross' };
  policy?: {
    work_days_per_week?: 5 | 6;
    tax_allowance_mode?: PayrollPreparationInput['tax_allowance_mode'];
    fixed_tax_allowance?: Decimalish | null;
    bpjs_paid_by_company?: boolean;
    bpjs_base?: Decimalish | null;
    rounding?: PayrollPreparationInput['rounding'];
    [key: string]: unknown;
  } | null;
  input?: PayrollPreparationInput | null;
  calculated_pph21?: Decimalish | null;
  rounding_adjustment?: number;
  tax_allowance?: Decimalish | null;
  tax_source?: string | null;
  tax_reference?: string | null;
  bpjs_base?: Decimalish | null;
  raw_calculation?: Record<string, unknown> | null;
  payments?: {
    regular?: Decimalish | null;
    bonus?: Decimalish | null;
    total?: Decimalish | null;
    held?: boolean | null;
  } | null;
  /** Final (annual) PPh 21 period only. */
  annual_tax?: PayrollAnnualTax | null;
  [key: string]: unknown;
}

/** Backend saved read presentation (payroll-read-presentation.ts); null = not saved / not knowable. */
export type PayrollEarningKey = 'basic_salary' | 'position_allowance' | 'position_allowance_unsplit' | 'tax_allowance'
  | 'transport_allowance' | 'meal_allowance' | 'overtime_pay' | 'other_allowances' | 'thr' | 'bonus'
  | 'incentive' | 'commission' | 'back_pay';
export interface PayrollReadPresentation {
  version: 1;
  basis: 'calculation_v2' | 'generation' | 'saved_result' | 'saved_flag' | 'unrecorded';
  take_home_pay: number | null;
  company_cost: number | null;
  taxable_base: number | null;
  funding: {
    pph21: 'company_paid' | 'withheld' | null;
    tax_allowance_mode: 'gross_up' | 'fixed' | 'none' | null;
    bpjs_employee: 'company' | 'employee' | null;
  };
  position: { total: number | null; business: number | null; tax_allowance: number | null };
  /** unreconciled: saved total minus listed saved items (null when total not saved). */
  earnings: { items: Array<{ key: PayrollEarningKey; amount: number }>; total: number | null; unreconciled: number | null } | null;
  deductions: { pph21: number | null; bpjs_employee: number | null; system: number | null; total: number | null };
  company_borne: { pph21: number | null; bpjs_employee: number | null; bpjs_company: number | null };
  /** Final (annual) PPh 21 period; null for a monthly TER row. Absent on older API responses. */
  annual_tax?: PayrollAnnualTax | null;
}

// ==========================================
// TARGET THP -> BASIC SALARY SIMULATION (read-only)
// ==========================================

export type SimulationSalaryStatus = 'new_gross' | 'existing';
export const SIMULATION_PTKP = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'] as const;
export interface SimulationAllowances { position: number; transport: number; meal: number; other: number }
export interface SalarySimulationRequest {
  company_id: number;
  context: 'employee_form' | 'standalone';
  employee_id?: number;
  /** Payroll period (YYYY-MM) whose company/employee rules are checked. */
  period: string;
  target_thp: number;
  ptkp_status: string;
  salary_status: SimulationSalaryStatus;
  allowance_source: 'manual' | 'employee_contract';
  allowances: SimulationAllowances;
}
export type SimulationApplyReason = 'standalone' | 'not_exact' | 'policy_rules_apply' | 'rules_unreadable'
  | 'allowances_not_registered' | 'sources_pending';
export interface SalarySimulationResult {
  status: 'exact' | 'below_minimum' | 'nearest';
  target_thp: number;
  basic_salary: number;
  achieved_thp: number;
  difference: number;
  salary_status: SimulationSalaryStatus;
  ptkp_status: string;
  allowances_used: SimulationAllowances & { total: number };
  allowance_source: 'manual' | 'employee_contract';
  breakdown: {
    basic_salary: number; fixed_allowances: number; gross_cash: number; taxable_base_dpp: number;
    bpjs_object_pph21: number; ter_golongan: string; ter_rate: number; pph21: number;
    pph21_paid_by: 'company' | 'employee'; tax_allowance: number;
    bpjs_employee: { jht: number; jp: number; jks: number; total: number };
    bpjs_employee_paid_by: 'company' | 'employee';
    bpjs_company: { jht: number; jkm: number; jkk: number; jks: number; jp: number; total: number };
    employee_deductions: number; take_home_pay: number; company_cost: number;
  };
  scope: { period: string; automation_active: boolean; policy_rules_apply: boolean; rules_unreadable: boolean;
    /** Always a monthly TER estimate; December settles the year at generation. Absent on older API responses. */
    estimate?: 'monthly_ter'; final_tax_period?: boolean };
  employee_context: {
    employee_id: number; contract_income: (SimulationAllowances & { total: number }) | null;
    pending_sources: number; one_time_excluded: number;
  } | null;
  apply: { allowed: boolean; reasons: SimulationApplyReason[] };
  assumptions: string[];
}

export interface PayrollProrationSnapshot {
  work_days_per_week?: 5 | 6;
  [key: string]: unknown;
}

export interface Payroll {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
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
  prorate_factor?: Decimalish | null;
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
  metadata?: {
    calculation?: PayrollCalculationSnapshot | null;
    proration?: PayrollProrationSnapshot | null;
    [key: string]: unknown;
  } | null;
  /** Saved read presentation from the backend (list rows: earnings null). */
  presentation?: PayrollReadPresentation | null;
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
  /** Sum of saved take-home pay (take_home_pay, then thp). */
  total_net: number;
  /** Rows with no saved take-home pay; excluded from total_net. */
  total_net_missing: number;
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
  calculation_snapshot?: PayrollCalculationSnapshot | null;
  proration_snapshot?: PayrollProrationSnapshot | null;
}

export interface PayrollResultEmployee {
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
}

export interface PayrollPreparationPreview {
  generated: 0;
  previewed: number;
  errors: number;
  results: Array<PayrollCalculationResult & PayrollResultEmployee>;
  errorDetails: Array<PayrollResultEmployee & { error: string }>;
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

// Saved payroll money is immutable; money changes go through discard + regenerate.
export interface UpdatePayrollRequest {
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
  success: boolean;
  generated: number;
  errors: number;
  results: Payroll[];
  errorDetails: Array<PayrollResultEmployee & { error: string }>;
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
  getAutomation: async (company_id: number, period: string): Promise<PayrollAutomation> => {
    const response = await api.get<ApiResponse<PayrollAutomation>>('/payroll/automation', { params: { company_id, period } });
    const saved = response.data.data;
    if (!response.data.success || saved?.company_id !== company_id || saved.period !== period
      || !('input' in saved) || !('effective_from' in saved)) throw new Error('Gagal memuat aturan perusahaan. Muat ulang aturan.');
    return saved;
  },

  saveAutomation: async (company_id: number, period: string, input: PayrollAutomationInput | null): Promise<PayrollAutomation> => {
    const response = await api.put<ApiResponse<PayrollAutomation>>('/payroll/automation', { company_id, period, input });
    const saved = response.data.data;
    if (!response.data.success || saved?.company_id !== company_id || saved.period !== period
      || !('input' in saved) || saved.effective_from !== period) throw new Error('Simpan aturan belum terkonfirmasi. Muat ulang aturan.');
    return saved;
  },

  setPaymentHold: async (id: number, held: boolean, reason: string): Promise<Payroll> => {
    const response = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/payment-hold`, { held, reason });
    if (!response.data.success || response.data.data?.id !== id) throw new Error('Perubahan penahanan belum terkonfirmasi. Muat ulang detail.');
    return response.data.data;
  },

  getPreparation: async (company_id: number, period: string): Promise<PayrollPreparationRow[]> => {
    const response = await api.get<ApiResponse<PayrollPreparationRow[]>>('/payroll/preparation', {
      params: { company_id, period },
    });
    if (!response.data.success || !Array.isArray(response.data.data)) throw new Error('Gagal memuat persiapan payroll.');
    return response.data.data;
  },

  savePreparation: async (employeeId: number, period: string, input: PayrollPreparationInput | null): Promise<PayrollPreparationSaved> => {
    const response = await api.put<ApiResponse<PayrollPreparationSaved>>(`/payroll/preparation/${employeeId}`, { period, input });
    const saved = response.data.data;
    if (!response.data.success || saved?.employee_id !== employeeId || !('input' in saved)
      || (saved.period !== undefined && saved.period !== period)) throw new Error('Simpan persiapan belum terkonfirmasi. Muat ulang data.');
    return response.data.data;
  },

  /** Read-only Target THP -> basic salary simulation; never saves anything. */
  simulateSalary: async (data: SalarySimulationRequest, signal?: AbortSignal): Promise<SalarySimulationResult> => {
    const response = await api.post<ApiResponse<SalarySimulationResult>>('/payroll/salary-simulation', data, { signal });
    if (!response.data.success || !response.data.data) throw new Error('Simulasi gaji gagal.');
    return response.data.data;
  },

  previewPreparation: async (data: GeneratePayrollRequest): Promise<PayrollPreparationPreview> => {
    const response = await api.post<ApiResponse<PayrollPreparationPreview>>('/payroll/preparation/preview', data);
    if (!response.data.success || !response.data.data) throw new Error('Preview payroll gagal.');
    return response.data.data;
  },

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
    if (!response.data.success) throw new Error(response.data.message || 'Generate payroll gagal. Preview ulang sebelum mencoba lagi.');
    return {
      success: response.data.success,
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

  // Export freelance/internship payroll to Excel
  // Exports all accessible companies
  exportFreelanceInternship: async (period: string, cutoffDate: number = 20): Promise<void> => {
    const response = await api.get('/payroll/export/freelance-internship', {
      params: { period, cutoff_date: cutoffDate },
      responseType: 'blob',
    });

    // Create download link
    const periodFormatted = period.replace('-', '');
    const filename = `Freelance_Internship_Payroll_${periodFormatted}.xlsx`;

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
  formatCalculationCurrency: (amount: Decimalish | null | undefined): string => {
    if (amount == null || amount === '' || !Number.isFinite(Number(amount))) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number(amount));
  },

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
        // Saved payout only; net_salary is pre-tax/BPJS for pure-gross rows.
        const thp = savedThp(p);
        if (thp === null) summary.total_net_missing++;
        else summary.total_net += thp;
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
        total_net_missing: 0,
        total_tax: 0,
        total_bpjs_employee: 0,
        total_bpjs_company: 0,
      } as PayrollSummary
    );
  },
};
