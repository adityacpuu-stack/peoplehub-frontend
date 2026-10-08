import { roleLabel } from './localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { Modal } from '@/components/ui/Modal';
import { ReportPage, ReportHeader, ReportSummary, ReportSection } from '@/pages/dashboard/ReportingLayout';
import './admin-workflows.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { UserCog, Search, Plus, Edit, Trash2, Shield, CheckCircle, XCircle, Clock, Mail, AlertCircle, Eye, EyeOff, RefreshCw, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { userService, type User, type UserStats, type CreateUserDTO, type UpdateUserDTO } from '@/services/user.service';
import { rbacService } from '@/services/rbac.service';
import { useAuthStore } from '@/stores/auth.store';

interface Role {
  id: number;
  name: string;
  level: number;
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
  useLocale();
  const isSuperAdmin = useAuthStore(state => state.user?.roles.includes('Super Admin'));
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [roles, setRoles] = useState<Role[]>([]);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [formModal, setFormModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [credentialModal, setCredentialModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [credentialUsername, setCredentialUsername] = useState('');
  const [credentialLicenseSkuId, setCredentialLicenseSkuId] = useState('');
  const [m365Licenses, setM365Licenses] = useState<{ available: boolean; licenses: import('@/services/user.service').M365License[] }>({ available: false, licenses: [] });
  const [licenseStatus, setLicenseStatus] = useState<'loading' | 'ready' | 'unconfigured' | 'error'>('loading');
  const [licenseRevision, setLicenseRevision] = useState(0);
  const credentialRequest = useRef(0);
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
      toast.error(error.response?.data?.error?.message || error.response?.data?.message ||t('Gagal memuat data users'), { id: 'api-error' });
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
      // Lightweight /options endpoint — returns just {id, name, level} for dropdowns.
      const options = await rbacService.getRolesOptions();
      // Never set undefined — `roles.map` in the modal would crash the render.
      setRoles(Array.isArray(options) ? options : []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
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
    if (!credentialModal.open) return;
    let current = true;
    setLicenseStatus('loading');
    setCredentialLicenseSkuId('');
    userService.getM365Licenses().then(result => {
      if (!current) return;
      setM365Licenses(result);
      setLicenseStatus(result.available ? 'ready' : 'unconfigured');
    }).catch(() => { if (current) setLicenseStatus('error'); });
    return () => { current = false; };
  }, [credentialModal.open, credentialModal.user?.id, licenseRevision]);

  useEffect(() => {
    let current = true;
    const emailDomain = credentialModal.user?.employee?.company?.email_domain;
    setCredentialLicenseSkuId('');
    if (!credentialUsername || !emailDomain) {
      setM365UsernameStatus({ checking: false, exists: null, licenses: [] });
      return;
    }
    setM365UsernameStatus({ checking: true, exists: null, licenses: [] });
    const timer = setTimeout(async () => {
      try {
        const email = `${credentialUsername}@${emailDomain}`;
        const status = await userService.getM365UserStatus(email);
        if (current) setM365UsernameStatus({ checking: false, exists: status.available ? status.exists : null, licenses: status.available ? status.licenses || [] : [] });
      } catch {
        if (current) setM365UsernameStatus({ checking: false, exists: null, licenses: [] });
      }
    }, 600);
    return () => { current = false; clearTimeout(timer); };
  }, [credentialUsername, credentialModal.user, licenseRevision]);

  const handleOpenCreateModal = async () => {
    if (!isSuperAdmin) { toast.error(t("Tambahkan karyawan melalui menu Employees. Akun dibuat bersama profil karyawan.")); return; }
    setFormData({ email: '', password: '', employee_id: null, role_ids: [], is_active: true });
    await fetchRoles();
    setFormModal({ open: true, user: null });
  };

  const handleOpenEditModal = async (user: User) => {
    // Open the modal FIRST so a slow/failing role fetch never blocks it.
    // Guard user.roles — if the list payload ever omits roles, `.map` would
    // throw here and the modal would silently never open.
    setFormData({
      email: user.email,
      password: '',
      employee_id: user.employee?.id || null,
      role_ids: (user.roles ?? []).map((r) => r.id),
      is_active: user.is_active,
    });
    setFormModal({ open: true, user });
    // Roles populate the checkbox list; load async after the modal is up.
    fetchRoles().catch((err) => console.error('Failed to load roles:', err));
  };

  const handleSubmit = async () => {
    if (!formData.email) { toast.error(t("Email harus diisi")); return; }
    try {
      setIsSubmitting(true);
      if (formModal.user) {
        const updateData: UpdateUserDTO = { email: formData.email, is_active: formData.is_active, role_ids: formData.role_ids };
        if (formData.password) updateData.password = formData.password;
        await userService.update(formModal.user.id, updateData);
        toast.success(t("User berhasil diupdate"));
      } else {
        const createData: CreateUserDTO = { email: formData.email, is_active: formData.is_active, role_ids: formData.role_ids };
        const created = await userService.create(createData);
        toast.success(t("User berhasil dibuat"));
        if (created.credentials_sent === false) toast.error(t("Email kredensial belum terkirim. Gunakan Kirim Kredensial untuk mencoba lagi."));
      }
      setFormModal({ open: false, user: null });
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message ||t('Gagal menyimpan user'), { id: 'api-error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    try {
      await userService.delete(deleteModal.user.id);
      toast.success(t("User berhasil dihapus"));
      setDeleteModal({ open: false, user: null });
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message ||t('Gagal menghapus user'), { id: 'api-error' });
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await userService.toggleStatus(user.id);
      toast.success(t("Status user berhasil diubah"));
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message ||t('Gagal mengubah status'), { id: 'api-error' });
    }
  };

  const handleOpenCredentialModal = async (user: User) => {
    const request = ++credentialRequest.current;
    setLicenseStatus('loading');
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
      const userStatusResult = await (validEmail
          ? userService.getM365UserStatus(validEmail).catch(() => ({ available: false, exists: false, licenses: [] as import('@/services/user.service').M365UserLicense[] }))
          : Promise.resolve({ available: false, exists: false, licenses: [] as import('@/services/user.service').M365UserLicense[] }));
      if (request === credentialRequest.current) setM365UserStatus(userStatusResult);
    } catch {
      if (request === credentialRequest.current) setM365UserStatus({ available: false, exists: false, licenses: [] });
    }
  };

  const handleSendCredentials = async () => {
    if (!credentialModal.user) return;
    if (credentialUsername && (licenseStatus !== 'ready' || m365UsernameStatus.checking || m365UsernameStatus.exists === null)) return;
    try {
      setIsSendingCredentials(true);
      const result = await userService.sendCredentials(credentialModal.user.id, credentialUsername || undefined, credentialLicenseSkuId || undefined);
      toast.success(t("Credentials sent to {email}", { email: result.sentTo }));
      setCredentialModal({ open: false, user: null });
      setCredentialUsername('');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('Gagal mengirim credentials'), { id: 'api-error' });
    } finally {
      setIsSendingCredentials(false);
    }
  };

  return (
    <ReportPage  className="ph-admin-page">{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl font-bold text-gray-900">{t("User Management")}</h1><p className="text-sm text-gray-500">{t("Kelola akun dan hak akses sistem")}</p></div>
<div className="report-header-context"><button
          onClick={handleOpenCreateModal}
          className="ph-button ph-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />{t("Tambah User")} </button></div>
</ReportHeader>{/* Stats */}<ReportSummary>{[
          { label: 'Total Users', value: stats?.total ?? 0, icon: UserCog, color: 'text-slate-600' },
          { label: 'Aktif', value: stats?.active ?? 0, icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'Nonaktif', value: stats?.inactive ?? 0, icon: XCircle, color: 'text-red-500' },
          { label: 'Login (7 hari)', value: stats?.recentLogins ?? 0, icon: Shield, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="report-metric"><Icon className={`w-5 h-5 shrink-0 ${color}`} /><div>
              <p className="report-metric-label">{t(label)}</p>
              <p className="report-metric-value">{(value).toLocaleString(intlLocale())}</p>
            </div></div>
        ))}</ReportSummary>{/* Table Panel */}<ReportSection  className="overflow-hidden">{/* Toolbar */}<div className="report-toolbar">
          <div className="relative flex-1 max-w-sm report-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={t("Cari email, nama, atau role...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={() => { fetchUsers(); fetchStats(); }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={t("Refresh")}
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-xs text-gray-400 ml-auto hidden sm:block">
            {(users.length).toLocaleString(intlLocale())}{' '}{t("dari")} {(total).toLocaleString(intlLocale())}{' '}{t("user")} </span>
        </div>{/* Table */}<div  className="ph-table-scroll overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['User', 'Karyawan', 'Role', 'Status', 'Last Login', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 last:text-center last:w-28">
                    {t(h)}
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
                    <p className="text-sm text-gray-400">{t("Tidak ada user ditemukan")}</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* User */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-[#65716b] ${user.email.endsWith("@temp.local") ? "bg-amber-400" : "bg-[#f5f6f7] text-[#24302b]"}`}>
                          {user.email.endsWith('@temp.local') ? '?' : user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {user.email.endsWith('@temp.local') ? (
                            <p className="text-xs text-amber-600 italic">{t("No email — kirim credentials")}</p>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <p className="text-sm text-gray-900 truncate">{user.email}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{t("Dibuat")} {formatDate(user.created_at)}</p>
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
                            {roleLabel(role.name)}
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
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {user.is_active ? t("Aktif") : t("Nonaktif")}
                      </button>
                    </td>
                    {/* Last Login */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {user.last_login_at ? formatDate(user.last_login_at) : t("Belum pernah")}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenCredentialModal(user)}
                          title={t("Kirim Credentials")}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors group"
                        >
                          <Send className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          title={t("Edit")}
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors group"
                        >
                          <Edit className="w-3.5 h-3.5 text-gray-400 group-hover:text-slate-700" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, user })}
                          title={t("Hapus")}
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
          </table></div>{/* Pagination */}{totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{t("Halaman")} {(page).toLocaleString(intlLocale())}{' '}{t("dari")} {(totalPages).toLocaleString(intlLocale())}</span>
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
        )}</ReportSection>{/* Create / Edit Modal */}{formModal.open && (
        <Modal isOpen onClose={() => setFormModal({ open: false, user: null })} title={formModal.user ? t("Edit User") : t("Tambah User")} description={formModal.user ? t("Editing {email}", { email: formModal.user.email }) : t("Buat akun user baru")} size="lg" busy={isSubmitting} className="admin-workflow-dialog admin-refreshed-dialog">


            {/* Body */}
            <div className="admin-dialog-content">
              <section className="ph-section"><h3>{t("Informasi akun")}</h3><div className="ph-form-grid">{/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5" htmlFor="admin-user-email">{t("Email")}</label>
                <input
                  id="admin-user-email" type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={INPUT}
                  placeholder={"user@example.com"}
                />
              </div>

              {/* Password reset is only shown for an existing account. */}
              {formModal.user && <div>
                <label htmlFor="admin-user-password" className="block text-xs font-semibold text-gray-500 mb-1.5">{t("Password")} {formModal.user && <span className="normal-case text-gray-400 font-normal">{t("(kosongkan jika tidak diubah)")}</span>}
                </label>
                <div className="relative">
                  <input
                    id="admin-user-password" type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={INPUT + " pr-9"}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? t("Sembunyikan password") : t("Tampilkan password")} onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>}

              {!formModal.user && <p className="text-sm text-gray-500">{t("Password sementara dibuat otomatis dan dikirim melalui email. Akun karyawan dibuat dari menu Employees.")} </p>}

              </div></section><section className="ph-section"><h3>{t("Akses dan status")}</h3>{/* Roles */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("Roles")}</label>
                <div className="admin-choices">
                  {(roles ?? []).length === 0 && (
                    <p className="text-xs text-gray-400">{t("Memuat roles…")}</p>
                  )}
                  {(roles ?? []).map((role) => (
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role.name)}`}>{roleLabel(role.name)}</span>
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
                <span className="text-sm text-gray-700">{t("Aktifkan akun")}</span>
              </label></section>
            </div>

            {/* Footer */}
            <div className="ph-dialog-footer">
              <button
                disabled={isSubmitting} onClick={() => setFormModal({ open: false, user: null })}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
              >{t("Batal")} </button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="ph-button ph-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("Menyimpan...")}</> : formModal.user ? t("Update") : t("Buat User")}</button>
            </div>

</Modal>
      )}{/* Send Credentials Modal */}{credentialModal.open && credentialModal.user && (
        <Modal isOpen onClose={() => { setCredentialModal({ open: false, user: null }); setCredentialUsername(''); setCredentialLicenseSkuId(''); }} title={t("Kirim Credentials")} description={credentialModal.user.employee?.name || credentialModal.user.email} size="lg" busy={isSendingCredentials} className="admin-workflow-dialog admin-refreshed-dialog">


            <div className="admin-dialog-content">
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
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("Office Email")}</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
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
                          <p className="text-xs text-amber-600 mt-1">{t("M365 account ada tapi tidak ada lisensi")}</p>
                        ) : !m365UserStatus.available ? (
                          <p className="text-xs text-gray-400 mt-1">{t("M365 integration belum dikonfigurasi")}</p>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">{t("M365 account tidak ditemukan — akan dibuat saat kirim credentials")}</p>
                        )}
                      </div>
                    )}

                    {hasNoOfficeEmail && (
                      <div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md mb-3">
                          <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <span className="text-sm text-gray-600">{t("Tidak ada office email")}</span>
                            {personalEmail && (
                              <p className="text-xs text-gray-400">{t("Login via personal:")} <span className="font-mono">{personalEmail}</span></p>
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
                              {credentialUsername ? t("Batal setup M365") : t("Setup office email & M365")}
                            </button>
                            {credentialUsername && (
                              <div className="mt-2">
                                <div className="flex items-center">
                                  <input
                                    type="text"
                                    value={credentialUsername}
                                    onChange={(e) => setCredentialUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                                    placeholder={t("username")}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-l-xl bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-sm text-gray-500">@{emailDomain}</span>
                                </div>
                                {m365UsernameStatus.checking ? (
                                  <p className="text-xs text-gray-400 mt-1">{t("Memeriksa M365...")}</p>
                                ) : m365UsernameStatus.exists === true ? (
                                  <p className="text-xs text-amber-600 mt-1">{t("⚠ Email sudah ada di M365 — akan dihubungkan ke akun existing")}</p>
                                ) : m365UsernameStatus.exists === false ? (
                                  <p className="text-xs text-emerald-600 mt-1">{t("✓ Tersedia — akun M365 baru akan dibuat")}</p>
                                ) : (
                                  <p className="text-xs text-amber-700 mt-1">{t("Alamat belum berhasil diverifikasi di M365.")}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* M365 License */}
                    {emailDomain && (credentialUsername || hasOfficeEmail) && (
                      <div>
                        <label htmlFor="credential-license" className="block text-xs font-semibold text-gray-500 mb-1.5">{t("M365 License")}</label>
                        {licenseStatus === 'loading' ? <p role="status" className="text-sm text-gray-500">{t("Memuat paket lisensi M365...")}</p>
                        : licenseStatus === 'unconfigured' ? <p role="alert" className="text-sm text-amber-700">{t("Integrasi M365 belum dikonfigurasi di server ini. Paket lisensi dan pembuatan akun belum tersedia.")}</p>
                        : licenseStatus === 'error' ? <div role="alert"><p className="text-sm text-red-600">{t("Gagal memuat paket lisensi M365. Periksa koneksi dan izin integrasi Microsoft.")}</p><button type="button" className="text-sm text-blue-600" onClick={() => setLicenseRevision(v => v + 1)}>{t("Coba lagi")}</button></div>
                        : credentialUsername && m365UsernameStatus.exists && m365UsernameStatus.licenses.length > 0 ? (
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs font-medium text-blue-700">{t("Sudah berlisensi:")}</p>
                            {m365UsernameStatus.licenses.map((lic) => (
                              <p key={lic.skuId} className="text-sm text-blue-600">{lic.displayName}</p>
                            ))}
                          </div>
                        ) : !credentialUsername && m365UserStatus.licenses.length > 0 ? (
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs font-medium text-blue-700">{t("Sudah berlisensi:")}</p>
                            {m365UserStatus.licenses.map((lic) => (
                              <p key={lic.skuId} className="text-sm text-blue-600">{lic.displayName}</p>
                            ))}
                          </div>
                        ) : m365Licenses.licenses.length > 0 ? (
                          <>
                            <select
                              id="credential-license"
                              value={credentialLicenseSkuId}
                              onChange={(e) => setCredentialLicenseSkuId(e.target.value)}
                              className={INPUT}
                            >
                              <option value="">{t("Tanpa lisensi")}</option>
                              {m365Licenses.licenses.map((lic) => (
                                <option key={lic.skuId} value={lic.skuId} disabled={lic.availableUnits <= 0}>
                                  {lic.displayName} ({(lic.availableUnits).toLocaleString(intlLocale())}/{(lic.totalUnits).toLocaleString(intlLocale())}{' '}{t("tersedia)")} </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">{t("Assign lisensi Microsoft 365")}</p>
                          </>
                        ) : <p className="text-sm text-amber-700">{t("Tidak ada paket lisensi aktif yang dikembalikan M365 untuk tenant ini.")}</p>}
                      </div>
                    )}

                    {/* Summary */}
                    {(() => {
                      const targetStatus = credentialUsername ? m365UsernameStatus : m365UserStatus;
                      const isM365Licensed = targetStatus.exists && targetStatus.licenses.length > 0;
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
                      const hasRecipient = !!sendToEmail && !sendToEmail.endsWith('@temp.local');
                      const canSend = hasRecipient && (!credentialUsername || (licenseStatus === 'ready' && !m365UsernameStatus.checking && m365UsernameStatus.exists !== null));

                      return (
                        <>
                          <div className="admin-delivery-summary ph-section">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 text-xs">{t("Login saat ini")}</span>
                              {currentEmail.endsWith('@temp.local') ? (
                                <span className="text-amber-600 italic text-xs">{t("Belum diset")}</span>
                              ) : (
                                <span className="font-mono text-gray-700 text-xs">{currentEmail}</span>
                              )}
                            </div>
                            {credentialUsername && emailDomain && currentEmail !== `${credentialUsername}@${emailDomain}` && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-xs">{t("Login baru")}</span>
                                <span className="font-mono text-blue-600 text-xs font-medium">{credentialUsername}@{emailDomain}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 text-xs">{t("Kirim ke")}</span>
                              {hasRecipient ? (
                                <span className="font-mono text-emerald-700 text-xs">{sendToEmail} <span className="text-gray-400">({t(sendToLabel)})</span></span>
                              ) : (
                                <span className="text-red-500 text-xs">{t("Tidak ada email")}</span>
                              )}
                            </div>
                          </div>

                          {isPeopleHubOnly && isNoOfficeEmailMode && (
                            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md">{t("PeopleHub credential saja. Akan dikirim ke personal email.")}</p>
                          )}
                          {isPeopleHubOnly && isM365Licensed && hasOfficeEmail && (
                            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md">{t("PeopleHub credential saja. M365 sudah dikonfigurasi.")}</p>
                          )}
                          {!canSend && !personalEmail && (
                            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{t("Tidak ada email tersedia. Update personal email karyawan terlebih dahulu.")}</p>
                          )}
                          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md">{t("Password sementara baru akan digenerate. User harus menggantinya saat login pertama.")}</p>

                          <div className="ph-dialog-footer">
                            <button
                              onClick={() => { setCredentialModal({ open: false, user: null }); setCredentialUsername(''); setCredentialLicenseSkuId(''); }}
                              disabled={isSendingCredentials}
                              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                            >{t("Batal")} </button>
                            <button onClick={handleSendCredentials} disabled={isSendingCredentials || !canSend} className="ph-button ph-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isSendingCredentials ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("Mengirim...")}</> : isPeopleHubOnly ? t("Kirim PeopleHub Credential") : t("Kirim Credentials")}</button>
                          </div>
                        </>
                      );
                    })()}
                  </>
                );
              })()}
            </div>

</Modal>
      )}{/* Delete Modal */}{deleteModal.open && deleteModal.user && (
        <Modal isOpen onClose={() => setDeleteModal({ open: false, user: null })} title={t("Hapus User")} description={t("Tindakan ini tidak dapat dibatalkan")} size="sm" role="alertdialog" className="admin-workflow-dialog admin-refreshed-dialog">

            <p className="text-sm text-gray-600 mb-5">{t("Yakin hapus")} <span className="font-semibold text-gray-900">{deleteModal.user.email}</span>{t("? Semua akses akan dicabut.")} </p>
            <div className="ph-dialog-footer">
              <button onClick={() => setDeleteModal({ open: false, user: null })} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">{t("Batal")}</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors">{t("Hapus")}</button>
            </div>

</Modal>
      )}</ReportPage>
  );
}
