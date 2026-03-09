import api from './api';

export interface KPI {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  department_id: number | null;
  position_id: number | null;
  unit_of_measure: string | null;
  target_frequency: string | null;
  target_type: string | null;
  weight: number | null;
  calculation_method: string | null;
  formula: string | null;
  data_source: string | null;
  benchmark_value: number | null;
  threshold_red: number | null;
  threshold_yellow: number | null;
  threshold_green: number | null;
  is_active: boolean;
  effective_from: string | null;
  effective_until: string | null;
  department: { id: number; name: string; code: string | null } | null;
  position: { id: number; name: string; code: string | null } | null;
  _count: { goals: number };
  created_at: string;
  updated_at: string;
}

export interface KPIStatistics {
  total_kpis: number;
  by_category: { category: string | null; count: number }[];
  by_frequency: { frequency: string | null; count: number }[];
}

interface KPIListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  department_id?: number;
  is_active?: boolean;
}

export const kpiService = {
  list: async (query: KPIListQuery = {}): Promise<{ data: KPI[]; pagination: any }> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/kpis?${params.toString()}`);
    return { data: response.data.data, pagination: response.data.pagination };
  },

  getById: async (id: number): Promise<KPI> => {
    const response = await api.get(`/kpis/${id}`);
    return response.data;
  },

  getStatistics: async (): Promise<KPIStatistics> => {
    const response = await api.get('/kpis/statistics');
    return response.data;
  },

  getByCategory: async (category: string): Promise<KPI[]> => {
    const response = await api.get(`/kpis/category/${category}`);
    return response.data;
  },
};
