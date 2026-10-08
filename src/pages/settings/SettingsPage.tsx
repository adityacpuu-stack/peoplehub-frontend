import { t, useLocale } from '@/i18n';
import { useEffect, useImperativeHandle, useState, type FormEvent, type ReactNode } from 'react';
import { Bell, Building2, CalendarClock, CircleAlert, Pencil, LockKeyhole, Save, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { settingsService, type CompanyOption } from '@/services/settings.service';
import { profileService } from '@/services/profile.service';
import { settingsAccess, type SettingsTab } from './settings-access';
import type { AccountSectionProps } from './account-section';
import { AccountDiscardDialog } from './AccountDiscardDialog';
import { useAccountDiscard } from './useAccountDiscard';
import './settings.css';

export const settingsTabs: { id: SettingsTab; label: string; title: string; description: string; icon: typeof Bell; personal?: boolean }[] = [
  { id: 'notifications', label: 'Notifikasi', title: 'Pengaturan Notifikasi', description: 'Pilih email cuti yang ingin Anda terima.', icon: Bell, personal: true },
  { id: 'security', label: 'Keamanan akun', title: 'Keamanan Akun', description: 'Kelola kata sandi untuk akun Anda sendiri.', icon: LockKeyhole, personal: true },
  { id: 'general', label: 'Profil perusahaan', title: 'Pengaturan Umum', description: 'Identitas dan kontak resmi perusahaan yang dipilih.', icon: Building2 },
  { id: 'attendance', label: 'Kehadiran', title: 'Pengaturan Kehadiran', description: 'Jam kerja dan toleransi check-in perusahaan.', icon: CalendarClock },
  { id: 'payroll', label: 'Jadwal payroll', title: 'Pengaturan Payroll', description: 'Batas periode dan rencana tanggal pembayaran.', icon: Wallet },
];
const inputClass = 'ph-settings-input';
const primaryClass = 'ph-settings-button ph-settings-button-primary';
const secondaryClass = 'ph-settings-button ph-settings-button-secondary';
type Values = Record<string, string | number | boolean | null>;
type LoadState = { status: 'loading' | 'error' | 'ready'; values: Values | null };
function errorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response;
  return response?.data?.error?.message || response?.data?.message || t(fallback);
}

export function SettingsPage({ defaultTab, navigationRef, onBusyChange }: AccountSectionProps & { defaultTab: SettingsTab }) {
  useLocale();
  const user = useAuthStore(state => state.user);
  // Roles are the ceiling; covered actions (payroll.view/settings, company.update) narrow it.
  const roleAccess = settingsAccess(user?.roles ?? []);
  const access = settingsAccess(user?.roles ?? [], user);
  const active = defaultTab;
  const business = !['notifications', 'security'].includes(active) && access[active].view;
  const scopeKey = JSON.stringify([user?.id, user?.roles, user?.accessibleCompanyIds]);
  const [directory, setDirectory] = useState<{ key: string; rows: CompanyOption[]; status: 'loading' | 'error' | 'ready' }>({ key: '', rows: [], status: 'loading' });
  const [selected, setSelected] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const rows = directory.key === scopeKey ? directory.rows : [];
  const companyId = rows.some(row => row.id === selected) ? selected : rows[0]?.id ?? null;
  const discard = useAccountDiscard(JSON.stringify([scopeKey, active, companyId]), saving);

  useEffect(() => {
    if (!business || !user) return;
    let cancelled = false;
    setDirectory({ key: scopeKey, rows: [], status: 'loading' });
    const actor = JSON.parse(scopeKey) as [number, string[], number[]];
    settingsService.getCompanies(actor[1].includes('Super Admin') ? null : actor[2] ?? [])
      .then(companies => { if (!cancelled) setDirectory({ key: scopeKey, rows: companies, status: 'ready' }); })
      .catch(() => { if (!cancelled) setDirectory({ key: scopeKey, rows: [], status: 'error' }); });
    return () => { cancelled = true; };
  }, [business, scopeKey, retry]); // Personal settings never require a company request.

  useEffect(() => { setDirty(false); setSaving(false); }, [active, companyId, scopeKey]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || saving) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  const switchTo = (action: () => void) => {
    if (saving) return;
    if (dirty) { discard.request(() => { setDirty(false); action(); }); return; }
    setDirty(false);
    action();
  };
  useImperativeHandle(navigationRef, () => ({ leave: switchTo }));
  useEffect(() => { onBusyChange(saving); return () => onBusyChange(false); }, [saving, onBusyChange]);
  const tab = settingsTabs.find(item => item.id === active)!;

  return <div className="ph-settings ph-workflow">
    {business && rows.length > 0 && <div className="ph-settings-company-bar">
      <div className="ph-settings-context">
        <label htmlFor="settings-company">{t("Perusahaan")}</label>
        <div className="ph-settings-company-select">
          <Building2 size={17} aria-hidden="true" />
          <select id="settings-company" className={inputClass} value={companyId ?? ''} disabled={saving}
            onChange={event => { const nextCompanyId = Number(event.currentTarget.value); switchTo(() => setSelected(nextCompanyId)); }}>
            {rows.map(row => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}
          </select>
        </div>
      </div>
      <p>{t("Perubahan berlaku untuk perusahaan yang dipilih.")}</p>
    </div>}
    <section aria-label={t(tab.title)} className="ph-settings-panel">
      <div className="ph-settings-panel-header">
        <div><h2>{t(tab.title)}</h2><p>{t(tab.description)}</p></div>
        {business && <span className="ph-settings-access">
          {access[active].edit ? <Pencil size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}
          {access[active].edit ? t("Akses edit") : t("Hanya lihat")}
        </span>}
      </div>
      {!access[active].view ? <Notice title={roleAccess[active].view ? t("Pengaturan ini tidak tersedia untuk akses Anda.") : t("Pengaturan ini tidak tersedia untuk role Anda.")}>{t("Pilih Notifikasi atau Keamanan akun untuk mengelola akun pribadi.")}</Notice>
        : business && (directory.key !== scopeKey || directory.status === 'loading') ? <Loading />
        : business && directory.status === 'error' ? <Notice title={t("Daftar perusahaan gagal dimuat.")}><button className={secondaryClass} onClick={() => setRetry(value => value + 1)}>{t("Coba Lagi")}</button></Notice>
        : business && !companyId ? <Notice title={t("Belum ada perusahaan yang ditugaskan.")}>{t("Hubungi administrator untuk penugasan perusahaan. Pengaturan akun pribadi tetap tersedia.")}</Notice>
        : active === 'security' ? <PasswordForm key={scopeKey + active} onDirty={setDirty} onSaving={setSaving} />
        : <SettingsForm key={scopeKey + active + companyId} tab={active} companyId={companyId}
            canEdit={access[active].edit} onDirty={setDirty} onSaving={setSaving}
            onCompanySaved={row => setDirectory(previous => previous.key === scopeKey ? { ...previous, rows: previous.rows.map(item => item.id === row.id ? row : item) } : previous)} />}
    </section>
    <AccountDiscardDialog isOpen={discard.isOpen} busy={saving}
      message={t("Perubahan belum disimpan. Tinggalkan perubahan ini?")}
      onCancel={discard.cancel} onDiscard={discard.discard} />
  </div>;
}

function Loading() {
  useLocale();
  return <div role="status" className="ph-settings-loading"><span aria-hidden="true" />{t("Memuat pengaturan…")}</div>;
}
function Notice({ title, children }: { title: string; children: ReactNode }) {
  useLocale();
  return <div className="ph-settings-notice"><CircleAlert aria-hidden="true" size={22} />
    <div><p className="ph-settings-notice-title">{title}</p><div className="ph-settings-notice-body">{children}</div></div>
  </div>;
}
function FieldGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  useLocale();
  return <section className="ph-settings-field-group ph-section">
    <header className="ph-settings-group-heading"><h3>{title}</h3><p>{t(description)}</p></header>
    <div className="ph-settings-group-fields">{children}</div>
  </section>;
}

function SettingsForm({ tab, companyId, canEdit, onDirty, onSaving, onCompanySaved }: {
  tab: Exclude<SettingsTab, 'security'>; companyId: number | null; canEdit: boolean;
  onDirty: (value: boolean) => void; onSaving: (value: boolean) => void;
  onCompanySaved: (row: CompanyOption) => void;
}) {
  useLocale();
  const [state, setState] = useState<LoadState>({ status: 'loading', values: null });
  const [values, setValues] = useState<Values>({});
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== state.values?.[key]));
  const dirty = Object.keys(changes).length > 0;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', values: null }); setValues({});
    const load = async () => {
      if (tab === 'notifications') return settingsService.getNotificationPreferences();
      if (companyId == null) throw new Error('Perusahaan belum dipilih');
      if (tab === 'general') return settingsService.getCompanySettings(companyId);
      if (tab === 'attendance') return settingsService.getAttendanceSettings(companyId);
      return settingsService.getPayrollSettings(companyId);
    };
    load().then(row => {
      if (cancelled) return;
      if (row && 'company_id' in row && row.company_id !== companyId) throw new Error('Perusahaan tidak cocok');
      if (row && 'id' in row && tab === 'general' && row.id !== companyId) throw new Error('Perusahaan tidak cocok');
      const data = row ? { ...row } as Values : null;
      setState({ status: 'ready', values: data }); setValues(data ?? {});
    }).catch(() => { if (!cancelled) setState({ status: 'error', values: null }); });
    return () => { cancelled = true; };
  }, [tab, companyId, retry]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || saving || !dirty || !state.values || state.status !== 'ready') return;
    setSaving(true); onSaving(true);
    try {
      // The service also whitelists keys; never send the loaded row or its relations.
      const result = tab === 'general' ? await settingsService.updateCompanySettings(companyId!, changes)
        : tab === 'attendance' ? await settingsService.updateAttendanceSettings(companyId!, changes)
        : tab === 'payroll' ? await settingsService.updatePayrollSettings(companyId!, changes)
        : await settingsService.updateNotificationPreferences(changes);
      const data = { ...result } as Values;
      setValues(data); setState({ status: 'ready', values: data }); onDirty(false);
      if (tab === 'general' && 'id' in result && 'name' in result && 'code' in result) onCompanySaved(result);
      toast.success(t("Pengaturan berhasil disimpan"), { toasterId: 'account' });
    } catch (error) { toast.remove('api-error'); toast.error(errorMessage(error, 'Gagal menyimpan pengaturan. Perubahan Anda masih tersimpan di formulir.'), { id: 'api-error', toasterId: 'account' }); }
    finally { setSaving(false); onSaving(false); }
  };
  const initialize = async () => {
    if (!canEdit || !companyId || saving) return;
    setSaving(true); onSaving(true);
    try {
      const result = tab === 'attendance' ? await settingsService.createAttendanceSettings(companyId) : await settingsService.createPayrollSettings(companyId);
      const data = { ...result } as Values;
      setState({ status: 'ready', values: data }); setValues(data);
      toast.success(t("Konfigurasi perusahaan dibuat. Periksa nilainya sebelum digunakan."), { toasterId: 'account' });
    } catch (error) { toast.remove('api-error'); toast.error(errorMessage(error, 'Gagal membuat konfigurasi'), { id: 'api-error', toasterId: 'account' }); }
    finally { setSaving(false); onSaving(false); }
  };
  const field = (key: string, label: string, options: { type?: string; required?: boolean; min?: number; max?: number; hint?: string } = {}) =>
    <div key={key} className="ph-settings-field ph-field"><label htmlFor={'setting-' + key}>{t(label)}{options.required && <span className="ph-settings-required" aria-hidden="true"> *</span>}</label>
      <input id={'setting-' + key} name={key} className={inputClass} type={options.type ?? 'text'} value={String(values[key] ?? '')}
        required={options.required} min={options.min} max={options.max} step={options.type === 'number' ? 1 : undefined}
        onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value === '' ? (options.required ? '' : null) : options.type === 'number' ? Number(event.target.value) : event.target.value }))}
        aria-describedby={options.hint ? 'hint-' + key : undefined} />
      {options.hint && <p id={'hint-' + key} className="ph-settings-help">{t(options.hint)}</p>}
    </div>;

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <Notice title={t("Gagal memuat pengaturan. Data belum dapat disimpan.")}><button className={secondaryClass} onClick={() => setRetry(value => value + 1)}>{t("Coba Lagi")}</button></Notice>;
  if (!state.values) return <Notice title={t("Konfigurasi perusahaan belum dibuat.")}>
    <p className="mb-4">{canEdit ? t("Buat konfigurasi untuk mulai mengatur perusahaan ini.") : t("Administrator yang memiliki akses edit perlu membuat konfigurasi terlebih dahulu.")}</p>
    {canEdit && <button onClick={initialize} disabled={saving} className={primaryClass}>{saving ? t("Membuat…") : t("Buat konfigurasi")}</button>}
  </Notice>;

  return <form onSubmit={save}>
    <fieldset disabled={!canEdit || saving} className="ph-settings-fieldset">
      <legend className="sr-only">{t(settingsTabs.find(item => item.id === tab)?.title || '')}</legend>
      {tab === 'general' && <>
        <FieldGroup title={t("Identitas perusahaan")} description={t("Nama dan kode untuk mengenali perusahaan di PeopleHub.")}>
          <div className="ph-settings-field-grid ph-form-grid">
            {field('name', 'Nama perusahaan', { required: true })}
            {field('code', 'Kode perusahaan', { required: true })}
          </div>
        </FieldGroup>
        <FieldGroup title={t("Informasi kontak")} description={t("Kontak resmi dan alamat perusahaan.")}>
          <div className="ph-settings-field-grid ph-form-grid">
            {field('email', 'Email perusahaan', { type: 'email' })}
            {field('phone', 'Telepon', { type: 'tel' })}
            {field('website', 'Website', { type: 'url' })}
            <div className="ph-settings-field ph-settings-field-wide"><label htmlFor="setting-address">{t("Alamat")}</label>
              <textarea id="setting-address" className={inputClass} rows={3} value={String(values.address ?? '')}
                onChange={event => setValues(previous => ({ ...previous, address: event.target.value || null }))} />
            </div>
          </div>
        </FieldGroup>
      </>}
      {tab === 'attendance' && <>
        <FieldGroup title={t("Waktu kerja")} description={t("Jam masuk, pulang, dan istirahat dalam waktu lokal perusahaan.")}>
          <div className="ph-settings-field-grid ph-form-grid">
            {field('work_start_time', 'Jam masuk', { type: 'time' })}
            {field('work_end_time', 'Jam pulang', { type: 'time' })}
            {field('break_start_time', 'Mulai istirahat', { type: 'time' })}
            {field('break_end_time', 'Selesai istirahat', { type: 'time' })}
          </div>
        </FieldGroup>
        <FieldGroup title={t("Toleransi keterlambatan")} description={t("Batas toleransi saat menentukan status check-in.")}>
          <div className="ph-settings-field-short">
            {field('check_in_tolerance_minutes', 'Toleransi check-in (menit)', { type: 'number', min: 0, max: 1440, hint: 'Nilai 0 berarti tidak ada toleransi keterlambatan.' })}
          </div>
        </FieldGroup>
      </>}
      {tab === 'payroll' && <>
        <FieldGroup title={t("Periode & pembayaran")} description={t("Jadwal yang berlaku untuk perusahaan yang dipilih.")}>
          <div className="ph-settings-field-grid ph-form-grid">
            {field('payroll_cutoff_date', 'Tanggal cut-off', { type: 'number', required: true, min: 1, max: 31,
              hint: 'Cut-off 20 berarti periode 21 bulan sebelumnya sampai 20 bulan berjalan.' })}
            {field('payment_date', 'Rencana tanggal pembayaran', { type: 'number', min: 1, max: 31,
              hint: 'Tanggal rencana; pembayaran tidak dijalankan otomatis.' })}
          </div>
        </FieldGroup>
        <FieldGroup title={t("Perhitungan payroll")} description={t("Informasi metode yang tersimpan untuk perusahaan.")}>
          <dl className="ph-settings-readonly"><dt>{t("Metode prorata tersimpan")}</dt>
            <dd>{values.prorate_method === 'working_days' ? t("Hari kerja") : values.prorate_method === 'calendar_days' ? t("Hari kalender") : values.prorate_method === 'custom' ? t("Khusus per karyawan") : t("Belum ditentukan")}</dd>
          </dl>
          <p className="ph-settings-help ph-settings-paragraph">{t("Perubahan cut-off digunakan saat perhitungan berikutnya. Payroll yang sudah dibuat tetap memakai hasil sebelumnya. Tarif BPJS dan perhitungan pajak dikelola melalui perhitungan payroll.")}</p>
        </FieldGroup>
      </>}
      {tab === 'notifications' && <FieldGroup title={t("Notifikasi cuti")} description={t("Pilih pemberitahuan yang dikirim ke email akun Anda.")}>
        <div className="ph-settings-toggle-list">
          {([
            ['email_leave_request', 'Pengajuan cuti', 'Saat ada pengajuan cuti yang ditujukan kepada Anda sebagai approver.'],
            ['email_leave_approval', 'Status cuti saya', 'Saat pengajuan cuti Anda disetujui atau ditolak.'],
          ] as const).map(([key, label, description]) => <label key={key} htmlFor={key} className="ph-settings-toggle-row">
            <span><span className="ph-settings-toggle-label">{t(label)}</span><span className="ph-settings-toggle-description">{t(description)}</span></span>
            <input id={key} type="checkbox" className="ph-settings-switch" checked={values[key] === true}
              onChange={event => setValues(previous => ({ ...previous, [key]: event.target.checked }))} />
          </label>)}
        </div>
        <p className="ph-settings-help ph-settings-paragraph">{t("Preferensi hanya berlaku untuk akun Anda. Pengaturan kanal dan jenis notifikasi lainnya belum tersedia.")}</p>
      </FieldGroup>}
    </fieldset>
    <footer className="ph-settings-footer">
      <p role="status" className="ph-settings-save-status" data-dirty={dirty}>
        {!canEdit ? <LockKeyhole size={14} aria-hidden="true" /> : <span className="ph-settings-status-dot" aria-hidden="true" />}
        {!canEdit ? t("Hubungi administrator untuk mengubah pengaturan.") : saving ? t("Menyimpan perubahan…") : dirty ? t("Ada perubahan yang belum disimpan.") : t("Belum ada perubahan.")}
      </p>
      {canEdit && <div className="ph-settings-actions">
        {dirty && <button type="button" className={secondaryClass} disabled={saving} onClick={() => setValues({ ...state.values! })}>{t("Batal")}</button>}
        <button className={primaryClass} disabled={!dirty || saving} type="submit"><Save size={16} aria-hidden="true" />{saving ? t("Menyimpan…") : t("Simpan")}</button>
      </div>}
    </footer>
  </form>;
}

function PasswordForm({ onDirty, onSaving }: { onDirty: (value: boolean) => void; onSaving: (value: boolean) => void }) {
  useLocale();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  useEffect(() => { onDirty(Object.values(passwords).some(Boolean)); }, [passwords, onDirty]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setServerError('');
    if (saving) return;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(passwords.newPassword)) {
      setError('Gunakan minimal 8 karakter, termasuk huruf besar, huruf kecil, dan angka.'); return;
    }
    if (passwords.newPassword !== passwords.confirmation) { setError('Konfirmasi kata sandi tidak cocok.'); return; }
    setSaving(true); onSaving(true);
    try {
      await profileService.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' }); onDirty(false);
      toast.success(t("Kata sandi berhasil diperbarui"), { toasterId: 'account' });
    } catch (failure) { const response = (failure as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response;
      const message = response?.data?.error?.message || response?.data?.message;
      if (message) setServerError(message); else setError('Gagal memperbarui kata sandi.'); }
    finally { setSaving(false); onSaving(false); }
  };
  return <form onSubmit={submit}>
    <fieldset disabled={saving} className="ph-settings-fieldset">
      <legend className="sr-only">{t("Ubah kata sandi")}</legend>
      <FieldGroup title={t("Ubah kata sandi")} description={t("Kelola akses masuk ke akun PeopleHub Anda.")}>
        <div className="ph-settings-password-fields">
          <p id="password-help" className="ph-settings-password-help">{t("Gunakan minimal 8 karakter, termasuk huruf besar, huruf kecil, dan angka.")}</p>
          {([['currentPassword', 'Kata sandi saat ini', 'current-password'], ['newPassword', 'Kata sandi baru', 'new-password'], ['confirmation', 'Konfirmasi kata sandi baru', 'new-password']] as const).map(([key, label, autocomplete]) =>
            <div key={key} className="ph-settings-field ph-field"><label htmlFor={key}>{t(label)}</label>
              <input id={key} className={inputClass} autoComplete={autocomplete} type={visible ? 'text' : 'password'} required aria-describedby="password-help" value={passwords[key]}
                onChange={event => setPasswords(previous => ({ ...previous, [key]: event.target.value }))} /></div>)}
          <label className="ph-settings-checkbox-label"><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} />{t("Tampilkan kata sandi")}</label>
          {(error || serverError) && <p role="alert" className="ph-settings-error">{serverError || t(error)}</p>}
        </div>
      </FieldGroup>
    </fieldset>
    <footer className="ph-settings-footer">
      <p className="ph-settings-save-status"><LockKeyhole size={14} aria-hidden="true" />{t("Perubahan berlaku untuk akun Anda.")}</p>
      <button className={primaryClass} disabled={saving} type="submit">{saving ? t("Memperbarui…") : t("Perbarui kata sandi")}</button>
    </footer>
  </form>;
}
