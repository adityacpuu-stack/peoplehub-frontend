import api from './api';

// ==========================================
// TYPES
// ==========================================

export const ALLOWANCE_TYPES = [
  'transport',
  'meal',
  'housing',
  'communication',
  'medical',
  'position',
  'performance',
  'attendance',
  'shift',
  'remote',
  'thr',
  'bonus',
  'other',
] as const;
// Position carries tax semantics and is never a monthly incentive (server enforces too).
export const MONTHLY_TYPES = ALLOWANCE_TYPES.filter(type => type !== 'position');

export type AllowanceType = typeof ALLOWANCE_TYPES[number];
/** contract = existing OL checkbox (is_contract); monthly = has payroll_period; review = legacy, not yet classified. */
export type AllowanceLifecycle = 'contract' | 'monthly' | 'review';
export type AllowanceStatus = 'active' | 'inactive' | 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'paid';
type Money = number | string | null;

export interface AllowancePayrollLink {
  id: number;
  payroll_id?: number;
  payroll_number?: string | null;
  period: string;
  amount?: Money;
  reserved_at?: string;
  paid_at?: string | null;
  released_at?: string | null;
  release_reason?: string | null;
}

export interface Allowance {
  id: number;
  employee_id?: number | null;
  company_id?: number | null;
  name: string;
  type: AllowanceType;
  amount?: Money;
  percentage?: Money;
  calculation_base?: 'fixed' | 'basic_salary' | 'gross_salary' | null;
  frequency?: string | null;
  effective_date?: string | null;
  end_date?: string | null;
  status: AllowanceStatus;
  description?: string | null;
  notes?: string | null;
  is_taxable: boolean;
  is_bpjs_object: boolean;
  is_recurring?: boolean;
  is_contract?: boolean | null;
  approved_by?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  payroll_period?: string | null;
  component_key?: string | null;
  performance_start?: string | null;
  performance_end?: string | null;
  reference?: string | null;
  replaces_allowance_id?: number | null;
  submitted_at?: string | null;
  classified_at?: string | null;
  lifecycle?: AllowanceLifecycle;
  /** State of the latest-period active payroll link (earlier paid periods stay in history). */
  payment_state?: 'none' | 'reserved' | 'paid';
  payment_period?: string | null;
  locked?: boolean;
  payrollLinks?: AllowancePayrollLink[];
  employee?: {
    id: number;
    employee_id: string;
    name: string;
    company_id?: number | null;
    department?: { id: number; name: string } | null;
    position?: { id: number; name: string } | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface AllowanceListQuery {
  page?: number;
  limit?: number;
  search?: string;
  employee_id?: number;
  company_id?: number;
  type?: string;
  status?: string;
  lifecycle?: AllowanceLifecycle;
  payroll_period?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary?: { status: AllowanceStatus; count: number; amount: Money }[];
}

export interface ContractInput {
  employee_id: number;
  name: string;
  type: AllowanceType;
  amount: number;
  effective_period: string;
  end_period?: string;
  component_key?: string;
  description?: string;
  reference?: string;
  is_taxable?: boolean;
  is_bpjs_object?: boolean;
}

export interface ContractVersionInput {
  effective_period: string;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface MonthlyInput {
  employee_id: number;
  payroll_period: string;
  name: string;
  type: AllowanceType;
  /** null = blank (not entered); 0 = explicit final zero. */
  amount: number | null;
  component_key?: string;
  performance_start?: string;
  performance_end?: string;
  reference?: string;
  notes?: string;
  is_taxable?: boolean;
}

/** Edits send null to clear an optional field. */
export interface MonthlyUpdate {
  name?: string;
  type?: AllowanceType;
  amount?: number | null;
  performance_start?: string | null;
  performance_end?: string | null;
  reference?: string | null;
  notes?: string | null;
  is_taxable?: boolean;
}
export interface ContractUpdate {
  name?: string;
  type?: AllowanceType;
  amount?: number;
  effective_period?: string;
  end_period?: string | null;
  description?: string | null;
  reference?: string | null;
  is_taxable?: boolean;
  is_bpjs_object?: boolean;
}
export interface BulkResult { updated?: number; created?: number; failed: number; errors: string[] }

// ==========================================
// SERVICE
// Only business fields are sent; status, approvals and payroll links are
// decided by dedicated lifecycle endpoints on the server.
// ==========================================

class AllowanceService {
  async list(query: AllowanceListQuery = {}, signal?: AbortSignal): Promise<PaginatedResponse<Allowance>> {
    const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    const response = await api.get('/allowances', { params, signal });
    return response.data;
  }

  async history(id: number): Promise<{ lifecycle: AllowanceLifecycle; rows: Allowance[] }> {
    return (await api.get(`/allowances/${id}/history`)).data;
  }

  async createContract(data: ContractInput): Promise<Allowance> {
    return (await api.post('/allowances/contract', data)).data;
  }

  async updateContract(id: number, data: ContractUpdate): Promise<Allowance> {
    return (await api.put(`/allowances/contract/${id}`, data)).data;
  }

  async createContractVersion(id: number, data: ContractVersionInput): Promise<Allowance> {
    return (await api.post(`/allowances/contract/${id}/versions`, data)).data;
  }

  async end(id: number, lastPeriod: string, reason: string): Promise<Allowance> {
    return (await api.post(`/allowances/${id}/end`, { last_period: lastPeriod, reason })).data;
  }

  async classifyAsContract(id: number, reason: string): Promise<Allowance> {
    return (await api.post(`/allowances/${id}/classify`, { as: 'contract', reason })).data;
  }

  async createMonthly(data: MonthlyInput): Promise<Allowance> {
    return (await api.post('/allowances/monthly', data)).data;
  }

  async updateMonthly(id: number, data: MonthlyUpdate): Promise<Allowance> {
    return (await api.put(`/allowances/monthly/${id}`, data)).data;
  }

  async submitMonthly(ids: number[]): Promise<BulkResult> {
    return (await api.post('/allowances/monthly/submit', { ids })).data;
  }

  async approve(id: number): Promise<Allowance> {
    return (await api.post(`/allowances/${id}/approve`)).data;
  }

  async approveMany(ids: number[]): Promise<BulkResult> {
    return (await api.patch('/allowances/bulk/status', { ids, status: 'approved' })).data;
  }

  async reject(id: number, reason: string): Promise<Allowance> {
    return (await api.post(`/allowances/${id}/reject`, { reason })).data;
  }

  async cancel(id: number, reason: string): Promise<Allowance> {
    return (await api.post(`/allowances/${id}/cancel`, { reason })).data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`/allowances/${id}`);
  }
}

export const allowanceService = new AllowanceService();
