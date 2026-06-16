import api from './api';

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  description: string | null;
  level: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  _count?: { userRoles: number; rolePermissions: number };
}

export interface RoleDetail extends Role {
  rolePermissions: { permission: Permission }[];
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  description: string | null;
  group: string;
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

export interface PaginatedPermissionsResponse extends PaginatedResponse<Permission> {
  grouped?: Record<string, Permission[]>;
}

export interface RoleOption {
  id: number;
  name: string;
  level: number;
}

export const rbacService = {
  // Lightweight dropdown options ({id, name, level}, no pagination).
  // Use this for role-selection dropdowns instead of getRoles().
  getRolesOptions: async (): Promise<RoleOption[]> => {
    const response = await api.get('/rbac/roles/options');
    return response.data.data;
  },

  // Roles
  getRoles: async (): Promise<PaginatedResponse<Role>> => {
    const response = await api.get('/rbac/roles');
    // BE returns pagination at top level, not under `meta` — tolerate both.
    return {
      data: response.data.data,
      pagination: response.data.meta?.pagination ?? response.data.pagination,
    };
  },

  getRoleById: async (id: number): Promise<RoleDetail> => {
    const response = await api.get(`/rbac/roles/${id}`);
    return response.data.data;
  },

  createRole: async (data: { name: string; description?: string; level?: number }): Promise<Role> => {
    const response = await api.post('/rbac/roles', data);
    return response.data.data;
  },

  updateRole: async (id: number, data: { name?: string; description?: string; level?: number }): Promise<Role> => {
    const response = await api.put(`/rbac/roles/${id}`, data);
    return response.data.data;
  },

  deleteRole: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/rbac/roles/${id}`);
    return response.data;
  },

  // Permissions
  getPermissions: async (): Promise<PaginatedPermissionsResponse> => {
    const response = await api.get('/rbac/permissions');
    // BE returns { data, grouped, pagination } at top level, not under `meta`.
    return {
      data: response.data.data,
      pagination: response.data.meta?.pagination ?? response.data.pagination,
      grouped: response.data.meta?.grouped ?? response.data.grouped,
    };
  },

  getPermissionGroups: async (): Promise<string[]> => {
    const response = await api.get('/rbac/permissions/groups');
    return response.data.data;
  },

  // Role-Permission assignments
  assignPermissionsToRole: async (roleId: number, permissionIds: number[]): Promise<void> => {
    await api.post('/rbac/roles/assign-permissions', { role_id: roleId, permission_ids: permissionIds });
  },

  // User-Role assignments
  getUserRoles: async (userId: number): Promise<Role[]> => {
    const response = await api.get(`/rbac/users/${userId}/roles`);
    return response.data.data;
  },

  assignRolesToUser: async (userId: number, roleIds: number[]): Promise<void> => {
    await api.post('/rbac/users/assign-roles', { userId, roleIds });
  },

  // User-Permission assignments
  getUserPermissions: async (userId: number): Promise<Permission[]> => {
    const response = await api.get(`/rbac/users/${userId}/permissions`);
    return response.data.data;
  },

  // Check permission
  checkPermission: async (userId: number, permissionName: string): Promise<boolean> => {
    const response = await api.get(`/rbac/check/${userId}/${permissionName}`);
    return response.data.data.has_permission;
  },
};
