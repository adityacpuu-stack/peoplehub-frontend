import { intlLocale } from '@/i18n';

/** Format recorded quantities without rounding allocations or changing calculations. */
export function quantity(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(intlLocale(), { maximumFractionDigits: 20 })
    : String(value);
}
