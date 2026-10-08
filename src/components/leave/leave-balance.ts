import { toNum } from '@/lib/utils';
import type { LeaveBalance } from '@/types';

// Pending requests already reserve days from the remaining allocation.
export const getAvailableDays = (balance: LeaveBalance) => Math.max(0, toNum(balance.remaining_days) - toNum(balance.pending_days));
