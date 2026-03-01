import { useEffect, useState, useCallback } from 'react';
import {
  UserCog,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Badge,
  PageSpinner,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { userService, type User, type UserStats, type CreateUserDTO, type UpdateUserDTO } from '@/services/user.service';
import { rbacService } from '@/services/rbac.service';
import { employeeService } from '@/services/employee.service';

interface Role {
  id: number;
  name: string;
  level: number;
}

interface UnlinkedEmployee {
  id: number;
  employee_id?: string | null;
  name: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Roles and employees for form
  const [roles, setRoles] = useState<Role[]>([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [formModal, setFormModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [credentialModal, setCredentialModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [credentialUsername, setCredentialUsername] = useState('');
  const [credentialLicenseSkuId, setCredentialLicenseSkuId] = useState('');
  const [m365Licenses, setM365Licenses] = useState<{ available: boolean; licenses: import('@/services/user.service').M365License[] }>({ available: false, licenses: [] });
  const [m365UserStatus, setM365UserStatus] = useState<import('@/services/user.service').M365UserStatus>({ available: false, exists: false, licenses: [] });
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    employee_id: number | null;
    role_ids: number[];
    is_active: boolean;
  }>({
    email: '',
    password: '',
    employee_id: null,
    role_ids: [],
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await userService.getAll({
        page,
        limit,
        search: search || undefined,
      });
      setUsers(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal memuat data users');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  const fetchStats = async () => {
    try {
      const statsData = await userService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await rbacService.getRoles();
      setRoles(response.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchUnlinkedEmployees = async () => {
    try {
      // Fetch all employees - backend doesn't support has_user filter yet
      // For now, just fetch employees and let user select any
      const response = await employeeService.getAll({ page: 1, limit: 100 });
      setUnlinkedEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenCreateModal = async () => {
    setFormData({
      email: '',
      password: '',
      employee_id: null,
      role_ids: [],
      is_active: true,
    });
    await Promise.all([fetchRoles(), fetchUnlinkedEmployees()]);
    setFormModal({ open: true, user: null });
  };

  const handleOpenEditModal = async (user: User) => {
    setFormData({
      email: user.email,
      password: '',
      employee_id: user.employee?.id || null,
      role_ids: user.roles.map((r) => r.id),
      is_active: user.is_active,
    });
    await fetchRoles();
    setFormModal({ open: true, user });
  };

  const handleSubmit = async () => {
    if (!formData.email) {
      toast.error('Email harus diisi');
      return;
    }

    if (!formModal.user && !formData.password) {
      toast.error('Password harus diisi');
      return;
    }

    try {
      setIsSubmitting(true);

      if (formModal.user) {
        // Update
        const updateData: UpdateUserDTO = {
          email: formData.email,
          is_active: formData.is_active,
          role_ids: formData.role_ids,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await userService.update(formModal.user.id, updateData);
        toast.success('User berhasil diupdate');
      } else {
        // Create
        const createData: CreateUserDTO = {
          email: formData.email,
          password: formData.password,
          is_active: formData.is_active,
          role_ids: formData.role_ids,
        };
        if (formData.employee_id) {
          createData.employee_id = formData.employee_id;
        }
        await userService.create(createData);
        toast.success('User berhasil dibuat');
      }

      setFormModal({ open: false, user: null });
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menyimpan user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;

    try {
      await userService.delete(deleteModal.user.id);
      toast.success('User berhasil dihapus');
      setDeleteModal({ open: false, user: null });
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menghapus user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await userService.toggleStatus(user.id);
      toast.success(`Status user berhasil diubah`);
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengubah status');
    }
  };

  const handleOpenCredentialModal = async (user: User) => {
    // Auto-detect username from existing email
    const emailDomain = user.employee?.company?.email_domain;
    const currentEmail = user.email;
    let autoUsername = '';

    if (emailDomain && currentEmail && !currentEmail.endsWith('@temp.local')) {
      // Extract username from existing email if domain matches
      const emailParts = currentEmail.split('@');
      if (emailParts[1] === emailDomain) {
        autoUsername = emailParts[0];
      }
    }

    setCredentialUsername(autoUsername);
    setCredentialLicenseSkuId('');
    setM365UserStatus({ available: false, exists: false, licenses: [] });
    setCredentialModal({ open: true, user });

    // Fetch M365 licenses and user status in parallel
    const emailToCheck = autoUsername && emailDomain ? `${autoUsername}@${emailDomain}` : currentEmail;
    const validEmail = emailToCheck && !emailToCheck.endsWith('@temp.local') ? emailToCheck : null;

    try {
      const [licensesResult, userStatusResult] = await Promise.all([
        userService.getM365Licenses().catch(() => ({ available: false, licenses: [] as import('@/services/user.service').M365License[] })),
        validEmail
          ? userService.getM365UserStatus(validEmail).catch(() => ({ available: false, exists: false, licenses: [] as import('@/services/user.service').M365UserLicense[] }))
          : Promise.resolve({ available: false, exists: false, licenses: [] as import('@/services/user.service').M365UserLicense[] }),
      ]);
      setM365Licenses(licensesResult);
      setM365UserStatus(userStatusResult);
    } catch {
      setM365Licenses({ available: false, licenses: [] });
      setM365UserStatus({ available: false, exists: false, licenses: [] });
    }
  };

  const handleSendCredentials = async () => {
    if (!credentialModal.user) return;

    try {
      setIsSendingCredentials(true);
      const result = await userService.sendCredentials(
        credentialModal.user.id,
        credentialUsername || undefined,
        credentialLicenseSkuId || undefined,
      );
      toast.success(result.message || `Credentials sent to ${result.sentTo}`);
      setCredentialModal({ open: false, user: null });
      setCredentialUsername('');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengirim credentials');
    } finally {
      setIsSendingCredentials(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'Group CEO':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'CEO':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      case 'HR Manager':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
      case 'HR Staff':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white';
      case 'Manager':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading && users.length === 0) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage system users and their access</p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.total || 0}</p>
              </div>
              <UserCog className="h-10 w-10 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.active || 0}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-red-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Inactive</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.inactive || 0}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Recent Logins (7d)</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.recentLogins || 0}</p>
              </div>
              <Shield className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email, name, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
              />
            </div>
            <button
              onClick={() => { fetchUsers(); fetchStats(); }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800">User List</CardTitle>
            <span className="text-sm text-gray-500">
              Showing {users.length} of {total} users
            </span>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="font-semibold text-gray-700">User</TableHead>
              <TableHead className="font-semibold text-gray-700">Employee</TableHead>
              <TableHead className="font-semibold text-gray-700">Roles</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-gray-700">Last Login</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableEmpty message="No users found" />
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm text-gray-900">{user.email}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Created {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.employee ? (
                      <div>
                        <p className="font-medium text-gray-900">{user.employee.name}</p>
                        <span className="text-xs font-mono text-gray-500">{user.employee.employee_id}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No employee linked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${getRoleBadgeColor(role.name)}`}
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className="focus:outline-none"
                    >
                      <Badge variant={user.is_active ? 'success' : 'error'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {user.last_login_at
                        ? formatDate(user.last_login_at)
                        : 'Never'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                        title="Send Credentials"
                        onClick={() => handleOpenCredentialModal(user)}
                      >
                        <Send className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors group"
                        title="Edit"
                        onClick={() => handleOpenEditModal(user)}
                      >
                        <Edit className="h-4 w-4 text-gray-400 group-hover:text-slate-600" />
                      </button>
                      <button
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
                        title="Delete"
                        onClick={() => setDeleteModal({ open: true, user })}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {formModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setFormModal({ open: false, user: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {formModal.user ? 'Edit User' : 'Create New User'}
              </h3>
              <button
                onClick={() => setFormModal({ open: false, user: null })}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {formModal.user && <span className="text-gray-400">(kosongkan jika tidak diubah)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Employee (only for create) */}
              {!formModal.user && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link to Employee <span className="text-gray-400">(optional)</span>
                  </label>
                  <select
                    value={formData.employee_id || ''}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No employee</option>
                    {unlinkedEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.role_ids.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, role_ids: [...formData.role_ids, role.id] });
                          } else {
                            setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== role.id) });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(role.name)}`}>
                        {role.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setFormModal({ open: false, user: null })}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-800"
              >
                {isSubmitting ? 'Saving...' : formModal.user ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Credentials Confirmation Modal */}
      {credentialModal.open && credentialModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSendingCredentials && setCredentialModal({ open: false, user: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 border-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Send Credentials</h3>
                <p className="text-sm text-gray-500">
                  {credentialModal.user.employee?.name || credentialModal.user.email}
                </p>
              </div>
            </div>

            {/* Office Email - auto-detected or input */}
            {credentialModal.user.employee?.company?.email_domain && (() => {
              const emailDomain = credentialModal.user.employee?.company?.email_domain || '';
              const currentEmail = credentialModal.user.email;
              const hasExistingEmail = currentEmail && !currentEmail.endsWith('@temp.local') && currentEmail.endsWith(`@${emailDomain}`);

              return hasExistingEmail ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Office Email
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="font-mono text-sm text-green-800">{currentEmail}</span>
                  </div>
                  {m365UserStatus.exists && m365UserStatus.licenses.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m365UserStatus.licenses.map((lic) => (
                        <span key={lic.skuId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {lic.displayName}
                        </span>
                      ))}
                    </div>
                  ) : m365UserStatus.exists ? (
                    <p className="text-xs text-amber-600 mt-1">M365 account exists but has no license assigned</p>
                  ) : (
                    <p className="text-xs text-green-600 mt-1">M365 account exists, will only send PeopleHub credentials</p>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Office Email
                  </label>
                  <div className="flex items-center gap-0">
                    <input
                      type="text"
                      value={credentialUsername}
                      onChange={(e) => setCredentialUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder="username"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg text-sm text-gray-500">
                      @{emailDomain}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Will create Microsoft 365 mailbox & set as login email
                  </p>
                </div>
              );
            })()}

            {/* M365 License Picker */}
            {m365Licenses.available && m365Licenses.licenses.length > 0 && credentialModal.user.employee?.company?.email_domain && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  M365 License
                </label>
                <select
                  value={credentialLicenseSkuId}
                  onChange={(e) => setCredentialLicenseSkuId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">No license (Unlicensed)</option>
                  {m365Licenses.licenses.map((lic) => (
                    <option key={lic.skuId} value={lic.skuId} disabled={lic.availableUnits <= 0}>
                      {lic.displayName} ({lic.availableUnits}/{lic.totalUnits} available)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Assign Microsoft 365 license to user
                </p>
              </div>
            )}

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Current login</span>
                <span className="font-mono text-gray-700">{credentialModal.user.email}</span>
              </div>
              {credentialUsername && credentialModal.user.employee?.company?.email_domain &&
                credentialModal.user.email !== `${credentialUsername}@${credentialModal.user.employee.company.email_domain}` && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">New login</span>
                  <span className="font-mono text-blue-600 font-medium">
                    {credentialUsername}@{credentialModal.user.employee.company.email_domain}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Credential sent to</span>
                {credentialModal.user.employee?.personal_email ? (
                  <span className="font-mono text-green-700">{credentialModal.user.employee.personal_email}</span>
                ) : (
                  <span className="font-mono text-red-500">Not set</span>
                )}
              </div>
            </div>

            {!credentialModal.user.employee?.personal_email && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                Personal email belum diisi. Update data employee terlebih dahulu sebelum mengirim credentials.
              </p>
            )}

            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-6">
              A new temporary password will be generated. The user must change it on first login.
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setCredentialModal({ open: false, user: null }); setCredentialUsername(''); setCredentialLicenseSkuId(''); }}
                disabled={isSendingCredentials}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <button
                onClick={handleSendCredentials}
                disabled={isSendingCredentials || !credentialModal.user?.employee?.personal_email}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingCredentials ? 'Sending...' : 'Send Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteModal({ open: false, user: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 border-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteModal.user.email}</span>?
              This will revoke all access.
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, user: null })}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md shadow-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
