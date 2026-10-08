import { auditActionLabel } from './localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ReportPage, ReportHeader, ReportSection } from '@/pages/dashboard/ReportingLayout';
import { auditLogService, type AuditLog, type AuditLogListQuery, type AuditStatistics } from '@/services/audit-log.service';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import './admin-workflows.css';
import './audit-trail.css';

const CATEGORIES = [['', 'Semua aktivitas'], ['errors', 'Error & akses ditolak'], ['auth', 'Login & keamanan'], ['access', 'Akses halaman & data'], ['changes', 'Perubahan data'], ['approval', 'Persetujuan']] as const;
const MODELS = ['auth', 'Page', 'Browser', 'API', 'User', 'Employee', 'Company', 'Department', 'Position', 'Leave', 'LeaveType', 'Overtime', 'Payroll', 'Attendance', 'Contract', 'Document', 'Template', 'Announcement', 'Holiday', 'Setting', 'RBAC', 'Allowance', 'Deduction'];
const modelLabel = (value: string) => MODELS.includes(value) || ['Performance', 'Goal', 'KPI'].includes(value) ? t(value) : value;
const resultLabel = (value: string) => t(value === 'failure' ? 'Gagal' : value === 'success' ? 'Berhasil' : 'Tidak tercatat');
const failureActions = new Set(['error', 'failed', 'denied', 'login_failed', 'client_error', 'network_error']);
function outcome(log: AuditLog) { return log.context?.outcome || (failureActions.has(log.action) ? 'failure' : 'unknown'); }
function time(value: string) { return new Date(value).toLocaleString(intlLocale(), { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function Result({ log }: { log: AuditLog }) {
  useLocale();
  const result = outcome(log);
  return <span className={`audit-result audit-result-${result}`}>{result === 'failure' ? t("Gagal") : result === 'success' ? t("Berhasil") : t("Tidak tercatat")}{log.context?.status_code ? ` · ${log.context.status_code}` : ''}</span>;
}

export function AuditLogsPage() {
  useLocale();
  const isSuperAdmin = useAuthStore(state => state.user?.roles.includes('Super Admin'));
  const [filters, setFilters] = useState<AuditLogListQuery>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStatistics | null>(null);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [statsFailed, setStatsFailed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [detailFailed, setDetailFailed] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const dateError = !!(filters.start_date && filters.end_date && filters.start_date > filters.end_date);
  const query = useMemo(() => ({ ...filters, page, limit: 25 }), [filters, page]);

  useEffect(() => {
    const timer = setTimeout(() => { setFilters(old => old.search === search.trim() ? old : { ...old, search: search.trim() || undefined }); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (dateError) return;
    let current = true;
    setLoading(true); setFailed(false); setLogs([]);
    auditLogService.list(query).then(result => {
      if (current) { setLogs(result.data); setPagination(result.pagination); }
    }).catch(() => { if (current) { setFailed(true); setPagination({ total: 0, totalPages: 0 }); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [query, revision, dateError]);
  useEffect(() => {
    if (dateError) return;
    let current = true;
    setStats(null); setStatsFailed(false);
    auditLogService.getStatistics(filters).then(value => { if (current) setStats(value); })
      .catch(() => { if (current) setStatsFailed(true); });
    return () => { current = false; };
  }, [filters, revision, dateError]);
  useEffect(() => {
    if (detailId === null) return;
    let current = true;
    setDetail(null); setDetailFailed(false);
    auditLogService.getById(detailId).then(value => { if (current) setDetail(value); })
      .catch(() => { if (current) setDetailFailed(true); });
    return () => { current = false; };
  }, [detailId, detailRevision]);
  const change = (patch: AuditLogListQuery) => { setPage(1); setFilters(old => ({ ...old, ...patch })); };
  const exportLogs = async () => {
    setExporting(true);
    try {
      const data = await auditLogService.export(filters);
      const rows = [['ID', 'Aksi', 'Modul', 'Deskripsi', 'User', 'Email', 'Hasil', 'HTTP', 'Request ID', 'Durasi ms', 'Sumber', 'IP', 'Metode', 'Path', 'Waktu WIB'].map(label => t(label)),
        ...data.map(l => [l.id, auditActionLabel(l.action), l.model ? modelLabel(l.model) : l.model, l.description, l.employee_name, l.user_email, resultLabel(outcome(l)), l.context?.status_code, l.context?.request_id, l.context?.duration_ms, l.context?.source, l.ip_address, l.method, l.url, time(l.created_at)])];
      const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'peoplehub-audit-logs.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t(data.length === 10000 ? "{count} log diekspor (batas {limit}; persempit filter untuk sisanya)" : "{count} log diekspor", { count: data.length.toLocaleString(intlLocale()), limit: (10000).toLocaleString(intlLocale()) }));
    } catch { toast.error(t("Gagal mengekspor audit log"), { id: 'api-error' }); }
    finally { setExporting(false); }
  };
  const errorCount = stats?.by_action.filter(a => failureActions.has(a.action)).reduce((sum, a) => sum + a.count, 0);
  return <ReportPage className="ph-admin-page audit-trail">
    <ReportHeader><div className="report-heading"><h1>{t("Audit trail")}</h1><p>{t("Akses, perubahan, dan masalah user dalam satu riwayat.")}</p></div>
      <div className="report-header-context"><button className="ph-button" onClick={() => setRevision(v => v + 1)} disabled={loading || dateError}><RefreshCw size={16} />{t("Refresh")}</button>
        {isSuperAdmin && <button className="ph-button" onClick={exportLogs} disabled={exporting || loading || dateError || search.trim() !== (filters.search || '')}><Download size={16} />{exporting ? t("Mengekspor...") : t("Export CSV")}</button>}</div></ReportHeader>
    <div className="audit-summary" aria-label={t("Ringkasan sesuai filter")}><span><strong>{stats?.total_logs.toLocaleString(intlLocale()) ?? '—'}</strong>{' '}{t("aktivitas")}</span><span><strong>{errorCount?.toLocaleString(intlLocale()) ?? '—'}</strong>{' '}{t("gagal")}</span><span><strong>{stats?.by_user.length.toLocaleString(intlLocale()) ?? '—'}</strong>{' '}{t("akun tercatat")}</span><span>{t("Waktu Indonesia Barat (WIB)")}</span></div>
    {statsFailed && <p role="status">{t("Ringkasan belum tersedia. Gunakan Refresh untuk mencoba lagi.")}</p>}
    <ReportSection>
      <div className="audit-filters">
        <label className="audit-search">{t("Cari aktivitas")}<input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Nama, email, path, deskripsi, request ID")} /></label>
        <label>{t("Jenis aktivitas")}<select value={filters.category || ''} onChange={e => change({ category: (e.target.value || undefined) as AuditLogListQuery['category'] })}>{CATEGORIES.map(([key, title]) => <option key={key} value={key}>{t(title)}</option>)}</select></label>
        <label>{t("Modul")}<select value={filters.model || ''} onChange={e => change({ model: e.target.value || undefined })}><option value="">{t("Semua modul")}</option>{[...new Set([...MODELS, ...(stats?.by_model.map(x => x.model).filter((x): x is string => !!x) || [])])].sort().map(m => <option key={m} value={m}>{modelLabel(m)}</option>)}</select></label>
        <label>{t("Hasil")}<select value={filters.outcome || ''} onChange={e => change({ outcome: (e.target.value || undefined) as AuditLogListQuery['outcome'] })}><option value="">{t("Semua hasil")}</option><option value="success">{t("Berhasil")}</option><option value="failure">{t("Gagal")}</option></select></label>
        <label>{t("Dari tanggal")}<input type="date" value={filters.start_date || ''} onChange={e => change({ start_date: e.target.value || undefined })} /></label>
        <label>{t("Sampai tanggal")}<input type="date" value={filters.end_date || ''} onChange={e => change({ end_date: e.target.value || undefined })} /></label>
        <button className="ph-button" onClick={() => { setSearch(''); setFilters({}); setPage(1); }}>{t("Reset filter")}</button>
      </div>
      {dateError ? <p className="audit-feedback" role="alert">{t("Tanggal akhir harus sama atau sesudah tanggal awal.")}</p> : failed ? <div className="audit-feedback" role="alert">{t("Audit log gagal dimuat.")} <button className="ph-button" onClick={() => setRevision(v => v + 1)}>{t("Coba lagi")}</button></div> : <>
        <div className="ph-table-scroll"><table className="audit-table"><thead><tr><th>{t("Aktivitas")}</th><th>{t("User")}</th><th>{t("Hasil")}</th><th>{t("Waktu WIB")}</th><th><span className="sr-only">{t("Detail")}</span></th></tr></thead><tbody>
          {loading ? <tr><td colSpan={5} className="audit-feedback" role="status">{t("Memuat aktivitas...")}</td></tr> : !logs.length ? <tr><td colSpan={5} className="audit-feedback">{t("Tidak ada aktivitas sesuai filter.")}</td></tr> : logs.map(log => <tr key={log.id}>
            <td><strong>{auditActionLabel(log.action)}</strong><span className="audit-module">{log.model ? modelLabel(log.model) : t('Lainnya')}{log.model_id ? ` #${log.model_id}` : ''}</span><p>{log.description || log.url || t('Tanpa deskripsi')}</p></td>
            <td><strong>{log.employee_name || log.user_email || (log.context?.source === 'server' && !log.user_id ? t('Belum terautentikasi') : t('Sistem / tidak tercatat'))}</strong>{log.employee_name && <p>{log.user_email}</p>}<small>{log.ip_address || t('IP tidak tercatat')}</small></td>
            <td><Result log={log} /><small>{log.context?.source === 'client' ? t("Laporan browser") : log.context?.source === 'server' ? t("Server") : t("Log historis")}</small></td>
            <td><time dateTime={log.created_at}>{time(log.created_at)}</time></td>
            <td><button className="ph-button" aria-label={t("Detail aktivitas {id}", { id: log.id })} onClick={() => setDetailId(log.id)}><Eye size={16} /></button></td>
          </tr>)}
        </tbody></table></div>
        <footer className="audit-pagination"><span>{loading ? t("Memuat...") : t("{total} aktivitas · Halaman {page} dari {pages}", { total: pagination.total.toLocaleString(intlLocale()), page: page.toLocaleString(intlLocale()), pages: Math.max(1, pagination.totalPages).toLocaleString(intlLocale()) })}</span><div><button className="ph-button" aria-label={t("Halaman sebelumnya")} disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button><button className="ph-button" aria-label={t("Halaman berikutnya")} disabled={loading || page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button></div></footer>
      </>}
    </ReportSection>
    <p className="audit-note">{t("Riwayat lama tetap ditampilkan; status yang dahulu tidak dicatat ditandai “Tidak tercatat”. Ekspor mengikuti filter, maksimal 10.000 log. Laporan browser adalah informasi dari perangkat user.")}</p>
    {detailId !== null && <Modal isOpen onClose={() => setDetailId(null)} title={t("Detail aktivitas #{id}", { id: detailId })} size="lg" className="admin-workflow-dialog admin-refreshed-dialog">
      {!detail ? <div className="audit-feedback" role={detailFailed ? 'alert' : 'status'}>{detailFailed ? <>{t("Detail gagal dimuat.")} <button className="ph-button" onClick={() => setDetailRevision(v => v + 1)}>{t("Coba lagi")}</button></> : t("Memuat detail...")}</div> : <div className="admin-audit-detail">
        <section className="ph-section"><h3>{auditActionLabel(detail.action)}</h3><p>{detail.description}</p><Result log={detail} /></section>
        <section className="ph-section"><h3>{t("Jejak aktivitas")}</h3><dl className="ph-kv">
          {Object.entries({ User: detail.employee_name || detail.user_email || t('Sistem / belum terautentikasi'), Email: detail.user_email, 'User ID': detail.user_id, 'Waktu WIB': time(detail.created_at), Modul: detail.model ? modelLabel(detail.model) : detail.model, 'Record ID': detail.model_id, 'Request ID': detail.context?.request_id, 'Request terkait': detail.context?.related_request_id, 'Status HTTP': detail.context?.status_code, 'Durasi (ms)': detail.context?.duration_ms, Sumber: detail.context?.source === 'client' ? t('Laporan browser (client-reported)') : detail.context?.source === 'server' ? t('Server') : detail.context?.source, 'Kode error': detail.context?.error_code || detail.context?.error_name, 'Aksi yang dicoba': detail.context?.attempted_action ? auditActionLabel(detail.context.attempted_action) : undefined, Metode: detail.method, Path: detail.url, 'IP address': detail.ip_address, 'User agent': detail.user_agent }).map(([key, value]) => <div key={key}><dt>{t(key)}</dt><dd>{value ?? t('Tidak tercatat')}</dd></div>)}
        </dl></section>
        <div className="admin-audit-values">{detail.old_values && <section><h3>{t("Nilai sebelumnya")}</h3><pre>{JSON.stringify(detail.old_values, null, 2)}</pre></section>}{detail.new_values && <section><h3>{t("Nilai baru / input permintaan")}</h3><pre>{JSON.stringify(detail.new_values, null, 2)}</pre></section>}</div>
      </div>}<div className="ph-dialog-footer"><button className="ph-button" onClick={() => setDetailId(null)}>{t("Tutup")}</button></div>
    </Modal>}
  </ReportPage>;
}
