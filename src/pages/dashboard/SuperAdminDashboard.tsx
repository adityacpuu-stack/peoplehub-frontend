import {
  Users,
  Building2,
  Activity,
  Shield,
  Server,
  UserCog,
  History,
  CheckCircle,
  AlertTriangle,
  Calculator,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Settings,
  Download,
  ArrowRight,
  Clock,
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
import type { SuperAdminStats, AuditLogEntry, AuditStatistics } from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';

const systemHealthData = [
  { name: 'API',      status: 'healthy', uptime: 99.9 },
  { name: 'Database', status: 'healthy', uptime: 99.8 },
  { name: 'Storage',  status: 'healthy', uptime: 100 },
  { name: 'Cache',    status: 'healthy', uptime: 99.5 },
];

const ACTION_ICON: Record<string, React.ElementType> = {
  login: LogIn, logout: LogOut, create: Plus, update: Edit,
  delete: Trash2, approve: CheckCircle, reject: AlertTriangle, export: Download,
};
const ACTION_COLOR: Record<string, string> = {
  login:   'bg-emerald-100 text-emerald-600',
  logout:  'bg-gray-100 text-gray-500',
  create:  'bg-blue-100 text-blue-600',
  update:  'bg-amber-100 text-amber-600',
  delete:  'bg-red-100 text-red-600',
  approve: 'bg-emerald-100 text-emerald-600',
  reject:  'bg-orange-100 text-orange-600',
};

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
};

const greetingId = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat Pagi';
  if (h < 17) return 'Selamat Siang';
  return 'Selamat Malam';
};

interface Props {
  user: { employee?: { name?: string }; email?: string } | null;
  superAdminStats: SuperAdminStats | null;
  recentLogs: AuditLogEntry[];
  auditStats: AuditStatistics | null;
  greeting: () => string;
}

export function SuperAdminDashboard({ user, superAdminStats, recentLogs, auditStats }: Props) {
  const name = user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Admin';
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{greetingId()}, {name}!</h1>
            <p className="text-sm text-gray-400">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-xl border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" />
            All Systems Operational
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-xl border border-purple-100">
            <Shield className="w-3.5 h-3.5" />
            Super Admin
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'System Users',       value: superAdminStats?.total_users      ?? 0, icon: UserCog,   color: 'text-slate-600' },
          { label: 'Companies',          value: superAdminStats?.total_companies  ?? 0, icon: Building2, color: 'text-blue-500' },
          { label: 'Total Karyawan',     value: superAdminStats?.total_employees  ?? 0, icon: Users,     color: 'text-purple-500' },
          { label: 'Aktivitas Hari Ini', value: superAdminStats?.audit_entries_today ?? 0, icon: History, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Daily Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Aktivitas Harian</h3>
              <p className="text-xs text-gray-400 mt-0.5">Audit log 7 hari terakhir</p>
            </div>
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="px-4 py-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(auditStats?.daily_activity || [])
                  .slice(0, 7).reverse()
                  .map(d => ({
                    name: new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short' }),
                    count: d.count,
                  }))}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)', fontSize: 12 }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} name="Aktivitas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">System Health</h3>
              <p className="text-xs text-gray-400 mt-0.5">Status layanan</p>
            </div>
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg">Healthy</span>
          </div>
          <div className="p-4 space-y-2">
            {systemHealthData.map(service => (
              <div key={service.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${service.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-400">{service.uptime}% uptime</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  service.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {service.status === 'healthy' ? 'OK' : 'Warning'}
                </span>
              </div>
            ))}

            {/* Action breakdown */}
            {(auditStats?.by_action?.length ?? 0) > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Aksi Terbanyak</p>
                <div className="space-y-1.5">
                  {(auditStats?.by_action || []).slice(0, 4).map(a => {
                    const Icon = ACTION_ICON[a.action] ?? Settings;
                    const total = auditStats!.by_action.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((a.count / total) * 100) : 0;
                    return (
                      <div key={a.action} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${ACTION_COLOR[a.action] ?? 'bg-gray-100 text-gray-500'}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-700 capitalize">{a.action}</span>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Aktivitas Terbaru</h3>
              <p className="text-xs text-gray-400 mt-0.5">Audit log sistem terkini</p>
            </div>
            <Link to="/audit-logs" className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-medium transition-colors">
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLogs.length === 0 ? (
              <div className="py-12 text-center">
                <History className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Belum ada aktivitas</p>
              </div>
            ) : recentLogs.map(log => {
              const Icon = ACTION_ICON[log.action] ?? Settings;
              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-500'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">{log.action}
                      {log.model ? <span className="text-gray-400 font-normal"> · {log.model}</span> : null}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{log.employee_name || log.user_email || 'System'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(log.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-xs text-gray-400 mt-0.5">Shortcut admin</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { to: '/users',            label: 'Users',            icon: UserCog,    bg: 'bg-slate-100 text-slate-600',  hover: 'hover:bg-slate-100' },
              { to: '/roles',            label: 'Roles',            icon: Shield,     bg: 'bg-purple-100 text-purple-600', hover: 'hover:bg-purple-50' },
              { to: '/companies',        label: 'Companies',        icon: Building2,  bg: 'bg-blue-100 text-blue-600',    hover: 'hover:bg-blue-50' },
              { to: '/payroll-settings', label: 'Payroll',          icon: Calculator, bg: 'bg-emerald-100 text-emerald-600', hover: 'hover:bg-emerald-50' },
              { to: '/audit-logs',       label: 'Audit Logs',       icon: History,    bg: 'bg-amber-100 text-amber-600',  hover: 'hover:bg-amber-50' },
              { to: '/system-config',    label: 'System Config',    icon: Settings,   bg: 'bg-gray-100 text-gray-600',    hover: 'hover:bg-gray-100' },
            ].map(({ to, label, icon: Icon, bg, hover }) => (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 ${hover} transition-colors`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-600 text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
