import { t, intlLocale } from '@/i18n';
import type { Decimalish } from '@/types';

// Presentation only: preserve the existing zero- and two-decimal money policies.
export function payrollCurrency(amount: Decimalish | null | undefined): string {
  return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(amount) || 0);
}
export function payrollCalculationCurrency(amount: Decimalish | null | undefined): string {
  if (amount == null || amount === '' || !Number.isFinite(Number(amount))) return '-';
  return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount));
}
export const payrollNumber = (value: number): string => value.toLocaleString(intlLocale(), { maximumFractionDigits: 20 });

// Keep local messages as source keys until render so a language switch also
// updates an open form's feedback. Server messages remain opaque strings.
export type PayrollCopy = string | { source: string; values?: Record<string, string | number> };
export const payrollCopy = (source: string, values?: Record<string, string | number>): PayrollCopy => ({ source, values });
export const renderPayrollCopy = (copy: PayrollCopy): string => typeof copy === 'string' ? copy : t(copy.source, copy.values);
export class PayrollCopyError extends Error {
  readonly copy: PayrollCopy;
  constructor(source: string) { super(source); this.copy = payrollCopy(source); }
}

// Only known application enums enter the catalog. Unknown values remain data.
const enumLabels: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', pending: 'Pending', approved: 'Approved',
  rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired', processed: 'Processed',
  draft: 'Draft', processing: 'Processing', validated: 'Validated', submitted: 'Submitted', paid: 'Paid',
  monthly: 'Monthly', weekly: 'Weekly', daily: 'Daily', one_time: 'One Time', quarterly: 'Per Kuartal', yearly: 'Tahunan',
  transport: 'Transportasi', meal: 'Makan', housing: 'Perumahan', communication: 'Komunikasi',
  medical: 'Kesehatan', position: 'Jabatan', performance: 'Kinerja', attendance: 'Kehadiran',
  shift: 'Shift', remote: 'Remote', thr: 'THR', bonus: 'Bonus', other: 'Lainnya',
  deduction: 'Potongan', penalty: 'Denda/Penalty', loan: 'Pinjaman', advance: 'Kasbon',
  allowance: 'Tunjangan', reimbursement: 'Reimbursement', correction: 'Koreksi', incentive: 'Insentif', commission: 'Komisi',
  existing: 'Existing', new_gross: 'New / Gross', gross: 'Gross', nett: 'Nett',
  calculated: 'Calculated', external: 'External', external_total: 'External total',
};
export const payrollEnumLabel = (value: string): string => Object.prototype.hasOwnProperty.call(enumLabels, value) ? t(enumLabels[value]) : value;
