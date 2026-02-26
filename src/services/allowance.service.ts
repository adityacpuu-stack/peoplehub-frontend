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

export type AllowanceType = typeof ALLOWANCE_TYPES[number];

export interface Allowance {
  id: number;
  employee_id?: number;
  company_id?: number;
  name: string;
  type: AllowanceType;
  amount?: number;
  percentage?: number;
  calculation_base?: 'fixed' | 'basic_salary' | 'gross_salary';
  formula?: string;
  frequency: 'monthly' | 'weekly' | 'daily' | 'one_time';
  effective_date?: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'expired';
  description?: string;
  notes?: string;
  is_taxable: boolean;
  is_bpjs_object: boolean;
  is_recurring: boolean;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  employee?: {
    id: number;
    employee_id: string;
    name: string;
    basic_salary?: number;
    department?: {
      id: number;
      name: string;
    };
    position?: {
      id: number;
      name: string;
    };
  };
  company?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AllowanceTemplate {
  name: string;
  type: AllowanceType;
  calculation_base: string;
  frequency: string;
  is_taxable: boolean;
  is_bpjs_object: boolean;
  is_recurring: boolean;
  description: string;
}

export interface AllowanceListQuery {
  page?: number;
  limit?: number;
  search?: string;
  employee_id?: number;
  company_id?: number;
  type?: string;
  status?: string;
  is_taxable?: boolean;
  is_recurring?: boolean;
  frequency?: string;
  effective_from?: string;
  effective_to?: string;
}

export interface CreateAllowanceDTO {
  employee_id?: number;
  company_id?: number;
  name: string;
  type: string;
  amount?: number;
  percentage?: number;
  calculation_base?: string;
  formula?: string;
  frequency?: string;
  effective_date?: string;
  end_date?: string;
  status?: string;
  description?: string;
  notes?: string;
  is_taxable?: boolean;
  is_bpjs_object?: boolean;
  is_recurring?: boolean;
}

export interface UpdateAllowanceDTO extends Partial<CreateAllowanceDTO> {
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
}

export interface BulkCreateAllowanceDTO {
  employee_ids: number[];
  name: string;
  type: string;
  amount?: number;
  percentage?: number;
  calculation_base?: string;
  frequency?: string;
  effective_date?: string;
  end_date?: string;
  is_taxable?: boolean;
  is_bpjs_object?: boolean;
  is_recurring?: boolean;
  description?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==========================================
// SERVICE
// ==========================================

class AllowanceService {
  /**
   * Get list of allowances with pagination and filters
   */
  async list(query: AllowanceListQuery = {}): Promise<PaginatedResponse<Allowance>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/allowances?${params.toString()}`);
    return response.data;
  }

  /**
   * Get allowance detail by ID
   */
  async getById(id: number): Promise<Allowance> {
    const response = await api.get(`/allowances/${id}`);
    return response.data;
  }

  /**
   * Create new allowance
   */
  async create(data: CreateAllowanceDTO): Promise<Allowance> {
    const response = await api.post('/allowances', data);
    return response.data;
  }

  /**
   * Bulk create allowances for multiple employees
   */
  async bulkCreate(data: BulkCreateAllowanceDTO): Promise<{
    created: number;
    errors: string[];
  }> {
    const response = await api.post('/allowances/bulk', data);
    return response.data;
  }

  /**
   * Update allowance
   */
  async update(id: number, data: UpdateAllowanceDTO): Promise<Allowance> {
    const response = await api.put(`/allowances/${id}`, data);
    return response.data;
  }

  /**
   * Delete allowance
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/allowances/${id}`);
  }

  /**
   * Get allowance templates
   */
  async getTemplates(): Promise<AllowanceTemplate[]> {
    const response = await api.get('/allowances/templates');
    return response.data;
  }

  /**
   * Calculate allowance amount for employee
   */
  async calculateForEmployee(employeeId: number, month: number, year: number): Promise<{
    allowances: Allowance[];
    total: number;
    taxable_total: number;
    non_taxable_total: number;
  }> {
    const response = await api.get(`/allowances/calculate/${employeeId}`, {
      params: { month, year }
    });
    return response.data;
  }

  /**
   * Get employee allowances summary
   */
  async getEmployeeSummary(employeeId: number): Promise<{
    total_monthly: number;
    allowances: Allowance[];
  }> {
    const response = await api.get(`/allowances/employee/${employeeId}/summary`);
    return response.data;
  }

  /**
   * Get default allowance templates (static)
   */
  getDefaultTemplates(): AllowanceTemplate[] {
    return [
      {
        name: 'Tunjangan Transportasi',
        type: 'transport',
        calculation_base: 'fixed',
        frequency: 'monthly',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        description: 'Tunjangan transportasi bulanan',
      },
      {
        name: 'Tunjangan Makan',
        type: 'meal',
        calculation_base: 'fixed',
        frequency: 'monthly',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        description: 'Tunjangan makan bulanan',
      },
      {
        name: 'Tunjangan Perumahan',
        type: 'housing',
        calculation_base: 'fixed',
        frequency: 'monthly',
        is_taxable: true,
        is_bpjs_object: true,
        is_recurring: true,
        description: 'Tunjangan perumahan bulanan',
      },
      {
        name: 'Tunjangan Komunikasi',
        type: 'communication',
        calculation_base: 'fixed',
        frequency: 'monthly',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        description: 'Tunjangan pulsa/internet',
      },
      {
        name: 'Tunjangan Jabatan',
        type: 'position',
        calculation_base: 'basic_salary',
        frequency: 'monthly',
        is_taxable: true,
        is_bpjs_object: true,
        is_recurring: true,
        description: 'Tunjangan berdasarkan jabatan',
      },
      {
        name: 'Tunjangan Kesehatan',
        type: 'medical',
        calculation_base: 'fixed',
        frequency: 'monthly',
        is_taxable: false,
        is_bpjs_object: false,
        is_recurring: true,
        description: 'Tunjangan kesehatan tambahan',
      },
      {
        name: 'Tunjangan Kehadiran',
        type: 'attendance',
        calculation_base: 'fixed',
        frequency: 'monthly',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        description: 'Insentif kehadiran penuh',
      },
      {
        name: 'Tunjangan Shift',
        type: 'shift',
        calculation_base: 'fixed',
        frequency: 'daily',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        description: 'Tunjangan shift malam/weekend',
      },
      {
        name: 'Tunjangan Remote',
        type: 'remote',
        calculation_base: 'fixed',
        frequency: 'monthly',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: true,
        description: 'Tunjangan kerja dari rumah (listrik, internet)',
      },
      {
        name: 'THR (Tunjangan Hari Raya)',
        type: 'thr',
        calculation_base: 'basic_salary',
        frequency: 'one_time',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: false,
        description: 'Tunjangan Hari Raya keagamaan',
      },
      {
        name: 'Bonus',
        type: 'bonus',
        calculation_base: 'basic_salary',
        frequency: 'one_time',
        is_taxable: true,
        is_bpjs_object: false,
        is_recurring: false,
        description: 'Bonus kinerja / pencapaian target',
      },
    ];
  }

  /**
   * Get type label
   */
  getTypeLabel(type: AllowanceType): string {
    const labels: Record<AllowanceType, string> = {
      transport: 'Transportasi',
      meal: 'Makan',
      housing: 'Perumahan',
      communication: 'Komunikasi',
      medical: 'Kesehatan',
      position: 'Jabatan',
      performance: 'Kinerja',
      attendance: 'Kehadiran',
      shift: 'Shift',
      remote: 'Remote',
      thr: 'THR',
      bonus: 'Bonus',
      other: 'Lainnya',
    };
    return labels[type] || type;
  }
}

export const allowanceService = new AllowanceService();
