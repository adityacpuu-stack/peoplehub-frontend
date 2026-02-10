import api from './api';

// Adjustment types that count as deductions
export const DEDUCTION_TYPES = ['deduction', 'penalty', 'loan', 'advance'] as const;
export type DeductionType = typeof DEDUCTION_TYPES[number];

export const ADJUSTMENT_STATUSES = ['pending', 'approved', 'rejected', 'processed', 'cancelled'] as const;
export type AdjustmentStatus = typeof ADJUSTMENT_STATUSES[number];

export interface PayrollAdjustment {
  id: number;
  employee_id: number;
  type: string;
  category?: string;
  amount: number;
  description?: string;
  reason?: string;
  effective_date?: string;
  pay_period?: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  recurring_end_date?: string;
  is_taxable: boolean;
  is_bpjs_object: boolean;
  reference_number?: string;
  attachment_path?: string;
  company_id?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    employee_id: string;
    name: string;
    department?: {
      id: number;
      name: string;
    };
    position?: {
      id: number;
      name: string;
    };
  };
}

export interface DeductionListQuery {
  page?: number;
  limit?: number;
  search?: string;
  employee_id?: number;
  company_id?: number;
  type?: string;
  status?: string;
  pay_period?: string;
  effective_from?: string;
  effective_to?: string;
  is_recurring?: boolean;
}

export interface CreateDeductionDTO {
  employee_id: number;
  type: string;
  category?: string;
  amount: number;
  description?: string;
  reason?: string;
  effective_date?: string;
  pay_period?: string;
  is_recurring?: boolean;
  recurring_frequency?: string;
  recurring_end_date?: string;
  is_taxable?: boolean;
  is_bpjs_object?: boolean;
  reference_number?: string;
  company_id?: number;
}

export interface UpdateDeductionDTO extends Partial<Omit<CreateDeductionDTO, 'employee_id'>> {
  status?: string;
}

export interface DeductionListResponse {
  data: PayrollAdjustment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DeductionStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  pendingAmount: number;
}

class DeductionService {
  private baseUrl = '/payroll-adjustments';

  async list(query: DeductionListQuery = {}): Promise<DeductionListResponse> {
    // Filter only deduction types by default
    const params = new URLSearchParams();

    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.search) params.append('search', query.search);
    if (query.employee_id) params.append('employee_id', String(query.employee_id));
    if (query.company_id) params.append('company_id', String(query.company_id));
    if (query.type) params.append('type', query.type);
    if (query.status) params.append('status', query.status);
    if (query.pay_period) params.append('pay_period', query.pay_period);
    if (query.effective_from) params.append('effective_from', query.effective_from);
    if (query.effective_to) params.append('effective_to', query.effective_to);
    if (query.is_recurring !== undefined) params.append('is_recurring', String(query.is_recurring));

    const response = await api.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  async getById(id: number): Promise<PayrollAdjustment> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getByEmployeeId(employeeId: number): Promise<PayrollAdjustment[]> {
    const response = await api.get(`${this.baseUrl}/employee/${employeeId}`);
    return response.data;
  }

  async create(data: CreateDeductionDTO): Promise<PayrollAdjustment> {
    const response = await api.post(this.baseUrl, data);
    return response.data;
  }

  async update(id: number, data: UpdateDeductionDTO): Promise<PayrollAdjustment> {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async approve(id: number): Promise<PayrollAdjustment> {
    const response = await api.post(`${this.baseUrl}/${id}/approve`);
    return response.data;
  }

  async reject(id: number, reason: string): Promise<PayrollAdjustment> {
    const response = await api.post(`${this.baseUrl}/${id}/reject`, { rejection_reason: reason });
    return response.data;
  }

  async bulkCreate(data: {
    employee_ids: number[];
    type: string;
    category?: string;
    amount: number;
    description?: string;
    reason?: string;
    effective_date?: string;
    pay_period?: string;
    is_taxable?: boolean;
  }): Promise<PayrollAdjustment[]> {
    const response = await api.post(`${this.baseUrl}/bulk`, data);
    return response.data;
  }

  async bulkApprove(ids: number[]): Promise<{ approved: number; failed: number }> {
    const response = await api.post(`${this.baseUrl}/bulk/approve`, { ids });
    return response.data;
  }

  async getPendingApprovals(): Promise<PayrollAdjustment[]> {
    const response = await api.get(`${this.baseUrl}/pending`);
    return response.data;
  }

  async getStatistics(query?: { company_id?: number; pay_period?: string }): Promise<DeductionStatistics> {
    const params = new URLSearchParams();
    if (query?.company_id) params.append('company_id', String(query.company_id));
    if (query?.pay_period) params.append('pay_period', query.pay_period);

    const response = await api.get(`${this.baseUrl}/statistics?${params.toString()}`);
    return response.data;
  }

  // Helper methods
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      deduction: 'Potongan',
      penalty: 'Denda/Penalty',
      loan: 'Pinjaman',
      advance: 'Kasbon',
      bonus: 'Bonus',
      allowance: 'Tunjangan',
      reimbursement: 'Reimbursement',
      correction: 'Koreksi',
      incentive: 'Insentif',
      commission: 'Komisi',
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Menunggu',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      processed: 'Diproses',
      cancelled: 'Dibatalkan',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      processed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }
}

export const deductionService = new DeductionService();
