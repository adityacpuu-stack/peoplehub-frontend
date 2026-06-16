import api from './api';
import type { PaginatedResponse } from '@/types';

export interface Company {
  id: number;
  name: string;
  code: string;
  type: 'Holding' | 'Subsidiary' | 'Branch';
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  email_domain?: string;
  employee_count?: number;
  is_active: boolean;
  logo?: string;
  created_at: string;
  updated_at?: string;
  // Additional fields from backend
  legal_name?: string;
  company_type?: string;
  parent_company_id?: number | null;
  group_name?: string;
  city?: string;
  province?: string;
  industry?: string;
  status?: string;
  parent?: {
    id: number;
    name: string;
    code: string;
  } | null;
  _count?: {
    employees: number;
    departments: number;
    subsidiaries: number;
  };
}

// Backend response format
interface BackendCompany {
  id: number;
  name: string;
  code: string;
  legal_name?: string;
  company_type: string;
  parent_company_id?: number | null;
  group_name?: string;
  email?: string;
  email_domain?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  logo?: string;
  industry?: string;
  employee_count?: number;
  status: string;
  created_at: string;
  updated_at?: string;
  website?: string;
  parent?: {
    id: number;
    name: string;
    code: string;
  } | null;
  _count?: {
    employees: number;
    departments: number;
    subsidiaries: number;
  };
}

// Transform backend company to frontend format
function transformCompany(backend: BackendCompany): Company {
  // Map company_type to frontend type format
  const typeMap: Record<string, 'Holding' | 'Subsidiary' | 'Branch'> = {
    'holding': 'Holding',
    'subsidiary': 'Subsidiary',
    'branch': 'Branch',
  };

  return {
    ...backend,
    type: typeMap[backend.company_type?.toLowerCase()] || 'Subsidiary',
    is_active: backend.status === 'active',
    employee_count: backend._count?.employees || backend.employee_count || 0,
  };
}

// Inverse of transformCompany: FE shape → BE shape for create/update payloads.
// Prisma Company model expects company_type / tax_id / status, NOT type / npwp / is_active.
function toBackendCompany(input: Partial<Company> & { npwp?: string }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.code !== undefined) out.code = input.code;
  if (input.type !== undefined) out.company_type = String(input.type).toLowerCase();
  if (input.address !== undefined) out.address = input.address || undefined;
  if (input.phone !== undefined) out.phone = input.phone || undefined;
  if (input.email !== undefined) out.email = input.email || undefined;
  if (input.website !== undefined) out.website = input.website || undefined;
  if (input.email_domain !== undefined) out.email_domain = input.email_domain || undefined;
  if (input.npwp !== undefined) out.tax_id = input.npwp || undefined;
  if (input.is_active !== undefined) out.status = input.is_active ? 'active' : 'inactive';
  return out;
}

export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  company_type?: string;
  status?: string;
}

// Feature toggles interface
export interface CompanyFeatureToggles {
  id: number;
  name: string;
  code: string;
  attendance_enabled: boolean;
  leave_enabled: boolean;
  payroll_enabled: boolean;
  performance_enabled: boolean;
}

export interface CompanyWithFeatures extends CompanyFeatureToggles {
  company_type?: string;
  logo?: string;
  _count?: {
    employees: number;
  };
}

export interface CompanyOption {
  id: number;
  name: string;
  code: string;
}

export const companyService = {
  // Lightweight dropdown options ({id, name, code}, no pagination).
  // Prefer this over getAll() when you only need to populate a select.
  async getOptions(): Promise<CompanyOption[]> {
    // BE has NO /companies/options route → it falls through to /companies/:id
    // with id="options" → NaN → getById throws ForbiddenError("Access denied to
    // this company") for non-Super-Admins (NaN not in accessibleCompanyIds).
    // Use the working list endpoint and project to {id, name, code}.
    const response = await api.get('/companies', { params: { limit: 200 } });
    const list = (response.data?.data ?? []) as Array<{ id: number; name: string; code: string }>;
    return list.map((c) => ({ id: c.id, name: c.name, code: c.code }));
  },

  async getAll(params: CompanyQueryParams = {}): Promise<PaginatedResponse<Company>> {
    const response = await api.get('/companies', { params });
    // Transform each company from backend format
    const transformedData = response.data.data.map(transformCompany);
    return {
      ...response.data,
      data: transformedData,
    };
  },

  // Alias for getAll - returns just the data array for simple use cases
  async getCompanies(): Promise<Company[]> {
    const response = await api.get('/companies');
    return (response.data.data || []).map(transformCompany);
  },

  async getById(id: number): Promise<Company> {
    const response = await api.get(`/companies/${id}`);
    return transformCompany(response.data.data || response.data);
  },

  async create(data: Partial<Company> & { npwp?: string }): Promise<Company> {
    const response = await api.post('/companies', toBackendCompany(data));
    return transformCompany(response.data.data || response.data);
  },

  async update(id: number, data: Partial<Company> & { npwp?: string }): Promise<Company> {
    const response = await api.put(`/companies/${id}`, toBackendCompany(data));
    return transformCompany(response.data.data || response.data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/companies/${id}`);
  },

  // Feature Toggles (Super Admin Only)
  async getFeatureTogglesList(): Promise<CompanyWithFeatures[]> {
    const response = await api.get('/companies/feature-toggles/all');
    return response.data;
  },

  async getFeatureToggles(id: number): Promise<CompanyFeatureToggles> {
    const response = await api.get(`/companies/${id}/feature-toggles`);
    return response.data;
  },

  async updateFeatureToggles(
    id: number,
    data: Partial<Omit<CompanyFeatureToggles, 'id' | 'name' | 'code'>>
  ): Promise<CompanyFeatureToggles> {
    const response = await api.put(`/companies/${id}/feature-toggles`, data);
    return response.data;
  },
};
