import { ApplicationCopy } from '@/components/leave/ApplicationCopy';
import type { ReactElement } from 'react';
import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, Eye, Loader2, Megaphone, Pencil, Pin, Plus, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useResourceConfirmation } from './ResourceConfirmation';
import { AccountDialog } from '@/components/ui/AccountDialog';
import { useAuthStore } from '@/stores/auth.store';
import {
  announcementService, ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES,
  getAnnouncementCategoryLabel, getPriorityLabel, getVisibilityLabel,
  type Announcement, type AnnouncementOptions, type AnnouncementCategory,
  type AnnouncementPriority, type AnnouncementVisibility, type CreateAnnouncementRequest, type UpdateAnnouncementRequest,
} from '@/services/announcement.service';
import './announcements.css';
import './resources.css';
import './resources-refresh.css';

const errorMessage = (error: unknown, fallback: string) => (error as { response?: { data?: { error?: { message?: string } } } } | null)?.response?.data?.error?.message || <ApplicationCopy source={fallback} />;
const emptyOptions: AnnouncementOptions = { can_create: false, can_publish_global: false, companies: [], roles: [], departments: [] };
const dateLabel = (date: string | null) => date ? new Date(date).toLocaleString(intlLocale(), { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) + ' WIB' : '—';
const expired = (row: Announcement) => !!row.expires_at && new Date(row.expires_at).getTime() < Date.now();
const scopeLabel = (row: Announcement) => row.is_global ? t('Semua entity') : row.target_company_ids?.length ? t('{count} company', { count: row.target_company_ids.length.toLocaleString(intlLocale()) }) : row.company?.name || t('Company');
const destinations = (row: Announcement) => row.is_global ? t('Semua entity') : [...new Set([...(row.company_id ? [row.company_id] : []), ...(row.target_company_ids || [])])]
  .map(id => row.target_companies?.find(company => company.id === id)?.name || (row.company?.id === id ? row.company.name : t('Company #{id}', { id }))).join(', ');
const initialForm = {
  title: '', content: '', category: 'general' as AnnouncementCategory, priority: 'normal' as AnnouncementPriority,
  visibility: 'all' as AnnouncementVisibility, target_ids: [] as number[], scope: 'single' as 'single' | 'multiple' | 'global',
  company_ids: [] as number[], is_pinned: false, is_published: false, expires_at: '',
};
type Form = typeof initialForm;
function wibInput(date: string | null) {
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date));
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function AnnouncementsPage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  return <AnnouncementLibrary key={JSON.stringify([user?.id, user?.roles, user?.accessibleCompanyIds, user?.employee?.company_id])} />;
}

function AnnouncementLibrary() {
  useLocale();
  const { confirm, confirmation } = useResourceConfirmation();
  const [options, setOptions] = useState(emptyOptions);
  const [optionsState, setOptionsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [optionsRevision, setOptionsRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setOptionsState('loading');
    announcementService.getOptions().then(data => { if (!cancelled) { setOptions(data); setOptionsState('ready'); } })
      .catch(() => { if (!cancelled) setOptionsState('error'); });
    return () => { cancelled = true; };
  }, [optionsRevision]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('published');
  const [company, setCompany] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(value => value + 1);
  const [result, setResult] = useState({ key: '', rows: [] as Announcement[], total: 0, pages: 1, error: '' as string | ReactElement, loading: true });
  const key = JSON.stringify([query.trim(), category, priority, status, company, page, revision, options.can_create]);
  const current = result.key === key ? result : { ...result, rows: [], error: '', loading: true };
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await announcementService.getAll({ page, limit: 20, search: query.trim() || undefined,
          category: category as AnnouncementCategory || undefined, priority: priority as AnnouncementPriority || undefined,
          company_id: company ? Number(company) : undefined,
          is_published: !options.can_create ? true : status === 'all' ? undefined : status === 'published',
          sort_by: 'published_at', sort_order: 'desc' });
        if (cancelled) return;
        const pages = Math.max(1, data.pagination.totalPages);
        if (page > pages) { setPage(pages); return; }
        setResult({ key, rows: data.data, total: data.pagination.total, pages, loading: false, error: '' });
      } catch (error) {
        if (!cancelled) setResult({ key, rows: [], total: 0, pages: 1, loading: false, error: errorMessage(error, 'Pengumuman gagal dimuat.') });
      }
    }, query.trim() ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key]);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Announcement | null>(null);
  const [detailError, setDetailError] = useState<string | ReactElement>('');
  const [detailRevision, setDetailRevision] = useState(0);
  useEffect(() => {
    if (detailId === null) return;
    let cancelled = false;
    setDetail(null); setDetailError('');
    announcementService.getById(detailId).then(data => { if (!cancelled) setDetail(data); })
      .catch(error => { if (!cancelled) setDetailError(errorMessage(error, 'Pengumuman tidak tersedia.')); });
    return () => { cancelled = true; };
  }, [detailId, detailRevision]);
  const openDetail = (row: Announcement) => {
    setDetail(null); setDetailError(''); setDetailId(row.id);
    // Count a deliberate open, outside effects so StrictMode cannot double it.
    announcementService.trackView(row.id).catch(() => {});
  };

  const [form, setForm] = useState<Form>(initialForm);
  const originalForm = useRef<Form>(initialForm);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | ReactElement>('');
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const showEditor = (row: Announcement | null) => {
    const next: Form = row ? {
      title: row.title, content: row.content, category: row.category, priority: row.priority,
      visibility: row.visibility, target_ids: row.target_ids || [],
      scope: row.is_global ? 'global' : row.target_company_ids?.length ? 'multiple' : 'single',
      company_ids: row.target_company_ids?.length ? row.target_company_ids : row.company_id ? [row.company_id] : [],
      is_pinned: row.is_pinned, is_published: row.is_published, expires_at: wibInput(row.expires_at),
    } : { ...initialForm, company_ids: options.companies.length === 1 ? [options.companies[0].id] : [] };
    setForm(next); originalForm.current = next; setEditing(row); setFormError(''); setShowForm(true);
  };
  const edit = async (row: Announcement) => {
    if (writing.current || !row.permissions?.can_edit) return;
    writing.current = true; setBusy(true);
    try {
      const full = await announcementService.getById(row.id);
      if (mounted.current && full.permissions?.can_edit) showEditor(full);
    } catch (error) { toast.error(errorMessage(error, 'Formulir gagal dimuat.'), { id: 'api-error' }); }
    finally { writing.current = false; if (mounted.current) setBusy(false); }
  };
  const closeForm = async () => {
    if (writing.current) return;
    if (JSON.stringify(form) !== JSON.stringify(originalForm.current) && !await confirm(() => t("Buang perubahan pengumuman yang belum disimpan?"))) return;
    if (!mounted.current || writing.current) return;
    setShowForm(false);
  };
  const selectedDepartments = options.departments.filter(item => item.company_id === null || form.scope === 'global' || form.company_ids.includes(item.company_id));
  const audienceOptions = form.visibility === 'role' ? options.roles : selectedDepartments;
  const updateTarget = (patch: Partial<Form>) => setForm({ ...form, ...patch, target_ids: [] });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (writing.current || (editing ? !editing.permissions?.can_edit : !options.can_create)) return;
    if (!form.title.trim() || !form.content.trim()) { setFormError(<ApplicationCopy source="Judul dan isi pengumuman wajib diisi." />); return; }
    if (!editing && (form.scope === 'global' ? !options.can_publish_global : !form.company_ids.length)) { setFormError(<ApplicationCopy source="Pilih company tujuan." />); return; }
    if (form.visibility !== 'all' && !form.target_ids.length) { setFormError(<ApplicationCopy source="Pilih minimal satu target pembaca." />); return; }
    const expiry = form.expires_at ? new Date(`${form.expires_at}:00+07:00`) : null;
    if (expiry && (!Number.isFinite(expiry.getTime()) || (form.expires_at !== originalForm.current.expires_at && expiry.getTime() <= Date.now()))) { setFormError(<ApplicationCopy source="Waktu berakhir harus setelah waktu sekarang (WIB)." />); return; }
    const labels = audienceOptions.filter(item => form.target_ids.includes(item.id)).map(item => item.name);
    const audienceLabel = labels.join(', ');
    writing.current = true; setBusy(true); setFormError('');
    try {
      const data = { title: form.title.trim(), content: form.content.trim(), category: form.category, priority: form.priority,
        visibility: form.visibility, target_ids: form.visibility === 'all' ? [] : form.target_ids,
        target_audience: form.visibility === 'all' ? '' : audienceLabel.length <= 500 ? audienceLabel : `${form.target_ids.length} target dipilih`, is_pinned: form.is_pinned,
        expires_at: expiry?.toISOString() || null };
      if (editing) {
        // Send actual changes only: preserve legacy audiences and timestamps
        // when editing unrelated text, including expired announcements.
        const changes: UpdateAnnouncementRequest = {};
        for (const field of ['title', 'content', 'category', 'priority', 'is_pinned'] as const) {
          if (data[field] !== editing[field]) Object.assign(changes, { [field]: data[field] });
        }
        if (form.visibility !== originalForm.current.visibility || JSON.stringify(form.target_ids) !== JSON.stringify(originalForm.current.target_ids)) {
          Object.assign(changes, { visibility: data.visibility, target_ids: data.target_ids, target_audience: data.target_audience });
        }
        if (form.expires_at !== originalForm.current.expires_at) changes.expires_at = data.expires_at;
        if (Object.keys(changes).length) await announcementService.update(editing.id, changes);
      }
      else {
        const payload: CreateAnnouncementRequest = { ...data, expires_at: data.expires_at || undefined, is_published: form.is_published,
          ...(form.scope === 'global' ? { is_global: true } : form.scope === 'multiple' ? { target_company_ids: form.company_ids } : { company_id: form.company_ids[0] }) };
        await announcementService.create(payload);
      }
      if (mounted.current) { setShowForm(false); if (!editing) { setStatus(form.is_published ? 'published' : 'draft'); setPage(1); } refresh(); toast.success(t("Pengumuman disimpan.")); }
    } catch (error) { if (mounted.current) setFormError(errorMessage(error, 'Pengumuman gagal disimpan. Silakan coba lagi.')); }
    finally { writing.current = false; if (mounted.current) setBusy(false); }
  };
  const mutate = async (row: Announcement, action: 'delete' | 'publish' | 'unpublish' | 'togglePin') => {
    if (writing.current || !row.permissions?.can_edit || (action === 'delete' && !row.permissions?.can_delete)) return;
    const labels = { delete: 'Hapus', publish: 'Terbitkan', unpublish: 'Tarik publikasi', togglePin: 'Ubah pin' };
    if (action !== 'togglePin' && !await confirm(() => t('{action} pengumuman "{title}"?', { action: t(labels[action]), title: row.title }))) return;
    if (!mounted.current || writing.current) return;
    writing.current = true; setBusy(true);
    try { await announcementService[action](row.id); if (mounted.current) { refresh(); toast.success(t("Pengumuman diperbarui.")); } }
    catch (error) { toast.error(errorMessage(error, 'Perubahan gagal disimpan.'), { id: 'api-error' }); }
    finally { writing.current = false; if (mounted.current) setBusy(false); }
  };

  return <div className="ph-announcements resources-refresh">
    <header className="ph-announcement-heading"><div><h1>{t("Announcements")}</h1><p>{t("Pengumuman dan informasi terbaru untuk Anda.")}</p></div>
      {options.can_create && <button className="ph-announcement-primary" disabled={busy || optionsState !== 'ready'} onClick={() => showEditor(null)}><Plus size={17} />{t("Buat pengumuman")}</button>}
    </header>
    {optionsState === 'error' && <p className="ph-announcement-notice" role="alert">{t("Pilihan pengelolaan gagal dimuat.")} <button onClick={() => setOptionsRevision(value => value + 1)}>{t("Coba lagi")}</button></p>}
    <div className="ph-resource-workspace">
    <section className="ph-resource-filters ph-announcement-filters" aria-label={t("Filter announcements")}>
      <label className="ph-announcement-search"><Search size={18} aria-hidden="true" /><input aria-label={t("Cari pengumuman")} maxLength={200} placeholder={t("Cari judul atau isi pengumuman…")} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      <label>{t("Kategori")}<select aria-label={t("Kategori pengumuman")} value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">{t("Semua kategori")}</option>{ANNOUNCEMENT_CATEGORIES.map(item => <option key={item} value={item}>{t(getAnnouncementCategoryLabel(item))}</option>)}</select></label>
      <label>{t("Prioritas")}<select aria-label={t("Prioritas pengumuman")} value={priority} onChange={event => { setPriority(event.target.value); setPage(1); }}><option value="">{t("Semua prioritas")}</option>{ANNOUNCEMENT_PRIORITIES.map(item => <option key={item} value={item}>{t(getPriorityLabel(item))}</option>)}</select></label>
      {options.can_create && <><label>{t("Status publikasi")}<select aria-label={t("Status pengumuman")} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="published">{t("Terbit")}</option><option value="draft">{t("Draft")}</option><option value="all">{t("Semua status")}</option></select></label>
        <label>{t("Company")}<select aria-label={t("Filter company")} value={company} onChange={event => { setCompany(event.target.value); setPage(1); }}><option value="">{t("Semua yang dapat diakses")}</option>{options.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></>}
      {(query || category || priority || company || status !== 'published') && <button className="ph-resource-reset" onClick={() => { setQuery(''); setCategory(''); setPriority(''); setCompany(''); setStatus('published'); setPage(1); }}>{t("Reset filter")}</button>}
    </section>
    <div className="ph-resource-results">

      <div className="ph-resource-results-heading"><h2>{t("Papan pengumuman")}</h2><span>{current.loading ? t("Memuat…") : current.error ? t("Daftar belum tersedia") : t('{count} pengumuman ditemukan', { count: current.total.toLocaleString(intlLocale()) })}</span></div>
    <section className="ph-announcement-library" aria-label={t("Daftar pengumuman")} aria-busy={current.loading}>
      {current.loading ? <div className="ph-announcement-empty" role="status"><Loader2 className="animate-spin" size={22} />{t("Memuat pengumuman…")}</div>
        : current.error ? <div className="ph-announcement-empty" role="alert"><p>{current.error}</p><button onClick={refresh}>{t("Coba lagi")}</button></div>
        : !current.rows.length ? <div className="ph-announcement-empty"><Megaphone size={26} /><p>{t("Belum ada pengumuman yang sesuai.")}</p></div>
        : <ul>{current.rows.map(row => <li key={row.id} data-priority={row.priority} data-pinned={row.is_pinned}>
          <div className="ph-announcement-copy"><h2>{row.title}</h2><div className="ph-announcement-meta">
            <time dateTime={row.published_at || row.created_at}>{dateLabel(row.published_at || row.created_at)}</time>
            <span className="ph-announcement-category">{t(getAnnouncementCategoryLabel(row.category))}</span><span><Building2 size={12} aria-hidden="true" />{scopeLabel(row)}</span>
            {row.is_pinned && <span><Pin size={12} />{t("Disematkan")}</span>}
            {['urgent', 'high'].includes(row.priority) && <span className="ph-announcement-urgent">{t(getPriorityLabel(row.priority))}</span>}
            {!row.is_published ? <span className="ph-announcement-draft">{t("Draft")}</span> : expired(row) ? <span className="ph-announcement-draft">{t("Kedaluwarsa")}</span> : null}
          </div><p className="ph-announcement-excerpt">{row.content}</p>
            {row.creator?.name && <p className="ph-announcement-date">{row.creator.name}</p>}
          </div>
          <div className="ph-announcement-actions"><button aria-label={t('Baca {name}', { name: row.title })} disabled={busy} onClick={() => openDetail(row)}><Eye size={16} />{t("Baca")}</button>
            {row.permissions?.can_edit && <><button aria-label={t('Edit {name}', { name: row.title })} disabled={busy || optionsState !== 'ready'} onClick={() => edit(row)}><Pencil size={16} />{t("Edit")}</button>
              <button aria-label={t(row.is_published ? 'Tarik publikasi {name}' : 'Terbitkan {name}', { name: row.title })} disabled={busy} onClick={() => mutate(row, row.is_published ? 'unpublish' : 'publish')}>{row.is_published ? t("Tarik publikasi") : t("Terbitkan")}</button>
              <button aria-label={t(row.is_pinned ? 'Lepas pin {name}' : 'Sematkan {name}', { name: row.title })} disabled={busy} onClick={() => mutate(row, 'togglePin')}><Pin size={16} /></button>
              {row.permissions.can_delete && <button aria-label={t('Hapus {name}', { name: row.title })} disabled={busy} onClick={() => mutate(row, 'delete')}><Trash2 size={16} /></button>}</>}
          </div>
        </li>)}</ul>}
      <footer><span>{current.loading ? t("Memuat daftar") : current.error ? t("Daftar belum tersedia") : t('{count} pengumuman · Halaman {page} dari {pages}', { count: current.total.toLocaleString(intlLocale()), page, pages: current.pages })}</span><div>
        <button disabled={current.loading || !!current.error || page <= 1} onClick={() => setPage(value => value - 1)}>{t("Sebelumnya")}</button>
        <button disabled={current.loading || !!current.error || page >= current.pages} onClick={() => setPage(value => value + 1)}>{t("Berikutnya")}</button>
      </div></footer>
    </section>
    </div>
    </div>
    {showForm && <AccountDialog labelledBy="announcement-form-title" toasterId="announcements" className="ph-workflow ph-announcement-dialog resource-workflow resources-refresh-dialog" onClose={closeForm}>
      <form onSubmit={save} className="resource-editor"><header className="ph-dialog-header"><h2 id="announcement-form-title">{editing ? t("Edit pengumuman") : t("Buat pengumuman")}</h2><button type="button" aria-label={t("Tutup formulir pengumuman")} disabled={busy} onClick={closeForm}><X size={20} /></button></header>
        <div className="resource-editor-scroll"><fieldset disabled={busy} className="resource-editor-body">
          <section className="ph-section resource-form-section"><h3>{t("Isi pengumuman")}</h3>
          <label>{t("Judul")}<input required maxLength={255} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
          <label>{t("Isi pengumuman")}<textarea required rows={6} maxLength={100000} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} /></label>
          <div className="ph-form-grid ph-announcement-form-grid"><label>{t("Kategori")}<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as AnnouncementCategory })}>{ANNOUNCEMENT_CATEGORIES.map(item => <option key={item} value={item}>{t(getAnnouncementCategoryLabel(item))}</option>)}</select></label>
            <label>{t("Prioritas")}<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as AnnouncementPriority })}>{ANNOUNCEMENT_PRIORITIES.map(item => <option key={item} value={item}>{t(getPriorityLabel(item))}</option>)}</select></label></div>
          </section>
          <section className="ph-section resource-form-section"><h3>{t("Tujuan dan pembaca")}</h3>
          {editing ? <p className="ph-announcement-notice">{t("Tujuan:")} {destinations(editing)}{t(". Untuk tujuan berbeda, buat pengumuman baru.")}</p> : <>
            <label>{t("Tujuan publikasi")}<select value={form.scope} onChange={event => updateTarget({ scope: event.target.value as Form['scope'], company_ids: [] })}><option value="single">{t("Satu company")}</option><option value="multiple">{t("Beberapa company")}</option>{options.can_publish_global && <option value="global">{t("Semua entity")}</option>}</select></label>
            {form.scope === 'single' && <label>{t("Company tujuan")}<select required value={form.company_ids[0] || ''} onChange={event => updateTarget({ company_ids: event.target.value ? [Number(event.target.value)] : [] })}><option value="">{t("Pilih company")}</option>{options.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            {form.scope === 'multiple' && <div className="ph-announcement-targets" role="group" aria-label={t("Company tujuan")}>{options.companies.map(item => <label key={item.id}><input type="checkbox" checked={form.company_ids.includes(item.id)} onChange={event => updateTarget({ company_ids: event.target.checked ? [...form.company_ids, item.id] : form.company_ids.filter(id => id !== item.id) })} />{item.name}</label>)}</div>}
            {form.scope === 'global' && <p className="ph-announcement-notice">{t("Pengumuman ditujukan ke semua entity. Pembaca tetap mengikuti pilihan audiens di bawah.")}</p>}
          </>}
          <label>{t("Pembaca")}<select value={form.visibility} onChange={event => setForm({ ...form, visibility: event.target.value as AnnouncementVisibility, target_ids: [] })}><option value="all">{t("Semua pengguna di company tujuan")}</option><option value="department">{t("Departemen tertentu")}</option><option value="role">{t("Role tertentu")}</option></select></label>
          {form.visibility !== 'all' && <div className="ph-announcement-targets" role="group" aria-label={t("Target pembaca")}>{audienceOptions.map(item => <label key={item.id}><input type="checkbox" checked={form.target_ids.includes(item.id)} onChange={event => setForm({ ...form, target_ids: event.target.checked ? [...form.target_ids, item.id] : form.target_ids.filter(id => id !== item.id) })} />{item.name}</label>)}
            {!audienceOptions.length && <p>{t("Belum ada target tersedia untuk company yang dipilih.")}</p>}
            {form.target_ids.filter(id => !audienceOptions.some(item => item.id === id)).map(id => <label key={id}><input type="checkbox" checked onChange={() => setForm({ ...form, target_ids: form.target_ids.filter(value => value !== id) })} />{t("Target tersimpan #")}{id}</label>)}
          </div>}
          </section>
          <section className="ph-section resource-form-section resource-span"><h3>{t("Publikasi")}</h3>
          <label>{t("Berakhir pada (WIB, opsional)")}<input type="datetime-local" value={form.expires_at} onChange={event => setForm({ ...form, expires_at: event.target.value })} /></label>
          <label className="ph-announcement-checkbox"><input type="checkbox" checked={form.is_pinned} onChange={event => setForm({ ...form, is_pinned: event.target.checked })} />{t("Sematkan di bagian atas")}</label>
          {!editing && <label className="ph-announcement-checkbox"><input type="checkbox" checked={form.is_published} onChange={event => setForm({ ...form, is_published: event.target.checked })} />{t("Terbitkan setelah disimpan")}</label>}
          </section>
          {formError && <p className="ph-announcement-error" role="alert">{formError}</p>}
        </fieldset></div><footer className="ph-dialog-footer ph-form-actions"><button type="button" disabled={busy} onClick={closeForm}>{t("Batal")}</button><button className="ph-announcement-primary" type="submit" disabled={busy}>{busy ? t("Menyimpan…") : t("Simpan pengumuman")}</button></footer>
      </form>
    </AccountDialog>}
    {detailId !== null && <AccountDialog labelledBy="announcement-detail-title" toasterId="announcements" className="ph-workflow ph-announcement-dialog resource-workflow resources-refresh-dialog" onClose={() => setDetailId(null)}>
      <header className="ph-dialog-header"><h2 id="announcement-detail-title">{t("Detail pengumuman")}</h2><button aria-label={t("Tutup detail pengumuman")} onClick={() => setDetailId(null)}><X size={20} /></button></header>
      <div className="ph-announcement-detail">{detailError ? <div role="alert"><p>{detailError}</p><button onClick={() => setDetailRevision(value => value + 1)}>{t("Coba lagi")}</button></div> : !detail ? <p role="status">{t("Memuat pengumuman…")}</p> : <>
        <article className="resource-reader-copy"><p className="ph-announcement-meta">{scopeLabel(detail)} · {t(getAnnouncementCategoryLabel(detail.category))}</p><h3>{detail.title}</h3>
        <p className="ph-announcement-date">{dateLabel(detail.published_at || detail.created_at)}{detail.creator?.name ? ` · ${detail.creator.name}` : ''}</p>
        <div className="ph-announcement-body">{detail.content}</div></article><section className="ph-section resource-reader-facts"><h3>{t("Publikasi dan akses")}</h3><dl><dt>{t("Company")}</dt><dd>{destinations(detail)}</dd><dt>{t("Pembaca")}</dt><dd>{t(getVisibilityLabel(detail.visibility))}{detail.target_audience ? `: ${detail.target_audience}` : ''}</dd>
          <dt>{t("Prioritas")}</dt><dd>{t(getPriorityLabel(detail.priority))}</dd><dt>{t("Status")}</dt><dd>{!detail.is_published ? t("Draft") : expired(detail) ? t("Kedaluwarsa") : t("Terbit")}</dd>
          {detail.expires_at && <><dt>{t("Berakhir")}</dt><dd>{dateLabel(detail.expires_at)}</dd></>}
        </dl></section></>}
      </div>
    </AccountDialog>}
    {confirmation}
  </div>;
}
