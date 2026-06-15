import { z } from 'zod';

/**
 * Zod schema for the "create leave request" form on LeaveRequestsPage.
 *
 * PFI policy: leave is always full-day (no half-day option). Wave 6 removed
 * the `is_half_day` / `half_day_session` UI toggle since BE has no column for it.
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
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format');

export const leaveRequestSchema = z
  .object({
    employee_id: z.string().optional(),
    leave_type_id: z
      .string()
      .min(1, 'Leave type is required')
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: 'Leave type is required',
      }),
    start_date: dateString,
    end_date: dateString,
    reason: z
      .string()
      .optional()
      .refine((v) => v === undefined || v === '' || v.length >= 3, {
        message: 'Reason must be at least 3 characters',
      }),
    attachment: z.instanceof(File).optional(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  });

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;
