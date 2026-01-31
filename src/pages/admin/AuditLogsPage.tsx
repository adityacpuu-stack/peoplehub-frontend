import { useState } from 'react';
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
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Plus,
  Settings,
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

// Mock data for audit logs
const mockAuditLogs = [
  {
    id: 1,
    action: 'login',
    module: 'auth',
    description: 'User logged in successfully',
    user: { id: 1, email: 'admin@example.com', name: 'System Admin' },
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    metadata: null,
    created_at: '2025-01-28T10:30:00Z',
  },
  {
    id: 2,
    action: 'create',
    module: 'employees',
    description: 'Created new employee: John Doe (EMP001)',
    user: { id: 2, email: 'hr.manager@example.com', name: 'Sarah Johnson' },
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    metadata: { employee_id: 'EMP001', name: 'John Doe' },
    created_at: '2025-01-28T10:15:00Z',
  },
  {
    id: 3,
    action: 'update',
    module: 'employees',
    description: 'Updated employee salary: Jane Smith (EMP002)',
    user: { id: 2, email: 'hr.manager@example.com', name: 'Sarah Johnson' },
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    metadata: { employee_id: 'EMP002', field: 'basic_salary' },
    created_at: '2025-01-28T09:45:00Z',
  },
  {
    id: 4,
    action: 'delete',
    module: 'departments',
    description: 'Attempted to delete department: Marketing',
    user: { id: 2, email: 'hr.manager@example.com', name: 'Sarah Johnson' },
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'failed',
    metadata: { error: 'Department has active employees' },
    created_at: '2025-01-28T09:30:00Z',
  },
  {
    id: 5,
    action: 'logout',
    module: 'auth',
    description: 'User logged out',
    user: { id: 3, email: 'hr.staff@example.com', name: 'Mike Chen' },
    ip_address: '192.168.1.102',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    status: 'success',
    metadata: null,
    created_at: '2025-01-28T09:00:00Z',
  },
  {
    id: 6,
    action: 'login',
    module: 'auth',
    description: 'Failed login attempt',
    user: { id: null, email: 'unknown@example.com', name: 'Unknown' },
    ip_address: '10.0.0.50',
    user_agent: 'Python-urllib/3.9',
    status: 'failed',
    metadata: { reason: 'Invalid credentials' },
    created_at: '2025-01-28T08:45:00Z',
  },
  {
    id: 7,
    action: 'update',
    module: 'settings',
    description: 'Updated system settings: notification preferences',
    user: { id: 1, email: 'admin@example.com', name: 'System Admin' },
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    metadata: { setting: 'notifications' },
    created_at: '2025-01-28T08:30:00Z',
  },
  {
    id: 8,
    action: 'create',
    module: 'roles',
    description: 'Created new role: Branch Manager',
    user: { id: 1, email: 'admin@example.com', name: 'System Admin' },
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    metadata: { role_name: 'Branch Manager', level: 5 },
    created_at: '2025-01-27T16:00:00Z',
  },
];

const modules = ['All', 'auth', 'employees', 'departments', 'roles', 'settings', 'companies'];
const actions = ['All', 'login', 'logout', 'create', 'update', 'delete'];
const statuses = ['All', 'success', 'failed'];

export function AuditLogsPage() {
  const [logs, setLogs] = useState(mockAuditLogs);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedLog, setSelectedLog] = useState<typeof mockAuditLogs[0] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.user.email.toLowerCase().includes(search.toLowerCase()) ||
      log.user.name?.toLowerCase().includes(search.toLowerCase());
    const matchesModule = selectedModule === 'All' || log.module === selectedModule;
    const matchesAction = selectedAction === 'All' || log.action === selectedAction;
    const matchesStatus = selectedStatus === 'All' || log.status === selectedStatus;

    return matchesSearch && matchesModule && matchesAction && matchesStatus;
  });

  const successCount = logs.filter((l) => l.status === 'success').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const todayCount = logs.filter(
    (l) => new Date(l.created_at).toDateString() === new Date().toDateString()
  ).length;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return LogIn;
      case 'logout':
        return LogOut;
      case 'create':
        return Plus;
      case 'update':
        return Edit;
      case 'delete':
        return Trash2;
      default:
        return Settings;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-green-100 text-green-600';
      case 'logout':
        return 'bg-gray-100 text-gray-600';
      case 'create':
        return 'bg-blue-100 text-blue-600';
      case 'update':
        return 'bg-amber-100 text-amber-600';
      case 'delete':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
                <p className="text-3xl font-bold text-white mt-1">{logs.length}</p>
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
                <p className="text-green-100 text-sm">Success</p>
                <p className="text-3xl font-bold text-white mt-1">{successCount}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-red-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Failed</p>
                <p className="text-3xl font-bold text-white mt-1">{failedCount}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-200" />
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
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Module</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
                >
                  {modules.map((module) => (
                    <option key={module} value={module}>
                      {module === 'All' ? 'All Modules' : module.charAt(0).toUpperCase() + module.slice(1)}
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
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {action === 'All' ? 'All Actions' : action.charAt(0).toUpperCase() + action.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm transition-all focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:bg-white"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'All' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
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
              Showing {filteredLogs.length} of {logs.length} entries
            </span>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="font-semibold text-gray-700">Action</TableHead>
              <TableHead className="font-semibold text-gray-700">Description</TableHead>
              <TableHead className="font-semibold text-gray-700">User</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-gray-700">Timestamp</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-20">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableEmpty message="No audit logs found" />
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
                          <p className="text-xs text-gray-500 capitalize">{log.module}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-700 line-clamp-1">{log.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xs font-semibold">
                          {log.user.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.user.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{log.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                        {log.status}
                      </Badge>
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
                        onClick={() => setSelectedLog(log)}
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
            <div
              className={`p-6 ${
                selectedLog.status === 'success'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  {selectedLog.status === 'success' ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : (
                    <XCircle className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white capitalize">
                    {selectedLog.action} - {selectedLog.module}
                  </h3>
                  <p className="text-white/80 text-sm">{formatDate(selectedLog.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="font-medium text-gray-900">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">User</span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{selectedLog.user.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{selectedLog.user.email}</p>
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
                  <p className="font-mono text-sm text-gray-900">{selectedLog.ip_address}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Device</span>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-1">{selectedLog.user_agent.split(' ')[0]}</p>
                </div>
              </div>

              {selectedLog.metadata && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-sm font-medium text-slate-700 mb-2">Additional Data</p>
                  <pre className="text-xs text-slate-600 font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
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
