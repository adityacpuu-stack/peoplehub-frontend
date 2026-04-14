import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Download,
  Eye,
  User,
  Calendar,
  Clock,
  Globe,
  Monitor,
  ChevronDown,
  CheckCircle,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { auditLogService, type AuditLog, type AuditLogListQuery, type AuditStatistics } from '@/services/audit-log.service';
import toast from 'react-hot-toast';

const MODELS = ['Employee', 'Department', 'Position', 'Company', 'Leave', 'Overtime', 'Payroll', 'Attendance', 'Contract', 'Document', 'Performance', 'Goal', 'KPI', 'Setting', 'RBAC', 'Allowance', 'Benefit', 'Announcement', 'Holiday'];

type TabKey = 'all' | 'auth' | 'create' | 'update' | 'delete' | 'approval';

const TABS: { key: TabKey; label: string; apiAction?: string; clientActions?: string[]; icon: React.ElementType }[] = [
  { key: 'all',      label: 'Semua',    icon: History },
  { key: 'auth',     label: 'Auth',     clientActions: ['login', 'logout'], icon: LogIn },
  { key: 'create',   label: 'Buat',     apiAction: 'create',  icon: Plus },
  { key: 'update',   label: 'Ubah',     apiAction: 'update',  icon: Edit },
  { key: 'delete',   label: 'Hapus',    apiAction: 'delete',  icon: Trash2 },
  { key: 'approval', label: 'Approval', clientActions: ['approve', 'reject'], icon: CheckCircle },
];

const ACTION_ICON: Record<string, React.ElementType> = {
  login: LogIn, logout: LogOut, create: Plus, update: Edit, delete: Trash2,
  approve: CheckCircle, reject: X, export: Download,
};
const ACTION_COLOR: Record<string, string> = {
  login: 'bg-emerald-100 text-emerald-600',
  logout: 'bg-gray-100 text-gray-500',
  create: 'bg-blue-100 text-blue-600',
  update: 'bg-amber-100 text-amber-600',
  delete: 'bg-red-100 text-red-600',
  approve: 'bg-emerald-100 text-emerald-600',
  reject: 'bg-orange-100 text-orange-600',
};

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const activeTabDef = TABS.find(t => t.key === activeTab)!;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const query: AuditLogListQuery = { page, limit: 25 };
      if (selectedModel) query.model = selectedModel;
      // For single-action tabs, send to API; for multi-action tabs, fetch all and filter client-side
      if (activeTabDef.apiAction) query.action = activeTabDef.apiAction;
      const result = await auditLogService.list(query);
      setLogs(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch {
      toast.error('Gagal memuat audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, selectedModel, activeTab]);

  const fetchStats = useCallback(async () => {
    try { setStats(await auditLogService.getStatistics()); } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [activeTab, selectedModel]);

  const handleViewDetail = async (log: AuditLog) => {
    try { setSelectedLog(await auditLogService.getById(log.id)); }
    catch { setSelectedLog(log); }
  };

  const handleExport = async () => {
    try {
      const query: AuditLogListQuery = {};
      if (selectedModel) query.model = selectedModel;
      if (activeTabDef.apiAction) query.action = activeTabDef.apiAction;
      const data = await auditLogService.export(query);
      const csv = [
        ['ID', 'Action', 'Model', 'Description', 'User', 'Email', 'IP', 'Method', 'URL', 'Date'].join(','),
        ...data.map(l => [l.id, l.action, l.model || '', `"${(l.description || '').replace(/"/g, '""')}"`, l.employee_name || '', l.user_email || '', l.ip_address || '', l.method || '', l.url || '', l.created_at].join(',')),
      ].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success('Audit logs diekspor');
    } catch { toast.error('Gagal ekspor'); }
  };

  // Client-side filter for multi-action tabs + search
  const filteredLogs = logs.filter(log => {
    if (activeTabDef.clientActions && !activeTabDef.clientActions.includes(log.action)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (log.description || '').toLowerCase().includes(q) ||
      (log.user_email || '').toLowerCase().includes(q) ||
      (log.employee_name || '').toLowerCase().includes(q);
  });

  const todayCount = stats?.daily_activity?.find(d => d.date === new Date().toISOString().slice(0, 10))?.count ?? 0;
  const getStatCount = (actions: string[]) => stats?.by_action?.filter(a => actions.includes(a.action)).reduce((s, a) => s + a.count, 0) ?? 0;

  const tabCounts: Record<TabKey, number> = {
    all: stats?.total_logs ?? total,
    auth: getStatCount(['login', 'logout']),
    create: getStatCount(['create']),
    update: getStatCount(['update']),
    delete: getStatCount(['delete']),
    approval: getStatCount(['approve', 'reject']),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500">Pantau seluruh aktivitas dan perubahan sistem</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Log', value: stats?.total_logs ?? total, icon: History, color: 'text-slate-600' },
          { label: 'Hari Ini', value: todayCount, icon: Calendar, color: 'text-blue-500' },
          { label: 'Jenis Aksi', value: stats?.by_action?.length ?? 0, icon: Settings, color: 'text-purple-500' },
          { label: 'Active Users', value: stats?.by_user?.length ?? 0, icon: User, color: 'text-emerald-500' },
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

      {/* Main Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-100 px-4 pt-3 flex items-center gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-slate-900 border-slate-800 bg-slate-50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count > 9999 ? '9999+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari deskripsi, email, nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-slate-400 focus:outline-none transition-all appearance-none"
            >
              <option value="">Semua Modul</option>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <span className="text-xs text-gray-400 ml-auto hidden sm:block">
            {loading ? <Loader2 className="inline w-3 h-3 animate-spin mr-1" /> : null}
            {filteredLogs.length} dari {total} log
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Aksi', 'Deskripsi', 'User', 'Waktu', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:w-14 last:text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300 mx-auto" /></td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <History className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Tidak ada log ditemukan</p>
                  </td>
                </tr>
              ) : filteredLogs.map(log => {
                const ActionIcon = ACTION_ICON[log.action] ?? Settings;
                return (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Action */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-500'}`}>
                          <ActionIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{log.action}</p>
                          <p className="text-xs text-gray-400">{log.model || log.method || '—'}</p>
                        </div>
                      </div>
                    </td>
                    {/* Description */}
                    <td className="px-5 py-3 max-w-xs">
                      <p className="text-sm text-gray-700 truncate">{log.description || '—'}</p>
                    </td>
                    {/* User */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(log.employee_name || log.user_email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{log.employee_name || 'System'}</p>
                          <p className="text-xs text-gray-400 truncate">{log.user_email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    {/* Time */}
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-700">{fmtTime(log.created_at)}</p>
                          <p className="text-gray-400">{fmtDate(log.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    {/* Detail */}
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => handleViewDetail(log)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors group">
                        <Eye className="w-3.5 h-3.5 text-gray-400 group-hover:text-slate-700" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Hal. {page} dari {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ACTION_COLOR[selectedLog.action] ?? 'bg-gray-100 text-gray-500'}`}>
                  {(() => { const Icon = ACTION_ICON[selectedLog.action] ?? Settings; return <Icon className="w-4 h-4" />; })()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {selectedLog.action}{selectedLog.model ? ` · ${selectedLog.model}` : ''}
                  </h3>
                  <p className="text-xs text-gray-400">{fmtDate(selectedLog.created_at)} · {fmtTime(selectedLog.created_at)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Description */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Deskripsi</p>
                <p className="text-sm font-medium text-gray-900">{selectedLog.description || 'Tidak ada deskripsi'}</p>
              </div>

              {/* User + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">User</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.employee_name || 'System'}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedLog.user_email || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">Waktu</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{fmtTime(selectedLog.created_at)}</p>
                  <p className="text-xs text-gray-500">{fmtDate(selectedLog.created_at)}</p>
                </div>
              </div>

              {/* IP + Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">IP Address</span>
                  </div>
                  <p className="font-mono text-sm text-gray-900">{selectedLog.ip_address || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Monitor className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">Method</span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded-lg ${
                    selectedLog.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                    selectedLog.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    selectedLog.method === 'PUT' || selectedLog.method === 'PATCH' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{selectedLog.method || 'N/A'}</span>
                </div>
              </div>

              {/* URL */}
              {selectedLog.url && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">URL</p>
                  <p className="font-mono text-xs text-gray-700 break-all">{selectedLog.url}</p>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">User Agent</p>
                  <p className="text-xs text-gray-600 break-all">{selectedLog.user_agent}</p>
                </div>
              )}

              {/* Old Values */}
              {selectedLog.old_values && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-red-600 mb-2">Nilai Sebelumnya</p>
                  <pre className="text-xs text-red-700 font-mono overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                </div>
              )}

              {/* New Values */}
              {selectedLog.new_values && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-600 mb-2">Nilai Baru</p>
                  <pre className="text-xs text-emerald-700 font-mono overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
