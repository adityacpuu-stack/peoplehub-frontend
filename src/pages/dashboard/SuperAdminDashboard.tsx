import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuthStore } from '@/stores/auth.store';
import type { SuperAdminStats, AuditLogEntry, AuditStatistics } from '@/services/dashboard.service';
import { formatNumber } from '@/lib/utils';
import './hr-dashboard.css';
import '../admin/admin-refresh.css';

type ServiceStatus = 'healthy' | 'unhealthy' | 'disabled' | 'loading' | 'unknown';
type Health = { name: string; status: ServiceStatus; latency?: number };
type OnlineUser = { user_id: number; name?: string; email: string; page?: string; last_seen: string };
interface Props {
  user: { employee?: { name?: string }; email?: string } | null;
  superAdminStats: SuperAdminStats | null;
  recentLogs: AuditLogEntry[];
  auditStats: AuditStatistics | null;
  greeting: () => string;
  failed?: boolean;
  onRetry: () => void;
}
const API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const API_BASE = API_URL.replace(/\/api\/v1$/, '');
const SERVICES = ['API', 'Database', 'Storage', 'Cache'];
const stamp = (value: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(value));

export function SuperAdminDashboard({ user, superAdminStats, recentLogs, auditStats, greeting, failed = false, onRetry }: Props) {
  useLocale();
  const token = useAuthStore(state => state.token);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [presenceState, setPresenceState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [health, setHealth] = useState<Health[]>(SERVICES.map(name => ({ name, status: 'loading' })));
  const [retryHealth, setRetryHealth] = useState(0);
  const [retryPresence, setRetryPresence] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        const data = await response.json();
        // A health endpoint may intentionally return 503 with valid service statuses.
        if (!data.services || typeof data.services !== 'object') throw new Error('Invalid health response');
        const rows: Health[] = SERVICES.map(name => {
          const service = data.services[name.toLowerCase()];
          const status: ServiceStatus = ['healthy', 'unhealthy', 'disabled'].includes(service?.status) ? service.status : 'unknown';
          return { name, status, latency: typeof service?.latency === 'number' ? service.latency : undefined };
        });
        if (!controller.signal.aborted) setHealth(rows);
      } catch {
        if (!controller.signal.aborted) setHealth(SERVICES.map(name => ({ name, status: 'unknown' })));
      } finally { pending = false; }
    };
    void load();
    const timer = setInterval(load, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [retryHealth]);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        if (!token) throw new Error('Missing session');
        const response = await fetch(`${API_URL}/presence`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Presence unavailable');
        const data = await response.json();
        if (!Array.isArray(data.data)) throw new Error('Invalid presence response');
        if (!controller.signal.aborted) { setOnline(data.data); setPresenceState('ready'); }
      } catch {
        if (!controller.signal.aborted) { setOnline([]); setPresenceState('failed'); }
      } finally { pending = false; }
    };
    void load();
    const timer = setInterval(load, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [token, retryPresence]);

  const checking = health.some(service => service.status === 'loading');
  const unknown = health.some(service => service.status === 'unknown');
  const healthy = health.every(service => service.status === 'healthy' || service.status === 'disabled');
  const healthLabel = checking ? 'Checking Systems' : unknown ? 'Status belum tersedia' : healthy ? 'All Systems Operational' : 'Some Services Unavailable';
  const chart = [...(auditStats?.daily_activity ?? [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-7).map(row => ({
    ...row, label: new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(row.date)),
  }));

  return <div className="hr-home admin-home">
    <header className="hr-home-heading"><div><h1>{greeting()}, {user?.employee?.name?.split(' ')[0] || user?.email?.split('@')[0] || t('Admin')}</h1><p>{t("Akun, akses, dan layanan PeopleHub dalam satu tempat.")}</p></div>
      <div className="hr-home-actions"><button className="hr-refresh" aria-label={t("Refresh dashboard")} onClick={onRetry}><RefreshCw size={16} /></button><Link className="hr-primary-action" to="/users">{t("Kelola user")} <ArrowUpRight size={15} /></Link></div>
    </header>
    <div className="hr-home-context"><span>{t("System overview")}</span><time>{new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date())}</time></div>
    {failed || !superAdminStats ? <section className="hr-home-error" role="alert"><h2>{t("Ringkasan belum bisa dimuat")}</h2><p>{t("Coba lagi untuk melihat data akun dan aktivitas terbaru.")}</p><button className="hr-primary-action" onClick={onRetry}>{t("Coba lagi")}</button></section> : <>
      <section className="hr-workforce-metrics" aria-label={t("System summary")}>
        {[['System Users', superAdminStats.total_users], ['Companies', superAdminStats.total_companies], ['Total Karyawan', superAdminStats.total_employees], ['Aktivitas Hari Ini', superAdminStats.audit_entries_today]].map(([label, value]) => <div key={label}><span>{t(String(label))}</span><strong>{formatNumber(Number(value))}</strong></div>)}
      </section>
      <div className="admin-home-primary">
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("Aktivitas terbaru")}</h2><p>{t("Sepuluh catatan audit terakhir")}</p></div><Link className="admin-text-link" to="/audit-logs">{t("Audit Logs")} <ArrowUpRight size={15} /></Link></header>
          <div className="admin-register-scroll"><table className="admin-register"><thead><tr><th>{t("Aktivitas")}</th><th>{t("User")}</th><th>{t("Waktu (WIB)")}</th></tr></thead><tbody>{recentLogs.map(log => <tr key={log.id}><td><strong>{log.description || `${log.action} ${log.model || ''}`}</strong><small>{log.action} · {log.model || t('System')}</small></td><td>{log.employee_name || log.user_email || t('System')}</td><td><time>{stamp(log.created_at)}</time></td></tr>)}</tbody></table></div>
          {!recentLogs.length && <p className="hr-empty">{t("Belum ada aktivitas tercatat.")}</p>}
        </section>
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("System Health")}</h2><p>{t("Diperiksa setiap 30 detik")}</p></div><button className="hr-refresh" aria-label={t("Periksa layanan lagi")} onClick={() => setRetryHealth(value => value + 1)}><RefreshCw size={14} /></button></header>
          <p className="admin-health-summary" data-state={healthy ? 'healthy' : unknown || checking ? 'unknown' : 'unhealthy'} role="status">{t(healthLabel)}</p>
          <dl className="admin-health-list">{health.map(service => <div key={service.name}><dt>{t(service.name)}{service.latency !== undefined && <small>{(service.latency).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}{' '}{t("ms")}</small>}</dt><dd data-state={service.status}>{service.status === 'healthy' ? t("OK") : service.status === 'disabled' ? t("Off") : service.status === 'unhealthy' ? t("Error") : service.status === 'loading' ? t("Checking...") : t("Belum tersedia")}</dd></div>)}</dl>
          <nav className="admin-shortcuts" aria-label={t("Administrasi cepat")}><Link to="/roles">{t("Roles & Permissions")} <ArrowUpRight size={14} /></Link><Link to="/company-assignments">{t("Company Assignments")} <ArrowUpRight size={14} /></Link><Link to="/system-config">{t("System Configuration")} <ArrowUpRight size={14} /></Link></nav>
        </section>
      </div>
      <div className="hr-home-bottom-grid">
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("Aktivitas harian")}</h2><p>{t("Audit log tujuh hari terakhir")}</p></div></header>
          {chart.length ? <div className="admin-activity-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}><CartesianGrid vertical={false} stroke="#e8eee9" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><YAxis tickFormatter={value => Number(value).toLocaleString(intlLocale())} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><Tooltip formatter={value => typeof value === 'number' ? value.toLocaleString(intlLocale()) : value} /><Bar dataKey="count" name={t("Aktivitas")} fill="#6e9978" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <p className="hr-empty">{t("Belum ada aktivitas harian.")}</p>}
          {!!auditStats?.by_action?.length && <div className="admin-action-counts">{auditStats.by_action.map(action => <span key={action.action}>{action.action} <strong>{formatNumber(action.count)}</strong></span>)}</div>}
        </section>
        <section className="hr-home-panel"><header className="hr-panel-heading"><div><h2>{t("Online Now")}{presenceState === 'ready' && <span className="admin-inline-count">{(online.length).toLocaleString(intlLocale(), { maximumFractionDigits: 20 })}</span>}</h2><p>{t("Aktivitas sesi, diperbarui setiap 15 detik")}</p></div></header>
          {presenceState === 'loading' ? <p className="hr-empty" role="status">{t("Memuat user online...")}</p> : presenceState === 'failed' ? <div className="admin-inline-error" role="alert"><p>{t("Status user online belum tersedia.")}</p><button className="ph-button" onClick={() => setRetryPresence(value => value + 1)}>{t("Coba lagi")}</button></div> : !online.length ? <p className="hr-empty">{t("No users online right now")}</p> : <ul className="admin-online-list">{online.map(person => <li key={person.user_id}><span className="hr-person-initial">{(person.name || person.email).slice(0, 2).toUpperCase()}</span><div><strong>{person.name || person.email}</strong><small>{person.page || t('Halaman tidak tersedia')}</small></div><time>{stamp(person.last_seen)}</time></li>)}</ul>}
        </section>
      </div>
    </>}
  </div>;
}
