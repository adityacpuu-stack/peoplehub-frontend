import {
  Users,
  Building2,
  Clock,
  Activity,
  ArrowRight,
  Shield,
  Server,
  UserCog,
  History,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Zap,
  Calculator,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui';
import type { SuperAdminStats, AuditLogEntry, AuditStatistics } from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

// Static system health data (no real monitoring infra)
const systemHealthData = [
  { name: 'API', status: 'healthy', uptime: 99.9 },
  { name: 'Database', status: 'healthy', uptime: 99.8 },
  { name: 'Storage', status: 'healthy', uptime: 100 },
  { name: 'Cache', status: 'healthy', uptime: 99.5 },
];

const formatRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const formatAuditAction = (action: string) => {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

interface Props {
  user: { employee?: { name?: string }; email?: string } | null;
  superAdminStats: SuperAdminStats | null;
  recentLogs: AuditLogEntry[];
  auditStats: AuditStatistics | null;
  greeting: () => string;
}

export function SuperAdminDashboard({ user, superAdminStats, recentLogs, auditStats, greeting }: Props) {
  return (
    <div className="space-y-6">
      {/* Header Banner with Gradient - Super Admin Style */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="admin-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#admin-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                  <Server className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0]}!
                  </h1>
                  <p className="text-slate-300 text-sm mt-1">System Overview & Administration</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                  <Shield className="h-4 w-4 text-purple-300" />
                  Super Admin
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur-xl rounded-xl text-sm text-green-300 font-medium border border-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                  All Systems Operational
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium border border-white/10">
                  <Clock className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
              <UserCog className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(superAdminStats?.total_users || 0)}</p>
          <p className="text-sm text-gray-500">System Users</p>
        </div>

        {/* Companies */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(superAdminStats?.total_companies || 0)}</p>
          <p className="text-sm text-gray-500">Companies</p>
        </div>

        {/* Total Employees */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">All</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(superAdminStats?.total_employees || 0)}</p>
          <p className="text-sm text-gray-500">Total Employees</p>
        </div>

        {/* Audit Logs Today */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <History className="h-5 w-5 text-white" />
            </div>
            <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
              Today
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(superAdminStats?.audit_entries_today || 0)}</p>
          <p className="text-sm text-gray-500">Audit Entries</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Daily Activity</h3>
              <p className="text-xs text-gray-500 mt-1">Audit log entries per day (last 7 days)</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(auditStats?.daily_activity || [])
                  .slice(0, 7)
                  .reverse()
                  .map((d) => ({
                    name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
                    count: d.count,
                  }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Activities" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">System Health</h3>
              <p className="text-xs text-gray-500 mt-1">Service status overview</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <Cpu className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            {systemHealthData.map((service) => (
              <div
                key={service.name}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  service.status === 'healthy' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {service.status === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.uptime}% uptime</p>
                  </div>
                </div>
                <Badge variant={service.status === 'healthy' ? 'success' : 'warning'}>
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <p className="text-xs text-gray-500 mt-1">Latest system audit logs</p>
            </div>
            <Link to="/audit-logs" className="text-sm text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentLogs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            )}
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{formatAuditAction(log.action)}</p>
                    <p className="text-xs text-gray-500">{log.employee_name || log.user_email || 'System'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatRelativeTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              <p className="text-xs text-gray-500 mt-1">Admin shortcuts</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/users"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-slate-50 border border-gray-100 hover:border-slate-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-slate-700">Manage Users</span>
            </Link>
            <Link
              to="/roles"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-purple-700">Roles</span>
            </Link>
            <Link
              to="/payroll-settings"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-emerald-700">Payroll Settings</span>
            </Link>
            <Link
              to="/audit-logs"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 transition-all group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <History className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-amber-700">Audit Logs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
