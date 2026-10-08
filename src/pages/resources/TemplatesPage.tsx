import { ApplicationCopy } from '@/components/leave/ApplicationCopy';
import type { ReactElement } from 'react';
import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Eye, FileText, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useResourceConfirmation } from './ResourceConfirmation';
import { AccountDialog } from '@/components/ui/AccountDialog';
import { useAuthStore } from '@/stores/auth.store';
import { companyService, type Company } from '@/services/company.service';
import {
  templateService, TEMPLATE_CATEGORIES, TEMPLATE_FILE_TYPES, getCategoryLabel, getFileTypeLabel,
  type Template, type TemplateCategory, type TemplateFileType, type UpdateTemplateRequest,
} from '@/services/template.service';
import './templates.css';
import './resources.css';
import './resources-refresh.css';

const message = (error: unknown, fallback: string) => (error as { response?: { data?: { error?: { message?: string } } } } | null)?.response?.data?.error?.message || <ApplicationCopy source={fallback} />;
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  const amount = bytes < 1024 ? bytes : bytes < 1024 * 1024 ? bytes / 1024 : bytes / (1024 * 1024);
  return `${amount.toLocaleString(intlLocale(), { minimumFractionDigits: bytes < 1024 ? 0 : 1, maximumFractionDigits: bytes < 1024 ? 0 : 1 })} ${bytes < 1024 ? 'B' : bytes < 1024 * 1024 ? 'KB' : 'MB'}`;
};
const initialForm = { name: '', description: '', category: 'form' as TemplateCategory, version: '1.0', is_active: true };
const fileType = (file: File): TemplateFileType => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({ doc: 'docx', docx: 'docx', pdf: 'pdf', xls: 'xlsx', xlsx: 'xlsx', ppt: 'pptx', pptx: 'pptx' } as Record<string, TemplateFileType>)[extension ?? ''] ?? 'other';
};

export function TemplatesPage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  const scope = JSON.stringify([user?.id, user?.roles, user?.accessibleCompanyIds, user?.employee?.company_id]);
  // Reset drafts/results if account or operational scope changes.
  return <TemplateLibrary key={scope} />;
}

function TemplateLibrary() {
  useLocale();
  const { confirm, confirmation } = useResourceConfirmation();
  const user = useAuthStore(state => state.user)!;
  const superAdmin = user.roles.includes('Super Admin');
  const editor = user.roles.some(role => ['Super Admin', 'Group CEO', 'HR Manager', 'HR Staff'].includes(role));
  const uploader = user.roles.some(role => ['Super Admin', 'Group CEO', 'HR Manager'].includes(role));
  const hasWriteScope = superAdmin || !!user.accessibleCompanyIds?.length;
  const canEdit = (template: Template) => editor && (superAdmin || user.accessibleCompanyIds?.includes(template.company_id));
  const canDelete = (template: Template) => uploader && canEdit(template);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; loading: boolean; error: string | ReactElement; rows: Template[]; total: number; pages: number }>({ key: '', loading: true, error: '', rows: [], total: 0, pages: 1 });
  const key = JSON.stringify([query.trim(), category, format, status, page, revision]);
  const current = result.key === key ? result : { ...result, loading: true, error: '', rows: [] };
  const refresh = () => setRevision(value => value + 1);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await templateService.getAll({ page, limit: 20, search: query.trim() || undefined,
          category: (category || undefined) as TemplateCategory | undefined, file_type: (format || undefined) as TemplateFileType | undefined,
          is_active: !editor || !hasWriteScope ? true : status === 'all' ? undefined : status === 'active' });
        if (cancelled) return;
        const pages = Math.max(1, data.pagination.totalPages);
        if (page > pages) { setPage(pages); return; }
        setResult({ key, loading: false, error: '', rows: data.data, total: data.pagination.total, pages });
      } catch (error) {
        if (!cancelled) setResult({ key, loading: false, error: message(error, 'Template gagal dimuat.'), rows: [], total: 0, pages: 1 });
      }
    }, query.trim() ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyState, setCompanyState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [companyRevision, setCompanyRevision] = useState(0);
  useEffect(() => {
    if (!uploader || !hasWriteScope) return;
    let cancelled = false;
    setCompanyState('loading');
    (async () => {
      try {
        const rows: Company[] = [];
        let companyPage = 1;
        while (true) {
          const response = await companyService.getAll({ page: companyPage, limit: 100 });
          if (cancelled) return;
          rows.push(...response.data.filter(company => superAdmin || user.accessibleCompanyIds?.includes(company.id)));
          if (companyPage >= response.pagination.totalPages) break;
          companyPage++;
        }
        setCompanies(rows.filter((row, index) => rows.findIndex(item => item.id === row.id) === index));
        setCompanyState('ready');
      } catch { if (!cancelled) setCompanyState('error'); }
    })();
    return () => { cancelled = true; };
  }, [companyRevision]);

  const [editing, setEditing] = useState<Template | null>(null);
  const [details, setDetails] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [companyId, setCompanyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const uploaded = useRef<{ file: File; info: Awaited<ReturnType<typeof templateService.uploadFile>> } | null>(null);
  const [formError, setFormError] = useState<string | ReactElement>('');
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const downloadLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const openForm = (template: Template | null) => {
    if (template ? !canEdit(template) : !uploader || !hasWriteScope || companyState !== 'ready' || !companies.length) return;
    setEditing(template);
    setForm(template ? { name: template.name, description: template.description ?? '', category: template.category, version: template.version ?? '1.0', is_active: template.is_active } : initialForm);
    setCompanyId(template ? String(template.company_id) : companies.length === 1 ? String(companies[0].id) : '');
    setFile(null); uploaded.current = null; setFormError(''); setShowForm(true);
  };
  const closeForm = async () => {
    if (writing.current) return;
    const original = editing ? { name: editing.name, description: editing.description ?? '', category: editing.category, version: editing.version ?? '1.0', is_active: editing.is_active } : initialForm;
    if ((file || JSON.stringify(form) !== JSON.stringify(original)) && !await confirm(() => t("Buang perubahan template yang belum disimpan?"))) return;
    if (!mounted.current || writing.current) return;
    setShowForm(false);
  };
  const download = async (template: Template) => {
    if (downloadLock.current) return;
    downloadLock.current = true; setDownloading(template.id);
    try {
      const response = await templateService.getDownloadUrl(template.id);
      const url = new URL(response.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid download URL');
      if (!mounted.current) return;
      const anchor = document.createElement('a');
      anchor.href = url.href; anchor.download = response.filename; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
      document.body.append(anchor); anchor.click(); anchor.remove();
    } catch (error) { toast.error(message(error, 'File gagal diunduh. Silakan coba lagi.'), { id: 'api-error', toasterId: details ? 'templates' : undefined }); }
    finally { downloadLock.current = false; if (mounted.current) setDownloading(null); }
  };
  const mutate = async (template: Template, action: 'delete' | 'duplicate') => {
    if (writing.current || !canEdit(template) || (action === 'delete' && !canDelete(template))) return;
    if (action === 'delete' && !await confirm(() => t('Hapus template "{name}"?', { name: template.name }))) return;
    if (!mounted.current || writing.current) return;
    writing.current = true; setBusy(true);
    try {
      await templateService[action](template.id);
      if (mounted.current) { refresh(); toast.success(action === 'delete' ? t("Template dihapus.") : t("Salinan template dibuat sebagai nonaktif.")); }
    } catch (error) { toast.error(message(error, 'Perubahan template gagal.'), { id: 'api-error' }); }
    finally { writing.current = false; if (mounted.current) setBusy(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (writing.current || (editing ? !canEdit(editing) : !uploader || !companies.some(item => item.id === Number(companyId)))) return;
    if (!form.name.trim() || (!editing && !file)) { setFormError(<ApplicationCopy source="Nama template dan file wajib diisi." />); return; }
    if (file && file.size > 25 * 1024 * 1024) { setFormError(<ApplicationCopy source="Ukuran file maksimal 25 MB." />); return; }
    writing.current = true; setBusy(true); setFormError('');
    try {
      const data: UpdateTemplateRequest = { ...form, name: form.name.trim() };
      if (file) {
        if (!uploader) throw new Error('Upload not allowed');
        if (uploaded.current?.file !== file) uploaded.current = { file, info: await templateService.uploadFile(file) };
        Object.assign(data, uploaded.current.info, { file_type: fileType(file) });
      }
      if (!mounted.current) return;
      if (editing) await templateService.update(editing.id, data);
      else await templateService.create({ ...data, name: data.name!, category: form.category, company_id: Number(companyId), file_path: data.file_path!, file_type: data.file_type! });
      if (mounted.current) { setShowForm(false); refresh(); toast.success(t("Template disimpan.")); }
    } catch (error) { if (mounted.current) setFormError(message(error, 'Template gagal disimpan. Data tetap tersimpan di formulir.')); }
    finally { writing.current = false; if (mounted.current) setBusy(false); }
  };

  return <div className="ph-templates resources-refresh">
    <header className="ph-templates-heading">
      <div><h1>{t("Templates")}</h1><p>{t("Dokumen acuan, formulir, dan panduan untuk pekerjaan Anda.")}</p></div>
      {uploader && <button className="ph-template-primary" disabled={!hasWriteScope || companyState !== 'ready' || !companies.length || busy} onClick={() => openForm(null)}><Plus size={17} />{t("Upload template")}</button>}
    </header>
    {editor && !hasWriteScope && <p className="ph-template-notice">{t("Belum ada company yang ditugaskan untuk pengelolaan template. Template yang tersedia tetap dapat dibaca.")}</p>}
    {uploader && hasWriteScope && companyState === 'error' && <p className="ph-template-notice" role="alert">{t("Company upload gagal dimuat.")} <button onClick={() => setCompanyRevision(value => value + 1)}>{t("Coba lagi")}</button></p>}
    {uploader && hasWriteScope && companyState === 'ready' && !companies.length && <p className="ph-template-notice">{t("Belum ada company yang tersedia untuk upload.")}</p>}
    <div className="ph-resource-workspace">
    <section className="ph-resource-filters ph-template-filters" aria-label={t("Filter templates")}>
      <label className="ph-template-search"><Search size={18} aria-hidden="true" /><input aria-label={t("Cari template")} placeholder={t("Cari nama atau deskripsi template…")} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      <label>{t("Kategori")}<select aria-label={t("Kategori template")} value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">{t("Semua kategori")}</option>{TEMPLATE_CATEGORIES.map(value => <option key={value} value={value}>{t(getCategoryLabel(value))}</option>)}</select></label>
      <label>{t("Format file")}<select aria-label={t("Format file")} value={format} onChange={event => { setFormat(event.target.value); setPage(1); }}><option value="">{t("Semua format")}</option>{TEMPLATE_FILE_TYPES.map(value => <option key={value} value={value}>{t(getFileTypeLabel(value))}</option>)}</select></label>
      {editor && hasWriteScope && <label>{t("Status")}<select aria-label={t("Status template")} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="active">{t("Aktif")}</option><option value="inactive">{t("Nonaktif")}</option><option value="all">{t("Semua status")}</option></select></label>}
      {(query || category || format || status !== 'active') && <button className="ph-resource-reset" onClick={() => { setQuery(''); setCategory(''); setFormat(''); setStatus('active'); setPage(1); }}>{t("Reset filter")}</button>}
    </section>
    <div className="ph-resource-results">

      <div className="ph-resource-results-heading"><h2>{t("Katalog template")}</h2><span>{current.loading ? t("Memuat…") : current.error ? t("Daftar belum tersedia") : t('{count} dokumen ditemukan', { count: current.total.toLocaleString(intlLocale()) })}</span></div>
    <div className="ph-template-library" aria-busy={current.loading}>
      {current.loading ? <p className="ph-template-state" role="status"><Loader2 size={20} className="animate-spin" />{t("Memuat templates…")}</p>
        : current.error ? <div className="ph-template-state" role="alert">{current.error}<button onClick={refresh}>{t("Coba lagi")}</button></div>
          : !current.rows.length ? <p className="ph-template-state">{t("Tidak ada template yang sesuai. Coba ubah pencarian atau filter.")}</p>
            : <ul>{current.rows.map(template => <li key={template.id}>
              <div className="ph-template-file" data-format={template.file_type}><FileText size={19} aria-hidden="true" /><span>{template.file_type.toUpperCase()}</span></div>
              <div className="ph-template-copy"><h2>{template.name}</h2><p>{template.description || t('Tidak ada deskripsi.')}</p>
                <div className="ph-template-meta"><span>{t(getCategoryLabel(template.category))}</span><span>{template.company?.name || t('Company')}</span>{!template.is_active && <span className="ph-template-inactive">{t("Nonaktif")}</span>}</div></div>
              <div className="ph-template-file-meta"><span>{t("Versi")} {template.version || '—'}</span><span>{formatFileSize(template.file_size)}</span></div>
              <div className="ph-template-actions">
                <button aria-label={t('Lihat detail {name}', { name: template.name })} onClick={() => setDetails(template)}><Eye size={17} />{t("Detail")}</button>
                <button aria-label={t('Unduh {name}', { name: template.name })} disabled={downloading !== null} onClick={() => download(template)}>{downloading === template.id ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}{' '}{t("Unduh")}</button>
                {canEdit(template) && <>
                  <button aria-label={t('Edit {name}', { name: template.name })} disabled={busy} onClick={() => openForm(template)}><Pencil size={16} />{t("Edit")}</button>
                  <button aria-label={t('Duplikasi {name}', { name: template.name })} disabled={busy} onClick={() => mutate(template, 'duplicate')}><Copy size={16} /></button>
                  {canDelete(template) && <button aria-label={t('Hapus {name}', { name: template.name })} disabled={busy} onClick={() => mutate(template, 'delete')}><Trash2 size={16} /></button>}
                </>}
              </div>
            </li>)}</ul>}
      <footer><span>{current.loading ? t("Memuat daftar") : current.error ? t("Daftar belum tersedia") : t('{count} template · Halaman {page} dari {pages}', { count: current.total.toLocaleString(intlLocale()), page, pages: current.pages })}</span>
        <div><button disabled={current.loading || !!current.error || page <= 1} onClick={() => setPage(value => value - 1)}>{t("Sebelumnya")}</button><button disabled={current.loading || !!current.error || page >= current.pages} onClick={() => setPage(value => value + 1)}>{t("Berikutnya")}</button></div></footer>
    </div>
    </div>
    </div>
    {showForm && <AccountDialog labelledBy="template-form-title" toasterId="templates" className="ph-workflow ph-template-dialog resource-workflow resources-refresh-dialog" onClose={closeForm}>
      <form onSubmit={save} className="resource-editor">
        <header className="ph-dialog-header"><h2 id="template-form-title">{editing ? t("Edit template") : t("Upload template")}</h2><button type="button" aria-label={t("Tutup formulir template")} disabled={busy} onClick={closeForm}><X size={20} /></button></header>
        <div className="resource-editor-scroll"><fieldset disabled={busy} className="resource-editor-body">
          <section className="ph-section resource-form-section"><h3>{t("Informasi template")}</h3>
          <label>{t("Nama template")}<input required maxLength={255} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
          <label>{t("Deskripsi")}<textarea rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
          <div className="ph-form-grid ph-template-form-grid"><label>{t("Kategori")}<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as TemplateCategory })}>{TEMPLATE_CATEGORIES.map(value => <option key={value} value={value}>{t(getCategoryLabel(value))}</option>)}</select></label>
            <label>{t("Versi")}<input required maxLength={20} value={form.version} onChange={event => setForm({ ...form, version: event.target.value })} /></label></div>
          </section>
          <section className="ph-section resource-form-section"><h3>{t("File dan akses")}</h3>
          {!editing && <label>{t("Company upload")}<select required value={companyId} onChange={event => setCompanyId(event.target.value)}><option value="">{t("Pilih company")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>}
          {editing && <p className="ph-template-notice">{t("Company:")} {editing.company?.name || editing.company_id}</p>}
          {uploader && <label>{editing ? t("Ganti file (opsional)") : t("File template")}<input type="file" required={!editing} onChange={event => { setFile(event.target.files?.[0] ?? null); uploaded.current = null; }} />{file && <small>{file.name} · {formatFileSize(file.size)}</small>}</label>}
          <label className="ph-template-checkbox"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} />{t("Aktif dan tersedia untuk pengguna")}</label>
          </section>
          {formError && <p className="ph-template-error" role="alert">{formError}</p>}
        </fieldset></div>
        <footer className="ph-dialog-footer ph-form-actions"><button type="button" disabled={busy} onClick={closeForm}>{t("Batal")}</button><button className="ph-template-primary" disabled={busy} type="submit">{busy ? t("Menyimpan…") : t("Simpan template")}</button></footer>
      </form>
    </AccountDialog>}
    {details && <AccountDialog labelledBy="template-detail-title" toasterId="templates" className="ph-workflow ph-template-dialog resource-workflow resources-refresh-dialog" onClose={() => setDetails(null)}>
      <header className="ph-dialog-header"><h2 id="template-detail-title">{t("Detail template")}</h2><button aria-label={t("Tutup detail template")} onClick={() => setDetails(null)}><X size={20} /></button></header>
      <div className="ph-template-detail resource-reader"><section className="resource-reader-copy"><h3>{details.name}</h3><p>{details.description || t('Tidak ada deskripsi.')}</p></section><section className="ph-section resource-reader-facts"><h3>{t("Informasi dokumen")}</h3><dl>
        <dt>{t("Company")}</dt><dd>{details.company?.name || '—'}</dd><dt>{t("Kategori")}</dt><dd>{t(getCategoryLabel(details.category))}</dd>
        <dt>{t("File")}</dt><dd>{details.file_name || details.name}</dd><dt>{t("Ukuran")}</dt><dd>{formatFileSize(details.file_size)}</dd>
        <dt>{t("Versi")}</dt><dd>{details.version || '—'}</dd><dt>{t("Status")}</dt><dd>{details.is_active ? t("Aktif") : t("Nonaktif")}</dd>
        <dt>{t("Diperbarui")}</dt><dd>{new Date(details.updated_at).toLocaleDateString(intlLocale(), { timeZone: 'Asia/Jakarta' })}</dd>
      </dl></section></div><footer className="ph-dialog-footer ph-form-actions"><button className="ph-template-primary" disabled={downloading !== null} onClick={() => download(details)}><Download size={17} />{t("Unduh template")}</button></footer>
    </AccountDialog>}
    {confirmation}
  </div>;
}
