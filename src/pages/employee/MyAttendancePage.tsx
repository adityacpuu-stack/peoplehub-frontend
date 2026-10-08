import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { attendanceService, type AttendanceSummary } from '@/services/attendance.service';
import type { Attendance, PaginatedResponse } from '@/types';
import '@/pages/personal/personal-workspace.css';
import './my-attendance.css';
import { AttendanceClock } from './AttendanceClock';

const statusLabels: Record<string, string> = {
  present: 'Hadir', absent: 'Tidak hadir', late: 'Terlambat', early_leave: 'Pulang lebih awal',
  on_leave: 'Cuti', half_day: 'Absensi setengah hari', wfh: 'WFH', work_from_home: 'WFH', holiday: 'Hari libur',
};
const shiftLabels: Record<string, string> = { morning: 'Morning shift', afternoon: 'Afternoon shift', night: 'Night shift', flexible: 'Flexible shift' };
const shiftLabel = (value?: string | null) => value ? shiftLabels[value] ? t(shiftLabels[value]) : value : t('Tidak tercatat');
const dateLabel = (value: string) => new Date(value).toLocaleDateString(intlLocale(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const timeLabel = (value?: string | null) => value ? new Date(value).toLocaleTimeString(intlLocale(), { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) : '—';
const hoursLabel = (value: unknown) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString(intlLocale(), { maximumFractionDigits: 2 });
function Status({ value }: { value: string }) {
  useLocale();
  const tone = ['present', 'work_from_home', 'wfh'].includes(value) ? 'positive' : value === 'late' ? 'warning' : value === 'absent' ? 'negative' : 'neutral';
  return <span className={`attendance-status attendance-status-${tone}`}>{statusLabels[value] ? t(statusLabels[value]) : value || t('Tidak tercatat')}</span>;
}
function currentMonth() {
  const todayWib = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const [year, month] = todayWib.split('-').map(Number);
  return { start: `${todayWib.slice(0, 7)}-01`, end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) };
}

function SummaryDialog({ initialStart, initialEnd, onClose }: { initialStart: string; initialEnd: string; onClose: () => void }) {
  useLocale();
  const defaults = initialStart && initialEnd ? { start: initialStart, end: initialEnd } : currentMonth();
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [retry, setRetry] = useState(0);
  const key = `${start}:${end}:${retry}`;
  const [response, setResponse] = useState<{ key: string; data?: AttendanceSummary; failed?: boolean } | null>(null);
  const current = response?.key === key ? response : null;
  const valid = !!start && !!end && start <= end;
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    attendanceService.getMySummary({ start_date: start, end_date: end })
      .then(data => { if (!cancelled) setResponse({ key, data }); })
      .catch(() => { if (!cancelled) setResponse({ key, failed: true }); });
    return () => { cancelled = true; };
  }, [start, end, key, valid]);
  const data = current?.data;
  return <Modal isOpen onClose={onClose} title={t("Ringkasan kehadiran")} description={t("Berdasarkan catatan absensi yang sudah tersimpan pada periode pilihan.")} size="lg" className="ph-workflow personal-modal attendance-dialog">
    <div className="attendance-filters attendance-summary-filters">
      <label>{t("Dari tanggal")}<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>{t("Sampai tanggal")}<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
    </div>
    {!valid ? <p role="alert" className="attendance-feedback">{t("Isi kedua tanggal dengan urutan yang benar.")}</p>
      : current?.failed ? <div role="alert" className="attendance-feedback">{t("Ringkasan belum berhasil dimuat.")} <button className="ph-button" onClick={() => setRetry(n => n + 1)}>{t("Coba lagi")}</button></div>
      : !data ? <p role="status" className="attendance-feedback">{t("Memuat ringkasan...")}</p>
      : <><dl className="attendance-summary-grid">
        {Object.entries({ 'Catatan tersimpan': data.total_days, Hadir: data.present_days, Terlambat: data.late_days, 'Tidak hadir tercatat': data.absent_days, Cuti: data.leave_days, WFH: data.wfh_days, 'Hari libur': data.holiday_days, 'Absensi setengah hari': data.half_days, 'Total durasi (jam)': hoursLabel(data.total_hours), 'Lembur tercatat (jam)': hoursLabel(data.total_overtime_hours), 'Rata-rata masuk (WIB)': data.average_check_in ?? '—', 'Rata-rata keluar (WIB)': data.average_check_out ?? '—' }).map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{typeof value === 'number' ? value.toLocaleString(intlLocale()) : value}</dd></div>)}
      </dl><p className="attendance-note">{t("Hadir mencakup status hadir, terlambat, dan WFH. Hari tanpa catatan tidak otomatis dihitung sebagai tidak hadir. Ringkasan ini mencakup semua status pada periode pilihan.")}</p></>}
    <div className="ph-dialog-footer"><button className="ph-button" onClick={onClose}>{t("Tutup")}</button></div>
  </Modal>;
}

export function MyAttendancePage() {
  useLocale();
  const [page, setPage] = useState(1);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<Attendance | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [response, setResponse] = useState<{ key: string; result?: PaginatedResponse<Attendance>; error?: string } | null>(null);
  const invalidRange = Boolean(start && end && start > end);
  const queryKey = `${page}:${start}:${end}:${status}:${reload}`;
  const current = response?.key === queryKey ? response : null;
  const loading = !current;
  const error = current?.error;
  const rows = current?.result?.data ?? [];
  const total = current?.result?.pagination.total ?? 0;
  const totalPages = current?.result?.pagination.totalPages ?? 0;
  useEffect(() => {
    if (invalidRange) return;
    let cancelled = false;
    attendanceService.getMyAttendance({ page, limit: 10, start_date: start || undefined, end_date: end || undefined, status: status || undefined })
      .then(result => { if (!cancelled) setResponse({ key: queryKey, result }); })
      .catch(() => { if (!cancelled) setResponse({ key: queryKey, error: 'Riwayat absensi belum berhasil dimuat. Silakan coba lagi.' }); });
    return () => { cancelled = true; };
  }, [page, start, end, status, invalidRange, queryKey]);

  return <div className="ph-workflow personal-page my-attendance-page">
    <header className="personal-heading"><div><h1>{t("My Attendance")}</h1><p>{t("Riwayat kehadiran dan jam kerja pribadi.")}</p></div>
      <div className="personal-heading-actions"><button className="ph-button" onClick={() => setReload(value => value + 1)} disabled={loading || invalidRange}><RefreshCw size={16} />{t("Refresh")}</button><button className="ph-button" onClick={() => setShowSummary(true)} disabled={invalidRange}><BarChart3 size={16} />{t("Ringkasan")}</button></div>
    </header>
    <AttendanceClock onChanged={() => setReload(value => value + 1)} />
    <section className="personal-surface" aria-label={t("Riwayat kehadiran")}>
      <div className="personal-surface-heading"><div><h2>{t("Catatan kehadiran")}</h2><p>{t("Waktu masuk dan keluar ditampilkan dalam WIB.")}</p></div><span className="attendance-record-count">{loading || invalidRange ? '—' : error ? t("Belum tersedia") : t('{count} catatan', { count: total.toLocaleString(intlLocale()) })}</span></div>
      <div className="attendance-filters">
        <label>{t("Dari tanggal")}<input type="date" value={start} onChange={e => { setStart(e.target.value); setPage(1); }} /></label>
        <label>{t("Sampai tanggal")}<input type="date" value={end} min={start || undefined} onChange={e => { setEnd(e.target.value); setPage(1); }} /></label>
        <label>{t("Status kehadiran")}<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">{t("Semua status")}</option>{['present', 'late', 'absent', 'work_from_home', 'on_leave', 'holiday', 'half_day'].map(value => <option key={value} value={value}>{t(statusLabels[value])}</option>)}</select></label>
        <button className="ph-button" onClick={() => { setStart(''); setEnd(''); setStatus(''); setPage(1); }}>{t("Reset filter")}</button>
      </div>
      {invalidRange ? <p role="alert" className="attendance-feedback">{t("Tanggal akhir harus sama atau setelah tanggal mulai.")}</p>
        : error ? <div role="alert" className="attendance-feedback">{t(error)}<button className="ph-button" onClick={() => setReload(value => value + 1)}>{t("Coba lagi")}</button></div>
        : loading ? <p role="status" className="attendance-feedback">{t("Memuat riwayat absensi...")}</p>
        : <><div className="ph-table-scroll"><table className="attendance-history-table"><thead><tr>{['Tanggal', 'Masuk (WIB)', 'Keluar (WIB)', 'Durasi (jam)', 'Status'].map(label => <th key={label}>{t(label)}</th>)}<th><span className="sr-only">{t("Detail")}</span></th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}><td>{dateLabel(row.date)}</td><td>{timeLabel(row.check_in)}</td><td>{timeLabel(row.check_out)}</td><td>{hoursLabel(row.total_hours)}</td><td><Status value={row.status} /></td><td><button className="ph-button" aria-label={t('Detail kehadiran {date}', { date: dateLabel(row.date) })} onClick={() => setSelected(row)}><Eye size={16} /></button></td></tr>)}
            {rows.length === 0 && <tr><td colSpan={6} className="attendance-feedback">{t("Belum ada catatan absensi pada rentang ini.")}</td></tr>}
          </tbody></table></div>
          <footer className="personal-pagination"><span>{total.toLocaleString(intlLocale())}{' '}{t("catatan")}</span><div><button className="ph-button" aria-label={t("Halaman sebelumnya")} disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16} /></button><span>{page} / {Math.max(1, totalPages)}</span><button className="ph-button" aria-label={t("Halaman berikutnya")} disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight size={16} /></button></div></footer>
        </>}
    </section>
    <p className="attendance-note">{t("Halaman ini menampilkan catatan absensi pribadi. Untuk koreksi data, hubungi P&C.")}</p>
    {showSummary && <SummaryDialog initialStart={start} initialEnd={end} onClose={() => setShowSummary(false)} />}
    {selected && <Modal isOpen onClose={() => setSelected(null)} title={t("Detail kehadiran")} description={dateLabel(selected.date)} size="lg" className="ph-workflow personal-modal attendance-dialog">
      <Status value={selected.status} /><dl className="attendance-summary-grid">
        {Object.entries({ 'Masuk (WIB)': timeLabel(selected.check_in), 'Keluar (WIB)': timeLabel(selected.check_out), 'Mulai istirahat (WIB)': timeLabel(selected.break_start), 'Selesai istirahat (WIB)': timeLabel(selected.break_end), 'Durasi (jam)': hoursLabel(selected.total_hours), 'Lembur tercatat (jam)': hoursLabel(selected.overtime_hours), Shift: shiftLabel(selected.shift_type), 'Lokasi kerja': selected.workLocation?.name || t('Tidak tercatat') }).map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}
      </dl><section className="attendance-notes"><h3>{t("Catatan")}</h3><p>{selected.notes || t('Tidak ada catatan tambahan.')}</p></section>
      <div className="ph-dialog-footer"><button className="ph-button" onClick={() => setSelected(null)}>{t("Tutup")}</button></div>
    </Modal>}
  </div>;
}
