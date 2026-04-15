import { useState, useEffect } from 'react';
import {
  Shield, Search, Plus, Save, RotateCcw, Loader2,
  Lock, Eye, EyeOff, Trash2, AlertCircle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rbacService, type Role, type RoleDetail, type Permission } from '@/services/rbac.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupPermissions(permissions: Permission[]) {
  const map: Record<string, Permission[]> = {};
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
};

// ─── Role Form Modal ──────────────────────────────────────────────────────────

interface RoleFormModalProps {
  role: Role | null; // null = create, non-null = edit
  onClose: () => void;
  onSaved: () => void;
}

function RoleFormModal({ role, onClose, onSaved }: RoleFormModalProps) {
  const isEdit = !!role;
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [level, setLevel] = useState(role?.level ?? 8);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await rbacService.updateRole(role!.id, { name, description, level });
        toast.success('Role diperbarui');
      } else {
        await rbacService.createRole({ name, description, level });
        toast.success('Role dibuat');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Role' : 'Buat Role Baru'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nama Role</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={role?.is_system}
              placeholder="cth: Finance Auditor"
              className="w-full h-9 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 bg-gray-50 focus:bg-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deskripsi</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Deskripsi singkat tentang role ini..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 bg-gray-50 focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Level <span className="text-gray-400 font-normal">(1 = tertinggi)</span></label>
            <input
              type="number" min={1} max={10}
              value={level}
              onChange={e => setLevel(Number(e.target.value))}
              className="w-full h-9 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 bg-gray-50 focus:bg-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 h-9 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ role, onClose, onDeleted }: { role: Role; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await rbacService.deleteRole(role.id);
      toast.success('Role dihapus');
      onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus role');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-red-100">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Hapus Role</h3>
            <p className="text-xs text-gray-500">Tindakan ini tidak bisa dibatalkan</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Hapus role <span className="font-semibold text-gray-900">{role.name}</span>?
          Semua user yang memiliki role ini akan kehilangan akses.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Batal
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex-1 h-9 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);

  // Pending permission IDs (editable)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [formModal, setFormModal] = useState<{ open: boolean; role: Role | null }>({ open: false, role: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; role: Role | null }>({ open: false, role: null });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        rbacService.getRoles(),
        rbacService.getPermissions(),
      ]);
      setRoles(rolesRes.data);
      setAllPermissions(permsRes.data);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role: Role) => {
    setLoadingRole(true);
    setIsDirty(false);
    try {
      const detail = await rbacService.getRoleById(role.id);
      setSelectedRole(detail);
      const ids = new Set(detail.rolePermissions.map(rp => rp.permission.id));
      setPendingIds(ids);
    } catch {
      toast.error('Gagal memuat detail role');
    } finally {
      setLoadingRole(false);
    }
  };

  const togglePermission = (permId: number) => {
    setPendingIds(prev => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
    setIsDirty(true);
  };

  const toggleGroup = (perms: Permission[], on: boolean) => {
    setPendingIds(prev => {
      const next = new Set(prev);
      perms.forEach(p => on ? next.add(p.id) : next.delete(p.id));
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await rbacService.assignPermissionsToRole(selectedRole.id, [...pendingIds]);
      toast.success('Permission berhasil disimpan');
      setIsDirty(false);
      // refresh role detail
      const detail = await rbacService.getRoleById(selectedRole.id);
      setSelectedRole(detail);
    } catch {
      toast.error('Gagal menyimpan permission');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!selectedRole) return;
    const ids = new Set(selectedRole.rolePermissions.map(rp => rp.permission.id));
    setPendingIds(ids);
    setIsDirty(false);
  };

  const grouped = groupPermissions(allPermissions);
  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-sm text-gray-500">Kelola role dan hak akses per role</p>
          </div>
        </div>
        <button
          onClick={() => setFormModal({ open: true, role: null })}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Role
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Role List */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:bg-white transition-all"
            />
          </div>

          {/* Role Pills */}
          <div className="flex flex-col gap-1.5">
            {filteredRoles.map(role => {
              const isActive = selectedRole?.id === role.id;
              const count = role._count;
              return (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-slate-800 text-white shadow'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {role.is_system && (
                      <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white/60' : 'text-gray-400'}`} />
                    )}
                    <span className="truncate">{role.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {count && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {count.userRoles} user
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center">{roles.length} role terdaftar</p>
        </div>

        {/* Right: Permission Panel */}
        <div className="lg:col-span-2">
          {!selectedRole && !loadingRole ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-center">
              <Shield className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">Pilih role di kiri untuk melihat permissions</p>
            </div>
          ) : loadingRole ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : selectedRole && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Panel Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{selectedRole.name}</h2>
                      {selectedRole.is_system && (
                        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">System</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {pendingIds.size} dari {allPermissions.length} permission aktif
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedRole.is_system && (
                    <>
                      <button
                        onClick={() => setFormModal({ open: true, role: selectedRole })}
                        className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, role: selectedRole })}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Hapus
                      </button>
                    </>
                  )}
                  {isDirty && (
                    <>
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Simpan
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Super Admin shortcut */}
              {selectedRole.level === 1 ? (
                <div className="p-6">
                  <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                    <p className="text-sm font-medium text-purple-800">Role ini memiliki akses penuh ke semua fitur sistem</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {Object.entries(grouped).map(([group, perms]) => {
                    const enabledInGroup = perms.filter(p => pendingIds.has(p.id)).length;
                    return (
                      <div key={group}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {GROUP_LABELS[group] || group}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{enabledInGroup}/{perms.length}</span>
                            <button
                              onClick={() => toggleGroup(perms, true)}
                              className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                              Semua
                            </button>
                            <button
                              onClick={() => toggleGroup(perms, false)}
                              className="text-xs px-2 py-1 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {perms.map(perm => {
                            const enabled = pendingIds.has(perm.id);
                            return (
                              <button
                                key={perm.id}
                                onClick={() => togglePermission(perm.id)}
                                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                                  enabled
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-gray-50 border-gray-200 text-gray-400'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate">{perm.description || perm.name}</p>
                                  <p className="text-xs font-mono opacity-60 truncate">{perm.name}</p>
                                </div>
                                {enabled
                                  ? <Eye className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                  : <EyeOff className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
                                }
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isDirty && (
                <div className="px-6 pb-4">
                  <p className="text-xs text-amber-600 text-center">Ada perubahan yang belum disimpan</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {formModal.open && (
        <RoleFormModal
          role={formModal.role}
          onClose={() => setFormModal({ open: false, role: null })}
          onSaved={fetchData}
        />
      )}
      {deleteModal.open && deleteModal.role && (
        <DeleteModal
          role={deleteModal.role}
          onClose={() => setDeleteModal({ open: false, role: null })}
          onDeleted={() => { fetchData(); setSelectedRole(null); }}
        />
      )}
    </div>
  );
}
