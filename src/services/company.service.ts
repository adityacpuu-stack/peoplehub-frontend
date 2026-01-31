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

export const companyService = {
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

  async create(data: Partial<Company>): Promise<Company> {
    const response = await api.post('/companies', data);
    return transformCompany(response.data.data || response.data);
  },

  async update(id: number, data: Partial<Company>): Promise<Company> {
    const response = await api.put(`/companies/${id}`, data);
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
