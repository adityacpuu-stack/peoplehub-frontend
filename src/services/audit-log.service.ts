import api from './api';

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_email: string | null;
  employee_name: string | null;
  action: string;
  model: string | null;
  model_id: number | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  method: string | null;
  url: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
  user?: {
    id: number;
    email: string;
    employee?: {
      id: number;
      name: string;
      employee_id: string;
    };
  };
}

export interface AuditLogListQuery {
  page?: number;
  limit?: number;
  user_id?: number;
  action?: string;
  model?: string;
  model_id?: number;
  start_date?: string;
  end_date?: string;
  ip_address?: string;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  pagination: AuditLogPagination;
}

export interface AuditStatistics {
  total_logs: number;
  by_action: { action: string; count: number }[];
  by_model: { model: string | null; count: number }[];
  by_user: { user_email: string | null; count: number }[];
  daily_activity: { date: string; count: number }[];
}

export const auditLogService = {
  // GET /audit-logs → { success, data, pagination }
  list: async (query: AuditLogListQuery = {}): Promise<AuditLogListResponse> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/audit-logs?${params.toString()}`);
    // Backend returns { success, data, pagination }
    return { data: response.data.data, pagination: response.data.pagination };
  },

  // GET /audit-logs/:id → { success, data }
  getById: async (id: number): Promise<AuditLog> => {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data.data;
  },

  // GET /audit-logs/recent → { success, data }
  getRecent: async (limit: number = 50): Promise<AuditLog[]> => {
    const response = await api.get('/audit-logs/recent', { params: { limit } });
    return response.data.data;
  },

  // GET /audit-logs/statistics → { success, data }
  getStatistics: async (query?: { start_date?: string; end_date?: string }): Promise<AuditStatistics> => {
    const response = await api.get('/audit-logs/statistics', { params: query });
    return response.data.data;
  },

  // GET /audit-logs/export → { success, data }
  export: async (query: AuditLogListQuery = {}): Promise<AuditLog[]> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/audit-logs/export?${params.toString()}`);
    return response.data.data;
  },
};
