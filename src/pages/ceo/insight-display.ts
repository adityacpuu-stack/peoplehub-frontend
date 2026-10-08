import { intlLocale, t } from '@/i18n';

// Use only for enum display fields, never names, notes, or other record content.
const enumLabels: Record<string, string> = {
  all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', draft: 'Draft',
  active: 'Active', inactive: 'Inactive', completed: 'Completed', cancelled: 'Cancelled',
  in_progress: 'In Progress', deferred: 'Deferred', low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
  performance: 'Performance', development: 'Development', behavioral: 'Behavioral', strategic: 'Strategic', team: 'Team',
  financial: 'Financial', customer: 'Customer', process: 'Process', learning: 'Learning', quality: 'Quality', productivity: 'Productivity', other: 'Other',
  male: 'Male', female: 'Female', permanent: 'Permanent', contract: 'Contract', internship: 'Internship', freelance: 'Freelance',
  full_time: 'Full-time', part_time: 'Part-time', single: 'Single', married: 'Married', divorced: 'Divorced', widowed: 'Widowed',
  resignation: 'Resignation', contract_end: 'Contract End', retirement: 'Retirement', termination: 'Termination',
  Male: 'Male', Female: 'Female', Permanent: 'Permanent', Contract: 'Contract', Intern: 'Intern', Internship: 'Internship',
  Freelance: 'Freelance', 'Full-time': 'Full-time', 'Part-time': 'Part-time', Single: 'Single', Married: 'Married',
  Divorced: 'Divorced', Widowed: 'Widowed', Unknown: 'Unknown', Other: 'Other',
  Resignation: 'Resignation', 'Contract End': 'Contract End', Retirement: 'Retirement', Termination: 'Termination',
  '< 1 year': '< 1 year', '1-2 years': '1-2 years', '2-5 years': '2-5 years', '3-5 years': '3-5 years',
  '5-10 years': '5-10 years', '10+ years': '10+ years', '> 10 years': '> 10 years',
  '2-3 years': '2-3 years', '5+ years': '5+ years', 'Part Time': 'Part-time',
  attendance: 'Attendance', leave: 'Leave', overtime: 'Overtime',
};
export function insightEnum(value: string): string {
  return Object.prototype.hasOwnProperty.call(enumLabels, value) ? t(enumLabels[value]) : value;
}

/** Presentation only: do not feed localized numbers back into calculations. */
export function insightNumber(value: number): string {
  return value.toLocaleString(intlLocale(), { maximumFractionDigits: 20 });
}
export function insightFixed(value: number, digits: number): string {
  // Retain the existing toFixed rounding before applying separators.
  return Number(value.toFixed(digits)).toLocaleString(intlLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function insightPercent(value: string): string {
  const match = /^([+-]?)(\d+(?:\.\d+)?)%$/.exec(value);
  if (!match) return value;
  return `${match[1]}${insightFixed(Number(match[2]), match[2].split('.')[1]?.length ?? 0)}%`;
}

// The dashboard and leadership APIs generate these duration formats.
export function insightTenure(value: string): string {
  if (value === 'N/A') return t('N/A');
  const yearsMonths = /^(\d+) years? (\d+) mo$/.exec(value);
  if (yearsMonths) return t('{years} years {months} mo', { years: insightNumber(Number(yearsMonths[1])), months: insightNumber(Number(yearsMonths[2])) });
  const duration = /^(\d+(?:\.\d+)?) (years?|months?)$/.exec(value);
  if (!duration) return value;
  const amount = insightFixed(Number(duration[1]), duration[1].split('.')[1]?.length ?? 0);
  const key = duration[2] === 'year' ? '{count} year' : duration[2] === 'years' ? '{count} years' : duration[2] === 'month' ? '{count} month' : '{count} months';
  return t(key, { count: amount });
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Month labels only; no UTC conversion of date-only periods. */
export function insightMonth(value: string): string {
  const month = months.indexOf(value);
  if (month >= 0) return t(months[month]);
  const match = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)( \d{4})$/.exec(value);
  return match ? `${t(match[1])}${match[2]}` : value;
}
export function insightPeriod(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' });
}
export function insightDate(value: string | undefined): string {
  if (!value) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export class SavedPayrollValueError extends Error {
  readonly field: string;
  constructor(field: string) { super('Invalid saved payroll value'); this.field = field; }
}
export function savedPayrollError(error: Error): string {
  return error instanceof SavedPayrollValueError
    ? t('Nilai payroll tersimpan tidak tersedia atau tidak valid ({field}). Data dan ekspor BPJS belum dapat ditampilkan.', { field: error.field })
    : t('Gagal memuat nilai payroll tersimpan. Silakan coba lagi.');
}
