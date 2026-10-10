import { payrollCurrency, payrollEnumLabel, payrollNumber } from '@/components/payroll/localization';
import { t, useLocale, intlLocale } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import '@/pages/leave/domain-workflows.css';
import './allowances.css';
import { useState, useEffect, useCallback, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { Plus, History, Lock } from 'lucide-react';
import { allowanceService, ALLOWANCE_TYPES, MONTHLY_TYPES } from '../../services/allowance.service';
import type { Allowance, AllowanceListQuery, AllowanceType, PaginatedResponse } from '../../services/allowance.service';
import { companyService } from '../../services/company.service';
import { employeeService } from '../../services/employee.service';
import { CompensationWorkspace, CompensationStatus, CompensationEmpty, CompensationDialog, CompensationEmployeeSelect } from '@/components/compensation/CompensationWorkspace';
import { collectPages } from '@/services/master-data';

type Tab = 'contract' | 'monthly';
type MonthlyView = 'period' | 'review';
interface Option { id: number; name: string }
interface EmployeeOption { id: number; name: string; employee_id: string }

const PAGE_SIZE = 20;
const MANAGE_ROLES = ['Super Admin', 'HR Manager', 'HR Staff'];
const APPROVE_ROLES = ['Super Admin', 'HR Manager', 'Finance Manager'];
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/** All companies use the 21st-to-20th cutoff: after the 20th the next payroll period is open. */
function currentPayrollPeriod(): string {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date()).split('-').map(Number);
  const next = day > 20 ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year, month - 1, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}
const periodLabel = (period: string) => PERIOD.test(period)
  ? new Intl.DateTimeFormat(intlLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${period}-01T00:00:00Z`)) : period;
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString(intlLocale(), { timeZone: 'UTC' }) : '';
/** Payroll period whose 21st-to-20th window starts on this date (21st -> next month). */
const periodStartingAt = (value?: string | null) => {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, day > 20 ? month : month - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};
const errorText = (error: unknown, fallback: string) => {
  if (!isAxiosError(error)) return error instanceof Error && error.message ? error.message : t(fallback);
  const data = error.response?.data;
  const fields = data?.error?.errors as { message?: string }[] | undefined;
  return fields?.[0]?.message || data?.error?.message || data?.message || t(fallback);
};
/** Blank stays null (not entered); "0" is an explicit final zero. A plain decimal (dot or comma) keeps its exact value. */
const parseAmount = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return undefined;
  return Number(trimmed.replace(',', '.'));
};
/** Bulk endpoints answer 200 with per-row failures; surface them as an error, never as success. */
const ensureNoFailures = async (pending: Promise<{ failed: number; errors: string[] }>) => {
  const outcome = await pending;
  if (outcome.failed) throw new Error(outcome.errors.join('; ') || t('Aksi gagal diproses'));
  return outcome;
};
const amountLabel = (row: Allowance) => row.amount == null || row.amount === ''
  ? <span className="al-blank">{t('Belum diisi')}</span>
  : Number(row.amount) === 0 ? <><strong>{payrollCurrency(0)}</strong><small>{t('Nol final')}</small></> : <strong>{payrollCurrency(row.amount)}</strong>;
const isApproved = (row: Allowance) => row.status === 'approved' || row.status === 'active';
const paymentLabel = (row: Allowance) => row.payment_state === 'paid' ? t('Dibayar') : row.payment_state === 'reserved' ? t('Masuk draft payroll') : '';

export function AllowancesPage() {
  useLocale();
  const user = useAuthStore(state => state.user);
  const canManage = user?.roles.some(role => MANAGE_ROLES.includes(role)) ?? false;
  const canApprove = user?.roles.some(role => APPROVE_ROLES.includes(role)) ?? false;
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'monthly' ? 'monthly' : 'contract';
  const view: MonthlyView = params.get('view') === 'review' ? 'review' : 'period';
  const period = PERIOD.test(params.get('period') ?? '') ? params.get('period')! : currentPayrollPeriod();
  const updateParams = (changes: Record<string, string | null>) => setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key); else next.set(key, value);
    }
    return next;
  }, { replace: true });

  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResponse<Allowance> | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [companiesFailed, setCompaniesFailed] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const request = useRef(0);

  // A failed company list is shown as a failure with retry, never as an empty choice.
  const loadCompanies = useCallback(() => {
    setCompaniesFailed(false);
    collectPages((page, limit) => companyService.getAll({ page, limit }))
      .then(rows => setCompanies(rows.map(row => ({ id: row.id, name: row.name }))))
      .catch(() => setCompaniesFailed(true));
  }, []);
  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // Any scope change starts a fresh request; older responses are discarded.
  useEffect(() => { setPage(1); setSelected([]); }, [tab, view, period, company, status, type, search]);
  // Status values differ per lifecycle; never carry one tab's filter into another.
  useEffect(() => { setStatus('all'); }, [tab, view]);

  const lifecycle = tab === 'contract' ? 'contract' : view === 'review' ? 'review' : 'monthly';
  useEffect(() => {
    const id = ++request.current;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    setResult(null);
    const query: AllowanceListQuery = { page, limit: PAGE_SIZE, lifecycle, search: search.trim() || undefined,
      company_id: company === 'all' ? undefined : Number(company), status: status === 'all' ? undefined : status,
      type: type === 'all' ? undefined : type, payroll_period: lifecycle === 'monthly' ? period : undefined };
    allowanceService.list(query, controller.signal).then(response => {
      if (id === request.current) setResult(response);
    }).catch(() => {
      if (id === request.current && !controller.signal.aborted) setLoadError(true);
    }).finally(() => {
      if (id === request.current) setLoading(false);
    });
    if (tab === 'monthly') {
      allowanceService.list({ lifecycle: 'review', limit: 1, company_id: company === 'all' ? undefined : Number(company) }, controller.signal)
        .then(response => { if (id === request.current) setReviewCount(response.pagination.total); })
        .catch(() => { if (id === request.current) setReviewCount(null); });
    }
    return () => controller.abort();
  }, [lifecycle, tab, page, search, company, status, type, period, revision]);

  const rows = result?.data ?? [];
  const reload = () => { setSelected([]); setRevision(value => value + 1); };
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(t(success));
      setDialog(null);
      reload();
    } catch (error) {
      toast.error(errorText(error, 'Aksi gagal diproses'), { id: 'api-error', toasterId: dialog ? 'compensation-dialog' : undefined });
    } finally {
      setBusy(false);
    }
  };
  const runBulk = async (action: () => Promise<{ failed: number; errors: string[] }>, success: string) => {
    setBusy(true);
    try {
      const outcome = await action();
      if (outcome.failed) toast.error(t('{value0} baris gagal: {value1}', { value0: payrollNumber(outcome.failed), value1: outcome.errors.slice(0, 2).join('; ') }));
      else toast.success(t(success));
      reload();
    } catch (error) {
      toast.error(errorText(error, 'Aksi gagal diproses'));
    } finally {
      setBusy(false);
    }
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next: Tab = event.key === 'Home' ? 'contract' : event.key === 'End' ? 'monthly' : tab === 'contract' ? 'monthly' : 'contract';
    updateParams({ tab: next, view: null });
    document.getElementById(`allowance-tab-${next}`)?.focus();
  };
  const summary = result?.summary ?? [];
  const countOf = (state: string) => summary.find(row => row.status === state)?.count ?? 0;
  const approvedAmount = Number(summary.find(row => row.status === 'approved')?.amount ?? 0);
  const total = result?.pagination.total ?? 0;
  const selectable = rows.filter(row => row.status === 'draft' || row.status === 'pending');
  const toggle = (id: number) => setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);

  const metrics = tab === 'contract'
    ? [
      { label: t('Tunjangan OL'), value: payrollNumber(total), note: t('Sesuai filter yang dipilih') },
      { label: t('Berlaku di halaman ini'), value: payrollNumber(rows.filter(isApproved).length), note: t('Disetujui dan berulang setiap periode') },
      { label: t('Menunggu persetujuan'), value: payrollNumber(rows.filter(row => row.status === 'pending').length), note: t('Pada halaman ini') },
    ]
    : view === 'review'
      ? [{ label: t('Perlu ditinjau'), value: payrollNumber(total), note: t('Tunjangan lama tanpa klasifikasi') }]
      : [
        { label: t('Draft'), value: payrollNumber(countOf('draft')), note: t('Belum diajukan') },
        { label: t('Menunggu persetujuan'), value: payrollNumber(countOf('pending')), note: t('Diajukan HR') },
        { label: t('Disetujui'), value: total ? payrollCurrency(approvedAmount) : '—', note: total ? t('Nominal disetujui, belum tentu sudah dibayar') : t('Belum ada pengajuan periode ini') },
      ];

  const statusOptions = tab === 'contract'
    ? ['pending', 'approved', 'rejected', 'cancelled']
    : view === 'review' ? ['active', 'approved', 'pending', 'inactive'] : ['draft', 'pending', 'approved', 'rejected', 'cancelled'];

  return <>
    <CompensationWorkspace
      title={t('Allowances')}
      description={t('Tunjangan kontrak / OL berlaku berulang sampai diubah; insentif bulanan dicatat per periode payroll dan tidak terbawa ke bulan berikutnya.')}
      actions={canManage && (tab === 'contract'
        ? <button className="cp-button cp-primary" onClick={() => setDialog({ kind: 'contract' })}><Plus size={17} />{t('Tambah tunjangan OL')}</button>
        : view === 'period' && <button className="cp-button cp-primary" onClick={() => setDialog({ kind: 'monthly' })}><Plus size={17} />{t('Tambah insentif')}</button>)}
      tabs={<div className="al-tabs" role="tablist" aria-label={t('Jenis tunjangan')}>
        {(['contract', 'monthly'] as Tab[]).map(value => <button key={value} id={`allowance-tab-${value}`} role="tab" type="button"
          aria-selected={tab === value} aria-controls="allowance-panel" tabIndex={tab === value ? 0 : -1} onKeyDown={onTabKey}
          onClick={() => updateParams({ tab: value, view: null })}>
          {value === 'contract' ? t('Tunjangan Kontrak / OL') : t('Insentif Bulanan')}
        </button>)}
      </div>}
      filters={<>
        {tab === 'monthly' && <div className="al-view" role="group" aria-label={t('Tampilan insentif')}>
          <button type="button" aria-pressed={view === 'period'} onClick={() => updateParams({ view: null })}>{t('Periode payroll')}</button>
          <button type="button" aria-pressed={view === 'review'} onClick={() => updateParams({ view: 'review' })}>
            {t('Perlu ditinjau')}{reviewCount ? <span className="al-badge">{payrollNumber(reviewCount)}</span> : null}
          </button>
        </div>}
        {tab === 'monthly' && view === 'period' && <label className="cp-field">{t('Periode payroll')}
          <input type="month" aria-label={t('Periode payroll')} value={period} onChange={event => PERIOD.test(event.target.value) && updateParams({ period: event.target.value })} />
        </label>}
        <label className="cp-field">{t('company')}<select aria-label={t('Filter company')} value={company} onChange={event => setCompany(event.target.value)}>
          <option value="all">{t('Semua company')}</option>{companies.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        {companiesFailed && <p className="cp-filter-error" role="alert">{t('Daftar company gagal dimuat.')} <button type="button" onClick={loadCompanies}>{t('Muat ulang company')}</button></p>}
        <label className="cp-field">{t('status')}<select aria-label={t('Filter status')} value={statusOptions.includes(status) ? status : 'all'} onChange={event => setStatus(event.target.value)}>
          <option value="all">{t('Semua status')}</option>{statusOptions.map(value => <option key={value} value={value}>{payrollEnumLabel(value)}</option>)}</select></label>
        <label className="cp-field">{t('tipe')}<select aria-label={t('Filter tipe')} value={type} onChange={event => setType(event.target.value)}>
          <option value="all">{t('Semua tipe')}</option>{ALLOWANCE_TYPES.map(value => <option key={value} value={value}>{payrollEnumLabel(value)}</option>)}</select></label>
        <button className="cp-reset" onClick={() => { setSearch(''); setCompany('all'); setStatus('all'); setType('all'); }}>{t('Reset filter')}</button>
      </>}
      metrics={metrics}
      search={search} onSearch={setSearch} searchLabel={t('Cari karyawan atau tunjangan…')}
      loading={loading} error={loadError} onRetry={reload}
      page={page} totalPages={result?.pagination.totalPages ?? 1} onPage={setPage}
      count={t('{value0} dari {value1} baris', { value0: payrollNumber(rows.length), value1: payrollNumber(total) })}>
      <div id="allowance-panel" role="tabpanel" aria-labelledby={`allowance-tab-${tab}`} className="al-panel">
        {tab === 'monthly' && view === 'period' && <p className="al-note">{t('Periode {value0}: periode baru selalu dimulai kosong. Nominal dan persetujuan bulan sebelumnya tidak dibawa; riwayat tetap tersedia lewat pilihan periode dan tombol riwayat.', { value0: periodLabel(period) })}</p>}
        {tab === 'monthly' && view === 'review' && <p className="al-note">{t('Tunjangan lama di bawah ini belum diklasifikasikan. Pembayarannya tetap seperti sebelumnya sampai HR menandainya sebagai OL atau mengakhirinya. Tidak ada klasifikasi otomatis.')}</p>}
        {tab === 'contract' && <p className="al-note"><Lock size={15} aria-hidden="true" />{t('Tunjangan yang sudah disetujui atau dipakai payroll tidak diedit; buat versi baru yang berlaku mulai periode payroll yang belum dibuat.')}</p>}
        {tab === 'contract' && <p className="al-note" data-profile-guidance>{t('Nilai tunjangan yang hanya tercatat di profil karyawan tidak dibayar payroll dan tidak disalin otomatis. Tinjau lalu masukkan sebagai tunjangan OL bila memang bagian dari kontrak.')}</p>}
        {tab === 'monthly' && view === 'period' && (canManage || canApprove) && selectable.length > 0 && <div className="al-bulk" role="group" aria-label={t('Aksi terpilih')}>
          <span>{t('{value0} dipilih', { value0: payrollNumber(selected.length) })}</span>
          {canManage && <button className="cp-button" disabled={busy || !selected.length} onClick={() => runBulk(() => allowanceService.submitMonthly(selected), 'Insentif diajukan')}>{t('Ajukan terpilih')}</button>}
          {canApprove && <button className="cp-button cp-primary" disabled={busy || !selected.length} onClick={() => runBulk(() => allowanceService.approveMany(selected), 'Insentif disetujui')}>{t('Setujui terpilih')}</button>}
        </div>}
        {!rows.length
          ? tab === 'monthly' && view === 'period'
            ? <div className="cp-feedback"><h3>{t('Belum ada insentif untuk {value0}', { value0: periodLabel(period) })}</h3><p>{t('Belum ada pengajuan pada periode ini, jadi belum ada nominal yang dibayar. Tambahkan insentif bila ada.')}</p></div>
            : tab === 'monthly' ? <div className="cp-feedback"><h3>{t('Tidak ada tunjangan yang perlu ditinjau')}</h3></div> : <CompensationEmpty />
          : <table className="cp-table al-table">
            <thead><tr>
              {tab === 'monthly' && view === 'period' && <th className="al-check al-col-check"><span className="sr-only">{t('Pilih')}</span></th>}
              <th className="al-col-employee">{t('Karyawan')}</th><th className="al-col-item">{tab === 'monthly' && view === 'period' ? t('Insentif') : t('Tunjangan')}</th>
              <th className="al-col-period">{tab === 'monthly' && view === 'period' ? t('Periode kinerja') : t('Berlaku')}</th>
              <th className="al-col-amount">{t('Nominal')}</th><th className="al-col-status">{t('Status')}</th>
              <th className="al-col-actions"><span className="sr-only">{t('Aksi')}</span></th>
            </tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} data-allowance-row={row.id}>
              {tab === 'monthly' && view === 'period' && <td className="al-check">{(row.status === 'draft' || row.status === 'pending') &&
                <input type="checkbox" aria-label={t('Pilih {value0}', { value0: row.employee?.name ?? row.name })} checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />}</td>}
              <td data-label={t('Karyawan')}><strong>{row.employee?.name ?? '—'}</strong><small>{row.employee?.employee_id ?? ''}</small></td>
              <td data-label={t('Tunjangan')}><strong>{row.name}</strong><small>{payrollEnumLabel(row.type)}{row.component_key ? ` · ${row.component_key}` : ''}</small>
                {row.reference && <small>{t('Ref')}: {row.reference}</small>}</td>
              <td data-label={t('Berlaku')}>{tab === 'monthly' && view === 'period'
                ? <small>{row.performance_start || row.performance_end ? `${dateLabel(row.performance_start)} – ${dateLabel(row.performance_end)}` : t('Tidak diisi')}</small>
                : <small>{row.effective_date ? dateLabel(row.effective_date) : t('Sejak awal')} – {row.end_date ? dateLabel(row.end_date) : t('seterusnya')}</small>}</td>
              <td data-label={t('Nominal')} className="cp-money">{amountLabel(row)}</td>
              <td data-label={t('Status')}><CompensationStatus status={row.status} />{paymentLabel(row) && <small className="al-payment">{paymentLabel(row)}</small>}
                {row.status === 'rejected' || row.status === 'cancelled' ? row.rejection_reason && <small>{row.rejection_reason}</small> : null}</td>
              {/* The cell stays a table cell; only its inner wrapper is flex. */}
              <td className="cp-row-actions al-actions-cell">
                <div className="al-actions">
                  <RowActions row={row} tab={tab} view={view} canManage={canManage} canApprove={canApprove} busy={busy}
                    onDialog={setDialog} onRun={run} />
                </div>
              </td>
            </tr>)}</tbody>
          </table>}
      </div>
    </CompensationWorkspace>
    {dialog && <AllowanceDialog state={dialog} period={period} companies={companies} companiesFailed={companiesFailed} onReloadCompanies={loadCompanies}
      busy={busy} onClose={() => !busy && setDialog(null)} onRun={run} />}
  </>;
}

type DialogState =
  | { kind: 'contract'; row?: Allowance }
  | { kind: 'version'; row: Allowance }
  | { kind: 'monthly'; row?: Allowance }
  | { kind: 'reason'; row: Allowance; action: 'reject' | 'cancel' | 'classify' | 'end' }
  | { kind: 'history'; row: Allowance };

function RowActions({ row, tab, view, canManage, canApprove, busy, onDialog, onRun }: {
  row: Allowance; tab: Tab; view: MonthlyView; canManage: boolean; canApprove: boolean; busy: boolean;
  onDialog: (state: DialogState) => void; onRun: (action: () => Promise<unknown>, success: string) => void;
}) {
  useLocale();
  const used = row.payment_state === 'reserved' || row.payment_state === 'paid';
  const name = row.employee?.name ?? row.name;
  const buttons: { label: string; onClick: () => void; primary?: boolean; danger?: boolean }[] = [];
  if (tab === 'contract') {
    if (canManage && (row.status === 'pending' || row.status === 'rejected') && !used) {
      buttons.push({ label: t('Edit'), onClick: () => onDialog({ kind: 'contract', row }) });
      buttons.push({ label: t('Batalkan entri'), danger: true, onClick: () => onDialog({ kind: 'reason', row, action: 'cancel' }) });
    }
    if (canApprove && row.status === 'pending') {
      buttons.push({ label: t('Setujui'), primary: true, onClick: () => onRun(() => allowanceService.approve(row.id), 'Tunjangan disetujui') });
      buttons.push({ label: t('Tolak'), danger: true, onClick: () => onDialog({ kind: 'reason', row, action: 'reject' }) });
    }
    if (canManage && isApproved(row)) buttons.push({ label: t('Versi baru'), onClick: () => onDialog({ kind: 'version', row }) });
    if (canApprove && isApproved(row)) buttons.push({ label: t('Akhiri tunjangan'), onClick: () => onDialog({ kind: 'reason', row, action: 'end' }) });
  } else if (view === 'review') {
    if (canManage && row.status !== 'paid' && row.status !== 'cancelled') buttons.push({ label: t('Tandai sebagai OL'), onClick: () => onDialog({ kind: 'reason', row, action: 'classify' }) });
    if (canApprove && isApproved(row)) buttons.push({ label: t('Akhiri tunjangan'), onClick: () => onDialog({ kind: 'reason', row, action: 'end' }) });
  } else {
    if (canManage && (row.status === 'draft' || row.status === 'rejected') && !used) buttons.push({ label: t('Edit'), onClick: () => onDialog({ kind: 'monthly', row }) });
    if (canManage && row.status === 'draft' && row.amount != null && row.amount !== '') {
      buttons.push({ label: t('Ajukan'), primary: true, onClick: () => onRun(() => ensureNoFailures(allowanceService.submitMonthly([row.id])), 'Insentif diajukan') });
    }
    if (canApprove && row.status === 'pending') {
      buttons.push({ label: t('Setujui'), primary: true, onClick: () => onRun(() => allowanceService.approve(row.id), 'Insentif disetujui') });
      buttons.push({ label: t('Tolak'), danger: true, onClick: () => onDialog({ kind: 'reason', row, action: 'reject' }) });
    }
    const cancellable = !used && (['draft', 'pending', 'rejected'].includes(row.status) ? canManage : row.status === 'approved' && canApprove);
    if (cancellable) buttons.push({ label: t('Batalkan entri'), danger: true, onClick: () => onDialog({ kind: 'reason', row, action: 'cancel' }) });
  }
  return <>
    <button className="cp-icon-button" aria-label={t('Riwayat {value0}', { value0: name })} title={t('Riwayat')} onClick={() => onDialog({ kind: 'history', row })}><History size={16} /></button>
    {buttons.map(button => <button key={button.label} className={`cp-button al-small${button.primary ? ' cp-primary' : ''}${button.danger ? ' al-danger' : ''}`}
      disabled={busy} aria-label={`${button.label} · ${name}`} onClick={button.onClick}>{button.label}</button>)}
  </>;
}

function AllowanceDialog({ state, period, companies, companiesFailed, onReloadCompanies, busy, onClose, onRun }: {
  state: DialogState; period: string; companies: Option[]; companiesFailed: boolean; onReloadCompanies: () => void; busy: boolean; onClose: () => void;
  onRun: (action: () => Promise<unknown>, success: string) => void;
}) {
  useLocale();
  if (state.kind === 'history') return <HistoryDialog row={state.row} onClose={onClose} />;
  if (state.kind === 'reason') return <ReasonDialog state={state} period={period} busy={busy} onClose={onClose} onRun={onRun} />;
  if (state.kind === 'version') return <VersionDialog row={state.row} busy={busy} onClose={onClose} onRun={onRun} />;
  return <EntryDialog state={state} period={period} companies={companies} companiesFailed={companiesFailed} onReloadCompanies={onReloadCompanies}
    busy={busy} onClose={onClose} onRun={onRun} />;
}

function EntryDialog({ state, period, companies, companiesFailed, onReloadCompanies, busy, onClose, onRun }: {
  state: { kind: 'contract' | 'monthly'; row?: Allowance }; period: string; companies: Option[]; companiesFailed: boolean;
  onReloadCompanies: () => void; busy: boolean; onClose: () => void; onRun: (action: () => Promise<unknown>, success: string) => void;
}) {
  useLocale();
  const monthly = state.kind === 'monthly';
  const row = state.row;
  const typeOptions: readonly AllowanceType[] = monthly ? MONTHLY_TYPES : ALLOWANCE_TYPES;
  const [companyId, setCompanyId] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeesFailed, setEmployeesFailed] = useState(false);
  // Saved boundaries; an edit only sends a period the user actually changed.
  const initialEffective = periodStartingAt(row?.effective_date) || period;
  const initialEnd = row?.end_date ? row.end_date.slice(0, 7) : '';
  const [form, setForm] = useState({
    employee_id: row?.employee_id ? String(row.employee_id) : '',
    name: row?.name ?? '',
    type: (row?.type ?? (monthly ? 'bonus' : 'transport')) as AllowanceType,
    amount: row?.amount == null || row.amount === '' ? '' : String(Number(row.amount)),
    component_key: '',
    effective_period: initialEffective,
    end_period: initialEnd,
    performance_start: row?.performance_start?.slice(0, 10) ?? '',
    performance_end: row?.performance_end?.slice(0, 10) ?? '',
    reference: row?.reference ?? '',
    note: monthly ? row?.notes ?? '' : row?.description ?? '',
  });
  const [error, setError] = useState('');
  const employeeRequest = useRef(0);
  const set = (changes: Partial<typeof form>) => setForm(previous => ({ ...previous, ...changes }));

  const loadEmployees = useCallback(() => {
    if (row) return;
    const id = ++employeeRequest.current;
    setLoadingEmployees(true);
    setEmployeesFailed(false);
    collectPages((page, limit) => employeeService.getAll({ page, limit, employment_status: 'all', ...(companyId ? { company_id: Number(companyId) } : {}) }))
      .then(list => { if (id === employeeRequest.current) setEmployees(list.filter(e => e.employment_status === 'active' || e.employment_status === 'resigned')
        .map(e => ({ id: e.id, name: e.name, employee_id: e.employee_id ?? '' }))); })
      // A failed roster is a failure with retry, never an apparently empty roster.
      .catch(() => { if (id === employeeRequest.current) { setEmployees([]); setEmployeesFailed(true); } })
      .finally(() => { if (id === employeeRequest.current) setLoadingEmployees(false); });
  }, [companyId, row]);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = parseAmount(form.amount);
    if (!form.name.trim() || (!row && !form.employee_id)) return setError(t('Lengkapi karyawan dan nama.'));
    if (amount === undefined) return setError(t('Nominal harus angka nol atau lebih.'));
    if (!monthly && amount === null) return setError(t('Tunjangan OL memerlukan nominal.'));
    setError('');
    // New rows omit blank optionals; an edit sends null so a cleared field is really cleared.
    const optional = (value: string) => value.trim() || undefined;
    const cleared = (value: string) => value.trim() || null;
    // Tax/BPJS flags are not offered: payroll does not apply them per allowance yet (server defaults are kept).
    if (monthly) {
      const fields = { name: form.name.trim(), type: form.type, amount };
      onRun(() => row
        ? allowanceService.updateMonthly(row.id, { ...fields, reference: cleared(form.reference), notes: cleared(form.note),
          performance_start: cleared(form.performance_start), performance_end: cleared(form.performance_end) })
        : allowanceService.createMonthly({ ...fields, employee_id: Number(form.employee_id), payroll_period: period, component_key: optional(form.component_key),
          reference: optional(form.reference), notes: optional(form.note), performance_start: optional(form.performance_start), performance_end: optional(form.performance_end) }),
      row ? 'Insentif diperbarui' : 'Insentif disimpan sebagai draft');
    } else {
      if (!PERIOD.test(form.effective_period)) return setError(t('Pilih periode mulai.'));
      if (form.end_period && form.end_period < form.effective_period) return setError(t('Periode akhir harus sama atau setelah periode mulai.'));
      const fields = { name: form.name.trim(), type: form.type, amount: amount! };
      onRun(() => row
        ? allowanceService.updateContract(row.id, { ...fields,
          // Only a deliberately changed boundary is sent; clearing the end period sends null.
          ...(form.effective_period !== initialEffective ? { effective_period: form.effective_period } : {}),
          ...(form.end_period !== initialEnd ? { end_period: form.end_period || null } : {}),
          description: cleared(form.note), reference: cleared(form.reference) })
        : allowanceService.createContract({ ...fields, effective_period: form.effective_period, employee_id: Number(form.employee_id),
          component_key: optional(form.component_key), end_period: optional(form.end_period), description: optional(form.note), reference: optional(form.reference) }),
      row ? 'Tunjangan OL diperbarui' : 'Tunjangan OL diajukan untuk disetujui');
    }
  };

  return <CompensationDialog title={monthly ? (row ? t('Edit insentif') : t('Tambah insentif bulanan')) : (row ? t('Edit tunjangan OL') : t('Tambah tunjangan OL'))}
    subtitle={monthly ? t('Periode payroll {value0}. Disimpan sebagai draft, lalu diajukan dan disetujui.', { value0: periodLabel(period) })
      : t('Berlaku berulang mulai periode payroll yang dipilih setelah disetujui.')} busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="ph-workflow dw-form" noValidate>
      <div className="dw-form-content">
        {error && <p className="cp-form-error" role="alert">{error}</p>}
        <section className="ph-section dw-section"><h3>{t('Penerima')}</h3><div className="dw-fields">
          {row ? <p className="dw-context"><strong>{row.employee?.name}</strong> · {row.employee?.employee_id}</p> : <>
            {companiesFailed && <p className="cp-form-error" role="alert">{t('Daftar company gagal dimuat.')} <button type="button" onClick={onReloadCompanies}>{t('Muat ulang company')}</button></p>}
            {employeesFailed && <p className="cp-form-error" role="alert">{t('Daftar karyawan gagal dimuat.')} <button type="button" onClick={loadEmployees}>{t('Muat ulang karyawan')}</button></p>}
            <div className="ph-form-grid dw-form-grid">
              <label>{t('Company')}<select aria-label={t('Company')} value={companyId} onChange={event => { setCompanyId(event.target.value); set({ employee_id: '' }); }}>
                <option value="">{t('Semua company')}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <div><span className="al-label">{t('Karyawan')}</span><CompensationEmployeeSelect options={employees.map(e => ({ value: e.id, label: e.name, sublabel: e.employee_id }))}
                value={form.employee_id ? Number(form.employee_id) : ''} onChange={value => set({ employee_id: String(value) })} loading={loadingEmployees}
                disabled={employeesFailed} placeholder={t('Pilih karyawan')} searchPlaceholder={t('Cari karyawan')}
                emptyMessage={employeesFailed ? t('Daftar karyawan gagal dimuat.') : t('No employees found')} /></div>
            </div>
          </>}
        </div></section>
        <section className="ph-section dw-section"><h3>{monthly ? t('Insentif') : t('Tunjangan')}</h3><div className="dw-fields"><div className="ph-form-grid dw-form-grid">
          <label>{t('Nama')}<input aria-label={t('Nama')} value={form.name} maxLength={255} onChange={event => set({ name: event.target.value })} required /></label>
          <label>{t('Tipe komponen')}<select aria-label={t('Tipe komponen')} value={form.type} onChange={event => set({ type: event.target.value as AllowanceType })}>
            {typeOptions.map(value => <option key={value} value={value}>{payrollEnumLabel(value)}</option>)}</select></label>
          <label>{t('Nominal (Rp)')}<input aria-label={t('Nominal (Rp)')} inputMode="decimal" value={form.amount} onChange={event => set({ amount: event.target.value })}
            placeholder={monthly ? t('Kosong = belum diisi') : '0'} /></label>
          {!row && <label>{t('Kode skema (opsional)')}<input aria-label={t('Kode skema (opsional)')} value={form.component_key} maxLength={80}
            onChange={event => set({ component_key: event.target.value.toLowerCase() })} placeholder={t('Otomatis dari nama')} /></label>}
          {monthly ? <>
            <label>{t('Awal periode kinerja')}<input type="date" aria-label={t('Awal periode kinerja')} value={form.performance_start} onChange={event => set({ performance_start: event.target.value })} /></label>
            <label>{t('Akhir periode kinerja')}<input type="date" aria-label={t('Akhir periode kinerja')} value={form.performance_end} onChange={event => set({ performance_end: event.target.value })} /></label>
          </> : <>
            <label>{t('Mulai periode payroll')}<input type="month" aria-label={t('Mulai periode payroll')} value={form.effective_period} onChange={event => set({ effective_period: event.target.value })} required /></label>
            <label>{t('Sampai periode payroll (opsional)')}<input type="month" aria-label={t('Sampai periode payroll (opsional)')} value={form.end_period} onChange={event => set({ end_period: event.target.value })} /></label>
          </>}
          <label>{t('Referensi')}<input aria-label={t('Referensi')} value={form.reference} maxLength={250} onChange={event => set({ reference: event.target.value })} /></label>
          <label>{monthly ? t('Catatan') : t('Keterangan')}<input aria-label={monthly ? t('Catatan') : t('Keterangan')} value={form.note} maxLength={2000} onChange={event => set({ note: event.target.value })} /></label>
        </div>
        {monthly && <p className="al-hint">{t('Kosongkan nominal jika belum diketahui; isi 0 hanya bila nilainya memang nol final. Nominal tidak diprorata ulang oleh payroll.')}</p>}
        <p className="al-hint">{t('Perlakuan pajak dan BPJS mengikuti aturan payroll yang berlaku; tidak diatur per tunjangan di sini.')}</p>
        </div></section>
      </div>
      <div className="ph-form-actions dw-actions">
        <button type="button" className="ph-button" disabled={busy} onClick={onClose}>{t('Cancel')}</button>
        <button type="submit" className="ph-button ph-button-primary" disabled={busy}>{busy ? t('Menyimpan…') : t('Simpan')}</button>
      </div>
    </form>
  </CompensationDialog>;
}

function VersionDialog({ row, busy, onClose, onRun }: { row: Allowance; busy: boolean; onClose: () => void; onRun: (action: () => Promise<unknown>, success: string) => void }) {
  useLocale();
  const [effective, setEffective] = useState('');
  const [amount, setAmount] = useState(row.amount == null ? '' : String(Number(row.amount)));
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = parseAmount(amount);
    if (!PERIOD.test(effective)) return setError(t('Pilih periode mulai.'));
    if (value == null) return setError(t('Tunjangan OL memerlukan nominal.'));
    onRun(() => allowanceService.createContractVersion(row.id, { effective_period: effective, amount: value, reference: reference.trim() || undefined }),
      'Versi baru diajukan untuk disetujui');
  };
  return <CompensationDialog title={t('Versi baru tunjangan OL')} subtitle={`${row.employee?.name ?? ''} · ${row.name}`} busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="ph-workflow dw-form" noValidate><div className="dw-form-content">
      {error && <p className="cp-form-error" role="alert">{error}</p>}
      <p className="al-hint">{t('Versi berlaku mulai periode payroll yang belum dibuat. Versi lama berakhir sehari sebelumnya setelah disetujui; periode yang sudah dibayar tidak diubah.')}</p>
      <div className="ph-form-grid dw-form-grid">
        <label>{t('Mulai periode payroll')}<input type="month" aria-label={t('Mulai periode payroll')} value={effective} onChange={event => setEffective(event.target.value)} required /></label>
        <label>{t('Nominal baru (Rp)')}<input aria-label={t('Nominal baru (Rp)')} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label>{t('Referensi')}<input aria-label={t('Referensi')} value={reference} maxLength={250} onChange={event => setReference(event.target.value)} /></label>
      </div>
    </div>
    <div className="ph-form-actions dw-actions">
      <button type="button" className="ph-button" disabled={busy} onClick={onClose}>{t('Cancel')}</button>
      <button type="submit" className="ph-button ph-button-primary" disabled={busy}>{t('Ajukan versi')}</button>
    </div></form>
  </CompensationDialog>;
}

const REASON_COPY = {
  reject: { title: 'Tolak pengajuan', button: 'Tolak', success: 'Pengajuan ditolak' },
  cancel: { title: 'Batalkan entri', button: 'Batalkan entri', success: 'Dibatalkan; riwayat tetap disimpan' },
  classify: { title: 'Tandai sebagai OL', button: 'Tandai sebagai OL', success: 'Ditandai sebagai tunjangan OL' },
  end: { title: 'Akhiri tunjangan', button: 'Akhiri tunjangan', success: 'Tanggal akhir disimpan' },
} as const;

function ReasonDialog({ state, period, busy, onClose, onRun }: {
  state: { row: Allowance; action: 'reject' | 'cancel' | 'classify' | 'end' }; period: string; busy: boolean;
  onClose: () => void; onRun: (action: () => Promise<unknown>, success: string) => void;
}) {
  useLocale();
  const { row, action } = state;
  const copy = REASON_COPY[action];
  const [reason, setReason] = useState('');
  const [lastPeriod, setLastPeriod] = useState(period);
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return setError(t('Alasan wajib diisi.'));
    if (action === 'end' && !PERIOD.test(lastPeriod)) return setError(t('Pilih periode terakhir.'));
    const call = action === 'reject' ? () => allowanceService.reject(row.id, reason.trim())
      : action === 'cancel' ? () => allowanceService.cancel(row.id, reason.trim())
        : action === 'classify' ? () => allowanceService.classifyAsContract(row.id, reason.trim())
          : () => allowanceService.end(row.id, lastPeriod, reason.trim());
    onRun(call, copy.success);
  };
  return <CompensationDialog title={t(copy.title)} subtitle={`${row.employee?.name ?? ''} · ${row.name}`} busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="ph-workflow dw-form" noValidate><div className="dw-form-content">
      {error && <p className="cp-form-error" role="alert">{error}</p>}
      {action === 'classify' && <p className="al-hint">{t('Nominal, status dan tanggal tidak berubah. Setelah ditandai, perubahan nominal dilakukan lewat versi baru.')}</p>}
      {action === 'end' && <label>{t('Dibayar sampai periode payroll')}<input type="month" aria-label={t('Dibayar sampai periode payroll')} value={lastPeriod} onChange={event => setLastPeriod(event.target.value)} /></label>}
      <label>{t('Alasan')}<textarea aria-label={t('Alasan')} rows={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
    </div>
    <div className="ph-form-actions dw-actions">
      <button type="button" className="ph-button" disabled={busy} onClick={onClose}>{t('Cancel')}</button>
      <button type="submit" className="ph-button ph-button-primary" disabled={busy}>{t(copy.button)}</button>
    </div></form>
  </CompensationDialog>;
}

function HistoryDialog({ row, onClose }: { row: Allowance; onClose: () => void }) {
  useLocale();
  const [rows, setRows] = useState<Allowance[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    allowanceService.history(row.id).then(result => { if (current) setRows(result.rows); }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [row.id]);
  return <CompensationDialog title={t('Riwayat')} subtitle={`${row.employee?.name ?? ''} · ${row.name}`} onClose={onClose}>
    <div className="dw-detail al-history">
      {failed ? <p role="alert">{t('Riwayat belum dapat dimuat.')}</p> : !rows ? <p role="status">{t('Memuat data…')}</p> : <table className="cp-table">
        <thead><tr><th>{t('Periode')}</th><th>{t('Nominal')}</th><th>{t('Status')}</th><th>{t('Pemakaian payroll')}</th></tr></thead>
        <tbody>{rows.map(item => <tr key={item.id}>
          <td data-label={t('Periode')}>{item.payroll_period ? periodLabel(item.payroll_period)
            : `${item.effective_date ? dateLabel(item.effective_date) : t('Sejak awal')} – ${item.end_date ? dateLabel(item.end_date) : t('seterusnya')}`}</td>
          <td data-label={t('Nominal')}>{amountLabel(item)}</td>
          <td data-label={t('Status')}><CompensationStatus status={item.status} /></td>
          <td data-label={t('Pemakaian payroll')}>{item.payrollLinks?.length ? item.payrollLinks.map(link => <small key={link.id}>
            {link.period} · {link.payroll_number ?? ''} · {link.released_at ? t('Dilepas') : link.paid_at ? t('Dibayar') : t('Masuk draft payroll')}</small>)
            : <small>{t('Belum dipakai')}</small>}</td>
        </tr>)}</tbody>
      </table>}
    </div>
  </CompensationDialog>;
}
