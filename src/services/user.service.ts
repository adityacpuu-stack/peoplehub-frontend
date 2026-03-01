import api from './api';

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
  updated_at: string;
  employee: {
    id: number;
    employee_id: string;
    name: string;
    email: string;
    personal_email: string | null;
    company: {
      id: number;
      name: string;
      code: string;
      email_domain: string | null;
    } | null;
    department: {
      id: number;
      name: string;
    } | null;
    position: {
      id: number;
      name: string;
    } | null;
  } | null;
  roles: {
    id: number;
    name: string;
    level: number;
  }[];
}

export interface UserDetail extends User {
  two_factor_enabled: boolean;
  failed_login_attempts: number;
  account_locked_until: string | null;
  password_expires_at: string | null;
  force_password_change: boolean;
  last_password_change: string | null;
  language: string;
  timezone: string;
  theme: string;
  permissions: {
    id: number;
    name: string;
    group: string;
  }[];
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  role_id?: number;
  company_id?: number;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  employee_id?: number;
  role_ids?: number[];
  is_active?: boolean;
}

export interface UpdateUserDTO {
  email?: string;
  password?: string;
  is_active?: boolean;
  role_ids?: number[];
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  recentLogins: number;
  roleDistribution: {
    role: string;
    count: number;
  }[];
}

export interface M365License {
  skuId: string;
  skuPartNumber: string;
  displayName: string;
  totalUnits: number;
  consumedUnits: number;
  availableUnits: number;
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

export const userService = {
  getAll: async (query: UserListQuery = {}): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.search) params.append('search', query.search);
    if (query.is_active !== undefined) params.append('is_active', String(query.is_active));
    if (query.role_id) params.append('role_id', String(query.role_id));
    if (query.company_id) params.append('company_id', String(query.company_id));

    const response = await api.get(`/users?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<UserDetail> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserDTO): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id: number, data: UpdateUserDTO): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  sendCredentials: async (id: number, username?: string, licenseSkuId?: string): Promise<{ success: boolean; officeEmail: string; sentTo: string; message: string }> => {
    const response = await api.post(`/users/${id}/send-credentials`, { username, licenseSkuId });
    return response.data;
  },

  getM365Licenses: async (): Promise<{ available: boolean; licenses: M365License[] }> => {
    const response = await api.get('/users/m365-licenses');
    return response.data;
  },

  toggleStatus: async (id: number): Promise<User> => {
    const response = await api.patch(`/users/${id}/toggle-status`);
    return response.data;
  },

  getStats: async (): Promise<UserStats> => {
    const response = await api.get('/users/stats');
    return response.data;
  },
};
