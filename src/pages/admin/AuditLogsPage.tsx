import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
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
import { auditLogService, type AuditLog, type AuditLogListQuery, type AuditStatistics } from '@/services/audit-log.service';
import toast from 'react-hot-toast';

const MODELS = ['All', 'Employee', 'Department', 'Position', 'Company', 'Leave', 'Overtime', 'Payroll', 'Attendance', 'Contract', 'Document', 'Performance', 'Goal', 'KPI', 'Setting', 'RBAC', 'Allowance', 'Benefit', 'Announcement', 'Holiday'];
const ACTIONS = ['All', 'create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'export'];

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const query: AuditLogListQuery = { page, limit: 25 };
      if (selectedModel !== 'All') query.model = selectedModel;
      if (selectedAction !== 'All') query.action = selectedAction;

      const result = await auditLogService.list(query);
      setLogs(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, selectedModel, selectedAction]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await auditLogService.getStatistics();
      setStats(result);
    } catch {
      // Silent fail for stats
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedModel, selectedAction]);

  const handleViewDetail = async (log: AuditLog) => {
    setDetailLoading(true);
    try {
      const detail = await auditLogService.getById(log.id);
      setSelectedLog(detail);
    } catch {
      setSelectedLog(log);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const query: AuditLogListQuery = {};
      if (selectedModel !== 'All') query.model = selectedModel;
      if (selectedAction !== 'All') query.action = selectedAction;
      const data = await auditLogService.export(query);

      const csv = [
        ['ID', 'Action', 'Model', 'Description', 'User', 'Email', 'IP', 'Method', 'URL', 'Date'].join(','),
        ...data.map((l) =>
          [l.id, l.action, l.model || '', `"${(l.description || '').replace(/"/g, '""')}"`, l.employee_name || '', l.user_email || '', l.ip_address || '', l.method || '', l.url || '', l.created_at].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit logs exported');
    } catch {
      toast.error('Failed to export logs');
    }
  };

  // Client-side search filter on loaded data
  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.description || '').toLowerCase().includes(q) ||
      (log.user_email || '').toLowerCase().includes(q) ||
      (log.employee_name || '').toLowerCase().includes(q)
    );
  });

  const todayCount = stats?.daily_activity?.find(
    (d) => d.date === new Date().toISOString().slice(0, 10)
  )?.count || 0;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return LogIn;
      case 'logout': return LogOut;
      case 'create': return Plus;
      case 'update': return Edit;
      case 'delete': return Trash2;
      default: return Settings;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-600';
      case 'logout': return 'bg-gray-100 text-gray-600';
      case 'create': return 'bg-blue-100 text-blue-600';
      case 'update': return 'bg-amber-100 text-amber-600';
      case 'delete': return 'bg-red-100 text-red-600';
      case 'approve': return 'bg-emerald-100 text-emerald-600';
      case 'reject': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && logs.length === 0) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all system activities and changes</p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Logs</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.total_logs ?? total}</p>
              </div>
              <History className="h-10 w-10 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Today</p>
                <p className="text-3xl font-bold text-white mt-1">{todayCount}</p>
              </div>
              <Calendar className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Actions Today</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats?.by_action?.length ?? 0}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Active Users</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats?.by_user?.length ?? 0}
                </p>
              </div>
              <User className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by description, user email, or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 h-10 rounded-xl border transition-all ${
                showFilters
                  ? 'border-slate-300 bg-slate-50 text-slate-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
                >
                  {MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model === 'All' ? 'All Models' : model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Action</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
                >
                  {ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {action === 'All' ? 'All Actions' : action.charAt(0).toUpperCase() + action.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-800">Activity Log</CardTitle>
            <span className="text-sm text-gray-500">
              {loading && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
              Showing {filteredLogs.length} of {total} entries
            </span>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="font-semibold text-gray-700">Action</TableHead>
              <TableHead className="font-semibold text-gray-700">Description</TableHead>
              <TableHead className="font-semibold text-gray-700">User</TableHead>
              <TableHead className="font-semibold text-gray-700">Timestamp</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-20">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableEmpty message={loading ? 'Loading...' : 'No audit logs found'} />
            ) : (
              filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <TableRow key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                          <ActionIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{log.action}</p>
                          <p className="text-xs text-gray-500">{log.model || log.method}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-700 line-clamp-1">{log.description || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xs font-semibold">
                          {(log.employee_name || log.user_email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.employee_name || 'System'}</p>
                          <p className="text-xs text-gray-500">{log.user_email || '-'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <div>
                          <p className="font-medium">{formatTime(log.created_at)}</p>
                          <p className="text-xs text-gray-400">{formatDate(log.created_at)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewDetail(log)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors mx-auto block"
                      >
                        <Eye className="h-4 w-4 text-gray-400 hover:text-slate-600" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-700 to-slate-800">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getActionColor(selectedLog.action)}`}>
                  {(() => { const Icon = getActionIcon(selectedLog.action); return <Icon className="h-6 w-6" />; })()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white capitalize">
                    {selectedLog.action}{selectedLog.model ? ` - ${selectedLog.model}` : ''}
                  </h3>
                  <p className="text-slate-300 text-sm">{formatDate(selectedLog.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="font-medium text-gray-900">{selectedLog.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">User</span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{selectedLog.employee_name || 'System'}</p>
                  <p className="text-xs text-gray-500">{selectedLog.user_email || '-'}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Time</span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{formatTime(selectedLog.created_at)}</p>
                  <p className="text-xs text-gray-500">{formatDate(selectedLog.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">IP Address</span>
                  </div>
                  <p className="font-mono text-sm text-gray-900">{selectedLog.ip_address || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Method</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    <Badge variant={selectedLog.method === 'DELETE' ? 'error' : 'default'}>
                      {selectedLog.method || 'N/A'}
                    </Badge>
                  </p>
                </div>
              </div>

              {selectedLog.url && (
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">URL</p>
                  <p className="font-mono text-xs text-gray-700 break-all">{selectedLog.url}</p>
                </div>
              )}

              {selectedLog.user_agent && (
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">User Agent</p>
                  <p className="text-xs text-gray-700 break-all">{selectedLog.user_agent}</p>
                </div>
              )}

              {selectedLog.old_values && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-sm font-medium text-red-700 mb-2">Previous Values</p>
                  <pre className="text-xs text-red-600 font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-sm font-medium text-green-700 mb-2">New Values</p>
                  <pre className="text-xs text-green-600 font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedLog(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
