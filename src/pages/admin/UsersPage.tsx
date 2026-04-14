import { useEffect, useState, useCallback, useRef } from 'react';
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
  Loader2,
} from 'lucide-react';
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

const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all';

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700',
  'Group CEO': 'bg-red-100 text-red-700',
  'CEO': 'bg-orange-100 text-orange-700',
  'HR Manager': 'bg-blue-100 text-blue-700',
  'HR Staff': 'bg-cyan-100 text-cyan-700',
  'Manager': 'bg-amber-100 text-amber-700',
};

const getRoleColor = (name: string) => ROLE_COLORS[name] ?? 'bg-gray-100 text-gray-600';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [roles, setRoles] = useState<Role[]>([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [formModal, setFormModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [credentialModal, setCredentialModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [credentialUsername, setCredentialUsername] = useState('');
  const [credentialLicenseSkuId, setCredentialLicenseSkuId] = useState('');
  const [m365Licenses, setM365Licenses] = useState<{ available: boolean; licenses: import('@/services/user.service').M365License[] }>({ available: false, licenses: [] });
  const [m365UserStatus, setM365UserStatus] = useState<import('@/services/user.service').M365UserStatus>({ available: false, exists: false, licenses: [] });
  const [m365UsernameStatus, setM365UsernameStatus] = useState<{ checking: boolean; exists: boolean | null; licenses: import('@/services/user.service').M365UserLicense[] }>({ checking: false, exists: null, licenses: [] });
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);

  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    employee_id: number | null;
    role_ids: number[];
    is_active: boolean;
  }>({ email: '', password: '', employee_id: null, role_ids: [], is_active: true });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await userService.getAll({ page, limit, search: searchRef.current || undefined });
      setUsers(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal memuat data users');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

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
      const response = await employeeService.getAll({ page: 1, limit: 100 });
      setUnlinkedEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  useEffect(() => { fetchUsers(); fetchStats(); }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchUsers();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const emailDomain = credentialModal.user?.employee?.company?.email_domain;
    if (!credentialUsername || !emailDomain) {
      setM365UsernameStatus({ checking: false, exists: null, licenses: [] });
      return;
    }
    setM365UsernameStatus({ checking: true, exists: null, licenses: [] });
    const timer = setTimeout(async () => {
      try {
        const email = `${credentialUsername}@${emailDomain}`;
        const status = await userService.getM365UserStatus(email);
        setM365UsernameStatus({ checking: false, exists: status.exists, licenses: status.licenses || [] });
      } catch {
        setM365UsernameStatus({ checking: false, exists: null, licenses: [] });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [credentialUsername, credentialModal.user]);

  const handleOpenCreateModal = async () => {
    setFormData({ email: '', password: '', employee_id: null, role_ids: [], is_active: true });
    await Promise.all([fetchRoles(), fetchUnlinkedEmployees()]);
    setFormModal({ open: true, user: null });
  };

  const handleOpenEditModal = async (user: User) => {
    setFormData({ email: user.email, password: '', employee_id: user.employee?.id || null, role_ids: user.roles.map((r) => r.id), is_active: user.is_active });
    await fetchRoles();
    setFormModal({ open: true, user });
  };

  const handleSubmit = async () => {
    if (!formData.email) { toast.error('Email harus diisi'); return; }
    if (!formModal.user && !formData.password) { toast.error('Password harus diisi'); return; }
    try {
      setIsSubmitting(true);
      if (formModal.user) {
        const updateData: UpdateUserDTO = { email: formData.email, is_active: formData.is_active, role_ids: formData.role_ids };
        if (formData.password) updateData.password = formData.password;
        await userService.update(formModal.user.id, updateData);
        toast.success('User berhasil diupdate');
      } else {
        const createData: CreateUserDTO = { email: formData.email, password: formData.password, is_active: formData.is_active, role_ids: formData.role_ids };
        if (formData.employee_id) createData.employee_id = formData.employee_id;
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
      toast.success('Status user berhasil diubah');
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengubah status');
    }
  };

  const handleOpenCredentialModal = async (user: User) => {
    const emailDomain = user.employee?.company?.email_domain;
    const currentEmail = user.email;
    let autoUsername = '';
    if (emailDomain && currentEmail && !currentEmail.endsWith('@temp.local')) {
      const emailParts = currentEmail.split('@');
      if (emailParts[1] === emailDomain) autoUsername = emailParts[0];
    }
    setCredentialUsername(autoUsername);
    setCredentialLicenseSkuId('');
    setM365UserStatus({ available: false, exists: false, licenses: [] });
    setCredentialModal({ open: true, user });
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
      const result = await userService.sendCredentials(credentialModal.user.id, credentialUsername || undefined, credentialLicenseSkuId || undefined);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Kelola akun dan hak akses sistem</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats?.total ?? 0, icon: UserCog, color: 'text-slate-600' },
          { label: 'Aktif', value: stats?.active ?? 0, icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'Nonaktif', value: stats?.inactive ?? 0, icon: XCircle, color: 'text-red-500' },
          { label: 'Login (7 hari)', value: stats?.recentLogins ?? 0, icon: Shield, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari email, nama, atau role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={() => { fetchUsers(); fetchStats(); }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-xs text-gray-400 ml-auto hidden sm:block">
            {users.length} dari {total} user
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['User', 'Karyawan', 'Role', 'Status', 'Last Login', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-center last:w-28">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <UserCog className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Tidak ada user ditemukan</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* User */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white ${user.email.endsWith('@temp.local') ? 'bg-amber-400' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
                          {user.email.endsWith('@temp.local') ? '?' : user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {user.email.endsWith('@temp.local') ? (
                            <p className="text-xs text-amber-600 italic">No email — kirim credentials</p>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <p className="text-sm text-gray-900 truncate">{user.email}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">Dibuat {formatDate(user.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    {/* Employee */}
                    <td className="px-5 py-3">
                      {user.employee ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.employee.name}</p>
                          <p className="text-xs font-mono text-gray-400">{user.employee.employee_id}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    {/* Roles */}
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : user.roles.map((role) => (
                          <span key={role.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role.name)}`}>
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    {/* Last Login */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {user.last_login_at ? formatDate(user.last_login_at) : 'Belum pernah'}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenCredentialModal(user)}
                          title="Kirim Credentials"
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors group"
                        >
                          <Send className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors group"
                        >
                          <Edit className="w-3.5 h-3.5 text-gray-400 group-hover:text-slate-700" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, user })}
                          title="Hapus"
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Halaman {page} dari {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {formModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFormModal({ open: false, user: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">{formModal.user ? 'Edit User' : 'Tambah User'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{formModal.user ? `Editing ${formModal.user.email}` : 'Buat akun user baru'}</p>
              </div>
              <button onClick={() => setFormModal({ open: false, user: null })} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={INPUT}
                  placeholder="user@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Password {formModal.user && <span className="normal-case text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={INPUT + ' pr-9'}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Employee (create only) */}
              {!formModal.user && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Link Karyawan <span className="normal-case font-normal text-gray-400">(opsional)</span>
                  </label>
                  <select
                    value={formData.employee_id || ''}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value ? parseInt(e.target.value) : null })}
                    className={INPUT}
                  >
                    <option value="">Tidak ada</option>
                    {unlinkedEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Roles */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Roles</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.role_ids.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) setFormData({ ...formData, role_ids: [...formData.role_ids, role.id] });
                          else setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== role.id) });
                        }}
                        className="w-3.5 h-3.5 rounded accent-slate-700"
                      />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role.name)}`}>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-3.5 h-3.5 rounded accent-slate-700"
                />
                <span className="text-sm text-gray-700">Aktifkan akun</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setFormModal({ open: false, user: null })}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Menyimpan...</> : formModal.user ? 'Update' : 'Buat User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Credentials Modal */}
      {credentialModal.open && credentialModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isSendingCredentials && setCredentialModal({ open: false, user: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Kirim Credentials</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{credentialModal.user.employee?.name || credentialModal.user.email}</p>
                </div>
              </div>
              <button onClick={() => { setCredentialModal({ open: false, user: null }); setCredentialUsername(''); setCredentialLicenseSkuId(''); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(() => {
                const emailDomain = credentialModal.user.employee?.company?.email_domain || '';
                const currentEmail = credentialModal.user.email;
                const hasOfficeEmail = emailDomain && currentEmail && !currentEmail.endsWith('@temp.local') && currentEmail.endsWith(`@${emailDomain}`);
                const hasNoOfficeEmail = !emailDomain || !currentEmail || currentEmail.endsWith('@temp.local') || !currentEmail.endsWith(`@${emailDomain}`);
                const personalEmail = credentialModal.user.employee?.personal_email;

                return (
                  <>
                    {/* Office Email Section */}
                    {hasOfficeEmail && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Office Email</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-mono text-sm text-emerald-800">{currentEmail}</span>
                        </div>
                        {m365UserStatus.exists && m365UserStatus.licenses.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {m365UserStatus.licenses.map((lic) => (
                              <span key={lic.skuId} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{lic.displayName}</span>
                            ))}
                          </div>
                        ) : m365UserStatus.exists ? (
                          <p className="text-xs text-amber-600 mt-1">M365 account ada tapi tidak ada lisensi</p>
                        ) : !m365UserStatus.available ? (
                          <p className="text-xs text-gray-400 mt-1">M365 integration belum dikonfigurasi</p>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">M365 account tidak ditemukan — akan dibuat saat kirim credentials</p>
                        )}
                      </div>
                    )}

                    {hasNoOfficeEmail && (
                      <div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl mb-3">
                          <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <span className="text-sm text-gray-600">Tidak ada office email</span>
                            {personalEmail && (
                              <p className="text-xs text-gray-400">Login via personal: <span className="font-mono">{personalEmail}</span></p>
                            )}
                          </div>
                        </div>
                        {emailDomain && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setCredentialUsername(credentialUsername ? '' : (credentialModal.user?.employee?.name?.split(' ')[0]?.toLowerCase() || ''))}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {credentialUsername ? 'Batal setup M365' : 'Setup office email & M365'}
                            </button>
                            {credentialUsername && (
                              <div className="mt-2">
                                <div className="flex items-center">
                                  <input
                                    type="text"
                                    value={credentialUsername}
                                    onChange={(e) => setCredentialUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                                    placeholder="username"
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-l-xl bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-sm text-gray-500">@{emailDomain}</span>
                                </div>
                                {m365UsernameStatus.checking ? (
                                  <p className="text-xs text-gray-400 mt-1">Memeriksa M365...</p>
                                ) : m365UsernameStatus.exists === true ? (
                                  <p className="text-xs text-amber-600 mt-1">⚠ Email sudah ada di M365 — akan dihubungkan ke akun existing</p>
                                ) : m365UsernameStatus.exists === false ? (
                                  <p className="text-xs text-emerald-600 mt-1">✓ Tersedia — akun M365 baru akan dibuat</p>
                                ) : (
                                  <p className="text-xs text-gray-400 mt-1">Akan membuat mailbox M365 dan set sebagai email login</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* M365 License */}
                    {m365Licenses.available && credentialModal.user.employee?.company?.email_domain && (credentialUsername || (credentialModal.user.email && !credentialModal.user.email.endsWith('@temp.local') && credentialModal.user.email.endsWith(`@${credentialModal.user.employee.company.email_domain}`))) && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">M365 License</label>
                        {credentialUsername && m365UsernameStatus.exists && m365UsernameStatus.licenses.length > 0 ? (
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs font-medium text-blue-700">Sudah berlisensi:</p>
                            {m365UsernameStatus.licenses.map((lic) => (
                              <p key={lic.skuId} className="text-sm text-blue-600">{lic.displayName}</p>
                            ))}
                          </div>
                        ) : m365UserStatus.licenses.length > 0 ? (
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs font-medium text-blue-700">Sudah berlisensi:</p>
                            {m365UserStatus.licenses.map((lic) => (
                              <p key={lic.skuId} className="text-sm text-blue-600">{lic.displayName}</p>
                            ))}
                          </div>
                        ) : m365Licenses.licenses.length > 0 ? (
                          <>
                            <select
                              value={credentialLicenseSkuId}
                              onChange={(e) => setCredentialLicenseSkuId(e.target.value)}
                              className={INPUT}
                            >
                              <option value="">Tanpa lisensi</option>
                              {m365Licenses.licenses.map((lic) => (
                                <option key={lic.skuId} value={lic.skuId} disabled={lic.availableUnits <= 0}>
                                  {lic.displayName} ({lic.availableUnits}/{lic.totalUnits} tersedia)
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Assign lisensi Microsoft 365</p>
                          </>
                        ) : null}
                      </div>
                    )}

                    {/* Summary */}
                    {(() => {
                      const isM365Licensed = m365UserStatus.exists && m365UserStatus.licenses.length > 0;
                      const isNoOfficeEmailMode = !hasOfficeEmail && !credentialUsername;
                      const isPeopleHubOnly = isM365Licensed || isNoOfficeEmailMode;
                      let sendToEmail: string | null = null;
                      let sendToLabel = '';
                      if (isPeopleHubOnly) {
                        if (hasOfficeEmail) { sendToEmail = currentEmail; sendToLabel = 'office email'; }
                        else if (personalEmail) { sendToEmail = personalEmail; sendToLabel = 'personal email'; }
                      } else {
                        sendToEmail = personalEmail || null;
                        sendToLabel = 'personal email';
                      }
                      const canSend = !!sendToEmail && !sendToEmail.endsWith('@temp.local');

                      return (
                        <>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 text-xs">Login saat ini</span>
                              {currentEmail.endsWith('@temp.local') ? (
                                <span className="text-amber-600 italic text-xs">Belum diset</span>
                              ) : (
                                <span className="font-mono text-gray-700 text-xs">{currentEmail}</span>
                              )}
                            </div>
                            {credentialUsername && emailDomain && currentEmail !== `${credentialUsername}@${emailDomain}` && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">Login baru</span>
                                <span className="font-mono text-blue-600 text-xs font-medium">{credentialUsername}@{emailDomain}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 text-xs">Kirim ke</span>
                              {canSend ? (
                                <span className="font-mono text-emerald-700 text-xs">{sendToEmail} <span className="text-gray-400">({sendToLabel})</span></span>
                              ) : (
                                <span className="text-red-500 text-xs">Tidak ada email</span>
                              )}
                            </div>
                          </div>

                          {isPeopleHubOnly && isNoOfficeEmailMode && (
                            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">PeopleHub credential saja. Akan dikirim ke personal email.</p>
                          )}
                          {isPeopleHubOnly && isM365Licensed && hasOfficeEmail && (
                            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">PeopleHub credential saja. M365 sudah dikonfigurasi.</p>
                          )}
                          {!canSend && !personalEmail && (
                            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">Tidak ada email tersedia. Update personal email karyawan terlebih dahulu.</p>
                          )}
                          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">Password sementara baru akan digenerate. User harus menggantinya saat login pertama.</p>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => { setCredentialModal({ open: false, user: null }); setCredentialUsername(''); setCredentialLicenseSkuId(''); }}
                              disabled={isSendingCredentials}
                              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                            >
                              Batal
                            </button>
                            <button
                              onClick={handleSendCredentials}
                              disabled={isSendingCredentials || !canSend}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSendingCredentials ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Mengirim...</> : isPeopleHubOnly ? 'Kirim PeopleHub Credential' : 'Kirim Credentials'}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && deleteModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, user: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hapus User</h3>
                <p className="text-xs text-gray-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Yakin hapus <span className="font-semibold text-gray-900">{deleteModal.user.email}</span>? Semua akses akan dicabut.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteModal({ open: false, user: null })} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
