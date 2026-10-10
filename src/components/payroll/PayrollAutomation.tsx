import { payrollNumber } from '@/components/payroll/localization';
import { payrollCalculationCurrency } from '@/components/payroll/localization';
import { payrollCopy, renderPayrollCopy, PayrollCopyError, type PayrollCopy } from './localization';
import { t, useLocale } from '@/i18n';
import '@/pages/payroll/payroll-workflows.css';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { Button, Input, Select } from '@/components/ui';
import {
  payrollService, type PayrollAutomation as AutomationRecord, type PayrollAutomationInput,
  type PayrollPreparationPreview, type GeneratePayrollResponse,
  type PayrollResultEmployee,
} from '@/services/payroll.service';

const treatmentSchema = z.object({
  tax_allowance_mode: z.enum(['gross_up', 'fixed_position', 'none']),
  bpjs_paid_by_company: z.boolean(),
});
const rulesSchema = z.object({
  reason: z.string().trim().min(1, 'Alasan aturan wajib diisi.').max(1000, 'Alasan aturan maksimal 1000 karakter.'),
  work_days_per_week: z.union([z.literal(5), z.literal(6)]),
  rounding: z.enum(['legacy', 'final_cent', 'final_cash']),
  existing: treatmentSchema,
  new_gross: treatmentSchema,
});
// A suggested draft only. Never persisted by loading, previewing or generating.
const draftDefaults: PayrollAutomationInput = {
  reason: '', work_days_per_week: 5, rounding: 'final_cash',
  existing: { tax_allowance_mode: 'gross_up', bpjs_paid_by_company: true },
  new_gross: { tax_allowance_mode: 'none', bpjs_paid_by_company: false },
};
const money = payrollCalculationCurrency;
const taxOptions = [
  { value: 'gross_up', label: 'Gross-up' },
  { value: 'fixed_position', label: 'Tetap dari allowance Position disetujui' },
  { value: 'none', label: 'Tanpa tunjangan' },
];

function message(cause: unknown, fallback: PayrollCopy): PayrollCopy {
  if (cause instanceof PayrollCopyError) return cause.copy;
  if (isAxiosError(cause)) {
    const body = cause.response?.data;
    const details: unknown = body?.error?.errors;
    if (Array.isArray(details)) {
      const messages = details.flatMap(item => typeof item?.message === 'string' ? [item.message] : []);
      if (messages.length) return messages.join('; ');
    }
    return body?.error?.message ?? body?.message ?? cause.message;
  }
  return cause instanceof Error ? cause.message : fallback;
}

function validAmount(value: unknown) {
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));
}

function employeeLabel(row: PayrollResultEmployee) {
  return row.employee_name ? `${row.employee_name}${row.employee_code ? ` (${row.employee_code})` : ''}`
    : row.employee_code || t("Karyawan #{value0}", { value0: row.employee_id });
}

function completePreview(result: PayrollPreparationPreview) {
  const ids = result.results.map(row => row.employee_id);
  const failedIds = result.errorDetails.map(row => row.employee_id);
  return result.generated === 0 && result.previewed === ids.length && result.errors === failedIds.length
    && new Set([...ids, ...failedIds]).size === ids.length + failedIds.length
    && [...ids, ...failedIds].every(id => Number.isSafeInteger(id) && id > 0)
    && result.errorDetails.every(row => typeof row.error === 'string' && row.error.trim())
    && result.results.every(row => [row.basic_salary, row.gross_salary, row.take_home_pay,
      row.total_cost_to_company, row.tax?.pph21].every(validAmount));
}

function EmployeeErrors({ errors }: { errors: PayrollPreparationPreview['errorDetails'] }) {
  useLocale();
  if (!errors.length) return null;
  return <div className="ph-callout pw-errors">
    <p className="font-semibold text-red-800">{t("Karyawan gagal (")}{payrollNumber(Number(errors.length))})</p>
    <ul className="space-y-2 text-sm text-red-800">
      {errors.map((row, index) => <li key={`${row.employee_id}:${index}`}><strong>{employeeLabel(row)}</strong>: {row.error}</li>)}
    </ul>
  </div>;
}

export function PayrollAutomation({ companyId, period, busy, onBegin, onEnd, onMutationChange,
  revision, exceptionsDirty, onGenerated }: {
  companyId: number; period: string; busy: boolean;
  onBegin: () => boolean; onEnd: () => void; onMutationChange: (saving: boolean) => void;
  revision: number; exceptionsDirty: boolean;
  onGenerated?: (companyId: number, period: string) => void | Promise<void>;
}) {
  useLocale();
  const [record, setRecord] = useState<AutomationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState<PayrollCopy>('');
  const [uncertain, setUncertain] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'previewing' | 'generating'>('idle');
  const [error, setError] = useState<PayrollCopy>('');
  const [notice, setNotice] = useState<PayrollCopy>('');
  const [review, setReview] = useState<{ revision: number; result: PayrollPreparationPreview; complete: boolean } | null>(null);
  const [generated, setGenerated] = useState<GeneratePayrollResponse | null>(null);
  const [generationErrors, setGenerationErrors] = useState<PayrollPreparationPreview['errorDetails']>([]);
  const active = useRef(false);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<PayrollAutomationInput>({
    resolver: zodResolver(rulesSchema), defaultValues: draftDefaults,
  });

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    payrollService.getAutomation(companyId, period).then(saved => {
      if (!current) return;
      setRecord(saved); reset(saved.input ?? draftDefaults); setUncertain(false);
    }).catch(cause => {
      if (current) setLoadError(message(cause, payrollCopy('Gagal memuat aturan perusahaan.')));
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [companyId, period, reload, reset]);

  const invalidate = () => { setReview(null); setGenerated(null); setGenerationErrors([]); setError(''); setNotice(''); };
  const reloadRules = () => {
    if (busy) return;
    invalidate(); setLoading(true); setRecord(null); setLoadError(''); setReload(value => value + 1);
  };
  const save = async (input: PayrollAutomationInput | null) => {
    if (loading || !record || !onBegin()) return;
    invalidate(); setPhase('saving'); onMutationChange(true);
    try {
      const saved = await payrollService.saveAutomation(companyId, period, input);
      if (!active.current) return;
      setRecord(saved); reset(saved.input ?? draftDefaults); setUncertain(false);
      setNotice(saved.input ? payrollCopy("Aturan tersimpan mulai {value0}. Preview ulang untuk melihat hasilnya.", { value0: saved.effective_from ?? '-' })
        : payrollCopy("Aturan dinonaktifkan mulai {value0}. Riwayat aturan tetap tersimpan.", { value0: saved.effective_from ?? '-' }));
    } catch (cause) {
      if (active.current) {
        setUncertain(true);
        setError(message(cause, payrollCopy('Simpan aturan gagal.')));
        setNotice(payrollCopy('Simpan belum terkonfirmasi. Coba simpan lagi atau muat ulang aturan sebelum preview.'));
      }
    } finally {
      if (active.current) setPhase('idle');
      onMutationChange(false); onEnd();
    }
  };

  const blocked = busy || loading || !record || uncertain || isDirty || exceptionsDirty;
  const preview = review?.revision === revision ? review : null;
  const ready = preview?.complete && !blocked ? preview.result.results : [];
  const previewAll = async () => {
    if (blocked || !onBegin()) return;
    invalidate(); setPhase('previewing');
    try {
      // Omit employee_ids: the server selects the complete eligible population.
      const result = await payrollService.previewPreparation({ company_id: companyId, period });
      if (!active.current) return;
      if (!Array.isArray(result.results) || !Array.isArray(result.errorDetails)) throw new PayrollCopyError('Respons preview tidak lengkap. Coba preview lagi.');
      const complete = completePreview(result);
      setReview({ revision, result, complete });
      if (!complete) setError(payrollCopy('Respons preview tidak lengkap atau tidak konsisten. Generate diblokir; coba preview lagi.'));
    } catch (cause) {
      if (active.current) setError(message(cause, payrollCopy('Preview gagal. Coba preview lagi.')));
    } finally {
      if (active.current) setPhase('idle');
      onEnd();
    }
  };

  const generate = async () => {
    if (!ready.length || !preview || !onBegin()) return;
    const employeeIds = ready.map(row => row.employee_id);
    setGenerationErrors(preview.result.errorDetails);
    setReview(null); setGenerated(null); setError(''); setNotice('');
    setPhase('generating'); onMutationChange(true);
    try {
      const result = await payrollService.generate({ company_id: companyId, period, employee_ids: employeeIds });
      if (!active.current) return;
      if (!Array.isArray(result.results) || !Array.isArray(result.errorDetails)
        || result.generated !== result.results.length || result.errors !== result.errorDetails.length
        || result.generated + result.errors !== employeeIds.length
        || new Set([...result.results, ...result.errorDetails].map(row => row.employee_id)).size !== employeeIds.length
        || [...result.results, ...result.errorDetails].some(row => !employeeIds.includes(row.employee_id))) {
        throw new PayrollCopyError('Hasil generate belum terkonfirmasi. Muat ulang halaman dan preview ulang sebelum mencoba lagi.');
      }
      setGenerated(result);
      setNotice(payrollCopy('Preview ulang sebelum generate berikutnya. Hasil yang sudah dibuat tidak dikirim ulang dari preview ini.'));
    } catch (cause) {
      if (active.current) {
        setError(message(cause, payrollCopy('Generate gagal.')));
        setNotice(payrollCopy('Hasil generate belum terkonfirmasi. Periksa daftar payroll dan preview ulang sebelum mencoba lagi.'));
      }
    } finally {
      // Even a lost response may have created payroll; refresh before retrying.
      try { await onGenerated?.(companyId, period); }
      catch { if (active.current) setError(payrollCopy('Daftar payroll gagal diperbarui. Muat ulang halaman sebelum melanjutkan.')); }
      if (active.current) setPhase('idle');
      onMutationChange(false); onEnd();
    }
  };

  return <div className="pw-automation">
    <section aria-label={t("Payroll otomatis")} className="ph-section pw-automatic">
      <h3 className="font-semibold text-lg">{t("Payroll otomatis untuk semua karyawan")}</h3>
      <p className="text-sm text-gray-700">{t("Preview memakai data dan aturan tersimpan dari server. Tanpa aturan perusahaan tersimpan, payroll otomatis yang sudah ada tetap berjalan. Input per karyawan bersifat opsional.")}</p>
      {loading && <p role="status">{t("Memuat aturan perusahaan…")}</p>}
      {loadError && <p role="alert" className="text-red-700">{renderPayrollCopy(loadError)}{' '}{t("Preview belum tersedia sampai aturan berhasil dimuat.")}</p>}
      {!loading && record && !uncertain && <p role="status" className="text-sm">{record.input
        ? t("Aturan perusahaan tersimpan, berlaku mulai {value0}.", { value0: record.effective_from ?? '-' })
        : record.effective_from ? t("Aturan perusahaan nonaktif mulai {value0}. Payroll otomatis yang sudah ada tetap berlaku.", { value0: record.effective_from })
          : t("Belum ada aturan perusahaan tersimpan. Saran isian aturan belum diterapkan.")}</p>}
      {(loadError || uncertain) && <Button variant="outline" disabled={busy || loading} onClick={reloadRules}>{t("Muat ulang aturan")}</Button>}
      {isDirty && <p className="text-sm text-amber-800">{t("Perubahan aturan belum disimpan. Simpan atau batalkan perubahan sebelum preview.")}</p>}
      {exceptionsDirty && <p className="text-sm text-amber-800">{t("Pengecualian karyawan belum disimpan. Simpan atau buang isian sebelum preview semua karyawan.")}</p>}
      <div className="ph-actions pw-generate-actions">
        <Button disabled={blocked} onClick={() => void previewAll()}>{t("Preview semua karyawan")}</Button>
        <Button disabled={!ready.length} onClick={() => void generate()}>{t("Generate siap (")}{payrollNumber(Number(ready.length))})</Button>
      </div>
      {phase !== 'idle' && <p role="status">{phase === 'saving' ? t("Menyimpan aturan…") : phase === 'generating' ? t("Membuat payroll…") : t("Memuat preview semua karyawan…")}</p>}
      {error && <p role="alert" className="text-red-700">{renderPayrollCopy(error)}</p>}
      {notice && <p role="status" className="text-sm">{renderPayrollCopy(notice)}</p>}
    </section>

    {preview && <section aria-label={t("Preview semua karyawan")} className="space-y-3">
      <h3 className="font-semibold">{t("Hasil preview dari server")}</h3>
      <p>{payrollNumber(Number(preview.result.previewed))}{' '}{t("karyawan siap ·")} {payrollNumber(Number(preview.result.errors))}{' '}{t("karyawan gagal")}</p>
      {preview.complete && preview.result.results.length > 0 && <dl className="ph-kv pw-preview-totals">
        <div><dt>{t("Total Take Home Pay siap")}</dt><dd className="font-semibold">{money(preview.result.results.reduce((sum, row) => sum + Number(row.take_home_pay), 0))}</dd></div>
        <div><dt>{t("Total biaya perusahaan siap")}</dt><dd className="font-semibold">{money(preview.result.results.reduce((sum, row) => sum + Number(row.total_cost_to_company), 0))}</dd></div>
      </dl>}
      {preview.result.results.length > 0 && <div className="ph-table-scroll pw-preview-table"><table className="w-full text-sm text-left">
        <thead><tr className="border-b"><th className="p-2">{t("Karyawan")}</th><th className="p-2">{t("Gaji pokok dibayar")}</th><th className="p-2">{t("Pajak diterapkan")}</th><th className="p-2">{t("Take Home Pay")}</th><th className="p-2">{t("Biaya perusahaan")}</th></tr></thead>
        <tbody>{preview.result.results.map((row, index) => <tr key={`${row.employee_id}:${index}`} className="border-b">
          <th className="p-2 font-medium">{employeeLabel(row)}</th><td className="p-2">{money(row.basic_salary)}</td>
          <td className="p-2">{money(row.tax?.pph21)}</td><td className="p-2">{money(row.take_home_pay)}</td><td className="p-2">{money(row.total_cost_to_company)}</td>
        </tr>)}</tbody>
      </table></div>}
      <EmployeeErrors errors={preview.result.errorDetails} />
      {preview.result.errors > 0 && <p className="text-sm text-amber-800">{t("Generate hanya membuat payroll untuk")} {payrollNumber(Number(preview.result.results.length))}{' '}{t("karyawan yang berhasil dipreview. Seluruh karyawan gagal ditampilkan di atas dan tidak ikut digenerate.")}</p>}
      {preview.complete && !preview.result.results.length && !preview.result.errors && <p>{t("Tidak ada karyawan yang dapat dipreview untuk perusahaan dan periode ini.")}</p>}
    </section>}

    {generated && <section aria-label={t("Hasil generate payroll")} className="space-y-3">
      <h3 className="font-semibold">{t("Hasil generate dari server")}</h3>
      <p>{payrollNumber(Number(generated.generated))}{' '}{t("payroll berhasil dibuat ·")} {payrollNumber(Number(generated.errors))}{' '}{t("karyawan gagal")}</p>
      <ul className="text-sm space-y-2">{generated.results.map(row => <li key={row.id}>{employeeLabel(row)} · {row.payroll_number}{' '}{t("· THP")} {money(row.take_home_pay ?? row.thp)}{' '}{t("· Biaya perusahaan")} {money(row.total_cost_to_company ?? row.total_cost_company)}</li>)}</ul>
      <EmployeeErrors errors={generated.errorDetails} />
    </section>}
    {generationErrors.length > 0 && <section aria-label={t("Tidak ikut generate")} className="space-y-2">
      <h3 className="font-semibold">{t("Tidak ikut generate karena preview gagal")}</h3><EmployeeErrors errors={generationErrors} />
    </section>}

    <details className="pw-disclosure">
      <summary className="cursor-pointer font-semibold">{t("Aturan perusahaan")}</summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-gray-600">{t("Simpan sekali untuk berlaku mulai")} {period}{' '}{t("dan periode berikutnya. Saran awal belum aktif sampai disimpan. Menonaktifkan aturan mulai periode pilihan mempertahankan riwayat sebelumnya.")}</p>
        <form noValidate onChangeCapture={invalidate} onSubmit={event => {
          event.preventDefault(); invalidate();
          void handleSubmit(input => save(input), () => setError(payrollCopy('Periksa isian aturan perusahaan.')))();
        }} className="space-y-4">
          <fieldset disabled={busy || loading || !record} className="space-y-4 disabled:opacity-70">
            <Input label={t("Alasan aturan perusahaan")} {...register('reason')} error={errors.reason?.message ? t(errors.reason?.message) : undefined} />
            <div className="ph-form-grid">
              <Select label={t("Hari kerja aturan perusahaan")} {...register('work_days_per_week', { setValueAs: Number })} options={[{ value: '5', label: t('5 hari') }, { value: '6', label: t('6 hari') }]} />
              <Select label={t("Pembulatan aturan perusahaan")} {...register('rounding')} options={[{ value: 'legacy', label: t('Legacy (pembulatan lama)') }, { value: 'final_cent', label: t('Final dua desimal') }, { value: 'final_cash', label: t('Bulatkan total akhir (HR)') }]} />
            </div>
            <div className="pw-rule-columns">{(['existing', 'new_gross'] as const).map(group => <fieldset key={group} className="ph-section pw-rule-group">
              <legend className="pw-legend">{group === 'existing' ? t("Existing") : t("New / Gross")}</legend>
              <Select label={t("Tunjangan pajak {value0}", { value0: group === 'existing' ? t('Existing') : t('New / Gross') })} {...register(`${group}.tax_allowance_mode`)} options={taxOptions.map(option => ({ ...option, label: t(option.label) }))} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register(`${group}.bpjs_paid_by_company`)} />{t("BPJS karyawan ditanggung perusahaan —")} {group === 'existing' ? t("Existing") : t("New / Gross")}</label>
            </fieldset>)}</div>
            <p className="text-sm text-gray-600">{t("Mode Tetap mengambil allowance bertipe Position yang telah disetujui, bukan nilai jabatan pada master karyawan. Nominal tersebut dialihkan menjadi tunjangan pajak agar tidak dihitung dua kali. Jika nominal sumber tidak tersedia, server melaporkan kesalahan per karyawan; nol hanya sah jika tercatat secara eksplisit.")}</p>
            <p className="text-sm text-gray-600">{t("Refund, pajak eksternal, dan pengecualian BPJS hanya berlaku pada periode pengecualian; tidak dibawa ke periode berikutnya.")}</p>
            <div className="ph-form-actions pw-editor-actions">
              <Button type="submit">{t("Simpan aturan perusahaan")}</Button>
              <Button type="button" variant="outline" disabled={!isDirty} onClick={() => { reset(record?.input ?? draftDefaults); invalidate(); }}>{t("Batalkan perubahan aturan")}</Button>
              <Button type="button" variant="ghost" disabled={!record?.input} onClick={() => void save(null)}>{t("Nonaktifkan mulai periode ini")}</Button>
            </div>
          </fieldset>
        </form>
      </div>
    </details>
  </div>;
}
