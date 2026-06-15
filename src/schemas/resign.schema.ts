import { z } from 'zod';

/**
 * Zod schema for the Resign confirmation modal inside EmployeeFormPage.
 *
 * Fields:
 * - resign_date: required YYYY-MM-DD string (effective resign date).
 * - resign_type: required enum — matches existing modal options
 *   (voluntary / involuntary / retirement / contract_end / mutual_agreement / other).
 * - resign_reason: optional. If provided, must be 3–500 chars to weed out junk.
 * - resign_notes: optional free-form notes (≤ 1000 chars).
 *
 * Backend contract: payload is merged into `employeeService.update()` along with
 * `employment_status: 'resigned'` — see EmployeeFormPage `onResign` handler.
 */

const dateString = z
  .string()
  .min(1, 'Tanggal resign harus diisi')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid');

export const RESIGN_TYPES = [
  'voluntary',
  'involuntary',
  'retirement',
  'contract_end',
  'mutual_agreement',
  'other',
] as const;

export const resignSchema = z.object({
  resign_date: dateString,
  resign_type: z.enum(RESIGN_TYPES, {
    message: 'Tipe resign harus dipilih',
  }),
  resign_reason: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === '' || v.length >= 3, {
      message: 'Alasan minimal 3 karakter',
    })
    .refine((v) => v === undefined || v.length <= 500, {
      message: 'Alasan maksimal 500 karakter',
    }),
  resign_notes: z
    .string()
    .max(1000, 'Catatan maksimal 1000 karakter')
    .optional(),
});

export type ResignFormInput = z.input<typeof resignSchema>;
export type ResignFormValues = z.output<typeof resignSchema>;
