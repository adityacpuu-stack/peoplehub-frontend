import { t, useLocale, intlLocale } from '@/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Coffee, LogIn, LogOut, MapPin, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { attendanceService, type AttendanceClockSession, type CheckInRequest } from '@/services/attendance.service';
import { attendanceClockErrorSources } from '@/i18n/attendance';

type ClockMessage = { source: string; text?: never } | { text: string; source?: never };
const messageText = (message: ClockMessage) => message.source !== undefined ? t(message.source) : message.text;
function clockError(error: unknown, fallback: string): ClockMessage {
  const message: unknown = isAxiosError(error) ? error.response?.data?.error?.message : undefined;
  if (typeof message !== 'string' || !message) return { source: fallback };
  // Only known application errors are catalog keys. Preserve all other server text.
  return attendanceClockErrorSources.has(message) ? { source: message } : { text: message };
}
class PhotoInputError extends Error {}

type Action = 'check-in' | 'check-out' | 'break-start' | 'break-end';
const names: Record<Action, string> = { 'check-in': 'Check-in', 'check-out': 'Check-out', 'break-start': 'Mulai istirahat', 'break-end': 'Selesai istirahat' };
const time = (value?: string | null) => value ? new Date(value).toLocaleTimeString(intlLocale(), { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) : '—';
function allowed(session: AttendanceClockSession, action: Action) {
  const row = session.attendance;
  if (row?.check_out) return false;
  if (action === 'check-in') return !row?.check_in;
  if (!row?.check_in) return false;
  if (action === 'break-start') return session.policy.track_break && !row.break_start;
  if (action === 'break-end') return !!row.break_start && !row.break_end;
  return !row.break_start || !!row.break_end;
}
async function photoData(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new PhotoInputError('Gunakan foto JPG, PNG, atau WebP maksimal 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d'); if (!context) throw new PhotoInputError('Foto tidak dapat diproses oleh browser ini.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', 0.8);
    if (result.length > 1000000) throw new PhotoInputError('Foto terlalu besar. Pilih foto yang lebih kecil.');
    return result;
  } finally { bitmap.close(); }
}

export function AttendanceClock({ onChanged }: { onChanged: () => void }) {
  useLocale();
  const [session, setSession] = useState<AttendanceClockSession | null>(null);
  const [loadError, setLoadError] = useState<ClockMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [location, setLocation] = useState<CheckInRequest>();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<ClockMessage | null>(null);
  const busyRef = useRef(false), generation = useRef(0), evidenceGeneration = useRef(0);
  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    const id = ++generation.current;
    setLoading(true); setLoadError(null);
    try { const data = await attendanceService.getMyClock(); if (id === generation.current) setSession(data); }
    catch (e) { if (id === generation.current) { setSession(null); setLoadError(clockError(e, 'Status absensi belum berhasil dimuat.')); } }
    finally { if (id === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const requestVersion = generation, evidenceVersion = evidenceGeneration;
    void refresh(); const timer = setInterval(() => { void refresh(); }, 60000);
    const onFocus = () => { void refresh(); }; window.addEventListener('focus', onFocus);
    return () => { requestVersion.current++; evidenceVersion.current++; clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  const open = (next: Action) => { evidenceGeneration.current++; setAction(next); setNotes(''); setPhoto(undefined); setLocation(undefined); setError(null); setLocating(false); setPhotoBusy(false); };
  const close = () => { if (!busyRef.current) { evidenceGeneration.current++; setAction(null); } };
  const locate = () => {
    if (!navigator.geolocation) { setError({ source: 'Browser tidak mendukung lokasi.' }); return; }
    const id = evidenceGeneration.current; setLocating(true); setError(null);
    navigator.geolocation.getCurrentPosition(pos => { if (id !== evidenceGeneration.current) return; setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, location_accuracy_meters: pos.coords.accuracy }); setLocating(false); }, () => { if (id !== evidenceGeneration.current) return; setError({ source: 'Lokasi belum tersedia. Izinkan akses lokasi browser dan coba lagi.' }); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };
  const clockAction = action === 'check-in' || action === 'check-out';
  const photoRequired = !!(session && (action === 'check-in' ? session.policy.photo_check_in : action === 'check-out' && session.policy.photo_check_out));
  const canSubmit = !!action && !!session && !loading && allowed(session, action) && !photoBusy && !locating && (!clockAction || ((!session.policy.location_required || !!location) && (!photoRequired || !!photo)));
  const submit = async () => {
    if (!canSubmit || !action || busyRef.current) return;
    busyRef.current = true; generation.current++; setBusy(true); setError(null);
    try {
      const data = { ...location, ...(photo ? { photo } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) };
      if (action === 'check-in') await attendanceService.checkIn(data);
      else if (action === 'check-out') await attendanceService.checkOut(data);
      else if (action === 'break-start') await attendanceService.startBreak();
      else await attendanceService.endBreak();
      toast.success(t('{action} berhasil dicatat.', { action: t(names[action]) })); setAction(null); evidenceGeneration.current++; onChanged();
    } catch (e) { setError(clockError(e, 'Absensi belum berhasil dicatat. Coba lagi.')); }
    finally { busyRef.current = false; setBusy(false); await refresh(); }
  };
  const row = session?.attendance;
  const stateLabel = row?.check_out ? 'Selesai bekerja' : row?.break_start && !row.break_end ? 'Sedang istirahat' : row?.check_in ? 'Sedang bekerja' : 'Belum check-in';
  return <section className="personal-surface attendance-clock" aria-label={t("Absensi hari ini")}>
    <div className="attendance-clock-heading"><div><h2>{t("Absensi hari ini")}</h2><p>{session ? new Date(session.business_date + 'T00:00:00Z').toLocaleDateString(intlLocale(), { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' (WIB)' : t("Waktu pencatatan mengikuti server.")}</p></div><button className="ph-button" aria-label={t("Refresh status absensi")} onClick={() => void refresh()} disabled={busy || loading}><RefreshCw size={16} /></button></div>
    {loadError ? <div className="attendance-feedback" role="alert">{messageText(loadError)}<button className="ph-button" onClick={() => void refresh()}>{t("Coba lagi status absensi")}</button></div> : !session ? <p role="status" className="attendance-note">{t("Memuat status absensi...")}</p> : <>
      <div className="attendance-clock-body"><div><span className="attendance-status">{t(stateLabel)}</span><dl className="attendance-clock-times">{Object.entries({ 'Check-in': time(row?.check_in), 'Mulai istirahat': time(row?.break_start), 'Selesai istirahat': time(row?.break_end), 'Check-out': time(row?.check_out) }).map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl></div>
        <div className="attendance-clock-actions">{(['check-in', 'break-start', 'break-end', 'check-out'] as Action[]).filter(a => allowed(session, a)).map(a => <button key={a} className={`ph-button ${a === 'check-in' || a === 'check-out' ? 'ph-button-primary' : ''}`} disabled={busy || loading} onClick={() => open(a)}>{a === 'check-in' ? <LogIn size={17} /> : a === 'check-out' ? <LogOut size={17} /> : <Coffee size={17} />}{t(names[a])}</button>)}</div></div>
      <p className="attendance-note">{session.policy.work_location ? t('Lokasi kerja: {location}. ', { location: session.policy.work_location }) : ''}{t("Jam dicatat saat konfirmasi diterima server.")}{row?.break_start && !row.break_end ? t(" Selesaikan istirahat untuk check-out.") : ''}</p>
    </>}
    {action && <Modal isOpen onClose={close} busy={busy} title={t('Konfirmasi {action}', { action: t(names[action]) })} description={t("Pastikan Anda siap mencatat waktu sekarang.")} size="md" className="ph-workflow personal-modal attendance-dialog">
      {clockAction && <div className="attendance-clock-form">
        {session?.policy.location_enabled && <div><label>{t("Lokasi")} {session.policy.location_required ? t("(wajib)") : t("(opsional)")}</label><button className="ph-button" onClick={locate} disabled={locating || busy}><MapPin size={16} />{locating ? t("Mencari lokasi...") : location ? t("Perbarui lokasi") : t("Gunakan lokasi saya")}</button>{location && <p className="attendance-note">{t('Lokasi berhasil diambil. Akurasi sekitar {metres} meter.', { metres: Math.round(location.location_accuracy_meters || 0).toLocaleString(intlLocale()) })}</p>}</div>}
        <label>{t("Foto")} {photoRequired ? t("(wajib)") : t("(opsional)")}<input type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={busy || photoBusy} onChange={async e => {
          const file = e.target.files?.[0]; const id = ++evidenceGeneration.current; setPhoto(undefined); setLocating(false); if (!file) return; setPhotoBusy(true); setError(null);
          try { const result = await photoData(file); if (id === evidenceGeneration.current) setPhoto(result); }
          catch (err) { if (id === evidenceGeneration.current) setError({ source: err instanceof PhotoInputError ? err.message : 'Foto tidak dapat dibaca.' }); }
          finally { if (id === evidenceGeneration.current) setPhotoBusy(false); }
        }} />{photoBusy ? t("Memproses foto...") : photo ? t("Foto siap dilampirkan.") : t("JPG, PNG, atau WebP, maksimal 10 MB.")}</label>
        <label>{t("Catatan (opsional)")}<textarea maxLength={1000} value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} rows={3} /></label>
      </div>}
      {!clockAction && <p className="attendance-note">{action === 'break-start' ? t("Waktu istirahat akan mulai dicatat.") : t("Waktu istirahat selesai akan dicatat. Durasi istirahat dikurangi dari jam kerja saat check-out.")}</p>}
      {error && <p role="alert" className="attendance-clock-error">{messageText(error)}</p>}
      {session && !allowed(session, action) && <p role="status">{t("Status absensi sudah berubah. Tutup popup untuk melihat tindakan terbaru.")}</p>}
      <div className="ph-dialog-footer"><button className="ph-button" onClick={close} disabled={busy}>{t("Batal")}</button><button className="ph-button ph-button-primary" disabled={busy || !canSubmit} onClick={() => void submit()}>{busy ? t("Menyimpan...") : t('Konfirmasi {action}', { action: t(names[action]) })}</button></div>
    </Modal>}
  </section>;
}
