import { roleLabel, permissionLabel } from './localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { Modal } from '@/components/ui/Modal';
import { ReportPage, ReportHeader, ReportSection } from '@/pages/dashboard/ReportingLayout';
import './admin-workflows.css';
import { useState, useEffect, useRef } from 'react';
import { Shield, Search, Plus, Save, RotateCcw, Loader2, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { rbacService, type Role, type RoleDetail, type Permission, type ActionMetadata, type PermissionMode } from '@/services/rbac.service';
import { useAuthStore } from '@/stores/auth.store';

const modeOf = (role: Role | null | undefined): PermissionMode | 'unknown' =>
  role?.permission_mode === undefined || role.permission_mode === 'legacy' ? 'legacy'
    : role.permission_mode === 'enforced' ? 'enforced' : 'unknown';

// Match backend-protected identities, including legacy rows without a flag.
// These UI restrictions supplement the server's authorization checks.
const builtInRoleNames = new Set(['Super Admin', 'Group CEO', 'CEO', 'HR Manager', 'HR Staff',
  'Finance Manager', 'Tax Manager', 'Tax Staff', 'Manager', 'Supervisor', 'Employee', 'IT Admin']);
const isProtectedRole = (role: Role) => Boolean(role.is_system) || builtInRoleNames.has(role.name);

function apiErrorMessage(error: unknown, fallback: string) {
  // api.ts normalizes and translates known backend diagnostics into message.
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || t(fallback);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupPermissions(permissions: Permission[]) {
  const map: Record<string, Permission[]> = Object.create(null);
  for (const p of permissions) {
    const g = p.group || p.name.split('.')[0] || 'other';
    if (!map[g]) map[g] = [];
    map[g].push(p);
  }
  return map;
}

const GROUP_LABELS: Record<string, string> = {
  employee: 'Employee', department: 'Department', position: 'Position',
  attendance: 'Attendance', leave: 'Leave', overtime: 'Overtime',
  payroll: 'Payroll', performance: 'Performance', contract: 'Contract',
  document: 'Document', company: 'Company', holiday: 'Holiday',
  setting: 'Setting', user: 'User', role: 'Role & Permission', report: 'Report',
  work_location: 'Work Locations',
};

// ─── Role Form Modal ──────────────────────────────────────────────────────────

interface RoleFormModalProps {
  role: Role | null; // null = create, non-null = edit
  onClose: () => void;
  onSaved: (role: Role) => void;
}

function RoleFormModal({ role, onClose, onSaved }: RoleFormModalProps) {
  useLocale();
  const isEdit = !!role;
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [level, setLevel] = useState(role ? String(role.level ?? '') : '8');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericLevel = level === '' ? undefined : Number(level);
    if (submitting.current || !name.trim() || (numericLevel !== undefined &&
        (!Number.isInteger(numericLevel) || numericLevel < 0 || numericLevel > 2147483647))) return;
    submitting.current = true;
    setSaving(true);
    try {
      const saved = isEdit
        ? await rbacService.updateRole(role.id, { name: name.trim(), description, ...(numericLevel !== undefined && numericLevel !== role.level ? { level: numericLevel } : {}) })
        : await rbacService.createRole({ name: name.trim(), description, ...(numericLevel !== undefined ? { level: numericLevel } : {}) });
      toast.success(t(isEdit ? "Role diperbarui" : "Role dibuat"));
      onSaved(saved);
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Gagal menyimpan role'), { id: 'api-error' });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? t("Edit Role") : t("Buat Role Baru")} size="md" busy={saving} className="admin-workflow-dialog admin-refreshed-dialog">


        <form onSubmit={handleSubmit}><section className="ph-section"><h3>{t("Informasi role")}</h3><div className="ph-form-grid">
          <div>
            <label htmlFor="admin-rolespage-1" className="block text-xs font-semibold text-gray-500 mb-1.5">{t("Nama Role")}</label>
            <input id="admin-rolespage-1"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={saving || Boolean(role && isProtectedRole(role))}
              maxLength={100}
              placeholder={t("cth: Finance Auditor")}
              className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 bg-gray-50 focus:bg-white disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="admin-rolespage-2" className="block text-xs font-semibold text-gray-500 mb-1.5">{t("Deskripsi")}</label>
            <textarea id="admin-rolespage-2"
              disabled={saving}
              maxLength={500}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder={t("Deskripsi singkat tentang role ini...")}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 bg-gray-50 focus:bg-white resize-none"
            />
          </div>

          <div>
            <label htmlFor="admin-rolespage-3" className="block text-xs font-semibold text-gray-500 mb-1.5">{t("Level")}</label>
            <input id="admin-rolespage-3"
              disabled={saving || Boolean(role && isProtectedRole(role))}
              type="number" min={0} max={2147483647} step={1}
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 bg-gray-50 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">{t("Role levels are used for account-management hierarchy. They do not automatically grant module access or Super Admin privileges.")}</p>
          </div>

          </div></section><div className="ph-dialog-footer">
            <button disabled={saving} type="button" onClick={onClose}
              className="ph-button"
            >{t("Batal")} </button>
            <button type="submit" disabled={saving} className="ph-button ph-button-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{' '}{t("Simpan")} </button>
          </div>
        </form>

</Modal>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ role, onClose, onDeleted }: { role: Role; onClose: () => void; onDeleted: () => void }) {
  useLocale();
  const [deleting, setDeleting] = useState(false);
  const submitting = useRef(false);

  const handleDelete = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setDeleting(true);
    try {
      await rbacService.deleteRole(role.id);
      toast.success(t("Role dihapus"));
      onDeleted();
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Gagal menghapus role'), { id: 'api-error' });
    } finally {
      submitting.current = false;
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t("Hapus Role")} description={t("Tindakan ini tidak bisa dibatalkan")} size="sm" busy={deleting} role="alertdialog" className="admin-workflow-dialog admin-refreshed-dialog">

        <p className="text-sm text-gray-600 mb-5">{t("Delete this role and its registered assignments?")} <span className="font-semibold text-gray-900">{role.is_system ? roleLabel(role.name) : role.name}</span></p>
        <div className="ph-dialog-footer">
          <button disabled={deleting} onClick={onClose} className="ph-button">{t("Batal")} </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="admin-button-danger"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{' '}{t("Hapus")} </button>
        </div>

</Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RolesPage() {
  useLocale();
  const canManage = useAuthStore(state => state.user?.roles?.includes('Super Admin') ?? false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [actions, setActions] = useState<ActionMetadata[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const catalogSequence = useRef(0);
  const [search, setSearch] = useState('');

  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const selectionSequence = useRef(0);
  const [detailError, setDetailError] = useState<Role | null>(null);

  // Pending permission IDs (editable)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  // Pending mode is part of the same reviewable draft as the permission set.
  const [pendingMode, setPendingMode] = useState<PermissionMode>('legacy');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const savedIds = new Set(selectedRole?.rolePermissions.map(rp => rp.permission.id) ?? []);
  const savedMode = modeOf(selectedRole);
  const modeDirty = selectedRole != null && savedMode !== 'unknown' && pendingMode !== savedMode;
  const isDirty = modeDirty || pendingIds.size !== savedIds.size || [...pendingIds].some(id => !savedIds.has(id));
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);

  // Modals
  const [formModal, setFormModal] = useState<{ open: boolean; role: Role | null }>({ open: false, role: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; role: Role | null }>({ open: false, role: null });

  useEffect(() => {
    const catalog = catalogSequence;
    const selection = selectionSequence;
    void fetchData();
    return () => { catalog.current++; selection.current++; };
  }, []);

  useEffect(() => {
    if (!isDirty && !saving) return;
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [isDirty, saving]);

  const fetchData = async () => {
    const sequence = ++catalogSequence.current;
    try {
      setLoading(true);
      setLoadError(false);
      const [rolesRes, permsRes, actionCatalog] = await Promise.all([
        rbacService.getAllRoles(),
        rbacService.getAllPermissions(),
        rbacService.getActionCatalog(),
      ]);
      if (sequence !== catalogSequence.current) return;
      setRoles(rolesRes);
      setAllPermissions(permsRes);
      setActions(Array.isArray(actionCatalog?.actions) ? actionCatalog.actions : []);
    } catch {
      if (sequence === catalogSequence.current) setLoadError(true);
    } finally {
      if (sequence === catalogSequence.current) setLoading(false);
    }
  };

  const handleSelectRole = async (role: Role) => {
    if (savingRef.current) return;
    const sequence = ++selectionSequence.current;
    setLoadingRole(true);
    setSelectedRole(null);
    setPendingIds(new Set());
    setPendingMode('legacy');
    setDetailError(null);
    try {
      const detail = await rbacService.getRoleById(role.id);
      if (sequence !== selectionSequence.current) return;
      setSelectedRole(detail);
      const ids = new Set(detail.rolePermissions.map(rp => rp.permission.id));
      setPendingIds(ids);
      const mode = modeOf(detail);
      setPendingMode(mode === 'enforced' ? 'enforced' : 'legacy');
    } catch {
      if (sequence !== selectionSequence.current) return;
      setDetailError(role);
    } finally {
      if (sequence === selectionSequence.current) setLoadingRole(false);
    }
  };

  const afterDiscard = (action: () => void) => {
    if (savingRef.current) return;
    if (isDirty) setDiscardAction(() => action);
    else action();
  };

  const togglePermission = (permId: number) => {
    if (!canManage || savingRef.current) return;
    setPendingIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleGroup = (perms: Permission[], on: boolean) => {
    if (!canManage || savingRef.current) return;
    setPendingIds(prev => {
      const next = new Set(prev);
      perms.forEach(p => on ? next.add(p.id) : next.delete(p.id));
      return next;
    });
  };

  const handleSave = async () => {
    if (!canManage || !selectedRole || !isDirty || savingRef.current) return;
    savingRef.current = true;
    const role = selectedRole;
    const submittedIds = new Set(pendingIds);
    // Super Admin is never enforced; other roles send the mode only when changed.
    const submittedMode = role.name === 'Super Admin' ? undefined : modeDirty ? pendingMode : undefined;
    setSaving(true);
    try {
      // Permission set and mode commit together in one server transaction.
      await rbacService.assignPermissionsToRole(role.id, [...submittedIds], submittedMode);
      // The endpoint atomically replaces this exact set. Commit the submitted
      // snapshot locally: a follow-up GET failure must not turn a saved write
      // into a failed write, or restore the old reset baseline.
      const permissions = new Map([...allPermissions, ...role.rolePermissions.map(rp => rp.permission)].map(p => [p.id, p]));
      const rolePermissions = [...submittedIds].map(id => ({ permission: permissions.get(id)! }));
      const permission_mode = submittedMode ?? role.permission_mode;
      const updated = { ...role, permission_mode, rolePermissions,
        _count: role._count && { ...role._count, rolePermissions: submittedIds.size } };
      setSelectedRole(updated);
      setPendingIds(submittedIds);
      setRoles(current => current.map(item => item.id === role.id
        ? { ...item, permission_mode, _count: item._count && { ...item._count, rolePermissions: submittedIds.size } } : item));
      toast.success(t("Permission berhasil disimpan"));
      // Own access may have changed: re-read effectiveActions now.
      const auth = useAuthStore.getState();
      if (auth.user?.roles?.includes(role.name)) void auth.refreshUser();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Gagal menyimpan permission'), { id: 'api-error' });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!selectedRole || savingRef.current) return;
    const ids = new Set(selectedRole.rolePermissions.map(rp => rp.permission.id));
    setPendingIds(ids);
    setPendingMode(modeOf(selectedRole) === 'enforced' ? 'enforced' : 'legacy');
  };

  const changeMode = (mode: PermissionMode) => {
    // Switching mode never selects or clears permissions automatically.
    if (!canManage || savingRef.current || !selectedRole || selectedRole.name === 'Super Admin' || savedMode === 'unknown') return;
    setPendingMode(mode);
  };

  const handleSyncCatalog = async () => {
    if (!canManage || syncing || savingRef.current) return;
    setSyncing(true);
    try {
      const result = await rbacService.syncActionCatalog();
      toast.success(t("{count} supported action keys registered", { count: (result?.created?.length ?? 0).toLocaleString(intlLocale()) }));
      setAllPermissions(await rbacService.getAllPermissions());
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to register supported action keys'), { id: 'api-error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleRoleSaved = (role: Role) => {
    setRoles(current => [...current.filter(item => item.id !== role.id), { ...current.find(item => item.id === role.id), ...role }].sort((a, b) => (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER) || a.id - b.id));
    setSearch('');
    if (selectedRole?.id === role.id) {
      setSelectedRole(current => current && { ...current, ...role, rolePermissions: current.rolePermissions });
    } else {
      void handleSelectRole(role);
    }
  };

  const grouped = groupPermissions(allPermissions);
  const actionByKey = new Map(actions.map(action => [action.key, action]));
  // Eligibility comes from the server's per-action built-in role ceilings: a
  // custom role name or numeric level never makes a role eligible.
  const isBuiltIn = (role: Role) => actions.some(action => action.eligible_roles.includes(role.name));
  const eligibleSelectedCount = selectedRole ? allPermissions.filter(permission => pendingIds.has(permission.id)
    && actionByKey.get(permission.name)?.eligible_roles.includes(selectedRole.name)).length : 0;
  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
    </div>
  );

  if (loadError) return <ReportPage className="ph-admin-page"><ReportSection>
    <p role="alert">{t("Gagal memuat data")}</p>
    <button className="ph-button" onClick={() => void fetchData()}>{t("Try again")}</button>
  </ReportSection></ReportPage>;

  return (
    <ReportPage  className="ph-admin-page ph-roles-page">{/* Header */}<ReportHeader>
<div className="report-heading"><h1 className="text-xl font-bold text-gray-900">{t("Roles & Permissions")}</h1><p className="text-sm text-gray-500">{t("Manage roles and registered permission assignments")}</p></div>
<div className="report-header-context">{canManage && <button
          disabled={saving || loadingRole}
          onClick={() => afterDiscard(() => setFormModal({ open: true, role: null }))}
          className="ph-button ph-button-primary flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />{t("Buat Role")} </button>}</div>
</ReportHeader>
      <div className="text-sm text-gray-500 mb-4 space-y-1" role="note">
        <p>{t("Legacy roles keep their existing built-in access. An enforced role can only use the supported actions selected here, and never more than its built-in role allows.")}</p>
        <p>{t("Data stays limited to each account's assigned companies. Personal pages (own leave, attendance, documents, payslip) and requests assigned to someone as approver do not depend on these permissions.")}</p>
      </div>
      {!allPermissions.length && <p className="text-sm text-gray-500 mb-4" role="status">{t("No permissions are registered in this environment. There are no permission assignments available to edit.")}</p>}
      {canManage && actions.length > 0 && actions.some(action => !allPermissions.some(permission => permission.name === action.key)) &&
        <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="catalog-sync">
          <p className="text-sm text-gray-600">{t("Some supported action keys are not registered yet. Registering adds them to the catalog only; it does not grant them to any role or change any mode.")}</p>
          <button className="ph-button" disabled={syncing || saving} onClick={() => void handleSyncCatalog()}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{' '}{t("Register supported actions")}</button>
        </div>}
      {!canManage && <p className="text-sm text-gray-500 mb-4">{t("Read-only access")}</p>}
      <div className="admin-scope-layout">
        {/* Left: Role List */}
        <div className="admin-scope-list space-y-3">
          {/* Search */}
          <div className="relative report-search">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("Cari role...")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:bg-white transition-all"
            />
          </div>

          {/* Role Pills */}
          <div className="admin-scope-buttons flex flex-col gap-1.5">
            {filteredRoles.map(role => {
              const isActive = selectedRole?.id === role.id;
              const count = role._count;
              return (
                <button
                  key={role.id}
                  aria-pressed={isActive}
                  disabled={saving}
                  onClick={() => { if (!isActive) afterDiscard(() => void handleSelectRole(role)); }}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isProtectedRole(role) && (
                      <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white/60" : "text-gray-400"}`} />
                    )}
                    <span className="truncate">{isProtectedRole(role) ? roleLabel(role.name) : role.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {modeOf(role) !== 'legacy' && <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"}`}>
                      {modeOf(role) === 'enforced' ? t("Enforced") : t("Unknown mode")}</span>}
                    {count && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        {(count.userRoles).toLocaleString(intlLocale())}{' '}{t("user")} </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!filteredRoles.length && <p className="text-sm text-gray-500">{t("No matching roles")}</p>}

          <p className="text-xs text-gray-400 text-center">{(roles.length).toLocaleString(intlLocale())}{' '}{t("role terdaftar")}</p>
        </div>

        {/* Right: Permission Panel */}
        <div className="admin-scope-detail">
          {detailError ? <ReportSection><p role="alert">{t("Gagal memuat detail role")}</p>
            <button className="ph-button" onClick={() => void handleSelectRole(detailError)}>{t("Try again")}</button>
          </ReportSection> : !selectedRole && !loadingRole ? (
            <ReportSection  className="flex flex-col items-center justify-center"><Shield className="w-10 h-10 text-gray-200 mb-3" /><p className="text-sm font-medium text-gray-400">{t("Pilih role di kiri untuk melihat permissions")}</p></ReportSection>
          ) : loadingRole ? (
            <ReportSection  className="flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></ReportSection>
          ) : selectedRole && (
            <ReportSection  className="overflow-hidden">{/* Panel Header */}<div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 report-avatar">
                    <Shield className="w-4 h-4 text-[#65716b]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{isProtectedRole(selectedRole) ? roleLabel(selectedRole.name) : selectedRole.name}</h2>
                      {isProtectedRole(selectedRole) && (
                        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">{t("System")}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("{selected} of {total} registered permissions selected", { selected: pendingIds.size.toLocaleString(intlLocale()), total: allPermissions.length.toLocaleString(intlLocale()) })}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canManage && (
                    <>
                      <button
                        disabled={saving}
                        onClick={() => setFormModal({ open: true, role: selectedRole })}
                        className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >{t("Edit")} </button>
                      <button
                        disabled={saving || isProtectedRole(selectedRole) || (roles.find(role => role.id === selectedRole.id)?._count?.userRoles ?? 0) > 0}
                        onClick={() => setDeleteModal({ open: true, role: selectedRole })}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >{t("Hapus")} </button>
                      {(roles.find(role => role.id === selectedRole.id)?._count?.userRoles ?? 0) > 0 &&
                        <span className="text-xs text-gray-500">{t("Remove assigned users before deleting this role.")}</span>}
                    </>
                  )}
                  {canManage && isDirty && (
                    <>
                      <button
                        disabled={saving}
                        onClick={() => afterDiscard(handleReset)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />{t("Reset")} </button>
                      <button onClick={handleSave} disabled={saving} className="ph-button ph-button-primary flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{' '}{t("Simpan")} </button>
                    </>
                  )}
                </div>
              </div>
              {/* Permission mode: part of the same draft; saved together with the set. */}
              <fieldset className="px-6 py-4 border-b border-gray-100" data-testid="permission-mode">
                <legend className="text-xs font-semibold text-gray-500 mb-2">{t("Permission mode")}</legend>
                {selectedRole.name === 'Super Admin' ? <p className="text-sm text-gray-600">{t("Legacy (protected). Super Admin access cannot be enforced.")}</p>
                  : savedMode === 'unknown' ? <p className="text-sm text-amber-700" role="alert">{t("Stored mode is not recognised. The server grants this role no covered actions until a valid mode is saved by a Super Admin.")}</p>
                  : <div className="flex flex-wrap gap-4">
                    {(['legacy', 'enforced'] as const).map(mode => <label key={mode} className="flex items-start gap-2 text-sm">
                      <input type="radio" name="permission-mode" value={mode} checked={pendingMode === mode}
                        disabled={!canManage || saving} onChange={() => changeMode(mode)} />
                      <span><strong>{mode === 'legacy' ? t("Legacy") : t("Enforced")}</strong><br />
                        <span className="text-xs text-gray-500">{mode === 'legacy' ? t("Existing built-in access; selections below are stored but not applied.") : t("Only the selected supported actions apply, within the built-in role's limits.")}</span></span>
                    </label>)}
                  </div>}
                {pendingMode === 'enforced' && selectedRole.name !== 'Super Admin' && !isBuiltIn(selectedRole) &&
                  <p className="text-xs text-amber-700 mt-2">{t("Custom roles are not eligible for any supported action, so enforcing this role grants nothing.")}</p>}
                {pendingMode === 'enforced' && isBuiltIn(selectedRole) && selectedRole.name !== 'Super Admin' && eligibleSelectedCount === 0 &&
                  <p className="text-xs text-amber-700 mt-2" role="status">{t("No supported action is selected: once saved, this role loses every covered action.")}</p>}
                {modeDirty && <p className="text-xs text-amber-600 mt-2">{t("Mode change is not saved yet. Review the selection, then Save.")}</p>}
              </fieldset>
              {/* Canonical built-in role, never numeric metadata. */}{selectedRole.name === 'Super Admin' ? (
                <div className="p-6">
                  <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-md">
                    <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                    <p className="text-sm font-medium text-purple-800">{t("Super Admin access follows built-in role rules, independently of these assignments.")}</p>
                  </div>
                </div>
              ) : (
                <div className="admin-permission-groups">
                  {!allPermissions.length && <p className="text-sm text-gray-500">{t("No permissions registered")}</p>}
                  {Object.entries(grouped).map(([group, perms]) => {
                    const enabledInGroup = perms.filter(p => pendingIds.has(p.id)).length;
                    return (
                      <section key={group} className="admin-permission-group">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold text-gray-400">
                            {GROUP_LABELS[group] ? t(GROUP_LABELS[group]) : group}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{(enabledInGroup).toLocaleString(intlLocale())}/{(perms.length).toLocaleString(intlLocale())}</span>
                            <button
                              disabled={saving || !canManage}
                              onClick={() => toggleGroup(perms, true)}
                              className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                            >{t("Semua")} </button>
                            <button
                              disabled={saving || !canManage}
                              onClick={() => toggleGroup(perms, false)}
                              className="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
                            >{t("Hapus")} </button>
                          </div>
                        </div>

                        <div className="admin-permission-options">
                          {perms.map(perm => {
                            const enabled = pendingIds.has(perm.id);
                            const action = actionByKey.get(perm.name);
                            const eligible = action ? action.eligible_roles.includes(selectedRole.name) : false;
                            return (
                              <button
                                disabled={saving || !canManage}
                                key={perm.id}
                                aria-pressed={enabled} onClick={() => togglePermission(perm.id)}
                                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                                  enabled
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-gray-50 border-gray-200 text-gray-400"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate">{permissionLabel(perm.name, perm.description)}</p>
                                  <p className="text-xs font-mono opacity-60 truncate">{perm.name}</p>
                                  {/* Honest status: stored-only names govern nothing; supported keys only
                                      apply to roles within their built-in eligibility. */}
                                  <p className="text-xs mt-0.5" data-permission-status={!action ? 'stored-only' : eligible ? 'supported' : 'not-eligible'}>
                                    {!action ? t("Stored only — not enforced") : eligible ? t("Supported action") : t("Supported, but not available to this role")}</p>
                                </div>
                                {enabled
                                  ? <Eye className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                  : <EyeOff className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
                                }
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}{isDirty && (
                <div className="px-6 pb-4">
                  <p className="text-xs text-amber-600 text-center">{t("Ada perubahan yang belum disimpan")}</p>
                </div>
              )}</ReportSection>
          )}
        </div>
      </div>{/* Modals */}{formModal.open && (
        <RoleFormModal
          role={formModal.role}
          onClose={() => setFormModal({ open: false, role: null })}
          onSaved={handleRoleSaved}
        />
      )}{deleteModal.open && deleteModal.role && (
        <DeleteModal
          role={deleteModal.role}
          onClose={() => setDeleteModal({ open: false, role: null })}
          onDeleted={() => {
            selectionSequence.current++;
            setRoles(current => current.filter(role => role.id !== deleteModal.role!.id));
            setSelectedRole(null);
            setPendingIds(new Set());
            setDetailError(null);
          }}
        />
      )}
      {discardAction && <Modal isOpen onClose={() => setDiscardAction(null)} title={t("Discard permission changes?")} size="sm" role="alertdialog">
        <p>{t("Your unsaved permission selection will be discarded.")}</p>
        <div className="ph-dialog-footer">
          <button className="ph-button" onClick={() => setDiscardAction(null)}>{t("Batal")}</button>
          <button className="ph-button ph-button-primary" onClick={() => {
            const action = discardAction;
            handleReset();
            setDiscardAction(null);
            action();
          }}>{t("Discard changes")}</button>
        </div>
      </Modal>}
      </ReportPage>
  );
}
