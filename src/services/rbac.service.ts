import api from './api';

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  description: string | null;
  level: number | null;
  is_system: boolean | null;
  /** 'legacy' = existing role rules; 'enforced' = only assigned covered actions. Absent on older servers. */
  permission_mode?: PermissionMode | string;
  created_at: string;
  updated_at: string;
  _count?: { userRoles: number; rolePermissions: number };
}

export type PermissionMode = 'legacy' | 'enforced';

/** A covered action key the server enforces, and the built-in roles that can ever use it. */
export interface ActionMetadata {
  key: string;
  group: string;
  description: string;
  eligible_roles: string[];
}

export interface ActionCatalog {
  modes: PermissionMode[];
  actions: ActionMetadata[];
}

export interface RoleDetail extends Role {
  rolePermissions: { permission: Permission }[];
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  description: string | null;
  group: string | null;
  /** True when the server enforces this exact key for enforced roles. */
  action_supported?: boolean;
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

// These endpoints paginate even when used as a catalog. Never use a single
// large limit as a substitute for following the server's pagination contract.
async function collectPages<T extends { id: number }>(fetchPage: (page: number) => Promise<PaginatedResponse<T>>): Promise<T[]> {
  const records = new Map<number, T>();
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    const pagination = result.pagination;
    if (!Array.isArray(result.data) || !pagination || pagination.page !== page ||
        !Number.isInteger(pagination.totalPages) || pagination.totalPages < 0) {
      throw new Error('Invalid RBAC pagination');
    }
    const previousSize = records.size;
    result.data.forEach(record => records.set(record.id, record));
    if (page >= pagination.totalPages) return [...records.values()];
    if (records.size === previousSize) throw new Error('Incomplete RBAC catalog');
  }
}

export const rbacService = {
  // Lightweight dropdown options ({id, name, level}, no pagination).
  // Use this for role-selection dropdowns instead of getRoles().
  getRolesOptions: async (): Promise<RoleOption[]> => {
    const list = await rbacService.getAllRoles();
    return list.map((r) => ({ id: r.id, name: r.name, level: r.level ?? 0 }));
  },

  // Roles
  getRoles: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Role>> => {
    const response = await api.get('/rbac/roles', { params });
    // BE returns pagination at top level, not under `meta` — tolerate both.
    return {
      data: response.data.data,
      pagination: response.data.meta?.pagination ?? response.data.pagination,
    };
  },

  getAllRoles: (): Promise<Role[]> => collectPages(page => rbacService.getRoles({ page, limit: 100 })),

  getRoleById: async (id: number): Promise<RoleDetail> => {
    const response = await api.get(`/rbac/roles/${id}`);
    return response.data?.data ?? response.data;
  },

  createRole: async (data: { name: string; description?: string; level?: number }): Promise<Role> => {
    const response = await api.post('/rbac/roles', data);
    return response.data?.data ?? response.data;
  },

  updateRole: async (id: number, data: { name?: string; description?: string; level?: number }): Promise<Role> => {
    const response = await api.put(`/rbac/roles/${id}`, data);
    return response.data?.data ?? response.data;
  },

  deleteRole: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/rbac/roles/${id}`);
    return response.data;
  },

  // Permissions
  getPermissions: async (params?: { page?: number; limit?: number }): Promise<PaginatedPermissionsResponse> => {
    const response = await api.get('/rbac/permissions', { params });
    // BE returns { data, grouped, pagination } at top level, not under `meta`.
    return {
      data: response.data.data,
      pagination: response.data.meta?.pagination ?? response.data.pagination,
      grouped: response.data.meta?.grouped ?? response.data.grouped,
    };
  },

  getAllPermissions: (): Promise<Permission[]> => collectPages(page => rbacService.getPermissions({ page, limit: 100 })),

  getPermissionGroups: async (): Promise<string[]> => {
    const response = await api.get('/rbac/permissions/groups');
    return response.data?.data ?? response.data;
  },

  // Covered action keys + role eligibility ceilings (server source of truth).
  getActionCatalog: async (): Promise<ActionCatalog> => {
    const response = await api.get('/rbac/permissions/actions');
    return response.data?.data ?? response.data;
  },

  // Additively register covered action keys as permissions. No grants, no mode change.
  syncActionCatalog: async (): Promise<{ created: string[]; existing: string[]; total: number }> => {
    const response = await api.post('/rbac/permissions/sync-catalog');
    return response.data?.data ?? response.data;
  },

  // Role-Permission assignments. The permission set (and optional mode) is
  // replaced atomically in one server transaction.
  assignPermissionsToRole: async (roleId: number, permissionIds: number[], permissionMode?: PermissionMode): Promise<RoleDetail | undefined> => {
    const response = await api.post('/rbac/roles/assign-permissions', {
      role_id: roleId, permission_ids: permissionIds,
      ...(permissionMode ? { permission_mode: permissionMode } : {}),
    });
    return response.data?.data ?? response.data;
  },

  // User-Role assignments
  getUserRoles: async (userId: number): Promise<RoleOption[]> => {
    const response = await api.get(`/rbac/users/${userId}/roles`);
    const assignments: { role: RoleOption }[] = response.data?.data ?? response.data;
    return assignments.map(assignment => assignment.role);
  },

  assignRolesToUser: async (userId: number, roleIds: number[]): Promise<void> => {
    await api.post('/rbac/users/assign-roles', { user_id: userId, role_ids: roleIds });
  },

  // User-Permission assignments
  getUserPermissions: async (userId: number): Promise<Permission[]> => {
    const response = await api.get(`/rbac/users/${userId}/permissions`);
    return response.data?.data ?? response.data;
  },

  // Check permission
  checkPermission: async (userId: number, permissionName: string): Promise<boolean> => {
    const response = await api.get(`/rbac/check/${userId}/${permissionName}`);
    return (response.data?.data ?? response.data)?.has_permission ?? false;
  },
};
