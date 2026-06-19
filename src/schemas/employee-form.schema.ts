import { z } from 'zod';

/**
 * Zod schema for EmployeeFormPage (create + edit).
 *
 * Multi-step form covering:
 *  - Personal info (identity, demographics)
 *  - Employment (job, department, dates)
 *  - Payroll (salary, allowances, tax)
 *  - Contact & address (KTP + domicile + emergency contact)
 *
 * Conventions:
 *  - Most fields are optional (backend handles defaults / minimum required set).
 *  - Required core: name, personal_email. company_id is required-ish (UI strongly
 *    encourages selection). Office email is conditionally required via a cross-field
 *    refine driven by `has_office_email`.
 *  - Numeric inputs use `z.preprocess` so empty string → undefined.
 *  - Date fields are loose YYYY-MM-DD strings ('' allowed for unset).
 */

// ---- Indonesian validators ----------------------------------------------------

/** Phone: +62 / 62 / 0 prefix, 6-18 digits with dash/space tolerance. */
const phoneRegex = /^(\+62|62|0)?[\s-]?[0-9][\s\-0-9]{6,18}$/;

const optionalPhone = z
  .string()
  .trim()
  .max(20, 'Phone number too long')
  .refine((v) => v === '' || phoneRegex.test(v), {
    message: 'Invalid phone format (e.g. +6281234567890 or 081234567890)',
  })
  .optional()
  .or(z.literal('').transform(() => ''));

/** NIK / Family Card / NPWP digits — store as string for leading-zero safety. */
const optionalDigits = (label: string, len: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), {
      message: `${label} must contain digits only`,
    })
    .refine((v) => v === '' || v.length === len, {
      message: `${label} must be ${len} digits`,
    })
    .optional()
    .or(z.literal('').transform(() => ''));

/** Loose NPWP — accepts 15 or 16 digit forms or formatted XX.XXX.XXX.X-XXX.XXX. */
const optionalNpwp = z
  .string()
  .trim()
  .max(25, 'NPWP too long')
  .refine(
    (v) => {
      if (v === '') return true;
      const digits = v.replace(/\D/g, '');
      return digits.length === 15 || digits.length === 16;
    },
    { message: 'NPWP must be 15 or 16 digits' },
  )
  .optional()
  .or(z.literal('').transform(() => ''));

const optionalString = z
  .string()
  .trim()
  .max(255, 'Maximum 255 characters')
  .optional()
  .or(z.literal('').transform(() => ''));

const optionalLongText = z
  .string()
  .trim()
  .max(1000, 'Maximum 1000 characters')
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

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: 'Invalid email',
  })
  .optional()
  .or(z.literal('').transform(() => ''));

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: 'Date must be YYYY-MM-DD',
  })
  .optional()
  .or(z.literal('').transform(() => ''));

const toFloatOrUndefined = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isNaN(n) ? undefined : n;
};

const toIntOrUndefined = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return Number.isNaN(n) ? undefined : n;
};

// Use type<...>().pipe() so that z.input infers a usable input type
// (string | number | null | undefined) instead of `unknown`.
// NOTE: z.null() in the union is REQUIRED — existing employee records carry
// `null` for unset allowances/salary/FK fields, and the form maps them through
// verbatim. Without z.null() the union rejects null with "Invalid input" before
// the transform (which coerces null → undefined) ever runs, forcing users to
// fill optional allowance fields on edit.
const optionalCurrency = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform(toFloatOrUndefined)
  .pipe(z.number().min(0, 'Must be 0 or greater').max(1e12, 'Amount too large').optional());

const optionalId = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform(toIntOrUndefined)
  .pipe(z.number().int().positive('Must be a positive number').optional());

// ---- Enums --------------------------------------------------------------------

export const genderValues = ['', 'male', 'female'] as const;
export const maritalValues = ['', 'single', 'married', 'divorced', 'widowed'] as const;
export const religionValues = [
  '',
  'islam',
  'kristen',
  'katolik',
  'hindu',
  'buddha',
  'konghucu',
  'other',
] as const;
export const employmentTypeValues = [
  '',
  'permanent',
  'contract',
  'internship',
  'freelance',
  'part_time',
] as const;
export const employmentStatusValues = [
  '',
  'active',
  'inactive',
  'terminated',
  'resigned',
  'retired',
  'suspended',
] as const;
// PFI policy: all employees gross. Keep 'gross' only to prevent accidental drift.
export const payTypeValues = ['gross'] as const;
// PFI policy: salary_status routes payroll engine.
//  - `existing` = legacy net→gross migration (basic includes gross-up; THP = basic)
//  - `new_gross` = new hires, pure gross (employee bears PPh21 + BPJS deduction)
export const salaryStatusValues = ['existing', 'new_gross'] as const;
export const payFrequencyValues = ['', 'monthly', 'weekly', 'biweekly'] as const;
export const currencyValues = ['IDR', 'USD', 'SGD'] as const;
export const ptkpValues = [
  '',
  'TK/0',
  'TK/1',
  'TK/2',
  'TK/3',
  'K/0',
  'K/1',
  'K/2',
  'K/3',
  'K/I/0',
  'K/I/1',
  'K/I/2',
  'K/I/3',
] as const;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().or(z.literal('').transform(() => '' as T[number]));

// ---- Schema -------------------------------------------------------------------

export const employeeFormSchema = z
  .object({
    // UI-only flag (drives conditional office email validation)
    has_office_email: z.boolean().default(true),

    // Identity & demographics
    name: z.string().trim().min(2, 'Full name is required (min 2 chars)').max(255),
    nick_name: optionalString,
    employee_id: optionalString,
    national_id: optionalDigits('NIK', 16),
    family_card_number: optionalDigits('KK', 16),
    npwp_number: optionalNpwp,
    passport_number: optionalString,
    passport_expiry: optionalDate,
    date_of_birth: optionalDate,
    place_of_birth: optionalString,
    gender: optionalEnum(genderValues),
    marital_status: optionalEnum(maritalValues),
    religion: optionalEnum(religionValues),
    nationality: optionalString,

    // Contact
    email: optionalEmail, // office email — conditionally required
    personal_email: z
      .string()
      .trim()
      .min(1, 'Personal email is required')
      .email('Invalid email'),
    phone: optionalPhone,
    mobile_number: optionalPhone,

    // Address (KTP)
    address: optionalLongText,
    city: optionalString,
    province: optionalString,
    postal_code: optionalPostalCode,

    // Address (Domicile)
    current_address: optionalLongText,
    current_city: optionalString,
    current_province: optionalString,
    current_postal_code: optionalPostalCode,

    // Emergency contact
    emergency_contact_name: optionalString,
    emergency_contact_phone: optionalPhone,
    emergency_contact_relationship: optionalString,
    emergency_contact_address: optionalLongText,

    // Employment
    job_title: optionalString,
    company_id: optionalId,
    department_id: optionalId,
    position_id: optionalId,
    work_location_id: optionalId,
    manager_id: optionalId,
    leave_approver_id: optionalId,
    overtime_approver_id: optionalId,
    employment_type: optionalEnum(employmentTypeValues),
    employment_status: optionalEnum(employmentStatusValues),
    work_schedule: optionalString,

    // Dates
    join_date: optionalDate,
    hire_date: optionalDate,
    probation_start_date: optionalDate,
    probation_end_date: optionalDate,
    contract_start_date: optionalDate,
    contract_end_date: optionalDate,

    // Payroll
    basic_salary: optionalCurrency,
    salary_currency: z.enum(currencyValues).optional().default('IDR'),
    pay_frequency: optionalEnum(payFrequencyValues),
    pay_type: optionalEnum(payTypeValues),
    salary_status: z.enum(salaryStatusValues).default('new_gross').optional(),
    transport_allowance: optionalCurrency,
    meal_allowance: optionalCurrency,
    position_allowance: optionalCurrency,

    // Tax / social security
    ptkp_status: optionalEnum(ptkpValues),
    bpjs_ketenagakerjaan_number: optionalString,
    bpjs_kesehatan_number: optionalString,
    jht_registered: z.boolean().optional().default(false),
    jp_registered: z.boolean().optional().default(false),
    medical_insurance: z.boolean().optional().default(false),
    life_insurance: z.boolean().optional().default(false),

    // Bank
    bank_name: optionalString,
    bank_account_number: optionalString,
    bank_account_holder: optionalString,
  })
  .refine(
    (d) => {
      if (!d.has_office_email) return true;
      return typeof d.email === 'string' && d.email.trim().length > 0;
    },
    {
      message: 'Office email is required when "Has office email" is enabled',
      path: ['email'],
    },
  )
  .refine(
    (d) => {
      // contract_end_date >= contract_start_date when both provided
      if (!d.contract_start_date || !d.contract_end_date) return true;
      return d.contract_end_date >= d.contract_start_date;
    },
    { message: 'Contract end must be after contract start', path: ['contract_end_date'] },
  );

export type EmployeeFormInput = z.input<typeof employeeFormSchema>;
export type EmployeeFormValues = z.output<typeof employeeFormSchema>;

/**
 * Fields belonging to each step (used for per-step `trigger()` validation).
 */
export const STEP_FIELDS = {
  1: [
    'name',
    'employee_id',
    'nick_name',
    'national_id',
    'family_card_number',
    'passport_number',
    'passport_expiry',
    'date_of_birth',
    'place_of_birth',
    'gender',
    'marital_status',
    'religion',
    'nationality',
    'company_id',
  ],
  2: [
    'job_title',
    'department_id',
    'manager_id',
    'work_location_id',
    'work_schedule',
    'employment_type',
    'employment_status',
    'join_date',
    'contract_start_date',
    'contract_end_date',
  ],
  3: [
    'basic_salary',
    'salary_currency',
    'pay_frequency',
    'pay_type',
    'salary_status',
    'transport_allowance',
    'meal_allowance',
    'position_allowance',
    'bank_name',
    'bank_account_number',
    'npwp_number',
    'ptkp_status',
    'bpjs_ketenagakerjaan_number',
    'bpjs_kesehatan_number',
  ],
  4: [
    'phone',
    'mobile_number',
    'personal_email',
    'email',
    'has_office_email',
    'address',
    'city',
    'province',
    'postal_code',
    'current_address',
    'current_city',
    'current_province',
    'current_postal_code',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'emergency_contact_address',
  ],
} as const satisfies Record<number, readonly (keyof EmployeeFormInput)[]>;
