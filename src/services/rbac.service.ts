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

export const rbacService = {
  // Roles
  getRoles: async (): Promise<PaginatedResponse<Role>> => {
    const response = await api.get('/rbac/roles');
    return response.data;
  },

  getRoleById: async (id: number): Promise<Role> => {
    const response = await api.get(`/rbac/roles/${id}`);
    return response.data;
  },

  createRole: async (data: { name: string; description?: string; level?: number }): Promise<Role> => {
    const response = await api.post('/rbac/roles', data);
    return response.data;
  },

  updateRole: async (id: number, data: { name?: string; description?: string; level?: number }): Promise<Role> => {
    const response = await api.put(`/rbac/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/rbac/roles/${id}`);
    return response.data;
  },

  // Permissions
  getPermissions: async (): Promise<PaginatedResponse<Permission>> => {
    const response = await api.get('/rbac/permissions');
    return response.data;
  },

  getPermissionGroups: async (): Promise<string[]> => {
    const response = await api.get('/rbac/permissions/groups');
    return response.data;
  },

  // Role-Permission assignments
  assignPermissionsToRole: async (roleId: number, permissionIds: number[]): Promise<void> => {
    await api.post('/rbac/roles/assign-permissions', { roleId, permissionIds });
  },

  // User-Role assignments
  getUserRoles: async (userId: number): Promise<Role[]> => {
    const response = await api.get(`/rbac/users/${userId}/roles`);
    return response.data;
  },

  assignRolesToUser: async (userId: number, roleIds: number[]): Promise<void> => {
    await api.post('/rbac/users/assign-roles', { userId, roleIds });
  },

  // User-Permission assignments
  getUserPermissions: async (userId: number): Promise<Permission[]> => {
    const response = await api.get(`/rbac/users/${userId}/permissions`);
    return response.data;
  },

  // Check permission
  checkPermission: async (userId: number, permissionName: string): Promise<boolean> => {
    const response = await api.get(`/rbac/check/${userId}/${permissionName}`);
    return response.data.hasPermission;
  },
};
