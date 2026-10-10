import type { Payroll, PayrollReadPresentation } from '@/services/payroll.service';

// Payroll reads render the backend's saved read presentation
// (backend payroll-read-presentation.ts). Nothing here classifies funding,
// splits Position or rebuilds money: it only selects saved values and sums
// them, reporting a missing value as null instead of inventing zero.

export function savedAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type Payout = Pick<Payroll, 'take_home_pay' | 'thp'> & { presentation?: PayrollReadPresentation | null };
type Cost = Pick<Payroll, 'total_cost_to_company' | 'total_cost_company'> & { presentation?: PayrollReadPresentation | null };

/** Saved take-home pay: take_home_pay, then its saved alias thp. Never net_salary. */
export function savedThp(p: Payout): number | null {
  if (p.presentation) return p.presentation.take_home_pay;
  return savedAmount(p.take_home_pay) ?? savedAmount(p.thp);
}

/** Company cost saved at generation. */
export function savedCompanyCost(p: Cost): number | null {
  if (p.presentation) return p.presentation.company_cost;
  return savedAmount(p.total_cost_to_company) ?? savedAmount(p.total_cost_company);
}

function sumSaved<T>(rows: T[], read: (row: T) => number | null) {
  let total = 0;
  let missing = 0;
  for (const row of rows) {
    const value = read(row);
    if (value === null) missing++;
    else total += value;
  }
  return { total, missing };
}

/**
 * A saved deduction as signed display text. A negative saved deduction is a
 * refund to the employee (final PPh 21 period), shown as "+", never "--".
 */
export function signedDeduction(value: number, format: (amount: number) => string): string {
  if (value < 0) return `+${format(-value)}`;
  return value > 0 ? `-${format(value)}` : format(0);
}

/** Sum of saved payouts; rows without one are counted, never guessed. */
export const sumSavedThp = (rows: Payout[]) => sumSaved(rows, savedThp);
/** Sum of saved company cost; rows without one are counted, never guessed. */
export const sumSavedCompanyCost = (rows: Cost[]) => sumSaved(rows, savedCompanyCost);
