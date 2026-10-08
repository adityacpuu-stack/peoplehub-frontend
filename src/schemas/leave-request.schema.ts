import { t } from '@/i18n';
import { z } from 'zod';

/**
 * Zod schema for the "create leave request" form on LeaveRequestsPage.
 *
 * PFI policy: leave is always full-day (no half-day option). The backend also
 * rejects half-day inputs; legacy DB fields remain only to preserve history.
 *
 * Fields:
 * - employee_id: optional (P&C may submit on behalf of an employee, otherwise backend uses requester)
 * - leave_type_id: required, must be a positive integer
 * - start_date / end_date: required YYYY-MM-DD strings; end_date must be >= start_date
 * - reason: optional, but if provided must be at least 3 characters
 * - attachment: optional File. UI-only for now — backend `createLeaveSchema` does not
 *   accept an attachment field on `/leaves` POST. Tracked for a follow-up wave.
 */

const dateString = z
  .string()
  .min(1, { error: () => t('Date is required') })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: () => t('Invalid date format') });

export const leaveRequestSchema = z
  .object({
    employee_id: z.string().optional(),
    leave_type_id: z
      .string()
      .min(1, { error: () => t('Leave type is required') })
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        error: () => t('Leave type is required'),
      }),
    start_date: dateString,
    end_date: dateString,
    reason: z
      .string()
      .optional()
      .refine((v) => v === undefined || v === '' || v.length >= 3, {
        error: () => t('Reason must be at least 3 characters'),
      }),
    attachment: z.instanceof(File).optional(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    error: () => t('End date must be on or after start date'),
    path: ['end_date'],
  });

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
