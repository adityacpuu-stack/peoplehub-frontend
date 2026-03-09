import { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Plus,
  Edit,
  Trash2,
  Key,
  Users,
  Lock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  PageSpinner,
} from '@/components/ui';
import { rbacService, type Role, type Permission } from '@/services/rbac.service';
import toast from 'react-hot-toast';

interface PermissionGroup {
  module: string;
  label: string;
  permissions: Permission[];
}

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        rbacService.getRoles(),
        rbacService.getPermissions(),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);
    try {
      // For Super Admin with wildcard, show all permissions
      const userPerms = await rbacService.getUserPermissions(role.id);
      setRolePermissions(userPerms);
    } catch {
      setRolePermissions([]);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.role) return;
    setDeleting(true);
    try {
      await rbacService.deleteRole(deleteModal.role.id);
      toast.success('Role deleted');
      setDeleteModal({ open: false, role: null });
      if (selectedRole?.id === deleteModal.role.id) setSelectedRole(null);
      fetchData();
    } catch {
      toast.error('Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  // Group permissions by module
  const permissionGroups: PermissionGroup[] = permissions.reduce<PermissionGroup[]>((groups, perm) => {
    const module = perm.group || perm.name.split('.')[0] || 'other';
    const existing = groups.find((g) => g.module === module);
    if (existing) {
      existing.permissions.push(perm);
    } else {
      groups.push({
        module,
        label: module.charAt(0).toUpperCase() + module.slice(1).replace(/_/g, ' '),
        permissions: [perm],
      });
    }
    return groups;
  }, []);

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      role.description?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleModule = (module: string) => {
    setExpandedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const totalUsers = roles.reduce((acc, role) => acc + ((role as any).user_count || 0), 0);
  const systemRoles = roles.filter((r) => r.is_system).length;

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 mt-1">Manage user roles and access control</p>
        </div>
        <Button className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md">
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Roles</p>
                <p className="text-3xl font-bold text-white mt-1">{roles.length}</p>
              </div>
              <Shield className="h-10 w-10 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">System Roles</p>
                <p className="text-3xl font-bold text-white mt-1">{systemRoles}</p>
              </div>
              <Lock className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Custom Roles</p>
                <p className="text-3xl font-bold text-white mt-1">{roles.length - systemRoles}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Permissions</p>
                <p className="text-3xl font-bold text-white mt-1">{permissions.length}</p>
              </div>
              <Key className="h-10 w-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Split View */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-800">Roles</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                {filteredRoles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      selectedRole?.id === role.id
                        ? 'border-slate-300 bg-slate-50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            role.level === 1
                              ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                              : role.level <= 3
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                              : role.level <= 5
                              ? 'bg-gradient-to-br from-cyan-500 to-blue-500'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}
                        >
                          <Shield className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900">{role.name}</span>
                      </div>
                      {role.is_system && <Lock className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{role.description || 'No description'}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">Level {role.level}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Panel */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-800">
                  {selectedRole ? `${selectedRole.name} Permissions` : 'Select a Role'}
                </CardTitle>
                {selectedRole && !selectedRole.is_system && (
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors group">
                      <Edit className="h-4 w-4 text-gray-400 group-hover:text-slate-600" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
                      onClick={() => setDeleteModal({ open: true, role: selectedRole })}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {selectedRole ? (
                <div className="space-y-4">
                  {/* Role Info */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                          selectedRole.level === 1
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                            : 'bg-gradient-to-br from-slate-600 to-slate-700'
                        }`}
                      >
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedRole.name}</h3>
                        <p className="text-sm text-gray-500">{selectedRole.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <Badge variant={selectedRole.is_system ? 'warning' : 'success'}>
                        {selectedRole.is_system ? 'System Role' : 'Custom Role'}
                      </Badge>
                      <span className="text-sm text-gray-500">Level {selectedRole.level}</span>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-2">
                    {selectedRole.level === 1 ? (
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Key className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-purple-900">Full Access</p>
                            <p className="text-sm text-purple-600">
                              This role has all permissions in the system
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      permissionGroups.map((group) => {
                        const grantedInGroup = group.permissions.filter((p) =>
                          rolePermissions.some((rp) => rp.id === p.id || rp.name === p.name)
                        );
                        return (
                          <div key={group.module} className="border border-gray-100 rounded-xl overflow-hidden">
                            <button
                              onClick={() => toggleModule(group.module)}
                              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {expandedModules.includes(group.module) ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="font-medium text-gray-900">{group.label}</span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {grantedInGroup.length} / {group.permissions.length}
                              </span>
                            </button>
                            {expandedModules.includes(group.module) && (
                              <div className="px-4 pb-4 space-y-2">
                                {group.permissions.map((perm) => {
                                  const hasPermission = rolePermissions.some(
                                    (rp) => rp.id === perm.id || rp.name === perm.name
                                  );
                                  return (
                                    <div
                                      key={perm.id}
                                      className={`flex items-center justify-between p-3 rounded-lg ${
                                        hasPermission ? 'bg-green-50' : 'bg-gray-50'
                                      }`}
                                    >
                                      <div>
                                        <span className={`text-sm ${hasPermission ? 'text-green-700' : 'text-gray-500'}`}>
                                          {perm.description || perm.name}
                                        </span>
                                        <p className="text-xs text-gray-400 font-mono">{perm.name}</p>
                                      </div>
                                      {hasPermission ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a role to view its permissions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteModal({ open: false, role: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 border-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Role</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the{' '}
              <span className="font-semibold text-gray-900">{deleteModal.role.name}</span> role?
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, role: null })}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md shadow-red-500/25 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
