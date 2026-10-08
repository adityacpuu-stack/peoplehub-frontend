import { payrollCalculationCurrency } from '@/components/payroll/localization';
import { payrollCopy, renderPayrollCopy, PayrollCopyError, type PayrollCopy } from './localization';
import { payrollEnumLabel } from '@/components/payroll/localization';
import { t, useLocale } from '@/i18n';
import '@/pages/payroll/payroll-workflows.css';
import '@/pages/payroll/payroll-refresh.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { Button, Input, Modal, Select } from '@/components/ui';
import type { Company } from '@/services/company.service';
import { useAuthStore } from '@/stores/auth.store';
import { canAction } from '@/lib/actions';
import {
  payrollService,
  type Payroll,
  type PayrollCalculationResult,
  type PayrollCalculationSnapshot,
  type PayrollPreparationInput,
  type PayrollPreparationRow,
} from '@/services/payroll.service';
import type { Decimalish } from '@/types';
import { PayrollAutomation } from './PayrollAutomation';

const defaultOption = { value: '', label: 'Ikuti pengaturan payroll' };
const money = payrollCalculationCurrency;
const taxModes = { gross_up: 'Gross-up', fixed: 'Fixed tax allowance', none: 'Tanpa tunjangan' };
const roundingModes = { legacy: 'Legacy (pembulatan lama)', final_cent: 'Final dua desimal', final_cash: 'Bulatkan total akhir (HR)' };
const finalCashHint = 'Bulatkan total akhir (HR) mempertahankan presisi input mentah; total pembayaran akhir dibulatkan ke dua desimal. Sertakan alasan dan referensi perhitungan HR.';
const externalBpjsFields = [
  { name: 'bpjs_kes_employee', label: 'BPJS Kesehatan karyawan (HR)' },
  { name: 'bpjs_jht_employee', label: 'BPJS JHT karyawan (HR)' },
  { name: 'bpjs_jp_employee', label: 'BPJS JP karyawan (HR)' },
  { name: 'bpjs_kes_company', label: 'BPJS Kesehatan perusahaan (HR)' },
  { name: 'bpjs_jht_company', label: 'BPJS JHT perusahaan (HR)' },
  { name: 'bpjs_jp_company', label: 'BPJS JP perusahaan (HR)' },
  { name: 'bpjs_jkk_company', label: 'BPJS JKK perusahaan (HR)' },
  { name: 'bpjs_jkm_company', label: 'BPJS JKM perusahaan (HR)' },
] as const;

function Amount({ label, value }: { label: string; value: Decimalish | null | undefined }) {
  useLocale();
  return <div><dt className="text-sm text-gray-500">{label}</dt><dd className="font-semibold tabular-nums">{money(value)}</dd></div>;
}

export function PayrollPolicyDetail({ snapshot, appliedTax, workDays }: {
  snapshot: PayrollCalculationSnapshot;
  appliedTax: Decimalish | null | undefined;
  workDays?: 5 | 6;
}) {
  useLocale();
  const policy = snapshot.policy;
  return (
    <section aria-label={t("Kebijakan dan pembayaran payroll")} className="ph-section pw-policy">
      <h3 className="pw-section-title">{t("Kebijakan dan pembayaran tersimpan")}</h3>
      <dl className="ph-kv pw-policy-facts">
        {snapshot.automation && <div className="sm:col-span-3"><dt className="text-gray-500">{t("Sumber aturan perusahaan")}</dt><dd>{snapshot.automation.rule === 'existing' ? t("Existing") : t("New / Gross")}{' '}{t("· Berlaku mulai")} {snapshot.automation.effective_from}</dd></div>}
        <div><dt className="text-gray-500">{t("Hari kerja per minggu")}</dt><dd>{policy?.work_days_per_week ?? workDays ?? '-'}</dd></div>
        <div><dt className="text-gray-500">{t("Mode tunjangan pajak")}</dt><dd>{policy?.tax_allowance_mode ? taxModes[policy.tax_allowance_mode] ? t(taxModes[policy.tax_allowance_mode]) : policy.tax_allowance_mode : '-'}</dd></div>
        <div><dt className="text-gray-500">{t("Pembulatan")}</dt><dd>{policy?.rounding ? roundingModes[policy.rounding] ? t(roundingModes[policy.rounding]) : policy.rounding : '-'}</dd></div>
        <div><dt className="text-gray-500">{t("BPJS karyawan ditanggung perusahaan")}</dt><dd>{policy?.bpjs_paid_by_company == null ? '-' : policy.bpjs_paid_by_company ? t("Ya") : t("Tidak")}</dd></div>
        <Amount label={t("Dasar BPJS")} value={snapshot.bpjs_base ?? policy?.bpjs_base} />
        <div><dt className="text-gray-500">{t("Referensi komponen BPJS HR")}</dt><dd className="break-words">{snapshot.input?.external_bpjs?.reference ?? '-'}</dd></div>
        <Amount label={t("Tunjangan pajak")} value={snapshot.tax_allowance} />
        <div><dt className="text-gray-500">{t("Sumber pajak")}</dt><dd>{snapshot.tax_source ? payrollEnumLabel(snapshot.tax_source) : '-'}</dd></div>
        <div><dt className="text-gray-500">{t("Referensi pajak")}</dt><dd className="break-words">{snapshot.tax_reference ?? '-'}</dd></div>
        <Amount label={t("Pajak diterapkan")} value={appliedTax} />
        <Amount label={t("Pajak hasil kalkulasi")} value={snapshot.calculated_pph21} />
      </dl>
      <h4 className="pw-section-title">{t("Pembayaran tersimpan")}</h4>
      <dl className="ph-kv pw-policy-facts">
        <Amount label={t("Pembayaran reguler")} value={snapshot.payments?.regular} />
        <Amount label={t("Pembayaran bonus")} value={snapshot.payments?.bonus} />
        <Amount label={t("Total pembayaran")} value={snapshot.payments?.total} />
        {snapshot.rounding_adjustment != null && snapshot.rounding_adjustment !== 0 && <Amount label={t("Selisih pembulatan")} value={snapshot.rounding_adjustment} />}
        <div><dt className="text-gray-500">{t("Status pembayaran")}</dt><dd>{snapshot.payments?.held == null ? '-' : snapshot.payments.held ? t("Ditahan") : t("Tidak ditahan")}</dd></div>
        <div><dt className="text-gray-500">{t("Alasan penahanan")}</dt><dd className="break-words">{snapshot.input?.payment_hold_reason ?? '-'}</dd></div>
        <div className="sm:col-span-3"><dt className="text-gray-500">{t("Alasan persiapan")}</dt><dd className="break-words">{snapshot.input?.reason ?? '-'}</dd></div>
      </dl>
      <p className="text-xs text-gray-600">{t("Nilai berasal dari server. Nilai mentah (raw) sebelum pembulatan dipakai untuk pemeriksaan; pembayaran mengikuti kebijakan tersimpan. Final dua desimal membulatkan nilai akhir ke 0,01 rupiah.")}</p>
      {policy?.rounding === 'final_cash' && <p className="text-xs text-gray-600">{t(finalCashHint)}</p>}
      <p className="text-xs text-gray-600">{t("Reguler dan bonus adalah rincian total payroll yang disetujui bersama. Rincian ini bukan status pembayaran bonus terpisah.")}</p>
    </section>
  );
}

export function PayrollSavedBPJS({ record }: { record: Payroll }) {
  useLocale();
  const paidByCompany = record.metadata?.calculation?.policy?.bpjs_paid_by_company;
  return <section aria-label={t("Rincian BPJS tersimpan")} className="ph-section pw-saved-bpjs">
    <h3 className="pw-section-title">{t("Rincian BPJS tersimpan")}</h3>
    <p className="text-sm text-gray-600">{t("Porsi karyawan:")} {paidByCompany == null ? '-' : paidByCompany ? t("Ditanggung perusahaan") : t("Ditanggung karyawan")}{t(". Nominal berikut adalah komponen tersimpan, bukan perhitungan ulang potongan.")}</p>
    <div className="pw-bpjs-columns"><section><h4>{t("Porsi karyawan")}</h4><dl className="ph-kv">
      <Amount label={t("BPJS Kesehatan karyawan")} value={record.bpjs_kes_employee} />
      <Amount label={t("BPJS JHT karyawan")} value={record.bpjs_jht_employee} />
      <Amount label={t("BPJS JP karyawan")} value={record.bpjs_jp_employee} />
      <Amount label={t("Total BPJS karyawan")} value={record.bpjs_employee_total} />
    </dl></section><section><h4>{t("Porsi perusahaan")}</h4><dl className="ph-kv">
      <Amount label={t("BPJS Kesehatan perusahaan")} value={record.bpjs_kes_company} />
      <Amount label={t("BPJS JHT perusahaan")} value={record.bpjs_jht_company} />
      <Amount label={t("BPJS JP perusahaan")} value={record.bpjs_jp_company} />
      <Amount label={t("BPJS JKK perusahaan")} value={record.bpjs_jkk_company} />
      <Amount label={t("BPJS JKM perusahaan")} value={record.bpjs_jkm_company} />
      <Amount label={t("Total BPJS perusahaan")} value={record.bpjs_company_total} />
    </dl></section></div>
  </section>;
}

const optionalAmount = z.string().refine(value => value.trim() === '' || Number.isFinite(Number(value)), 'Masukkan angka yang valid.');
const formSchema = z.object({
  reason: z.string().trim().min(1, 'Alasan persiapan wajib diisi.'),
  work_days_per_week: z.enum(['', '5', '6']),
  tax_allowance_mode: z.enum(['', 'gross_up', 'fixed', 'none']),
  fixed_tax_allowance: optionalAmount,
  bpjs_paid_by_company: z.enum(['', 'true', 'false']),
  bpjs_base: optionalAmount,
  external_bpjs_enabled: z.boolean(),
  external_bpjs_reference: z.string(),
  bpjs_kes_employee: optionalAmount,
  bpjs_jht_employee: optionalAmount,
  bpjs_jp_employee: optionalAmount,
  bpjs_kes_company: optionalAmount,
  bpjs_jht_company: optionalAmount,
  bpjs_jp_company: optionalAmount,
  bpjs_jkk_company: optionalAmount,
  bpjs_jkm_company: optionalAmount,
  rounding: z.enum(['', 'legacy', 'final_cent', 'final_cash']),
  paid_basic_salary: optionalAmount,
  external_tax_enabled: z.boolean(),
  external_tax_amount: optionalAmount,
  external_tax_reference: z.string(),
  payment_hold_reason: z.string(),
  bonus_enabled: z.boolean(),
  bonus_amount: optionalAmount,
  bonus_tax_enabled: z.boolean(),
  bonus_tax_amount: optionalAmount,
  bonus_tax_reference: z.string(),
}).superRefine((value, ctx) => {
  const issue = (path: keyof typeof value, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (value.bpjs_base.trim() && Number(value.bpjs_base) <= 0) issue('bpjs_base', 'Dasar BPJS harus lebih dari 0.');
  if (value.external_bpjs_enabled) {
    if (!value.external_bpjs_reference.trim()) issue('external_bpjs_reference', 'Referensi komponen BPJS wajib diisi.');
    for (const field of externalBpjsFields) {
      if (!value[field.name].trim() || Number(value[field.name]) < 0) issue(field.name, 'Isi komponen BPJS minimal 0; semua komponen wajib diisi.');
    }
  }
  if (value.paid_basic_salary.trim() && Number(value.paid_basic_salary) < 0) issue('paid_basic_salary', 'Gaji dibayar minimal 0.');
  if (value.tax_allowance_mode === 'fixed') {
    if (!value.fixed_tax_allowance.trim()) issue('fixed_tax_allowance', 'Isi tunjangan pajak tetap secara eksplisit, termasuk 0 bila nihil.');
    else if (Number(value.fixed_tax_allowance) < 0) issue('fixed_tax_allowance', 'Tunjangan tetap minimal 0.');
  }
  if (value.external_tax_enabled || value.bonus_enabled) {
    if (!['fixed', 'none'].includes(value.tax_allowance_mode)) issue('tax_allowance_mode', 'Pajak eksternal atau bonus memerlukan mode Tetap atau Tanpa tunjangan secara eksplisit; gross-up untuk bonus belum didukung.');
  }
  if (value.external_tax_enabled) {
    if (!value.external_tax_amount.trim()) issue('external_tax_amount', 'Isi pajak eksternal, termasuk 0 bila nihil.');
    if (!value.external_tax_reference.trim()) issue('external_tax_reference', 'Referensi pajak wajib diisi.');
  }
  if (value.bonus_enabled) {
    if (!value.bonus_amount.trim() || Number(value.bonus_amount) <= 0) issue('bonus_amount', 'Bonus harus lebih dari 0.');
    if (value.bonus_tax_enabled) {
      if (!value.bonus_tax_amount.trim()) issue('bonus_tax_amount', 'Isi total pajak eksternal.');
      if (!value.bonus_tax_reference.trim()) issue('bonus_tax_reference', 'Referensi total pajak wajib diisi.');
    }
  }
});
type FormValues = z.infer<typeof formSchema>;

function formValues(input: PayrollPreparationInput | null): FormValues {
  return {
    reason: input?.reason ?? '',
    work_days_per_week: input?.work_days_per_week ? String(input.work_days_per_week) as '5' | '6' : '',
    tax_allowance_mode: input?.tax_allowance_mode ?? '',
    fixed_tax_allowance: String(input?.fixed_tax_allowance ?? ''),
    bpjs_paid_by_company: input?.bpjs_paid_by_company == null ? '' : input.bpjs_paid_by_company ? 'true' : 'false',
    bpjs_base: String(input?.bpjs_base ?? ''),
    external_bpjs_enabled: input?.external_bpjs != null,
    external_bpjs_reference: input?.external_bpjs?.reference ?? '',
    bpjs_kes_employee: String(input?.external_bpjs?.bpjs_kes_employee ?? ''),
    bpjs_jht_employee: String(input?.external_bpjs?.bpjs_jht_employee ?? ''),
    bpjs_jp_employee: String(input?.external_bpjs?.bpjs_jp_employee ?? ''),
    bpjs_kes_company: String(input?.external_bpjs?.bpjs_kes_company ?? ''),
    bpjs_jht_company: String(input?.external_bpjs?.bpjs_jht_company ?? ''),
    bpjs_jp_company: String(input?.external_bpjs?.bpjs_jp_company ?? ''),
    bpjs_jkk_company: String(input?.external_bpjs?.bpjs_jkk_company ?? ''),
    bpjs_jkm_company: String(input?.external_bpjs?.bpjs_jkm_company ?? ''),
    rounding: input?.rounding ?? '',
    paid_basic_salary: String(input?.paid_basic_salary ?? ''),
    external_tax_enabled: input?.external_tax != null,
    external_tax_amount: String(input?.external_tax?.amount ?? ''),
    external_tax_reference: input?.external_tax?.reference ?? '',
    payment_hold_reason: input?.payment_hold_reason ?? '',
    bonus_enabled: input?.bonus != null,
    bonus_amount: String(input?.bonus?.amount ?? ''),
    bonus_tax_enabled: input?.bonus?.external_total_tax != null,
    bonus_tax_amount: String(input?.bonus?.external_total_tax?.amount ?? ''),
    bonus_tax_reference: input?.bonus?.external_total_tax?.reference ?? '',
  };
}

// Encode decisions only. All payroll arithmetic remains on the server.
function preparationInput(value: FormValues): PayrollPreparationInput {
  return {
    reason: value.reason.trim(),
    ...(value.work_days_per_week && { work_days_per_week: Number(value.work_days_per_week) as 5 | 6 }),
    ...(value.tax_allowance_mode && { tax_allowance_mode: value.tax_allowance_mode }),
    ...(value.tax_allowance_mode === 'fixed' && { fixed_tax_allowance: Number(value.fixed_tax_allowance) }),
    ...(value.bpjs_paid_by_company && { bpjs_paid_by_company: value.bpjs_paid_by_company === 'true' }),
    ...(value.bpjs_base.trim() && { bpjs_base: Number(value.bpjs_base) }),
    ...(value.external_bpjs_enabled && { external_bpjs: {
      reference: value.external_bpjs_reference.trim(),
      bpjs_kes_employee: Number(value.bpjs_kes_employee),
      bpjs_jht_employee: Number(value.bpjs_jht_employee),
      bpjs_jp_employee: Number(value.bpjs_jp_employee),
      bpjs_kes_company: Number(value.bpjs_kes_company),
      bpjs_jht_company: Number(value.bpjs_jht_company),
      bpjs_jp_company: Number(value.bpjs_jp_company),
      bpjs_jkk_company: Number(value.bpjs_jkk_company),
      bpjs_jkm_company: Number(value.bpjs_jkm_company),
    } }),
    ...(value.rounding && { rounding: value.rounding }),
    ...(value.paid_basic_salary.trim() && { paid_basic_salary: Number(value.paid_basic_salary) }),
    ...(value.external_tax_enabled && { external_tax: { amount: Number(value.external_tax_amount), reference: value.external_tax_reference.trim() } }),
    ...(value.payment_hold_reason.trim() && { payment_hold_reason: value.payment_hold_reason.trim() }),
    ...(value.bonus_enabled && { bonus: {
      amount: Number(value.bonus_amount),
      ...(value.bonus_tax_enabled && { external_total_tax: { amount: Number(value.bonus_tax_amount), reference: value.bonus_tax_reference.trim() } }),
    } }),
  };
}

function errorMessage(error: unknown, fallback: PayrollCopy): PayrollCopy {
  if (error instanceof PayrollCopyError) return error.copy;
  if (isAxiosError(error)) {
    const details: unknown = error.response?.data?.error?.errors;
    if (Array.isArray(details)) {
      const messages = details.flatMap((detail: unknown) => detail && typeof detail === 'object'
        && 'message' in detail && typeof detail.message === 'string' ? [detail.message] : []);
      if (messages.length) return [...new Set(messages)].join('; ');
    }
    if (typeof error.response?.data?.message === 'string') return error.response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

interface PreparationActivity {
  onBegin: () => boolean;
  onEnd: () => void;
  onInvalidate: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

function PreparationEditor({ row, companyId, period, onSaved, onSavingChange, onBegin, onEnd, onInvalidate, onDirtyChange }: {
  row: PayrollPreparationRow;
  companyId: number;
  period: string;
  onSaved: (row: PayrollPreparationRow) => void;
  onSavingChange: (saving: boolean) => void;
} & PreparationActivity) {
  useLocale();
  const [phase, setPhase] = useState<'idle' | 'saving' | 'previewing'>('idle');
  const [preview, setPreview] = useState<PayrollCalculationResult | null>(null);
  const [error, setError] = useState<PayrollCopy>('');
  const [notice, setNotice] = useState<PayrollCopy>('');
  const [conflict, setConflict] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);
  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(formSchema), defaultValues: formValues(row.input),
  });
  const mode = watch('tax_allowance_mode');
  const external = watch('external_tax_enabled');
  const externalBpjs = watch('external_bpjs_enabled');
  const bonus = watch('bonus_enabled');
  const bonusTax = watch('bonus_tax_enabled');
  const moneyStep = watch('rounding') === 'final_cash' ? 'any' : '0.01';

  useEffect(() => () => { request.current++; }, []);
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const invalidate = () => { setPreview(null); setError(''); setNotice(''); request.current++; onInvalidate(); };
  const save = async (input: PayrollPreparationInput | null, withPreview: boolean) => {
    if (row.locked !== false || conflict || busy.current || !onBegin()) return;
    const current = ++request.current;
    busy.current = true;
    setPreview(null); setError(''); setNotice(''); setPhase('saving'); onSavingChange(true); onInvalidate();
    let saved = false;
    try {
      const savedFields = await payrollService.savePreparation(row.employee_id, period, input);
      if (current !== request.current) return;
      const stored = { ...row, ...savedFields };
      onSaved(stored);
      reset(formValues(stored.input));
      saved = true;
      if (stored.locked !== false) throw new PayrollCopyError('Payroll sudah tersedia. Persiapan terkunci; muat ulang data.');
      setNotice(input == null ? payrollCopy('Persiapan dihapus. Pengaturan payroll berlaku kembali.') : payrollCopy('Persiapan karyawan untuk periode ini tersimpan.'));
      onSavingChange(false);
      if (withPreview) {
        setPhase('previewing');
        const result = await payrollService.previewPreparation({ company_id: companyId, period, employee_ids: [row.employee_id] });
        if (current !== request.current) return;
        const calculated = result.results?.find(item => item.employee_id === row.employee_id);
        if (result.generated !== 0 || result.errors !== 0 || result.previewed !== 1 || result.results?.length !== 1 || result.errorDetails?.length || !calculated) {
          const serverError = result.errorDetails?.map(item => item.error).join('; ');
          if (serverError) throw new Error(serverError);
          throw new PayrollCopyError('Preview tidak lengkap. Muat ulang lalu coba lagi.');
        }
        setPreview(calculated);
      }
    } catch (cause) {
      if (current !== request.current) return;
      setPreview(null);
      if (isAxiosError(cause) && cause.response?.status === 409) setConflict(true);
      setNotice(saved ? payrollCopy('Persiapan tersimpan, tetapi preview belum berhasil.') : payrollCopy('Simpan belum terkonfirmasi. Muat ulang untuk memeriksa data server.'));
      setError(errorMessage(cause, payrollCopy('Persiapan payroll gagal.')));
    } finally {
      if (current === request.current) {
        busy.current = false; setPhase('idle');
      }
      onSavingChange(false); onEnd();
    }
  };
  const submit = (withPreview: boolean) => {
    setPreview(null); setNotice(''); setError('');
    void handleSubmit(values => save(preparationInput(values), withPreview), () => setError(payrollCopy('Periksa isian persiapan.')))();
  };
  const disabled = row.locked !== false || conflict || phase !== 'idle';

  return (
    <div className="space-y-4">
      <div className="pw-exception-identity">
        <p className="font-semibold">{row.employee_name} · {row.employee_code}</p>
        <p>{t("Status gaji:")} {row.salary_status ? payrollEnumLabel(row.salary_status) : '-'}{' '}{t("· Gaji pokok tercatat:")} {money(row.basic_salary)}</p>
      </div>
      {row.locked !== false && <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-900">{t("Payroll sudah tersedia untuk karyawan dan periode ini. Persiapan hanya dapat dibaca dan tidak dapat ditimpa.")}</p>}
      {conflict && <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-900">{t("Data payroll berubah. Muat ulang sebelum melanjutkan persiapan.")}</p>}
      <form noValidate onSubmit={event => { event.preventDefault(); submit(true); }} onChangeCapture={invalidate} className="space-y-4">
        <fieldset disabled={disabled} className="space-y-4 disabled:opacity-70">
          <Input label={t("Alasan persiapan")} {...register('reason')} error={errors.reason?.message ? t(errors.reason?.message) : undefined} helperText={t("Wajib untuk keputusan HR periode ini, termasuk override prorata manual.")} />
          <fieldset className="ph-section pw-form-section">
            <legend className="pw-legend">{t("Gaji dan hari kerja")}</legend>
            <div className="ph-form-grid">
              <Select label={t("Hari kerja per minggu")} {...register('work_days_per_week')} options={[{ ...defaultOption, label: t(defaultOption.label) }, { value: '5', label: t('5 hari') }, { value: '6', label: t('6 hari') }]} />
              <Input label={t("Gaji pokok dibayar (override manual)")} type="number" step={moneyStep} min="0" {...register('paid_basic_salary')} error={errors.paid_basic_salary?.message ? t(errors.paid_basic_salary?.message) : undefined} helperText={t("Kosong: server menghitung prorata. Nilai 0 adalah override yang sah.")} />
            </div>
          </fieldset>
          <fieldset className="ph-section pw-form-section">
            <legend className="pw-legend">{t("Pajak")}</legend>
            <Select label={t("Mode tunjangan pajak")} {...register('tax_allowance_mode')} error={errors.tax_allowance_mode?.message ? t(errors.tax_allowance_mode?.message) : undefined} options={[{ ...defaultOption, label: t(defaultOption.label) }, ...Object.entries(taxModes).map(([value, label]) => ({ value, label: t(label) }))]} />
            {mode === 'fixed' && <Input label={t("Tunjangan pajak tetap")} type="number" min="0" step={moneyStep} {...register('fixed_tax_allowance')} error={errors.fixed_tax_allowance?.message ? t(errors.fixed_tax_allowance?.message) : undefined} helperText={t("Wajib diisi pada mode Tetap. Isi 0 secara eksplisit bila nihil.")} />}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('external_tax_enabled')} />{t("Gunakan pajak eksternal / refund")}</label>
            {external && <div className="ph-form-grid">
              <Input label={t("Pajak eksternal")} type="number" step={moneyStep} {...register('external_tax_amount')} error={errors.external_tax_amount?.message ? t(errors.external_tax_amount?.message) : undefined} helperText={t("Boleh negatif untuk refund. Pilih mode Tetap atau Tanpa tunjangan.")} />
              <Input label={t("Referensi pajak eksternal")} {...register('external_tax_reference')} error={errors.external_tax_reference?.message ? t(errors.external_tax_reference?.message) : undefined} helperText={t("Nomor dokumen atau referensi keputusan HR/pajak.")} />
            </div>}
          </fieldset>
          <fieldset className="ph-section pw-form-section">
            <legend className="pw-legend">{t("BPJS dan pembulatan")}</legend>
            <div className="ph-form-grid">
              <Select label={t("BPJS karyawan ditanggung perusahaan")} {...register('bpjs_paid_by_company')} options={[{ ...defaultOption, label: t(defaultOption.label) }, { value: 'true', label: t('Ya') }, { value: 'false', label: t('Tidak') }]} />
              <Input label={t("Dasar BPJS")} type="number" step={moneyStep} {...register('bpjs_base')} error={errors.bpjs_base?.message ? t(errors.bpjs_base?.message) : undefined} helperText={t("Opsional, harus lebih dari 0.")} />
              <Select label={t("Pembulatan")} title={t(finalCashHint)} {...register('rounding')} options={[{ ...defaultOption, label: t(defaultOption.label) }, ...Object.entries(roundingModes).map(([value, label]) => ({ value, label: t(label) }))]} />
              <p className="text-sm text-gray-500">{t("Legacy mempertahankan pembulatan lama. Final dua desimal mempertahankan presisi kalkulasi mentah (raw) sampai pembulatan akhir ke 0,01 rupiah.")}</p>
              {moneyStep === 'any' && <p className="text-sm text-gray-500 sm:col-span-2">{t(finalCashHint)}</p>}
            </div>
            <details className="mt-4" open={row.input?.external_bpjs != null || undefined}>
              <summary className="cursor-pointer font-medium">{t("Lanjutan: komponen BPJS HR")}</summary>
              <div className="space-y-4 mt-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('external_bpjs_enabled')} />{t("Komponen BPJS dari perhitungan HR")}</label>
                {externalBpjs && <>
                  <p className="text-sm text-gray-500">{t("Isi seluruh delapan komponen, termasuk 0 bila nihil, serta referensi perhitungan HR untuk periode ini.")}</p>
                  <Input label={t("Referensi komponen BPJS HR")} {...register('external_bpjs_reference')} error={errors.external_bpjs_reference?.message ? t(errors.external_bpjs_reference?.message) : undefined} />
                  <div className="ph-form-grid">
                    {externalBpjsFields.map(field => <Input key={field.name} label={t(field.label)} type="number" step={moneyStep} min="0" {...register(field.name)} error={errors[field.name]?.message ? t(errors[field.name]?.message ?? '') : undefined} />)}
                  </div>
                </>}
              </div>
            </details>
          </fieldset>
          <details className="ph-section pw-form-section" open={row.input?.bonus != null || row.input?.payment_hold_reason != null || undefined}>
            <summary className="cursor-pointer font-semibold">{t("Lanjutan: bonus dan penahanan pembayaran")}</summary>
            <div className="space-y-4 mt-4">
              <Input label={t("Alasan penahanan pembayaran")} {...register('payment_hold_reason')} helperText={t("Opsional. Terisi berarti pembayaran ditahan sesuai hasil server.")} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('bonus_enabled')} />{t("Sertakan bonus")}</label>
              {bonus && <>
                <Input label={t("Bonus bruto")} type="number" step={moneyStep} {...register('bonus_amount')} error={errors.bonus_amount?.message ? t(errors.bonus_amount?.message) : undefined} helperText={t("Harus lebih dari 0; pilih mode pajak Tetap atau Tanpa tunjangan. Server menolak bonus jika sudah ada allowance bonus yang disetujui.")} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('bonus_tax_enabled')} />{t("Gunakan total pajak eksternal termasuk bonus")}</label>
                {bonusTax && <div className="ph-form-grid">
                  <Input label={t("Total pajak eksternal termasuk bonus")} type="number" step={moneyStep} {...register('bonus_tax_amount')} error={errors.bonus_tax_amount?.message ? t(errors.bonus_tax_amount?.message) : undefined} helperText={t("Total pajak bulan termasuk bonus, bukan selisih. Boleh negatif.")} />
                  <Input label={t("Referensi total pajak bonus")} {...register('bonus_tax_reference')} error={errors.bonus_tax_reference?.message ? t(errors.bonus_tax_reference?.message) : undefined} />
                </div>}
              </>}
            </div>
          </details>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{renderPayrollCopy(error)}</p>}
        {notice && <p role="status" className="text-sm text-gray-700">{renderPayrollCopy(notice)}</p>}
        {phase !== 'idle' && <p role="status">{phase === 'saving' ? t("Menyimpan persiapan…") : t("Memuat preview dari server…")}</p>}
        <div className="ph-form-actions pw-editor-actions">
          <Button type="button" variant="outline" disabled={disabled} onClick={() => submit(false)}>{t("Simpan persiapan")}</Button>
          <Button type="submit" disabled={disabled}>{t("Simpan & preview")}</Button>
          <Button type="button" variant="ghost" disabled={disabled || row.input == null} onClick={() => void save(null, false)}>{t("Hapus persiapan periode ini")}</Button>
        </div>
        {isDirty && <p className="text-sm text-amber-700">{t("Perubahan belum disimpan. Mengganti pilihan akan membuang isian yang belum disimpan.")}</p>}
      </form>
      {preview && <section aria-label={t("Preview payroll")} className="space-y-4 border-t border-gray-200 pt-4">
        <h3 className="font-semibold text-lg">{t("Preview payroll dari server")}</h3>
        <dl className="ph-kv pw-preview-facts">
          <Amount label={t("Gaji pokok dibayar")} value={preview.basic_salary} />
          <Amount label={t("Gaji bruto")} value={preview.gross_salary} />
          <Amount label={t("Tunjangan pajak")} value={preview.calculation_snapshot?.tax_allowance} />
          <Amount label={t("Pajak diterapkan")} value={preview.tax?.pph21} />
          <Amount label={t("Pajak hasil kalkulasi")} value={preview.calculation_snapshot?.calculated_pph21} />
          <Amount label={t("Total BPJS karyawan")} value={preview.bpjs?.bpjs_employee_total} />
          <Amount label={t("Take Home Pay")} value={preview.take_home_pay} />
        </dl>
        {preview.calculation_snapshot && <PayrollPolicyDetail snapshot={preview.calculation_snapshot} appliedTax={preview.tax?.pph21} workDays={preview.proration_snapshot?.work_days_per_week} />}
        <p className="text-sm text-gray-600">{t("Preview ini belum membuat payroll. Gunakan Preview semua karyawan di atas, lalu Generate siap dalam dialog ini. Generate memakai pengecualian tersimpan untuk periode yang sama.")}</p>
      </section>}
    </div>
  );
}

function PreparationEmployees({ companyId, period, saving, onSavingChange, ...activity }: {
  companyId: number; period: string; saving: boolean; onSavingChange: (saving: boolean) => void;
} & PreparationActivity) {
  useLocale();
  const [rows, setRows] = useState<PayrollPreparationRow[] | null>(null);
  const [error, setError] = useState<PayrollCopy>('');
  const [employeeId, setEmployeeId] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    payrollService.getPreparation(companyId, period).then(data => {
      if (active) setRows(data);
    }).catch(cause => {
      if (active) { setRows(null); setError(errorMessage(cause, payrollCopy('Gagal memuat persiapan.'))); }
    });
    return () => { active = false; };
  }, [companyId, period, reload]);
  const refresh = () => { setRows(null); setEmployeeId(''); setError(''); setReload(value => value + 1); };
  const row = rows?.find(item => String(item.employee_id) === employeeId);
  return <div className="space-y-4">
    <div className="flex items-end gap-2">
      <Select label={t("Karyawan")} value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={!rows || saving} options={[
        { value: '', label: t('Pilih karyawan') },
        ...(rows ?? []).map(item => ({ value: String(item.employee_id), label: `${item.employee_name} (${item.employee_code})${item.locked ? ' · Terkunci' : ''}` })),
      ]} />
      <Button type="button" variant="outline" disabled={saving} onClick={refresh}>{t("Muat ulang")}</Button>
    </div>
    {!rows && !error && <p role="status">{t("Memuat persiapan…")}</p>}
    {error && <p role="alert" className="text-red-700">{renderPayrollCopy(error)}</p>}
    {rows?.length === 0 && <p>{t("Tidak ada karyawan untuk perusahaan dan periode ini.")}</p>}
    {row && <PreparationEditor key={`${companyId}:${period}:${row.employee_id}:${reload}`} row={row} companyId={companyId} period={period}
      onSaved={saved => { setRows(previous => previous?.map(item => item.employee_id === saved.employee_id ? saved : item) ?? null); activity.onInvalidate(); }} onSavingChange={onSavingChange} {...activity} />}
  </div>;
}

export function PayrollPreparation({ companies, initialCompanyId, initialPeriod, onClose, onGenerated }: {
  companies: Company[]; initialCompanyId: number | null; initialPeriod: string; onClose: () => void;
  onGenerated?: (companyId: number, period: string) => void | Promise<void>;
}) {
  useLocale();
  const [companyId, setCompanyId] = useState(initialCompanyId && companies.some(company => company.id === initialCompanyId) ? String(initialCompanyId) : '');
  const [period, setPeriod] = useState(initialPeriod);
  const [saving, setSaving] = useState(false);
  const [owner, setOwner] = useState<'bulk' | 'exception' | null>(null);
  const running = useRef(false);
  const [revision, setRevision] = useState(0);
  const [exceptionsDirty, setExceptionsDirty] = useState(false);
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const invalidate = useCallback(() => setRevision(value => value + 1), []);
  const begin = (nextOwner: 'bulk' | 'exception') => {
    if (running.current) return false;
    running.current = true; setOwner(nextOwner); return true;
  };
  const end = useCallback(() => { running.current = false; setOwner(null); }, []);
  const validPeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  return <Modal isOpen onClose={() => { if (owner !== 'bulk') onClose(); }} showCloseButton={owner !== 'bulk'} title={t("Persiapan Payroll")} size="full" className="pw-preparation-dialog payroll-refresh-dialog">
    <div className="ph-workflow pw-preparation">
      <p className="text-sm text-gray-600">{t("Pilih perusahaan dan periode, preview semua karyawan, lalu generate hasil yang siap. Tidak perlu memilih atau menyimpan karyawan satu per satu.")}</p>
      <div className="ph-form-grid">
        <Select label={t("Perusahaan persiapan")} value={companyId} disabled={saving} onChange={event => setCompanyId(event.target.value)} options={[{ value: '', label: t('Pilih perusahaan') }, ...companies.map(company => ({ value: String(company.id), label: company.name }))]} />
        <Input label={t("Periode persiapan")} type="month" value={period} disabled={saving} onChange={event => setPeriod(event.target.value)} />
      </div>
      {companyId && validPeriod && <PayrollAutomation key={`bulk:${companyId}:${period}`} companyId={Number(companyId)} period={period}
        busy={owner !== null} onBegin={() => begin('bulk')} onEnd={end} onMutationChange={setSaving}
        revision={revision} exceptionsDirty={exceptionsDirty} onGenerated={onGenerated} />}
      <details open={exceptionsOpen} onToggle={event => setExceptionsOpen(event.currentTarget.open)} className="pw-disclosure">
        <summary className="cursor-pointer font-semibold">{t("Pengecualian periode ini")}</summary>
        <p className="text-sm text-gray-600 my-4">{t("Opsional: keputusan HR untuk satu karyawan pada periode ini saja. Refund, pajak eksternal, dan pengecualian BPJS tidak dibawa ke periode berikutnya. Isian kosong mengikuti aturan payroll yang berlaku. Nominal manual maksimal dua desimal, kecuali mode Bulatkan total akhir (HR).")}</p>
        {exceptionsOpen && companyId && validPeriod && <fieldset disabled={owner === 'bulk'} onChangeCapture={invalidate}>
          <PreparationEmployees key={`exceptions:${companyId}:${period}`} companyId={Number(companyId)} period={period} saving={saving} onSavingChange={setSaving}
            onBegin={() => begin('exception')} onEnd={end} onInvalidate={invalidate} onDirtyChange={setExceptionsDirty} />
        </fieldset>}
      </details>
      {!validPeriod && <p role="alert">{t("Pilih periode yang valid.")}</p>}
    </div>
  </Modal>;
}

export function PayrollPaymentHold({ record, onUpdated }: { record: Payroll; onUpdated: (record: Payroll) => void }) {
  useLocale();
  const user = useAuthStore(state => state.user);
  // Mirrors the payment-hold route's approval role gate (HR Manager or higher).
  // Payment hold is a payment action: role ceiling AND payroll.pay.
  const canApprovePayroll = user?.roles.some(role => ['Super Admin', 'Group CEO', 'CEO', 'HR Manager'].includes(role))
    && canAction(user, 'payroll.pay');
  const held = record.metadata?.calculation?.payments?.held;
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<PayrollCopy>('');
  const [needsReload, setNeedsReload] = useState(false);
  const active = useRef(true);
  const busy = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  if (!canApprovePayroll || typeof held !== 'boolean' || record.metadata?.calculation?.version !== 2 || ['paid', 'cancelled'].includes(record.status)) return null;
  const update = async () => {
    if (busy.current || (!needsReload && !reason.trim())) return;
    busy.current = true; setPending(true); setError('');
    try {
      if (!needsReload) await payrollService.setPaymentHold(record.id, !held, reason.trim());
      if (!active.current) return;
      // Always reload the saved record; never derive payment amounts or flags locally.
      setNeedsReload(true);
      const refreshed = await payrollService.getById(record.id);
      if (!active.current) return;
      onUpdated(refreshed); setReason(''); setNeedsReload(false);
    } catch (cause) {
      if (active.current) { setError(errorMessage(cause, payrollCopy('Perubahan penahanan gagal.'))); setNeedsReload(true); }
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  };
  return <section aria-label={t("Ubah penahanan pembayaran")} className="ph-section pw-payment-hold">
    <h3 className="pw-section-title">{t("Penahanan pembayaran")}</h3>
    <p className="text-sm text-gray-600">{t("Tahan atau lepaskan pembayaran total payroll. Tindakan ini menyimpan status dan alasan tanpa mengubah nominal. Payroll yang ditahan belum dapat ditandai dibayar.")}</p>
    <Input label={t("Alasan perubahan penahanan")} value={reason} maxLength={1000} disabled={pending || needsReload} onChange={event => setReason(event.target.value)} />
    {error && <p role="alert" className="text-red-700">{renderPayrollCopy(error)}</p>}
    <Button type="button" disabled={pending || (!needsReload && !reason.trim())} onClick={() => void update()}>
      {pending ? t("Memuat…") : needsReload ? t("Muat ulang status penahanan") : held ? t("Lepaskan penahanan") : t("Tahan pembayaran")}
    </Button>
  </section>;
}
