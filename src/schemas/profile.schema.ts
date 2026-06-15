import { z } from 'zod';

/**
 * Indonesian phone format: optional +62 prefix or leading 0, 8-15 digits total.
 * Accepts: +6281234567890, 081234567890, 6281234567890, also dashes/spaces.
 */
const phoneRegex = /^(\+62|62|0)?[\s-]?[0-9][\s\-0-9]{6,18}$/;

const optionalString = z
  .string()
  .trim()
  .max(255, 'Maximum 255 characters')
  .optional()
  .or(z.literal('').transform(() => ''));

const optionalPhone = z
  .string()
  .trim()
  .max(20, 'Phone number too long')
  .refine((v) => v === '' || phoneRegex.test(v), {
    message: 'Invalid phone format (e.g. +6281234567890 or 081234567890)',
  })
  .optional()
  .or(z.literal('').transform(() => ''));

const optionalLongText = z
  .string()
  .trim()
  .max(500, 'Maximum 500 characters')
  .optional()
  .or(z.literal('').transform(() => ''));

const optionalPostalCode = z
  .string()
  .trim()
  .max(10, 'Maximum 10 characters')
  .refine((v) => v === '' || /^[0-9A-Za-z\s-]+$/.test(v), {
    message: 'Invalid postal code',
  })
  .optional()
  .or(z.literal('').transform(() => ''));

const currentYear = new Date().getFullYear();

const toIntOrUndefined = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return Number.isNaN(n) ? undefined : n;
};

const optionalYear = z.preprocess(
  toIntOrUndefined,
  z
    .number()
    .int('Year must be a whole number')
    .min(1950, 'Year must be 1950 or later')
    .max(currentYear + 10, `Year cannot exceed ${currentYear + 10}`)
    .optional(),
);

const optionalCount = (max = 20) =>
  z.preprocess(
    toIntOrUndefined,
    z
      .number()
      .int('Must be a whole number')
      .min(0, 'Must be 0 or more')
      .max(max, `Maximum ${max}`)
      .optional(),
  );

export const educationLevels = [
  '',
  'sd',
  'smp',
  'sma',
  'd1',
  'd2',
  'd3',
  'd4',
  's1',
  's2',
  's3',
] as const;

export const profileSchema = z.object({
  // Contact
  phone: optionalPhone,
  mobile_number: optionalPhone,

  // Legal address (KTP)
  address: optionalLongText,
  city: optionalString,
  province: optionalString,
  postal_code: optionalPostalCode,

  // Current address (domicile)
  current_address: optionalLongText,
  current_city: optionalString,
  current_province: optionalString,
  current_postal_code: optionalPostalCode,

  // Emergency contact
  emergency_contact_name: optionalString,
  emergency_contact_phone: optionalPhone,
  emergency_contact_relationship: optionalString,
  emergency_contact_address: optionalLongText,

  // Education
  last_education: z.enum(educationLevels).optional().or(z.literal('').transform(() => '' as const)),
  education_major: optionalString,
  education_institution: optionalString,
  graduation_year: optionalYear,

  // Family
  spouse_name: optionalString,
  children_count: optionalCount(20),
  number_of_dependents: optionalCount(20),
});

export type ProfileFormInput = z.input<typeof profileSchema>;
export type ProfileFormValues = z.output<typeof profileSchema>;
