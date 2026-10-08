import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Building2, FileSignature, Files, Search, RefreshCw, Upload, X, ArrowUpRight, Download, CheckCircle2, Undo2, Trash2, Info, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AccountDialog } from '@/components/ui/AccountDialog';
import { companyService, type Company } from '@/services/company.service';
import { contractService, type Contract } from '@/services/contract.service';
import { employeeService } from '@/services/employee.service';
import { employeeDocumentService, getDocumentCategory, type EmployeeDocument } from '@/services/employee-document.service';
import { documentService } from '@/services/document.service';
import { collectPages } from '@/services/master-data';
import type { Employee } from '@/types';
import './contracts.css';
import './contracts-refresh.css';

type Tab = 'contracts' | 'documents';
type Category = 'employee' | 'hr';
const contractTypes: Record<string, string> = { permanent: 'Permanent', contract: 'Contract', probation: 'Probation', internship: 'Internship', part_time: 'Part time' };
const contractStatuses: Record<string, string> = { draft: 'Draft', pending: 'Pending', active: 'Active', expired: 'Expired', terminated: 'Terminated', renewed: 'Renewed' };
const employeeTypes = [
  ['ktp', 'National ID Card (KTP)'], ['npwp', 'Tax ID (NPWP)'], ['kk', 'Family Card'], ['ijazah', 'Latest Diploma'],
  ['transkrip', 'Academic Transcript'], ['sertifikat', 'Skill Certificate'], ['skck', 'Police Clearance (SKCK)'],
  ['surat_sehat', 'Health Certificate'], ['foto', 'Passport Photo'], ['bpjs_kesehatan', 'BPJS Health Insurance'],
  ['bpjs_ketenagakerjaan', 'BPJS Employment'], ['rekening', 'Bank Account Book'], ['other', 'Other'],
];
const hrTypes = [
  ['offer_letter', 'Offer Letter'], ['kontrak_kerja', 'Employment Contract'], ['pkwt', 'Fixed-Term Contract (PKWT)'],
  ['pkwtt', 'Permanent Contract (PKWTT)'], ['addendum', 'Contract Addendum'], ['sp1', 'Warning Letter 1'],
  ['sp2', 'Warning Letter 2'], ['sp3', 'Warning Letter 3'], ['sk_pengangkatan', 'Appointment Letter'],
  ['sk_promosi', 'Promotion Letter'], ['sk_mutasi', 'Transfer Letter'], ['sk_phk', 'Termination Letter'],
  ['surat_referensi', 'Reference Letter'], ['paklaring', 'Employment Certificate'], ['slip_gaji', 'Salary Slip'], ['other', 'Other'],
];
const documentType = (type: string) => { const label = [...employeeTypes, ...hrTypes].find(([key]) => key === type)?.[1]; return label ? t(label) : type; };
const categoryName = (category: Category) => category === 'hr' ? t('P&C documents') : t('Employee documents');
const dateLabel = (value?: string | null) => value && !Number.isNaN(Date.parse(value))
  ? new Date(value).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '—';
const money = (value?: number | string | null) => value == null || value === '' || !Number.isFinite(Number(value))
  ? '—' : new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
const fileSize = (value?: number) => value == null ? '—' : value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KB` : `${(value / 1048576).toLocaleString(intlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('');
const expiresSoon = (contract: Contract) => {
  if (contract.status !== 'active' || !contract.end_date) return false;
  const days = Math.ceil((Date.parse(contract.end_date) - Date.now()) / 86400000);
  return days >= 0 && days <= 30;
};
function Status({ value, label }: { value: string; label: string }) {
  useLocale();
  return <span className="ct-status" data-status={value}><i aria-hidden="true" />{label}</span>;
}
function Identity({ name, code }: { name: string; code?: string }) {
  useLocale();
  return <div className="ct-identity"><span className="ct-avatar" aria-hidden="true">{initials(name)}</span><div><strong>{name}</strong><small>{code || '—'}</small></div></div>;
}
function Dialog({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  useLocale();
  return <AccountDialog labelledBy="ct-dialog-title" toasterId="contracts-dialog" className="ct-dialog ph-workflow ct-workflow contracts-refresh-dialog" onClose={() => { if (!busy) onClose(); }}>
    <header className="ph-dialog-header"><div><h2 id="ct-dialog-title">{title}</h2></div><button type="button" className="ct-icon-button" aria-label={t("Tutup dialog")} disabled={busy} onClick={onClose}><X size={20} /></button></header>
    {children}
  </AccountDialog>;
}
function Feedback({ error, retry, title, children }: { error?: boolean; retry?: () => void; title: string; children?: ReactNode }) {
  useLocale();
  return <div className="ct-feedback" role={error ? 'alert' : 'status'}><Files size={28} /><h3>{title}</h3>{children && <p>{children}</p>}{retry && <button className="ct-button" onClick={retry}>{t("Coba lagi")}</button>}</div>;
}

export function ContractsPage() {
  useLocale();
  const [tab, setTab] = useState<Tab>('contracts');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState(false);
  const [companyAttempt, setCompanyAttempt] = useState(0);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [contractId, setContractId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [viewDocument, setViewDocument] = useState<EmployeeDocument | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<EmployeeDocument | null>(null);
  const [uploadCategory, setUploadCategory] = useState<Category | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(false);
  const [employeeAttempt, setEmployeeAttempt] = useState(0);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ employee: '', type: '', name: '', notes: '', file: null as File | null });

  useEffect(() => {
    let current = true;
    setCompanyLoading(true); setCompanyError(false);
    collectPages((page, limit) => companyService.getAll({ page, limit })).then(rows => {
      if (current) { setCompanies(rows); setCompanyId(previous => rows.some(row => row.id === previous) ? previous : rows[0]?.id ?? null); }
    }).catch(() => { if (current) setCompanyError(true); }).finally(() => { if (current) setCompanyLoading(false); });
    return () => { current = false; };
  }, [companyAttempt]);

  useEffect(() => {
    if (companyId == null) return;
    let current = true;
    setLoading(true); setLoadError(false); setLoadedKey('');
    const load = async () => {
      try {
        if (tab === 'contracts') {
          const rows = await collectPages((page, limit) => contractService.listContracts({ company_id: companyId, page, limit }));
          if (current) setContracts(rows);
        } else {
          const rows = await collectPages((page, limit) => employeeDocumentService.getAll({ company_id: companyId, page, limit }));
          if (current) setDocuments(rows);
        }
      } catch { if (current) setLoadError(true); }
      finally { if (current) { setLoadedKey(`${companyId}:${tab}`); setLoading(false); } }
    };
    void load();
    return () => { current = false; };
  }, [companyId, tab, version]);

  useEffect(() => {
    if (contractId == null) return;
    let current = true;
    setDetail(null); setDetailError(false);
    contractService.getById(contractId).then(row => { if (current) setDetail(row); })
      .catch(() => { if (current) setDetailError(true); });
    return () => { current = false; };
  }, [contractId, detailAttempt]);

  useEffect(() => {
    if (!uploadCategory || companyId == null) return;
    let current = true;
    setEmployees([]); setEmployeesLoading(true); setEmployeesError(false);
    collectPages((page, limit) => employeeService.getAll({ company_id: companyId, page, limit })).then(rows => { if (current) setEmployees(rows); })
      .catch(() => { if (current) setEmployeesError(true); }).finally(() => { if (current) setEmployeesLoading(false); });
    return () => { current = false; };
  }, [uploadCategory, companyId, employeeAttempt]);

  const selectedCompany = companies.find(company => company.id === companyId);
  const waiting = loading || loadedKey !== `${companyId}:${tab}`;
  const ready = !companyLoading && !companyError && companyId != null && !waiting && !loadError;
  const query = search.trim().toLowerCase();
  const filteredContracts = contracts.filter(row => [row.employee?.name, row.employee?.employee_id, row.contract_number].some(value => value?.toLowerCase().includes(query))
    && (status === 'all' || row.status === status) && (type === 'all' || row.contract_type === type));
  const filteredDocuments = documents.filter(row => [row.employee?.name, row.employee?.employee_id, row.document_name].some(value => value?.toLowerCase().includes(query))
    && (status === 'all' || row.is_verified === (status === 'verified')) && (type === 'all' || getDocumentCategory(row.document_type) === type));
  const filtered = tab === 'contracts' ? filteredContracts : filteredDocuments;
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * 10;
  const resetFilters = () => { setSearch(''); setStatus('all'); setType('all'); setPage(1); };
  const refresh = () => setVersion(value => value + 1);
  const download = (path: string) => documentService.downloadFile(path).catch(() => toast.error(t("Dokumen gagal diunduh."), { id: 'api-error', ...(contractId || viewDocument ? { toasterId: 'contracts-dialog' } : {}) }));
  const openUpload = (category: Category) => {
    setForm({ employee: '', type: '', name: '', notes: '', file: null }); setEmployeeSearch(''); setUploadCategory(category);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !form.file || !form.type || !form.name.trim() || !employees.some(employee => employee.id === Number(form.employee))) return;
    setBusy(true);
    try {
      const file = await employeeDocumentService.uploadFile(form.file);
      await employeeDocumentService.create({ employee_id: Number(form.employee), document_type: form.type, document_name: form.name.trim(), ...file, description: form.notes.trim() || undefined });
      setUploadCategory(null); refresh(); toast.success(t("Dokumen berhasil diunggah."));
    } catch { toast.error(t("Dokumen gagal disimpan. Silakan coba lagi."), { id: 'api-error', toasterId: 'contracts-dialog' }); }
    finally { setBusy(false); }
  };
  const changeVerification = async (doc: EmployeeDocument) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = doc.is_verified ? await employeeDocumentService.unverify(doc.id) : await employeeDocumentService.verify(doc.id);
      if (viewDocument?.id === doc.id) setViewDocument({ ...doc, ...updated });
      refresh(); toast.success(doc.is_verified ? t("Verifikasi dicabut.") : t("Dokumen terverifikasi."), { ...(viewDocument ? { toasterId: 'contracts-dialog' } : {}) });
    } catch { toast.error(t("Status verifikasi gagal diperbarui."), { id: 'api-error', ...(viewDocument ? { toasterId: 'contracts-dialog' } : {}) }); }
    finally { setBusy(false); }
  };
  const removeDocument = async () => {
    if (!deleteDocument || busy) return;
    setBusy(true);
    try { await employeeDocumentService.delete(deleteDocument.id); setDeleteDocument(null); refresh(); toast.success(t("Dokumen berhasil dihapus.")); }
    catch { toast.error(t("Dokumen gagal dihapus."), { id: 'api-error', toasterId: 'contracts-dialog' }); }
    finally { setBusy(false); }
  };

  const metrics = tab === 'contracts'
    ? [{ label: 'Total contracts', value: contracts.length }, { label: 'Active contracts', value: contracts.filter(row => row.status === 'active').length }, { label: 'Berakhir dalam 30 hari', value: contracts.filter(expiresSoon).length }]
    : [{ label: 'Total documents', value: documents.length }, { label: 'Verified', value: documents.filter(row => row.is_verified).length }, { label: 'Perlu verifikasi', value: documents.filter(row => !row.is_verified).length }];

  return <div className="ct-page contracts-refresh">
    <header className="ct-page-header"><div><h1>{t("Contracts & Documents")}</h1><p>{t("Kontrak kerja dan berkas karyawan, dalam satu tempat.")}</p></div>
      <div className="ct-header-actions">{tab === 'documents' && <button className="ct-button ct-primary" disabled={!ready || busy} onClick={() => openUpload('hr')}><Upload size={16} />{t("Upload document")}</button>}<button className="ct-button" disabled={!companyId || waiting || companyError || busy} onClick={refresh}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t("Refresh")}</button></div></header>
    <div className="ct-surface"><nav className="ct-tabs" aria-label={t("Jenis arsip")}>
      <button aria-current={tab === 'contracts' ? 'page' : undefined} onClick={() => { setTab('contracts'); resetFilters(); }}><FileSignature size={18} />{t("Contracts")}</button>
      <button aria-current={tab === 'documents' ? 'page' : undefined} onClick={() => { setTab('documents'); resetFilters(); }}><Files size={18} />{t("Documents")}</button>
    </nav>
    {companyLoading ? <Feedback title={t("Memuat company…")} /> : companyError ? <Feedback error title={t("Company belum dapat dimuat")} retry={() => setCompanyAttempt(value => value + 1)}>{t("Coba muat ulang daftar company.")}</Feedback> : !companies.length ? <Feedback title={t("Belum ada company yang tersedia")}>{t("Hubungi admin untuk memeriksa akses company.")}</Feedback> :
      <div className="ct-workspace">
        <section className="ct-filters" aria-label={t("Filter arsip")}>
          <label className="ct-search"><Search size={17} /><input aria-label={t("Cari arsip")} placeholder={tab === 'contracts' ? t("Cari nama, ID, atau nomor kontrak…") : t("Cari nama karyawan atau dokumen…")} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
          <label className="ct-field ct-company">{t("Company")}<select aria-label={t("Company")} value={companyId ?? ''} onChange={event => { setCompanyId(Number(event.target.value)); setPage(1); }}>
            {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="ct-field">{tab === 'contracts' ? t("Tipe kontrak") : t("Kategori dokumen")}<select aria-label={tab === 'contracts' ? t("Tipe kontrak") : t("Kategori dokumen")} value={type} onChange={event => { setType(event.target.value); setPage(1); }}>
            <option value="all">{t("Semua tipe")}</option>{Object.entries(tab === 'contracts' ? contractTypes : { employee: 'Employee documents', hr: 'P&C documents' }).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
          <label className="ct-field">{t("Status")}<select aria-label={t("Status")} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">{t("Semua status")}</option>{Object.entries(tab === 'contracts' ? contractStatuses : { verified: 'Verified', unverified: 'Unverified' }).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
          <button className="ct-reset" disabled={!search && status === 'all' && type === 'all'} onClick={resetFilters}>{t("Reset filter")}</button>
        </section>
        <section className="ct-content" aria-label={tab === 'contracts' ? t("Daftar kontrak") : t("Daftar dokumen")}>

          <div className="ct-register">
            <div className="ct-toolbar"><div className="ct-metrics">{metrics.map(metric => <div key={metric.label}><span>{t(metric.label)}</span><strong>{ready ? metric.value.toLocaleString(intlLocale()) : '—'}</strong></div>)}</div><span aria-live="polite">{ready ? t(tab === 'contracts' ? '{count} contracts' : '{count} documents', { count: filtered.length.toLocaleString(intlLocale()) }) : t("Memuat arsip")}</span></div>
            {waiting ? <Feedback title={t("Memuat arsip…")} /> : loadError ? <Feedback error title={t("Arsip belum dapat dimuat")} retry={refresh}>{t("Data company ini belum tersedia. Silakan coba lagi.")}</Feedback> : !filtered.length ? <Feedback title={search || status !== 'all' || type !== 'all' ? t("Tidak ada hasil yang cocok") : t("Belum ada arsip")}>{search || status !== 'all' || type !== 'all' ? t("Coba kata kunci lain atau reset filter.") : t("Arsip akan tampil di sini setelah tersedia untuk company ini.")}</Feedback> :
              <table className="ct-table"><thead><tr><th>{tab === 'contracts' ? t("Karyawan") : t("Dokumen / Karyawan")}</th><th>{tab === 'contracts' ? t("Tipe / Nomor") : t("Kategori / Jenis")}</th><th>{tab === 'contracts' ? t("Periode kontrak") : t("Diunggah")}</th><th>{t("Status")}</th><th><span className="sr-only">{t("Aksi")}</span></th></tr></thead>
                <tbody>{tab === 'contracts' ? filteredContracts.slice(pageStart, pageStart + 10).map(row => <tr key={row.id}>
                  <td><Identity name={row.employee?.name || t('Nama belum tersedia')} code={row.employee?.employee_id} /></td>
                  <td data-label={t("Kontrak")}><strong>{contractTypes[row.contract_type] ? t(contractTypes[row.contract_type]) : row.contract_type}</strong><small className="ct-reference">{row.contract_number || '—'}</small></td>
                  <td data-label={t("Periode")}><strong>{dateLabel(row.start_date)}</strong><small>{row.end_date ? t('Until {date}', { date: dateLabel(row.end_date) }) : t("Tanpa tanggal berakhir")}</small>{expiresSoon(row) && <span className="ct-expiry">{t("Berakhir dalam 30 hari")}</span>}</td>
                  <td data-label={t("Status")}><Status value={row.status} label={contractStatuses[row.status] ? t(contractStatuses[row.status]) : row.status} /></td>
                  <td className="ct-row-actions"><button className="ct-icon-button" aria-label={t('Contract details for {name}', { name: row.employee?.name || row.contract_number || '?' })} onClick={() => { setDetail(null); setContractId(row.id); }}><ArrowUpRight size={19} /></button></td>
                </tr>) : filteredDocuments.slice(pageStart, pageStart + 10).map(doc => <tr key={doc.id}>
                  <td><div className="ct-identity"><span className="ct-file-icon"><Files size={20} /></span><div><strong>{doc.document_name}</strong><small>{doc.employee?.name || t('Nama belum tersedia')} · {doc.employee?.employee_id || '—'}</small></div></div></td>
                  <td data-label={t("Kategori")}><strong>{categoryName(getDocumentCategory(doc.document_type))}</strong><small>{documentType(doc.document_type)}</small></td>
                  <td data-label={t("Diunggah")}><strong>{dateLabel(doc.created_at)}</strong><small>{fileSize(doc.file_size)}</small></td>
                  <td data-label={t("Status")}><Status value={doc.is_verified ? 'active' : 'pending'} label={doc.is_verified ? t("Verified") : t("Unverified")} /></td>
                  <td className="ct-row-actions"><button className="ct-icon-button" aria-label={t('Document details: {name}', { name: doc.document_name })} onClick={() => setViewDocument(doc)}><ArrowUpRight size={19} /></button><button className="ct-icon-button" aria-label={t('Download {name}', { name: doc.document_name })} onClick={() => void download(doc.file_path)}><Download size={17} /></button></td>
                </tr>)}</tbody></table>}
            {ready && filtered.length > 0 && <footer className="ct-pagination"><span>{(pageStart + 1).toLocaleString(intlLocale())}–{Math.min(pageStart + 10, filtered.length).toLocaleString(intlLocale())}{' '}{t("dari")} {filtered.length.toLocaleString(intlLocale())}</span><nav aria-label={t("Halaman arsip")}><button className="ct-icon-button" disabled={currentPage === 1} aria-label={t("Halaman sebelumnya")} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><span>{currentPage.toLocaleString(intlLocale())} / {totalPages.toLocaleString(intlLocale())}</span><button className="ct-icon-button" disabled={currentPage === totalPages} aria-label={t("Halaman berikutnya")} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></nav></footer>}
          </div>
          {tab === 'contracts' && <p className="ct-notice"><Info size={16} />{t("Penambahan, perubahan, dan penghapusan kontrak belum tersedia di halaman ini. Dokumen kontrak dapat diunggah melalui tab Documents.")}</p>}
        </section>
      </div>}</div>

    {contractId != null && <Dialog title={t("Detail kontrak")} onClose={() => setContractId(null)}>
      {detailError ? <Feedback error title={t("Detail gagal dimuat")} retry={() => setDetailAttempt(value => value + 1)} /> : !detail ? <Feedback title={t("Memuat detail…")} /> : <>
        <div className="ct-dialog-body"><div className="ct-detail-identity"><Identity name={detail.employee?.name || t('Nama belum tersedia')} code={detail.employee?.employee_id} /><Status value={detail.status} label={contractStatuses[detail.status] ? t(contractStatuses[detail.status]) : detail.status} /></div>
          <section className="ph-section ct-workflow-section"><h3>{t("Ketentuan kontrak")}</h3><dl className="ct-detail-grid ph-kv"><div><dt>{t("Nomor kontrak")}</dt><dd>{detail.contract_number || '—'}</dd></div><div><dt>{t("Tipe kontrak")}</dt><dd>{contractTypes[detail.contract_type] ? t(contractTypes[detail.contract_type]) : detail.contract_type}</dd></div><div><dt>{t("Department")}</dt><dd>{detail.department || detail.employee?.department?.name || '—'}</dd></div><div><dt>{t("Position")}</dt><dd>{detail.position || detail.employee?.position?.name || '—'}</dd></div><div><dt>{t("Tanggal mulai")}</dt><dd>{dateLabel(detail.start_date)}</dd></div><div><dt>{t("Tanggal berakhir")}</dt><dd>{detail.end_date ? dateLabel(detail.end_date) : t("Tanpa tanggal berakhir")}</dd></div><div className="ct-detail-salary"><dt>{t("Gaji dalam kontrak")}</dt><dd>{money(detail.salary)}</dd></div></dl></section>
          <section className="ct-detail-notes"><h3>{t("Catatan")}</h3><p>{detail.notes || t('Belum ada catatan.')}</p></section></div>
        <footer className="ct-dialog-footer ph-form-actions">{detail.attachment_path && <button className="ct-button" onClick={() => void download(detail.attachment_path!)}><Download size={16} />{t("Unduh lampiran")}</button>}<button className="ct-button" onClick={() => setContractId(null)}>{t("Tutup")}</button></footer>
      </>}
    </Dialog>}

    {viewDocument && <Dialog title={t("Detail dokumen")} onClose={() => setViewDocument(null)} busy={busy}>
      <div className="ct-dialog-body"><div className="ct-document-title"><span className="ct-file-icon"><Files size={25} /></span><div><h3>{viewDocument.document_name}</h3><p>{documentType(viewDocument.document_type)} · {fileSize(viewDocument.file_size)}</p></div></div>
        <section className="ph-section ct-workflow-section"><h3>{t("Informasi dan verifikasi")}</h3><dl className="ct-detail-grid ph-kv"><div><dt>{t("Karyawan")}</dt><dd>{viewDocument.employee?.name || '—'}</dd></div><div><dt>{t("ID karyawan")}</dt><dd>{viewDocument.employee?.employee_id || '—'}</dd></div><div><dt>{t("Kategori")}</dt><dd>{categoryName(getDocumentCategory(viewDocument.document_type))}</dd></div><div><dt>{t("Status")}</dt><dd><Status value={viewDocument.is_verified ? 'active' : 'pending'} label={viewDocument.is_verified ? t("Verified") : t("Unverified")} /></dd></div><div><dt>{t("Diunggah oleh")}</dt><dd>{viewDocument.uploader?.name || '—'}</dd></div><div><dt>{t("Tanggal unggah")}</dt><dd>{dateLabel(viewDocument.created_at)}</dd></div></dl></section>
        <section className="ct-detail-notes"><h3>{t("Catatan")}</h3><p>{viewDocument.description || t('Belum ada catatan.')}</p>{viewDocument.verification_notes && <p>{t("Verifikasi:")} {viewDocument.verification_notes}</p>}</section>
      </div>
      <footer className="ct-dialog-footer ph-form-actions"><button className="ct-button ct-danger" disabled={busy} onClick={() => { setDeleteDocument(viewDocument); setViewDocument(null); }}><Trash2 size={16} />{t("Hapus")}</button><button className="ct-button" onClick={() => void download(viewDocument.file_path)}><Download size={16} />{t("Unduh")}</button><button className="ct-button ct-primary" disabled={busy} onClick={() => void changeVerification(viewDocument)}>{busy ? <Loader2 size={16} className="animate-spin" /> : viewDocument.is_verified ? <Undo2 size={16} /> : <CheckCircle2 size={16} />}{viewDocument.is_verified ? t("Cabut verifikasi") : t("Verifikasi")}</button></footer>
    </Dialog>}

    {deleteDocument && <Dialog title={t("Hapus dokumen?")} onClose={() => setDeleteDocument(null)} busy={busy}><div className="ct-dialog-body"><p>{t("Dokumen")} <strong>{deleteDocument.document_name}</strong>{' '}{t("milik")} <strong>{deleteDocument.employee?.name || t('karyawan ini')}</strong>{' '}{t("akan dihapus. Pastikan dokumen ini sudah tidak diperlukan.")}</p></div><footer className="ct-dialog-footer ph-form-actions"><button className="ct-button" disabled={busy} onClick={() => setDeleteDocument(null)}>{t("Batal")}</button><button className="ct-button ct-danger" disabled={busy} onClick={() => void removeDocument()}>{busy ? t("Menghapus…") : t("Hapus dokumen")}</button></footer></Dialog>}

    {uploadCategory && <Dialog title={t("Upload document")} onClose={() => setUploadCategory(null)} busy={busy}><form onSubmit={submit} className="ct-upload-workflow">
      <div className="ct-dialog-body ct-upload-form"><div className="ct-upload-context"><Building2 size={18} /><span>{selectedCompany?.name}</span></div>
        <section className="ph-section ct-workflow-section"><h3>{t("Pemilik dokumen")}</h3><label className="ct-field">{t("Kategori dokumen")}<select aria-label={t("Kategori dokumen")} disabled={busy} value={uploadCategory} onChange={event => { setUploadCategory(event.target.value as Category); setForm(current => ({ ...current, employee: '', type: '' })); }}>{(['hr', 'employee'] as const).map(category => <option key={category} value={category}>{categoryName(category)}</option>)}</select></label>
        <div className="ct-employee-picker"><label className="ct-field">{t("Cari karyawan")}<input placeholder={t("Nama atau ID karyawan")} value={employeeSearch} disabled={busy} onChange={event => setEmployeeSearch(event.target.value)} /></label>
          {employeesError ? <Feedback error title={t("Daftar karyawan gagal dimuat")} retry={() => setEmployeeAttempt(value => value + 1)} /> : <label className="ct-field">{t("Karyawan *")}<select aria-label={t("Karyawan *")} required value={form.employee} disabled={busy || employeesLoading} onChange={event => setForm(current => ({ ...current, employee: event.target.value }))}><option value="">{employeesLoading ? t("Memuat karyawan…") : t("Pilih karyawan")}</option>{employees.filter(employee => String(employee.id) === form.employee || `${employee.name} ${employee.employee_id}`.toLowerCase().includes(employeeSearch.trim().toLowerCase())).map(employee => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_id}</option>)}</select></label>}
        </div>
        </section><section className="ph-section ct-workflow-section"><h3>{t("File dan keterangan")}</h3><div className="ct-form-grid ph-form-grid"><label className="ct-field">{t("Jenis dokumen *")}<select aria-label={t("Jenis dokumen *")} required disabled={busy} value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}><option value="">{t("Pilih jenis dokumen")}</option>{(uploadCategory === 'hr' ? hrTypes : employeeTypes).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label><label className="ct-field">{t("Nama dokumen *")}<input required value={form.name} disabled={busy} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder={t("Contoh: Kontrak kerja 2026")} /></label></div>
        <label className="ct-file-picker"><Upload size={22} /><strong>{t("Pilih file dokumen *")}</strong><span>{t("PDF, JPG, PNG, DOC, atau DOCX")}</span><input type="file" required disabled={busy} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={event => setForm(current => ({ ...current, file: event.target.files?.[0] || null }))} /></label>
        <label className="ct-field">{t("Catatan")} <span className="ct-optional">{t("Opsional")}</span><textarea rows={3} disabled={busy} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label></section>
      </div><footer className="ct-dialog-footer ph-form-actions"><button type="button" className="ct-button" disabled={busy} onClick={() => setUploadCategory(null)}>{t("Batal")}</button><button type="submit" className="ct-button ct-primary" disabled={busy || employeesLoading || employeesError || !form.employee}>{busy ? t("Mengunggah…") : t("Upload document")}</button></footer>
    </form></Dialog>}
  </div>;
}
