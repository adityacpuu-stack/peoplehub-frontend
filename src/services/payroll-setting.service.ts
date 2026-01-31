import api from './api';

// ==========================================
// TYPES
// ==========================================

export interface PayrollSetting {
  id: number;
  company_id: number;
  bpjs_kes_employee_rate: number;
  bpjs_kes_company_rate: number;
  bpjs_kes_max_salary: number;
  bpjs_jht_employee_rate: number;
  bpjs_jht_company_rate: number;
  bpjs_jp_employee_rate: number;
  bpjs_jp_company_rate: number;
  bpjs_jp_max_salary: number;
  bpjs_jkk_rate: number;
  bpjs_jkm_rate: number;
  use_ter_method: boolean;
  position_cost_rate: number;
  position_cost_max: number;
  overtime_rate_weekday: number;
  overtime_rate_weekend: number;
  overtime_rate_holiday: number;
  overtime_base: string;
  payroll_cutoff_date: number;
  payment_date: number;
  prorate_method: string;
  currency: string;
  enable_rounding: boolean;
  rounding_method: string;
  rounding_precision: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface TaxConfiguration {
  id: number;
  tax_category: string;
  description?: string;
  min_income?: number;
  max_income?: number;
  tax_rate?: number;
  tax_amount?: number;
  is_active: boolean;
  effective_from?: string;
  effective_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxBracket {
  id: number;
  bracket_name: string;
  rate: number;
  min_income: number;
  max_income?: number;
  is_active: boolean;
  company_id?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PTKP {
  id: number;
  status: string;
  description?: string;
  amount: number;
  is_active: boolean;
  company_id?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
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
// DTOs
// ==========================================

export interface CreatePayrollSettingDTO {
  company_id: number;
  bpjs_kes_employee_rate?: number;
  bpjs_kes_company_rate?: number;
  bpjs_kes_max_salary?: number;
  bpjs_jht_employee_rate?: number;
  bpjs_jht_company_rate?: number;
  bpjs_jp_employee_rate?: number;
  bpjs_jp_company_rate?: number;
  bpjs_jp_max_salary?: number;
  bpjs_jkk_rate?: number;
  bpjs_jkm_rate?: number;
  use_ter_method?: boolean;
  position_cost_rate?: number;
  position_cost_max?: number;
  overtime_rate_weekday?: number;
  overtime_rate_weekend?: number;
  overtime_rate_holiday?: number;
  overtime_base?: string;
  payroll_cutoff_date?: number;
  payment_date?: number;
  prorate_method?: string;
  currency?: string;
  enable_rounding?: boolean;
  rounding_method?: string;
  rounding_precision?: number;
  is_active?: boolean;
}

export interface UpdatePayrollSettingDTO extends Partial<Omit<CreatePayrollSettingDTO, 'company_id'>> {}

export interface CreateTaxConfigurationDTO {
  tax_category: string;
  description?: string;
  min_income?: number;
  max_income?: number;
  tax_rate?: number;
  tax_amount?: number;
  is_active?: boolean;
  effective_from?: string;
  effective_until?: string;
  notes?: string;
}

export interface CreateTaxBracketDTO {
  bracket_name: string;
  rate: number;
  min_income: number;
  max_income?: number;
  is_active?: boolean;
  company_id?: number;
}

export interface CreatePtkpDTO {
  status: string;
  description?: string;
  amount: number;
  is_active?: boolean;
  company_id?: number;
}

// ==========================================
// SERVICE
// ==========================================

export const payrollSettingService = {
  // ==========================================
  // PAYROLL SETTINGS
  // ==========================================

  async getByCompany(companyId: number): Promise<PayrollSetting> {
    const response = await api.get(`/payroll-settings/company/${companyId}`);
    return response.data.data || response.data;
  },

  async getOrCreate(companyId: number): Promise<PayrollSetting> {
    const response = await api.get(`/payroll-settings/company/${companyId}/init`);
    return response.data.data || response.data;
  },

  async create(data: CreatePayrollSettingDTO): Promise<PayrollSetting> {
    const response = await api.post('/payroll-settings', data);
    return response.data.data || response.data;
  },

  async update(companyId: number, data: UpdatePayrollSettingDTO): Promise<PayrollSetting> {
    const response = await api.put(`/payroll-settings/company/${companyId}`, data);
    return response.data.data || response.data;
  },

  async upsert(companyId: number, data: UpdatePayrollSettingDTO): Promise<PayrollSetting> {
    const response = await api.patch(`/payroll-settings/company/${companyId}`, data);
    return response.data.data || response.data;
  },

  async resetToDefault(companyId: number): Promise<PayrollSetting> {
    const response = await api.post(`/payroll-settings/company/${companyId}/reset`);
    return response.data.data || response.data;
  },

  // ==========================================
  // TAX CONFIGURATIONS (TER)
  // ==========================================

  async getTaxConfigurations(params?: { page?: number; limit?: number; tax_category?: string; is_active?: boolean }): Promise<PaginatedResponse<TaxConfiguration>> {
    const response = await api.get('/payroll-settings/tax-configurations', { params });
    return response.data;
  },

  async getTaxConfigurationById(id: number): Promise<TaxConfiguration> {
    const response = await api.get(`/payroll-settings/tax-configurations/${id}`);
    return response.data.data || response.data;
  },

  async createTaxConfiguration(data: CreateTaxConfigurationDTO): Promise<TaxConfiguration> {
    const response = await api.post('/payroll-settings/tax-configurations', data);
    return response.data.data || response.data;
  },

  async updateTaxConfiguration(id: number, data: Partial<CreateTaxConfigurationDTO>): Promise<TaxConfiguration> {
    const response = await api.put(`/payroll-settings/tax-configurations/${id}`, data);
    return response.data.data || response.data;
  },

  async deleteTaxConfiguration(id: number): Promise<void> {
    await api.delete(`/payroll-settings/tax-configurations/${id}`);
  },

  async seedTerRates(): Promise<{ message: string; count: number }> {
    const response = await api.post('/payroll-settings/tax-configurations/seed');
    return response.data;
  },

  // ==========================================
  // TAX BRACKETS (Progressive)
  // ==========================================

  async getTaxBrackets(params?: { page?: number; limit?: number; company_id?: number; is_active?: boolean }): Promise<PaginatedResponse<TaxBracket>> {
    const response = await api.get('/payroll-settings/tax-brackets', { params });
    return response.data;
  },

  async getTaxBracketById(id: number): Promise<TaxBracket> {
    const response = await api.get(`/payroll-settings/tax-brackets/${id}`);
    return response.data.data || response.data;
  },

  async createTaxBracket(data: CreateTaxBracketDTO): Promise<TaxBracket> {
    const response = await api.post('/payroll-settings/tax-brackets', data);
    return response.data.data || response.data;
  },

  async updateTaxBracket(id: number, data: Partial<CreateTaxBracketDTO>): Promise<TaxBracket> {
    const response = await api.put(`/payroll-settings/tax-brackets/${id}`, data);
    return response.data.data || response.data;
  },

  async deleteTaxBracket(id: number): Promise<void> {
    await api.delete(`/payroll-settings/tax-brackets/${id}`);
  },

  async seedTaxBrackets(): Promise<{ message: string; count: number }> {
    const response = await api.post('/payroll-settings/tax-brackets/seed');
    return response.data;
  },

  // ==========================================
  // PTKP
  // ==========================================

  async getPtkpList(params?: { page?: number; limit?: number; company_id?: number; is_active?: boolean }): Promise<PaginatedResponse<PTKP>> {
    const response = await api.get('/payroll-settings/ptkp', { params });
    return response.data;
  },

  async getPtkpById(id: number): Promise<PTKP> {
    const response = await api.get(`/payroll-settings/ptkp/${id}`);
    return response.data.data || response.data;
  },

  async getPtkpByStatus(status: string): Promise<PTKP> {
    const response = await api.get(`/payroll-settings/ptkp/status/${status}`);
    return response.data.data || response.data;
  },

  async createPtkp(data: CreatePtkpDTO): Promise<PTKP> {
    const response = await api.post('/payroll-settings/ptkp', data);
    return response.data.data || response.data;
  },

  async updatePtkp(id: number, data: Partial<Omit<CreatePtkpDTO, 'status'>>): Promise<PTKP> {
    const response = await api.put(`/payroll-settings/ptkp/${id}`, data);
    return response.data.data || response.data;
  },

  async deletePtkp(id: number): Promise<void> {
    await api.delete(`/payroll-settings/ptkp/${id}`);
  },

  async seedPtkp(): Promise<{ message: string; count: number }> {
    const response = await api.post('/payroll-settings/ptkp/seed');
    return response.data;
  },

  // ==========================================
  // UTILITY
  // ==========================================

  async getTerRate(params: { gross_monthly: number; ptkp_status: string }): Promise<{ rate: number; category: string }> {
    const response = await api.get('/payroll-settings/calculate/ter', { params });
    return response.data;
  },

  async calculateProgressiveTax(params: { pkp: number }): Promise<{ tax: number; breakdown: Array<{ bracket: string; amount: number; tax: number }> }> {
    const response = await api.get('/payroll-settings/calculate/progressive', { params });
    return response.data;
  },

  async seedAllTaxData(): Promise<{
    ter_rates: { created: number; skipped: number };
    tax_brackets: { created: number; skipped: number };
    ptkp: { created: number; skipped: number };
  }> {
    const response = await api.post('/payroll-settings/seed-all', {});
    return response.data;
  },
};
