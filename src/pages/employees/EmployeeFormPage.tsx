import { enumLabel } from '@/pages/employees/enum-labels';
import { t, useLocale, intlLocale } from '@/i18n';
import '@/components/ui/operations-refresh.css';
import '@/pages/employees/operations-workflows.css';
import '@/pages/employees/employee-form.css';
import { Modal } from '@/components/ui/Modal';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Save, Loader2, User, Phone, Briefcase, CreditCard, MapPin, Check, Hash, Calendar, Mail, Building, Clock, Wallet, Users, AlertCircle, FileText, Shield, LogOut, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSpinner, SearchableSelect } from '@/components/ui';
import { employeeService } from '@/services/employee.service';
import { departmentService } from '@/services/department.service';
import { companyService, type Company } from '@/services/company.service';
import { workLocationService, type WorkLocationOption } from '@/services/work-location.service';
import type { CreateEmployeeRequest, UpdateEmployeeRequest, PaginatedResponse, Department, Employee } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { canAction, canEditCompensation } from '@/lib/actions';
import {
  readEmployeeCreateDraft, removeEmployeeCreateDraft, writeEmployeeCreateDraft, type EmployeeDraftValues,
} from '@/lib/employee-create-draft';
import {
  employeeFormSchema,
  STEP_FIELDS,
  type EmployeeFormInput,
  type EmployeeFormValues,
} from '@/schemas/employee-form.schema';
import {
  resignSchema,
  type ResignFormInput,
  type ResignFormValues,
} from '@/schemas/resign.schema';

const STEPS = [
  { id: 1, title: 'Personal Info', subtitle: 'Basic details', icon: User },
  { id: 2, title: 'Employment', subtitle: 'Job info', icon: Briefcase },
  { id: 3, title: 'Payroll', subtitle: 'Salary & Tax', icon: Wallet },
  { id: 4, title: 'Contact', subtitle: 'Address', icon: MapPin },
  { id: 5, title: 'Review', subtitle: 'Confirm', icon: Check },
];

// Review date-only fields without interpreting midnight as a UTC instant.
const reviewDate = (value?: string) => {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
};

// Friendly labels for validation messages. Keep in sync with STEP_FIELDS.
const FIELD_LABELS: Record<string, string> = {
  // Step 1 — Personal
  name: 'Nama Lengkap',
  employee_id: 'Employee ID',
  nick_name: 'Nama Panggilan',
  national_id: 'NIK',
  family_card_number: 'No. KK',
  passport_number: 'No. Passport',
  passport_expiry: 'Passport Expiry',
  date_of_birth: 'Tanggal Lahir',
  place_of_birth: 'Tempat Lahir',
  gender: 'Jenis Kelamin',
  marital_status: 'Status Pernikahan',
  religion: 'Agama',
  nationality: 'Kewarganegaraan',
  company_id: 'Perusahaan',
  // Step 2 — Employment
  job_title: 'Jabatan',
  department_id: 'Departemen',
  manager_id: 'Atasan / Manager',
  work_location_id: 'Lokasi Kerja',
  work_schedule: 'Jadwal Kerja',
  employment_type: 'Tipe Karyawan',
  employment_status: 'Status Karyawan',
  join_date: 'Tanggal Masuk',
  contract_start_date: 'Mulai Kontrak',
  contract_end_date: 'Akhir Kontrak',
  // Step 3 — Payroll
  basic_salary: 'Gaji Pokok',
  pay_type: 'Tipe Pembayaran',
  pay_frequency: 'Frekuensi Pembayaran',
  salary_status: 'Status Karyawan (Payroll)',
  currency: 'Mata Uang',
  npwp_number: 'NPWP',
  ptkp_status: 'Status PTKP',
  bpjs_kesehatan_number: 'BPJS Kesehatan',
  bpjs_ketenagakerjaan_number: 'BPJS Ketenagakerjaan',
  bank_name: 'Nama Bank',
  bank_account_number: 'No. Rekening',
  bank_account_holder: 'Nama Pemilik Rekening',
  // Step 4 — Contact
  email: 'Email Kantor',
  personal_email: 'Email Pribadi',
  phone: 'Nomor Telepon',
  mobile_number: 'No. HP',
  address: 'Alamat KTP',
  city: 'Kota',
  province: 'Provinsi',
  postal_code: 'Kode Pos',
  current_address: 'Alamat Domisili',
  current_city: 'Kota Domisili',
  current_province: 'Provinsi Domisili',
  current_postal_code: 'Kode Pos Domisili',
  emergency_contact_name: 'Nama Kontak Darurat',
  emergency_contact_phone: 'No. HP Kontak Darurat',
  emergency_contact_relationship: 'Hubungan',
};

// ----- Default values ---------------------------------------------------------

const emptyValues: EmployeeFormInput = {
  has_office_email: true,
  name: '',
  nick_name: '',
  employee_id: '',
  national_id: '',
  family_card_number: '',
  npwp_number: '',
  passport_number: '',
  passport_expiry: '',
  date_of_birth: '',
  place_of_birth: '',
  gender: '',
  marital_status: '',
  religion: '',
  nationality: 'Indonesia',
  email: '',
  personal_email: '',
  phone: '',
  mobile_number: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  current_address: '',
  current_city: '',
  current_province: '',
  current_postal_code: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  emergency_contact_address: '',
  job_title: '',
  company_id: undefined,
  department_id: undefined,
  position_id: undefined,
  work_location_id: undefined,
  manager_id: undefined,
  leave_approver_id: undefined,
  overtime_approver_id: undefined,
  employment_type: 'permanent',
  employment_status: 'active',
  work_schedule: '',
  join_date: '',
  hire_date: '',
  probation_start_date: '',
  probation_end_date: '',
  contract_start_date: '',
  contract_end_date: '',
  basic_salary: undefined,
  salary_currency: 'IDR',
  pay_frequency: 'monthly',
  pay_type: 'gross',
  salary_status: 'new_gross',
  transport_allowance: undefined,
  meal_allowance: undefined,
  position_allowance: undefined,
  ptkp_status: '',
  bpjs_ketenagakerjaan_number: '',
  bpjs_kesehatan_number: '',
  jht_registered: false,
  jp_registered: false,
  medical_insurance: false,
  life_insurance: false,
  bank_name: '',
  bank_account_number: '',
  bank_account_holder: '',
};

const employeeToFormValues = (e: Employee): EmployeeFormInput => ({
  has_office_email: !!e.email && !e.email.endsWith('@temp.local'),
  name: e.name || '',
  nick_name: e.nick_name || '',
  employee_id: e.employee_id || '',
  national_id: e.national_id || '',
  family_card_number: e.family_card_number || '',
  npwp_number: e.npwp_number || '',
  passport_number: e.passport_number || '',
  passport_expiry: e.passport_expiry?.split('T')[0] || '',
  date_of_birth: e.date_of_birth?.split('T')[0] || '',
  place_of_birth: e.place_of_birth || '',
  gender: (e.gender as EmployeeFormInput['gender']) || '',
  marital_status: (e.marital_status as EmployeeFormInput['marital_status']) || '',
  religion: (e.religion as EmployeeFormInput['religion']) || '',
  nationality: e.nationality || 'Indonesia',
  email: e.email || '',
  personal_email: e.personal_email || '',
  phone: e.phone || '',
  mobile_number: e.mobile_number || '',
  address: e.address || '',
  city: e.city || '',
  province: e.province || '',
  postal_code: e.postal_code || '',
  current_address: e.current_address || '',
  current_city: e.current_city || '',
  current_province: e.current_province || '',
  current_postal_code: e.current_postal_code || '',
  emergency_contact_name: e.emergency_contact_name || '',
  emergency_contact_phone: e.emergency_contact_phone || '',
  emergency_contact_relationship: e.emergency_contact_relationship || '',
  emergency_contact_address: e.emergency_contact_address || '',
  // Use raw job_title as source of truth (per PFI ops). Previously this line
  // overrode the user-edited job_title with the legacy position.name relation,
  // causing the form to drift from the list display when HR updated job_title
  // without touching the Position FK.
  job_title: e.job_title || '',
  company_id: e.company_id,
  department_id: e.department_id,
  position_id: e.position_id,
  work_location_id: e.work_location_id,
  manager_id: e.manager_id,
  leave_approver_id: e.leave_approver_id,
  overtime_approver_id: e.overtime_approver_id,
  employment_type:
    (e.employment_type as EmployeeFormInput['employment_type']) || 'permanent',
  employment_status:
    (e.employment_status as EmployeeFormInput['employment_status']) || 'active',
  work_schedule: e.work_schedule || '',
  join_date: e.join_date?.split('T')[0] || '',
  hire_date: e.hire_date?.split('T')[0] || '',
  probation_start_date: e.probation_start_date?.split('T')[0] || '',
  probation_end_date: e.probation_end_date?.split('T')[0] || '',
  contract_start_date: e.contract_start_date?.split('T')[0] || '',
  contract_end_date: e.contract_end_date?.split('T')[0] || '',
  basic_salary: e.basic_salary,
  salary_currency: (e.salary_currency as EmployeeFormInput['salary_currency']) || 'IDR',
  pay_frequency: (e.pay_frequency as EmployeeFormInput['pay_frequency']) || 'monthly',
  // All PFI employees are gross — legacy 'net'/'nett' values normalized to 'gross'
  pay_type: 'gross',
  salary_status: (e.salary_status as EmployeeFormInput['salary_status']) || 'new_gross',
  transport_allowance: e.transport_allowance,
  meal_allowance: e.meal_allowance,
  position_allowance: e.position_allowance,
  ptkp_status: (e.ptkp_status as EmployeeFormInput['ptkp_status']) || '',
  bpjs_ketenagakerjaan_number: e.bpjs_ketenagakerjaan_number || '',
  bpjs_kesehatan_number: e.bpjs_kesehatan_number || '',
  jht_registered: !!e.jht_registered,
  jp_registered: !!e.jp_registered,
  medical_insurance: !!e.medical_insurance,
  life_insurance: !!e.life_insurance,
  bank_name: e.bank_name || '',
  bank_account_number: e.bank_account_number || '',
  bank_account_holder: e.bank_account_holder || '',
});

function buildPayload(values: EmployeeFormValues): CreateEmployeeRequest;
function buildPayload(values: EmployeeFormValues, dirty: Partial<Record<keyof EmployeeFormValues, unknown>>): UpdateEmployeeRequest;
function buildPayload(values: EmployeeFormValues, dirty?: Partial<Record<keyof EmployeeFormValues, unknown>>): UpdateEmployeeRequest {
  // Defensively cast — Zod's optionalEnum yields '' | enum-string
  const stripped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (k === 'has_office_email') continue;
    if (dirty && !dirty[k as keyof EmployeeFormValues]) continue;
    if (v === '' || v === undefined || v === null) {
      if (dirty) stripped[k] = null;
    } else stripped[k] = v;
  }
  // If office email toggle was off, ensure email isn't accidentally sent
  if (!values.has_office_email) {
    if (dirty?.has_office_email || dirty?.email) stripped.email = null;
    else delete stripped.email;
  }
  return stripped as UpdateEmployeeRequest;
}

// Compensation inputs (incl. their form defaults such as IDR/monthly/gross) must
// not be sent without employee.update_salary; the API would refuse the request.
const COMPENSATION_FIELDS = ['basic_salary', 'salary_currency', 'pay_frequency', 'pay_type', 'salary_status',
  'transport_allowance', 'meal_allowance', 'position_allowance', 'communication_allowance', 'housing_allowance',
  'performance_bonus', 'salary_grade_id'] as const;
type CompensationField = (typeof COMPENSATION_FIELDS)[number];
// Every compensation field is optional in Create/UpdateEmployeeRequest, so the
// narrowed Omit<> payload stays assignable to the service without widening it.
function withoutCompensation<T extends object>(payload: T, compensationEditable: boolean): T | Omit<T, CompensationField> {
  if (compensationEditable) return payload;
  const kept = Object.entries(payload).filter(([key]) => !(COMPENSATION_FIELDS as readonly string[]).includes(key));
  return Object.fromEntries(kept) as Omit<T, CompensationField>;
}

async function allPages<T>(fetchPage: (page: number) => Promise<PaginatedResponse<T>>): Promise<T[]> {
  const first = await fetchPage(1);
  const rows = [...first.data];
  for (let page = 2; page <= first.pagination.totalPages; page++) rows.push(...(await fetchPage(page)).data);
  return rows;
}

// =============================================================================

export function EmployeeFormPage() {
  useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const authUser = useAuthStore(state => state.user);
  const compensationEditable = canEditCompensation(authUser);
  const employeeLookupAvailable = canAction(authUser, 'employee.view');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocationOption[]>([]);
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState<string>('');
  const [isLoadingEmployeeId, setIsLoadingEmployeeId] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);

  // Resign modal — RHF + Zod (migrated from useState in Wave 6)
  const {
    register: registerResign,
    handleSubmit: handleSubmitResign,
    reset: resetResign,
    formState: { errors: resignErrors, isSubmitting: isResigning },
  } = useForm<ResignFormInput, unknown, ResignFormValues>({
    resolver: zodResolver(resignSchema),
    defaultValues: {
      resign_date: '',
      resign_type: undefined,
      resign_reason: '',
      resign_notes: '',
    },
    mode: 'onBlur',
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    getValues,
    trigger,
    getFieldState,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: emptyValues,
    mode: 'onBlur',
  });

  // Watched values for reactive UI
  const companyId = watch('company_id');
  const joinDate = watch('join_date');
  const hasOfficeEmail = watch('has_office_email');
  const employmentType = watch('employment_type');

  // ---- Fetch reference data + employee (edit mode) -------------------------
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(false);
      try {
        const [deptResponse, companyResponse, empResponse, workLocResponse] = await Promise.all([
          allPages(page => departmentService.getAll({ page, limit: 100 })),
          allPages(page => companyService.getAll({ page, limit: 100, is_active: true })),
          // The employee directory (manager lookup) is optional: a create-only account
          // without employee.view skips it instead of failing the whole form.
          employeeLookupAvailable
            ? allPages(page => employeeService.getAll({ page, limit: 200, employment_status: 'active' }))
            : Promise.resolve([] as Employee[]),
          // Use lightweight /options endpoint to populate the work-location dropdown.
          workLocationService.getOptions(),
        ]);
        const employee = id ? await employeeService.getById(Number(id)) : null;
        if (cancelled) return;
        setDepartments(deptResponse);
        setCompanies(companyResponse);
        setEmployees(empResponse);
        setWorkLocations(workLocResponse);

        if (employee) {
          reset(employeeToFormValues(employee));
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(true);
        console.error('Failed to fetch data:', error);
        toast.error(t("Failed to load data"), { id: 'api-error' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [id, reset, loadAttempt, employeeLookupAvailable]);

  // ---- Auto-generate employee_id on company change (create mode) -----------
  useEffect(() => {
    let cancelled = false;
    if (isEdit) return;
    setGeneratedEmployeeId('');
    setValue('employee_id', '');
    setIsLoadingEmployeeId(false);
    const fetchNextEmployeeId = async () => {
      if (!isEdit && companyId) {
        setIsLoadingEmployeeId(true);
        try {
          const nextId = await employeeService.getNextEmployeeId(Number(companyId));
          if (cancelled) return;
          setGeneratedEmployeeId(nextId);
          setValue('employee_id', nextId, { shouldValidate: false });
        } catch (error) {
          console.error('Failed to generate employee ID:', error);
        } finally {
          if (!cancelled) setIsLoadingEmployeeId(false);
        }
      }
    };

    fetchNextEmployeeId();
    return () => { cancelled = true; };
  }, [companyId, isEdit, setValue]);

  // ---- Auto-update BPJS defaults on employment_type change -----------------
  // Mirror old behavior: permanent => all 4 true; freelance => jht only; else => all false
  const [lastEmploymentType, setLastEmploymentType] = useState<string>('');
  useEffect(() => {
    // Existing benefits are explicit stored choices, not defaults to reapply
    // when the async employee fetch resets the form.
    if (isEdit || !employmentType || employmentType === lastEmploymentType) return;

    if (employmentType === 'permanent') {
      setValue('jht_registered', true);
      setValue('jp_registered', true);
      setValue('medical_insurance', true);
      setValue('life_insurance', true);
    } else if (employmentType === 'freelance') {
      setValue('jht_registered', true);
      setValue('jp_registered', false);
      setValue('medical_insurance', false);
      setValue('life_insurance', false);
    } else {
      setValue('jht_registered', false);
      setValue('jp_registered', false);
      setValue('medical_insurance', false);
      setValue('life_insurance', false);
    }
    setLastEmploymentType(employmentType);
  }, [employmentType, lastEmploymentType, isEdit, setValue]);

  // ---- Auto-calculate probation dates when join_date changes ---------------
  // A restored draft sets join_date once; its saved (possibly custom) probation
  // dates must survive that single change. Later real changes recalculate.
  const skipProbationForRestore = useRef<string | null>(null);
  useEffect(() => {
    if (isEdit) return;
    const restoring = skipProbationForRestore.current !== null && skipProbationForRestore.current === (joinDate ?? '');
    skipProbationForRestore.current = null;
    if (restoring) return;
    if (joinDate && /^\d{4}-\d{2}-\d{2}$/.test(joinDate)) {
      const [year, month, day] = joinDate.split('-').map(Number);
      // Clamp to the last day of the target calendar month: Jan 31 + 3
      // months is Apr 30, not May 1. UTC keeps date-only fields stable.
      const lastDay = new Date(Date.UTC(year, month + 3, 0)).getUTCDate();
      const probationDate = new Date(Date.UTC(year, month - 1 + 3, Math.min(day, lastDay)));
      const probationEnd = probationDate.toISOString().split('T')[0];
      setValue('probation_start_date', joinDate);
      setValue('probation_end_date', probationEnd);
    } else {
      // Clearing the source date must not submit a stale derived period.
      setValue('probation_start_date', '');
      setValue('probation_end_date', '');
    }
  }, [joinDate, isEdit, setValue]);

  // ---- Reset office email value when toggle disabled -----------------------
  useEffect(() => {
    if (!hasOfficeEmail) {
      setValue('email', '');
    }
  }, [hasOfficeEmail, setValue]);

  // ---- Refresh-safe Add Employee draft (create only, this tab, this user) ----
  // Restore waits for auth + reference data, re-checks company/related records
  // against what this account can load, drops compensation without salary-edit
  // access and never reuses the generated employee ID. Persistence starts only
  // after a real user edit (or a restore) and writes synchronously on change.
  const draftUserId = !isEdit ? authUser?.id : undefined;
  const [draftChecked, setDraftChecked] = useState(false);
  const [draftNotice, setDraftNotice] = useState<'restored' | 'saved' | 'unavailable' | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [draftTrimmed, setDraftTrimmed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const draftTouched = useRef(false);
  const draftFinished = useRef(false);
  const draftStep = useRef(currentStep);
  const persistDraft = useRef<(() => void) | null>(null);

  // The same mounted form can switch route (create <-> edit without reload) or
  // account (setUser/refresh). Either change ends the previous draft scope: old
  // writes stop, create values are cleared and the new scope restores its own
  // draft (if any). An edit route loads its employee via the fetch effect.
  const draftScope = `${id ?? 'create'}:${authUser?.id ?? 'none'}`;
  const previousDraftScope = useRef(draftScope);
  useEffect(() => {
    if (previousDraftScope.current === draftScope) return;
    previousDraftScope.current = draftScope;
    draftTouched.current = false;
    draftFinished.current = false;
    skipProbationForRestore.current = null;
    setDraftChecked(false);
    setDraftNotice(null);
    setDraftTrimmed(false);
    setConfirmDiscard(false);
    if (!id) {
      setLastEmploymentType('');
      reset(emptyValues);
    }
    draftStep.current = 1;
    setCurrentStep(1);
  }, [draftScope, id, reset]);

  useEffect(() => {
    if (draftUserId === undefined || isLoading || loadError || draftChecked) return;
    const draft = readEmployeeCreateDraft(draftUserId);
    if (draft) {
      const restored: EmployeeDraftValues = { ...draft.values };
      let trimmed = false;
      const drop = (key: keyof EmployeeDraftValues) => {
        const value = restored[key];
        if (value !== undefined && value !== null && value !== '') trimmed = true;
        delete restored[key];
      };
      const present = (value: unknown) => value !== undefined && value !== null && value !== '';
      const companyIdValue = Number(restored.company_id);
      if (present(restored.company_id) && !companies.some(c => c.id === companyIdValue)) {
        // Company no longer accessible: drop it and everything scoped to it.
        for (const key of ['company_id', 'department_id', 'position_id', 'work_location_id', 'manager_id',
          'leave_approver_id', 'overtime_approver_id'] as const) drop(key);
      } else {
        if (present(restored.department_id) && !departments.some(d => d.id === Number(restored.department_id)
          && (d.company_id ?? d.company?.id ?? companyIdValue) === companyIdValue)) drop('department_id');
        if (present(restored.work_location_id) && !workLocations.some(w => w.id === Number(restored.work_location_id)
          && (w.company_id == null || w.company_id === companyIdValue))) drop('work_location_id');
        for (const key of ['manager_id', 'leave_approver_id', 'overtime_approver_id'] as const) {
          if (present(restored[key]) && !employees.some(e => e.id === Number(restored[key]))) drop(key);
        }
      }
      if (!compensationEditable) for (const key of COMPENSATION_FIELDS) drop(key as keyof EmployeeDraftValues);
      // Default effects must not overwrite the restored BPJS/probation choices.
      skipProbationForRestore.current = typeof restored.join_date === 'string' ? restored.join_date : '';
      setLastEmploymentType(typeof restored.employment_type === 'string' && restored.employment_type ? restored.employment_type : 'permanent');
      reset({ ...emptyValues, ...restored } as EmployeeFormInput);
      draftStep.current = draft.step;
      setCurrentStep(draft.step);
      draftTouched.current = true;
      setDraftSavedAt(draft.saved_at);
      setDraftTrimmed(trimmed);
      setDraftNotice('restored');
      // Keep the stored record in line with what was actually restored.
      writeEmployeeCreateDraft(draftUserId, compensationEditable ? restored : withoutCompensation(restored, false), draft.step);
    }
    setDraftChecked(true);
  }, [draftUserId, isLoading, loadError, draftChecked, companies, departments, workLocations, employees, compensationEditable, reset]);

  useEffect(() => {
    if (draftUserId === undefined || !draftChecked) return;
    const persist = () => {
      if (draftFinished.current) return;
      const values = getValues();
      const result = writeEmployeeCreateDraft(draftUserId, compensationEditable ? values : withoutCompensation(values, false), draftStep.current);
      // Not the authenticated account any more (session ended/replaced): stop
      // writing for this form; the scope reset below takes over.
      if (result === 'not_owner') { draftFinished.current = true; return; }
      setDraftNotice(notice => !result ? 'unavailable' : notice === 'restored' ? 'restored' : 'saved');
    };
    persistDraft.current = persist;
    const subscription = watch((_values, { name, type }) => {
      if (draftFinished.current) return;
      if (!draftTouched.current) {
        // Programmatic defaults (BPJS flags, probation, generated ID) are not a draft.
        if (type !== 'change' && !(name && getFieldState(name as Parameters<typeof getFieldState>[0]).isDirty)) return;
        draftTouched.current = true;
      }
      persist();
    });
    return () => { subscription.unsubscribe(); persistDraft.current = null; };
  }, [draftUserId, draftChecked, compensationEditable, getValues, getFieldState, watch]);

  useEffect(() => {
    draftStep.current = currentStep;
    if (draftTouched.current && !draftFinished.current) persistDraft.current?.();
  }, [currentStep]);

  const discardDraft = () => {
    draftTouched.current = false;
    if (draftUserId !== undefined) removeEmployeeCreateDraft(draftUserId);
    skipProbationForRestore.current = null;
    setLastEmploymentType('');
    reset(emptyValues);
    draftStep.current = 1;
    setCurrentStep(1);
    setDraftNotice(null);
    setDraftTrimmed(false);
    setConfirmDiscard(false);
  };

  // ---- Derived: departments filtered by company ----------------------------
  const companyIdNum = companyId != null && companyId !== '' ? Number(companyId) : undefined;
  const filteredDepartments = departments.filter((d) => {
    if (!companyIdNum) return true;
    const deptCompanyId = d.company_id || d.company?.id;
    return deptCompanyId == null || deptCompanyId === companyIdNum;
  });

  // ---- Step navigation -----------------------------------------------------
  const nextStep = async () => {
    if (currentStep >= STEPS.length) return;
    const fieldsForStep = STEP_FIELDS[currentStep as 1 | 2 | 3 | 4];
    // `shouldFocus: true` makes RHF focus the first invalid field automatically.
    const isValid = await trigger(fieldsForStep as unknown as Parameters<typeof trigger>[0], { shouldFocus: true });
    if (!isValid) {
      // Use getFieldState — always reads the latest validation state.
      // (Destructured `errors` is a closure snapshot — stale on first click.)
      const invalid = fieldsForStep
        .map((f) => {
          const state = getFieldState(f as Parameters<typeof getFieldState>[0]);
          if (!state.invalid) return null;
          const label = t(FIELD_LABELS[f] || f.replace(/_/g, ' '));
          const msg = state.error?.message;
          return msg ? `${label}: ${t(msg)}` : label;
        })
        .filter((x): x is string => x !== null);

      if (invalid.length > 0) {
        const preview = invalid.slice(0, 3).join('\n• ');
        const extra = invalid.length > 3 ? '\n' + t('…and {count} more', { count: invalid.length - 3 }) : '';
        toast.error(t('Please fix the following:') + '\n• ' + preview + extra, { duration: 5000 });
      } else {
        toast.error(t("Please fix validation errors before continuing"));
      }
      return;
    }
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step: number) => {
    if (step <= currentStep) setCurrentStep(step);
    else if (step === currentStep + 1) void nextStep();
  };

  // ---- Submit --------------------------------------------------------------
  const onSubmit = handleSubmit(async (values) => {
    if (currentStep !== STEPS.length) {
      // Block accidental submits triggered from earlier steps
      return;
    }
    try {
      if (isEdit && id) {
        await employeeService.update(parseInt(id), withoutCompensation(buildPayload(values, dirtyFields), compensationEditable));
        toast.success(t("Employee updated successfully"));
      } else {
        await employeeService.create(withoutCompensation(buildPayload(values), compensationEditable));
        // Created: the draft is done. Mark finished first so no later change
        // (navigation/unmount) can write it back. A failed save keeps it.
        draftFinished.current = true;
        if (draftUserId !== undefined) removeEmployeeCreateDraft(draftUserId);
        toast.success(t("Employee created successfully"));
      }
      navigate('/employees');
    } catch (error) {
      // Axios interceptor handles toast for HTTP errors
      console.error('Failed to save employee:', error);
    }
  }, (validationErrors) => {
    const failedStep = Object.entries(STEP_FIELDS).find(([, fields]) => fields.some(field => field in validationErrors));
    if (failedStep) setCurrentStep(Number(failedStep[0]));
    toast.error(t("Periksa isian yang ditandai sebelum menyimpan."), { id: 'employee-validation' });
  });

  // ---- Resign action -------------------------------------------------------
  const closeResignModal = () => {
    resetResign();
    setShowResignModal(false);
  };

  const onResign = handleSubmitResign(async (data) => {
    try {
      await employeeService.update(parseInt(id!), {
        resign_date: data.resign_date,
        resign_type: data.resign_type,
        resign_reason: data.resign_reason,
        resign_notes: data.resign_notes,
        employment_status: 'resigned',
      });
      toast.success(t("Karyawan berhasil di-resign"));
      resetResign();
      setShowResignModal(false);
      navigate('/employees');
    } catch (error) {
      // Axios interceptor handles toast for HTTP errors
      console.error('Failed to resign employee:', error);
    }
  });

  if (isLoading) {
    return <PageSpinner />;
  }

  if (loadError) return (
    <div role="alert" className="ph-section ops-section">
      <h1 className="ops-page-title">{t("Data formulir karyawan gagal dimuat")}</h1>
      <p>{t("Muat ulang data sebelum menambah atau mengedit karyawan.")}</p>
      <button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="ph-button ph-button-primary">{t("Coba Lagi")}</button>
    </div>
  );

  // Get current form values for review step (read-only display)
  const values = watch();

  return (
    <div className="ph-workflow ops-workflow ph-form-page ops-employee-form operations-refresh-form">
      {/* Form heading */}
      <header className="ph-page-header ops-page-heading"><div>
                  <h1 className="ops-page-title">
                    {isEdit ? t("Edit Employee") : t("Add New Employee")}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">{t("Step")} <span className="font-bold">{currentStep}</span>{' '}{t("of")} <span className="font-bold">{STEPS.length}</span>{' '}{t("- Fields marked * are required")} </p>
                </div><div className="ph-actions"><div className="flex items-center gap-3">
              {isEdit && values.employment_status === 'active' && canAction(authUser, 'employee.update') && (
                <button
                  type="button"
                  onClick={() => setShowResignModal(true)}
                  className="ph-button ops-danger"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t("Resign")}</span>
                </button>
              )}
              <Link
                to="/employees"
                className="ph-button"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t("Back to List")}</span>
              </Link>
            </div></div></header>

      <nav aria-label={t("Employee registration steps")}><ol className="ops-step-nav">
        {STEPS.map((step) => <li key={step.id}><button type="button" aria-label={t('Go to {step}', { step: t(step.title) })} aria-current={currentStep === step.id ? 'step' : undefined} onClick={() => goToStep(step.id)} disabled={step.id > currentStep + 1}><span>{step.id}</span>{t(step.title)}</button></li>)}
      </ol></nav>

      {/* Add Employee draft notice (create only) */}
      {!isEdit && draftNotice && <div className="employee-draft-notice" role="status" data-testid="employee-draft-notice">
        <p>
          {draftNotice === 'restored'
            ? t('Draft restored from this browser tab (saved {time}). The employee ID was generated again.', {
              time: draftSavedAt ? new Date(draftSavedAt).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' }) : '-' })
            : draftNotice === 'saved'
              ? t('Draft saved in this browser tab until the employee is created, discarded or you sign out.')
              : t('This browser is not keeping a draft; finish the form in this session.')}
          {draftTrimmed && <> {t('Some draft entries were not restored because your company or salary access changed.')}</>}
        </p>
        {draftNotice !== 'unavailable' && (confirmDiscard
          ? <span className="employee-draft-confirm">
              <span>{t('Discard the draft and clear the form?')}</span>
              <button type="button" className="ph-button ops-danger" onClick={discardDraft} data-testid="employee-draft-discard-confirm">{t('Discard')}</button>
              <button type="button" className="ph-button" onClick={() => setConfirmDiscard(false)}>{t('Keep draft')}</button>
            </span>
          : <button type="button" className="ph-button" onClick={() => setConfirmDiscard(true)} data-testid="employee-draft-discard">{t('Discard draft')}</button>)}
      </div>}

      {/* Form */}
      <form onSubmit={onSubmit} noValidate className="employee-form-body">
        {/* Each step is conditionally hidden via className so RHF state is preserved */}
        <div className={currentStep === 1 ? '' : 'hidden'}>
          <Step1Personal
            register={register}
            errors={errors}
            companies={companies}
            generatedEmployeeId={generatedEmployeeId}
            isLoadingEmployeeId={isLoadingEmployeeId}
            isEdit={isEdit}
            onCompanyChange={() => setValue('department_id', undefined, { shouldDirty: true })}
          />
        </div>
        <div className={currentStep === 2 ? '' : 'hidden'}>
          <Step2Employment
            register={register}
            errors={errors}
            control={control}
            departments={filteredDepartments}
            workLocations={workLocations}
            employees={employees}
            companyId={companyId != null ? Number(companyId) : undefined}
            currentEmployeeId={id ? parseInt(id) : 0}
            employeeLookupAvailable={employeeLookupAvailable}
          />
        </div>
        <div className={currentStep === 3 ? '' : 'hidden'}>
          <Step3Payroll register={register} errors={errors} compensationEditable={compensationEditable} />
        </div>
        <div className={currentStep === 4 ? '' : 'hidden'}>
          <Step4Contact
            register={register}
            errors={errors}
            hasOfficeEmail={!!hasOfficeEmail}
            setValue={setValue}
          />
        </div>
        <div className={currentStep === 5 ? '' : 'hidden'}>
          <Step5Review
            values={values as EmployeeFormInput}
            companies={companies}
            departments={departments}
            employees={employees}
            compensationEditable={compensationEditable}
          />
        </div>

        {/* Navigation */}
        <div className="ph-form-actions ops-wizard-actions">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="ph-button"
            >
              <ArrowLeft className="h-4 w-4" />{t("Previous")} </button>

            <div className="flex items-center gap-3">
              {currentStep < 5 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ph-button ph-button-primary"
                >{t("Next Step")} <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {currentStep === 5 && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ph-button ph-button-primary"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />{t("Saving...")} </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEdit ? t("Update Employee") : t("Create Employee")}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Resign Modal — RHF + Zod (Wave 6 migration) */}
      {showResignModal && (
        <Modal isOpen={true} onClose={closeResignModal} title={t("Resign Karyawan")} size="lg" busy={isResigning} className="ph-workflow ops-workflow ops-modal operations-refresh-dialog"><form
              onSubmit={onResign}
              onKeyDown={(e) => {
                // Block accidental Enter-submit from text inputs (textarea/select unaffected).
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              noValidate
              className="ops-dialog-form"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">

                  <div>

                    <p className="text-sm text-gray-500">{values.name}</p>
                  </div>
                </div>

              </div>

              <div className="ops-dialog-content space-y-5">
                <div className="ops-record-block">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-amber-800">{t("Perhatian")}</h5>
                    <p className="text-sm text-amber-700 mt-1">{t("Status karyawan akan diubah menjadi")} <strong>{t("Resigned")}</strong>{t(". Data resign akan disimpan dan karyawan tidak akan tampil di daftar aktif.")} </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="ops-employeeform-1" className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><Calendar className="h-4 w-4 text-red-600" /></span>{t("Tanggal Resign")} <span className="text-red-500">*</span>
                  </label>
                  <input id="ops-employeeform-1"
                    type="date"
                    {...registerResign('resign_date')}
                    className="block w-full rounded-xl border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  />
                  {resignErrors.resign_date && (
                    <p className="mt-1 text-sm text-red-600">{t(resignErrors.resign_date.message || "")}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ops-employeeform-2" className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-orange-600" /></span>{t("Tipe Resign")} <span className="text-red-500">*</span>
                  </label>
                  <select id="ops-employeeform-2"
                    {...registerResign('resign_type')}
                    defaultValue=""
                    className="block w-full rounded-xl border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  >
                    <option value="">{t("-- Pilih Tipe Resign --")}</option>
                    <option value="voluntary">{t("Voluntary (Mengundurkan Diri)")}</option>
                    <option value="involuntary">{t("Involuntary (PHK)")}</option>
                    <option value="retirement">{t("Retirement (Pensiun)")}</option>
                    <option value="contract_end">{t("Contract End (Kontrak Berakhir)")}</option>
                    <option value="mutual_agreement">{t("Mutual Agreement (Kesepakatan Bersama)")}</option>
                    <option value="other">{t("Other (Lainnya)")}</option>
                  </select>
                  {resignErrors.resign_type && (
                    <p className="mt-1 text-sm text-red-600">{t(resignErrors.resign_type.message || "")}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ops-employeeform-3" className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-purple-600" /></span>{t("Alasan Resign")} </label>
                  <input id="ops-employeeform-3"
                    type="text"
                    {...registerResign('resign_reason')}
                    placeholder={t("Contoh: Pindah ke perusahaan lain, Melanjutkan pendidikan, dll")}
                    className="block w-full rounded-xl border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  />
                  {resignErrors.resign_reason && (
                    <p className="mt-1 text-sm text-red-600">{t(resignErrors.resign_reason.message || "")}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ops-employeeform-4" className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-gray-600" /></span>{t("Catatan Tambahan")} </label>
                  <textarea id="ops-employeeform-4"
                    {...registerResign('resign_notes')}
                    placeholder={t("Catatan tambahan mengenai proses resign...")}
                    rows={3}
                    className="block w-full rounded-xl border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all resize-none"
                  />
                  {resignErrors.resign_notes && (
                    <p className="mt-1 text-sm text-red-600">{t(resignErrors.resign_notes.message || "")}</p>
                  )}
                </div>
              </div>

              <div className="ph-form-actions ops-wizard-actions">
                <button
                  type="button"
                  onClick={closeResignModal}
                  className="ph-button"
                >{t("Batal")} </button>
                <button
                  type="submit"
                  disabled={isResigning}
                  className="ph-button ph-button-primary"
                >
                  {isResigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />{t("Processing...")} </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />{t("Konfirmasi Resign")} </>
                  )}
                </button>
              </div>
            </form></Modal>
      )}
    </div>
  );
}

// ============================================================================
// Step components
// ============================================================================

type StepProps = {
  register: UseFormRegister<EmployeeFormInput>;
  errors: FieldErrors<EmployeeFormInput>;
};

function Step1Personal({
  register,
  errors,
  companies,
  generatedEmployeeId,
  isLoadingEmployeeId,
  isEdit,
  onCompanyChange,
}: StepProps & {
  companies: Company[];
  generatedEmployeeId: string;
  isLoadingEmployeeId: boolean;
  isEdit: boolean;
  onCompanyChange: () => void;
}) {
  useLocale();
  return (
    <div className="ops-form-step">
      <section className="ops-form-section employee-field-group">
        <h3>{t("Registration")}</h3>
        <div className="ph-form-grid ">
          <div>
            <FieldLabel name="company_id" label={t("Company")} required icon={<Building className="h-4 w-4 text-indigo-600" />} />
            <select id="company_id"
              {...register('company_id', {
                onChange: onCompanyChange,
                // `valueAsNumber: true` turns '' (no selection) into NaN, which
                // breaks the Zod union schema. `setValueAs` returns undefined
                // for empty and Number(v) otherwise — schema-friendly.
                setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
              })}
              className={baseInput}
            >
              <option value="">{t("-- Pilih Company --")}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
            <FieldHint>{t("Pilih company dimana karyawan akan didaftarkan")}</FieldHint>
            <FieldError msg={errors.company_id?.message} />
          </div>
          <div>
            <FieldLabel name="employee_id" label={t("Employee ID (NIK)")} icon={<Hash className="h-4 w-4 text-indigo-600" />} />
            <div className="relative">
              <input id="employee_id"
                type="text"
                {...register('employee_id')}
                placeholder={isLoadingEmployeeId ? t("Generating...") : t("Pilih company untuk generate otomatis")}
                readOnly={!isEdit && !!generatedEmployeeId}
                className={`block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm transition-all ${!isEdit && generatedEmployeeId ? 'bg-gray-50 font-mono font-bold text-indigo-700' : ''
                  }`}
              />
              {isLoadingEmployeeId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <FieldHint>
              {generatedEmployeeId
                ? `${t("Format:")} ${generatedEmployeeId.split('-').slice(0, 2).join('-')}-YYNNNNN`
                : t("Pilih company terlebih dahulu untuk generate ID otomatis")}
            </FieldHint>
            <FieldError msg={errors.employee_id?.message} />
          </div></div>
      </section>
      <section className="ops-form-section employee-field-group">
        <h3>{t("Personal details")}</h3>
        <div className="ph-form-grid employee-grid-four">
          <TextField
            label={t("Full Name")}
            name="name"
            register={register}
            errors={errors}
            placeholder="John Doe"
            required
            hint={t("Full legal name as per ID card")}
            icon={<User className="h-4 w-4 text-blue-600" />}
          />
          <TextField
            label={t("Nickname")}
            name="nick_name"
            register={register}
            errors={errors}
            placeholder="John"
            hint={t("Preferred name or nickname")}
            icon={<User className="h-4 w-4 text-cyan-600" />}
          />
          <TextField
            label={t("Date of Birth")}
            name="date_of_birth"
            type="date"
            register={register}
            errors={errors}
            icon={<Calendar className="h-4 w-4 text-green-600" />}
          />
          <TextField
            label={t("Place of Birth")}
            name="place_of_birth"
            register={register}
            errors={errors}
            placeholder="Jakarta"
            hint={t("City/regency of birth")}
            icon={<MapPin className="h-4 w-4 text-red-600" />}
          />
          <SelectField
            label={t("Gender")}
            name="gender"
            register={register}
            errors={errors}
            icon={<Users className="h-4 w-4 text-purple-600" />}
            options={[
              { value: '', label: t('-- Select Gender --') },
              { value: 'male', label: t('Male (Laki-laki)') },
              { value: 'female', label: t('Female (Perempuan)') },
            ]}
          />
          <SelectField
            label={t("Marital Status")}
            name="marital_status"
            register={register}
            errors={errors}
            icon={<Users className="h-4 w-4 text-pink-600" />}
            options={[
              { value: '', label: t('-- Select Status --') },
              { value: 'single', label: t('Single (Belum Menikah)') },
              { value: 'married', label: t('Married (Menikah)') },
              { value: 'divorced', label: t('Divorced (Cerai)') },
              { value: 'widowed', label: t('Widowed (Duda/Janda)') },
            ]}
          />
          <SelectField
            label={t("Religion")}
            name="religion"
            register={register}
            errors={errors}
            icon={<Users className="h-4 w-4 text-teal-600" />}
            options={[
              { value: '', label: t('-- Select Religion --') },
              { value: 'islam', label: t('Islam') },
              { value: 'kristen', label: t('Kristen') },
              { value: 'katolik', label: t('Katolik') },
              { value: 'hindu', label: t('Hindu') },
              { value: 'buddha', label: t('Buddha') },
              { value: 'konghucu', label: t('Konghucu') },
              { value: 'other', label: t('Other') },
            ]}
          />
          <TextField
            label={t("Nationality")}
            name="nationality"
            register={register}
            errors={errors}
            placeholder="Indonesia"
            hint={t("Country of citizenship")}
            icon={<MapPin className="h-4 w-4 text-blue-600" />}
          /></div>
      </section>
      <section className="ops-form-section employee-field-group">
        <h3>{t("Identity documents")}</h3>
        <div className="ph-form-grid employee-grid-four">
          <TextField
            label={t("NIK KTP")}
            name="national_id"
            register={register}
            errors={errors}
            placeholder="1234567890123456"
            hint={t("16-digit National ID Number")}
            icon={<CreditCard className="h-4 w-4 text-purple-600" />}
          />
          <TextField
            label={t("Family Card Number (KK)")}
            name="family_card_number"
            register={register}
            errors={errors}
            placeholder="1234567890123456"
            hint={t("16-digit Family Card Number")}
            icon={<CreditCard className="h-4 w-4 text-indigo-600" />}
          />
          <TextField
            label={t("Passport Number")}
            name="passport_number"
            register={register}
            errors={errors}
            placeholder="A1234567"
            icon={<FileText className="h-4 w-4 text-teal-600" />}
          />
          <TextField
            label={t("Passport Expiry")}
            name="passport_expiry"
            type="date"
            register={register}
            errors={errors}
            icon={<Calendar className="h-4 w-4 text-red-600" />}
          /></div>
      </section>
    </div>
  );
}

function Step2Employment({
  register,
  errors,
  control,
  departments,
  workLocations,
  employees,
  companyId,
  currentEmployeeId,
  employeeLookupAvailable = true,
}: StepProps & {
  control: Control<EmployeeFormInput>;
  departments: Department[];
  workLocations: WorkLocationOption[];
  employees: Employee[];
  companyId: number | undefined;
  currentEmployeeId: number;
  employeeLookupAvailable?: boolean;
}) {
  useLocale();
  return (
    <div className="ph-section ops-form-step">


      {/* Job Details */}
      <div className="ph-section ops-form-section">
        <h3>{t("Job Details")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid employee-grid-three">
            <TextField
              label={t("Position")}
              name="job_title"
              register={register}
              errors={errors}
              placeholder={t("Software Engineer")}
              icon={<Briefcase className="h-4 w-4 text-blue-600" />}
            />
            <SelectField
              label={t("Department")}
              name="department_id"
              register={register}
              errors={errors}
              valueAsNumber
              icon={<Building className="h-4 w-4 text-indigo-600" />}
              options={[
                { value: '', label: companyId ? t('-- Select Department --') : t('-- Pilih Company dulu --') },
                ...departments.map((d) => ({ value: d.id.toString(), label: d.name })),
              ]}
            />
            <div>
              <FieldLabel label={t("Reports To (Manager)")} icon={<Users className="h-4 w-4 text-purple-600" />} />
              {!employeeLookupAvailable ? <FieldHint><span data-testid="manager-lookup-unavailable">{t("Manager selection needs access to the employee directory. Leave it empty; it can be set later by someone with that access.")}</span></FieldHint> : <><Controller
                name="manager_id"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ''}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    placeholder={t("-- No Manager (Top Level / Group CEO) --")}
                    searchPlaceholder="Search by name..."
                    emptyMessage={t("No employees found")}
                    options={employees
                      .filter((e) => e.id !== currentEmployeeId)
                      .map((e) => ({
                        value: e.id,
                        label: e.name,
                        sublabel: `${e.position?.name || e.job_title || t('No Position')} • ${e.company?.name || ''}`,
                      }))}
                  />
                )}
              />
              <FieldHint>{t("Pilih atasan langsung. Kosongkan untuk posisi tertinggi (Group CEO)")}</FieldHint></>}
              <FieldError msg={errors.manager_id?.message} />
            </div>
            <SelectField
              label={t("Work Location")}
              name="work_location_id"
              register={register}
              errors={errors}
              valueAsNumber
              icon={<MapPin className="h-4 w-4 text-purple-600" />}
              options={[
                { value: '', label: t('-- Select Work Location --') },
                ...workLocations.map((wl) => ({
                  value: String(wl.id),
                  label: wl.code ? `${wl.name} (${wl.code})` : wl.name,
                })),
              ]}
            />
            <TextField
              label={t("Work Schedule")}
              name="work_schedule"
              register={register}
              errors={errors}
              placeholder={t("Mon-Fri, 09:00-18:00")}
              icon={<Clock className="h-4 w-4 text-orange-600" />}
            />
          </div>
        </div>
      </div>

      {/* Employment Status */}
      <div className="ph-section ops-form-section">
        <h3>{t("Employment Status")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid">
            <SelectField
              label={t("Employment Type")}
              name="employment_type"
              register={register}
              errors={errors}
              icon={<FileText className="h-4 w-4 text-green-600" />}
              options={[
                { value: '', label: t('-- Select Type --') },
                { value: 'permanent', label: t('Permanent (Tetap)') },
                { value: 'contract', label: t('Contract (Kontrak)') },
                { value: 'internship', label: t('Internship (Magang)') },
                { value: 'freelance', label: t('Freelance') },
              ]}
            />
            <SelectField
              label={t("Employment Status")}
              name="employment_status"
              register={register}
              errors={errors}
              icon={<Check className="h-4 w-4 text-emerald-600" />}
              options={[
                { value: '', label: t('-- Select Status --') },
                { value: 'active', label: t('Active') },
                { value: 'inactive', label: t('Inactive') },
                { value: 'terminated', label: t('Terminated') },
                { value: 'resigned', label: t('Resigned') },
                { value: 'retired', label: t('Retired') },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Important Dates */}
      <div className="ph-section ops-form-section">
        <h3>{t("Important Dates")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid employee-grid-three">
            <TextField
              label={t("Join Date")}
              name="join_date"
              type="date"
              register={register}
              errors={errors}
              hint={currentEmployeeId ? t('Tanggal mulai bekerja. Tanggal probation tersimpan tidak dihitung ulang saat edit.') : t('Tanggal mulai bekerja. Default probation dihitung 3 bulan kalender.')}
              icon={<Calendar className="h-4 w-4 text-amber-600" />}
            />

            <div>
              <FieldLabel name="probation_start_date" label={t("Probation Start")} icon={<Calendar className="h-4 w-4 text-blue-600" />} />
              <input
                type="date"
                {...register('probation_start_date')}
                id="probation_start_date"
                readOnly
                className="block w-full rounded-xl border-gray-300 bg-gray-50 sm:text-sm cursor-not-allowed"
              />
              <FieldHint>{currentEmployeeId ? t("Tanggal probation yang tersimpan.") : t("Otomatis sama dengan Join Date")}</FieldHint>
            </div>
            <div>
              <FieldLabel name="probation_end_date" label={t("Probation End")} icon={<Calendar className="h-4 w-4 text-green-600" />} />
              <input
                type="date"
                {...register('probation_end_date')}
                id="probation_end_date"
                readOnly
                className="block w-full rounded-xl border-gray-300 bg-gray-50 sm:text-sm cursor-not-allowed"
              />
              <FieldHint>{currentEmployeeId ? t("Tanggal probation yang tersimpan; tidak berubah otomatis saat edit.") : t("Default Join Date + 3 bulan kalender; menyesuaikan akhir bulan.")}</FieldHint>
            </div>
            <TextField
              label={t("Contract Start")}
              name="contract_start_date"
              type="date"
              register={register}
              errors={errors}
              icon={<Calendar className="h-4 w-4 text-purple-600" />}
            />
            <TextField
              label={t("Contract End")}
              name="contract_end_date"
              type="date"
              register={register}
              errors={errors}
              icon={<Calendar className="h-4 w-4 text-red-600" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3Payroll({ register, errors, compensationEditable }: StepProps & { compensationEditable: boolean }) {
  useLocale();
  return (
    <div className="ph-section ops-form-step">

      {/* Without employee.update_salary the compensation inputs are not rendered
          and never sent; stored values stay unchanged. */}
      {!compensationEditable && <div className="ph-section ops-form-section" data-testid="compensation-locked">
        <h3>{t("Compensation")}</h3>
        <p className="text-sm text-slate-600">{t("Salary and allowances can only be changed by roles with salary-edit access. Existing values stay unchanged.")}</p>
      </div>}

      {compensationEditable && <>
      {/* Basic Salary */}
      <div className="ph-section ops-form-section">
        <h3>{t("Basic Salary")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid">
            <TextField
              label={t("Basic Salary")}
              name="basic_salary"
              type="number"
              register={register}
              errors={errors}
              placeholder="10000000"
              icon={<Wallet className="h-4 w-4 text-green-600" />}
            />
            <SelectField
              label={t("Currency")}
              name="salary_currency"
              register={register}
              errors={errors}
              icon={<CreditCard className="h-4 w-4 text-blue-600" />}
              options={[
                { value: 'IDR', label: t('IDR - Indonesian Rupiah') },
                { value: 'USD', label: t('USD - US Dollar') },
                { value: 'SGD', label: t('SGD - Singapore Dollar') },
              ]}
            />
            <SelectField
              label={t("Pay Frequency")}
              name="pay_frequency"
              register={register}
              errors={errors}
              icon={<Calendar className="h-4 w-4 text-purple-600" />}
              options={[{ value: 'monthly', label: t('Monthly') }]}
            />
            <SelectField
              label={t("Pay Type")}
              name="pay_type"
              register={register}
              errors={errors}
              icon={<Wallet className="h-4 w-4 text-indigo-600" />}
              hint={t("Semua karyawan PFI menggunakan tipe Gross — PPh 21 dipotong dari gaji")}
              options={[
                { value: 'gross', label: t('Gross (Pajak Ditanggung Karyawan)') },
              ]}
            />
            <SelectField
              label={t("Status Karyawan (Payroll)")}
              name="salary_status"
              register={register}
              errors={errors}
              icon={<Shield className="h-4 w-4 text-indigo-600" />}
              hint={t("Existing: karyawan lama dari skema net. New (Gross): karyawan baru, gaji pure gross.")}
              options={[
                {
                  value: 'existing',
                  label:
                    t('Existing (Legacy Net→Gross) — THP = Basic, tunjangan pajak otomatis'),
                },
                {
                  value: 'new_gross',
                  label: t('New (Gross) — Karyawan bayar PPh21, THP < Basic'),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Allowances */}
      <div className="ph-section ops-form-section">
        <h3>{t("Allowances")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid employee-grid-three">
            <TextField
              label={t("Transport Allowance")}
              name="transport_allowance"
              type="number"
              register={register}
              errors={errors}
              placeholder="500000"
              icon={<Wallet className="h-4 w-4 text-blue-600" />}
            />
            <TextField
              label={t("Meal Allowance")}
              name="meal_allowance"
              type="number"
              register={register}
              errors={errors}
              placeholder="500000"
              icon={<Wallet className="h-4 w-4 text-orange-600" />}
            />
            <TextField
              label={t("Position Allowance")}
              name="position_allowance"
              type="number"
              register={register}
              errors={errors}
              placeholder="1000000"
              icon={<Wallet className="h-4 w-4 text-purple-600" />}
            />
          </div>
        </div>
      </div>
      </>}

      {/* Bank Account */}
      <div className="ph-section ops-form-section">
        <h3>{t("Bank Account")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid employee-grid-three">
            <TextField
              label={t("Bank Name")}
              name="bank_name"
              register={register}
              errors={errors}
              placeholder={t("BCA, Mandiri, BNI, etc.")}
              icon={<Landmark className="h-4 w-4 text-amber-600" />}
            />
            <TextField
              label={t("Account Number")}
              name="bank_account_number"
              register={register}
              errors={errors}
              placeholder="1234567890"
              icon={<CreditCard className="h-4 w-4 text-amber-600" />}
            />
            <TextField
              label={t("Account Holder")}
              name="bank_account_holder"
              register={register}
              errors={errors}
              placeholder={t("Nama pemilik rekening")}
              icon={<User className="h-4 w-4 text-amber-600" />}
            />
          </div>
        </div>
      </div>

      {/* Tax Information */}
      <div className="ph-section ops-form-section">
        <h3>{t("Tax Information")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid">
            <TextField
              label={t("NPWP Number")}
              name="npwp_number"
              register={register}
              errors={errors}
              placeholder="XX.XXX.XXX.X-XXX.XXX"
              hint={t("Nomor Pokok Wajib Pajak")}
              icon={<FileText className="h-4 w-4 text-blue-600" />}
            />
            <SelectField
              label={t("Status PTKP")}
              name="ptkp_status"
              register={register}
              errors={errors}
              hint={t("Penghasilan Tidak Kena Pajak untuk perhitungan PPh 21")}
              icon={<FileText className="h-4 w-4 text-purple-600" />}
              options={[
                { value: '', label: t('-- Pilih Status PTKP --') },
                { value: 'TK/0', label: t('TK/0 - Tidak Kawin, Tanpa Tanggungan') },
                { value: 'TK/1', label: t('TK/1 - Tidak Kawin, 1 Tanggungan') },
                { value: 'TK/2', label: t('TK/2 - Tidak Kawin, 2 Tanggungan') },
                { value: 'TK/3', label: t('TK/3 - Tidak Kawin, 3 Tanggungan') },
                { value: 'K/0', label: t('K/0 - Kawin, Tanpa Tanggungan') },
                { value: 'K/1', label: t('K/1 - Kawin, 1 Tanggungan') },
                { value: 'K/2', label: t('K/2 - Kawin, 2 Tanggungan') },
                { value: 'K/3', label: t('K/3 - Kawin, 3 Tanggungan') },
                { value: 'K/I/0', label: t('K/I/0 - Kawin, Penghasilan Istri Digabung') },
                { value: 'K/I/1', label: t('K/I/1 - Kawin, Penghasilan Istri Digabung, 1 Tanggungan') },
                { value: 'K/I/2', label: t('K/I/2 - Kawin, Penghasilan Istri Digabung, 2 Tanggungan') },
                { value: 'K/I/3', label: t('K/I/3 - Kawin, Penghasilan Istri Digabung, 3 Tanggungan') },
              ]}
            />
          </div>
        </div>
      </div>

      {/* BPJS */}
      <div className="ph-section ops-form-section">
        <h3>{t("BPJS & Asuransi")}</h3>

        <div className="mb-4 ops-quiet-surface">
          <h5 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-teal-600" />{t("Nomor BPJS")} </h5>
          <div className="ph-form-grid">
            <TextField
              label={t("No. BPJS Ketenagakerjaan")}
              name="bpjs_ketenagakerjaan_number"
              register={register}
              errors={errors}
              placeholder={t("Masukkan nomor BPJS TK")}
              icon={<CreditCard className="h-4 w-4 text-teal-600" />}
            />
            <TextField
              label={t("No. BPJS Kesehatan")}
              name="bpjs_kesehatan_number"
              register={register}
              errors={errors}
              placeholder={t("Masukkan nomor BPJS Kesehatan")}
              icon={<CreditCard className="h-4 w-4 text-cyan-600" />}
            />
          </div>
        </div>

        <div className=" ops-quiet-surface">
          <p className="text-sm text-gray-500">{t("Program BPJS Ketenagakerjaan dan asuransi akan diatur otomatis berdasarkan tipe karyawan yang dipilih.")} </p>
          {/* keep these registered so values are submitted */}
          <input type="hidden" {...register('jht_registered')} />
          <input type="hidden" {...register('jp_registered')} />
          <input type="hidden" {...register('medical_insurance')} />
          <input type="hidden" {...register('life_insurance')} />
        </div>
      </div>
    </div>
  );
}

function Step4Contact({
  register,
  errors,
  hasOfficeEmail,
  setValue,
}: StepProps & {
  hasOfficeEmail: boolean;
  setValue: UseFormSetValue<EmployeeFormInput>;
}) {
  useLocale();
  return (
    <div className="ph-section ops-form-step">


      {/* Contact Information */}
      <div className="ph-section ops-form-section">
        <h3>{t("Contact Information")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid employee-grid-three">
            <TextField
              label={t("Phone Number")}
              name="phone"
              register={register}
              errors={errors}
              placeholder="+62 21 1234567"
              hint={t("Office or home landline")}
              icon={<Phone className="h-4 w-4 text-blue-600" />}
            />
            <TextField
              label={t("Mobile Number")}
              name="mobile_number"
              register={register}
              errors={errors}
              placeholder="+62 812 3456 7890"
              hint={t("Personal mobile/WhatsApp")}
              icon={<Phone className="h-4 w-4 text-green-600" />}
            />
            <TextField
              label={t("Personal Email")}
              name="personal_email"
              type="email"
              register={register}
              errors={errors}
              required
              placeholder="name@gmail.com"
              hint={hasOfficeEmail ? t('For onboarding credentials') : t('Used as login & for notifications')}
              icon={<Mail className="h-4 w-4 text-orange-500" />}
            />
            <div className="lg:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none mb-3">
                <button
                  type="button"
                  role="switch"
                  aria-label={t("Employee has office email")}
                  aria-checked={hasOfficeEmail}
                  className={`relative w-10 h-5 rounded-full transition-colors ${hasOfficeEmail ? 'bg-purple-500' : 'bg-gray-300'}`}
                  onClick={() => setValue('has_office_email', !hasOfficeEmail, { shouldDirty: true })}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hasOfficeEmail ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">{t("Employee has office email")}</span>
              </label>
              {hasOfficeEmail && (
                <TextField
                  label={t("Office Email")}
                  name="email"
                  type="email"
                  register={register}
                  errors={errors}
                  required
                  placeholder="employee@company.com"
                  hint={t("Official company email (M365 / Google Workspace)")}
                  icon={<Mail className="h-4 w-4 text-purple-600" />}
                />
              )}
              {!hasOfficeEmail && (
                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">{t("Login credential will be sent to personal email. Office email can be added later.")} </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="ph-section ops-form-section">
        <h3>{t("Address Information")}</h3>

        <div className="ops-quiet-surface employee-address-grid">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-3 pb-2 border-b border-gray-100">{t("Permanent Address (KTP)")}</p>
            <div className="space-y-4">
              <TextareaField
                label={t("Full Address")}
                name="address"
                register={register}
                errors={errors}
                rows={2}
                placeholder={t("Full address as per ID card")}
              />
              <div className="ph-form-grid">
                <TextField label={t("City")} name="city" register={register} errors={errors} placeholder="Bandar Lampung" icon={<MapPin className="h-4 w-4 text-blue-600" />} />
                <TextField label={t("Province")} name="province" register={register} errors={errors} placeholder="Lampung" icon={<MapPin className="h-4 w-4 text-green-600" />} />
                <TextField label={t("Postal Code")} name="postal_code" register={register} errors={errors} placeholder="35141" icon={<MapPin className="h-4 w-4 text-purple-600" />} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-3 pb-2 border-b border-gray-100">{t("Current Address (Domicile)")}</p>
            <div className="space-y-4">
              <TextareaField
                label={t("Full Address")}
                name="current_address"
                register={register}
                errors={errors}
                rows={2}
                placeholder={t("Current residential address")}
              />
              <div className="ph-form-grid">
                <TextField label={t("City")} name="current_city" register={register} errors={errors} placeholder="Tangerang Selatan" icon={<MapPin className="h-4 w-4 text-blue-600" />} />
                <TextField label={t("Province")} name="current_province" register={register} errors={errors} placeholder="Banten" icon={<MapPin className="h-4 w-4 text-green-600" />} />
                <TextField label={t("Postal Code")} name="current_postal_code" register={register} errors={errors} placeholder="15417" icon={<MapPin className="h-4 w-4 text-purple-600" />} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="ph-section ops-form-section">
        <h3>{t("Emergency Contact")}</h3>

        <div className=" ops-quiet-surface">
          <div className="ph-form-grid">
            <TextField label={t("Contact Name")} name="emergency_contact_name" register={register} errors={errors} placeholder={t("Full name")} icon={<User className="h-4 w-4 text-red-600" />} />
            <TextField label={t("Contact Phone")} name="emergency_contact_phone" register={register} errors={errors} placeholder="+62 812 3456 7890" icon={<Phone className="h-4 w-4 text-red-600" />} />
            <SelectField
              label={t("Relationship")}
              name="emergency_contact_relationship"
              register={register}
              errors={errors}
              icon={<Users className="h-4 w-4 text-pink-600" />}
              options={[
                { value: '', label: t('-- Pilih Hubungan --') },
                { value: 'Suami', label: t('Suami') },
                { value: 'Istri', label: t('Istri') },
                { value: 'Orang Tua', label: t('Orang Tua') },
                { value: 'Ayah', label: t('Ayah') },
                { value: 'Ibu', label: t('Ibu') },
                { value: 'Anak', label: t('Anak') },
                { value: 'Saudara', label: t('Saudara') },
                { value: 'Kakak', label: t('Kakak') },
                { value: 'Adik', label: t('Adik') },
                { value: 'Lainnya', label: t('Lainnya') },
              ]}
            />
            <TextField label={t("Contact Address")} name="emergency_contact_address" register={register} errors={errors} placeholder={t("Full address")} icon={<MapPin className="h-4 w-4 text-red-600" />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step5Review({
  values,
  companies,
  departments,
  employees,
  compensationEditable,
}: {
  values: EmployeeFormInput;
  companies: Company[];
  departments: Department[];
  employees: Employee[];
  compensationEditable: boolean;
}) {
  useLocale();
  return (
    <div className="ph-section ops-form-step">


      <div className="ops-review-sections">
        <div className="ph-section ops-form-section">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">{t("Personal Information")}</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label={t("Full Name")} value={values.name || '-'} />
            <SummaryItem label={t("Employee ID")} value={values.employee_id || t('Auto-generated')} />
            <SummaryItem label={t("Gender")} value={enumLabel(values.gender)} />
            <SummaryItem label={t("Date of Birth")} value={reviewDate(values.date_of_birth)} />
            <SummaryItem label={t("Nationality")} value={values.nationality || '-'} />
          </div>
        </div>

        <div className="ph-section ops-form-section">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">{t("Employment")}</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label={t("Company")} value={companies.find((c) => c.id === values.company_id)?.name || '-'} />
            <SummaryItem label={t("Position")} value={values.job_title || '-'} />
            <SummaryItem label={t("Department")} value={departments.find((d) => d.id === values.department_id)?.name || '-'} />
            <SummaryItem label={t("Reports To")} value={employees.find((e) => e.id === values.manager_id)?.name || t('No Manager (Top Level)')} />
            <SummaryItem label={t("Employment Type")} value={enumLabel(values.employment_type)} />
            <SummaryItem label={t("Status")} value={enumLabel(values.employment_status)} />
            <SummaryItem label={t("Join Date")} value={reviewDate(values.join_date)} />
          </div>
        </div>

        <div className="ph-section ops-form-section">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">{t("Payroll")}</h4>
          </div>
          <div className="space-y-2 text-sm">
            {compensationEditable ? <>
            <SummaryItem
              label={t("Basic Salary")}
              value={values.basic_salary ? `${values.salary_currency} ${Number(values.basic_salary).toLocaleString(intlLocale())}` : '-'}
            />
            <SummaryItem label={t("Pay Frequency")} value={enumLabel(values.pay_frequency)} />
            <SummaryItem label={t("Pay Type")} value={t("Gross (Pajak Ditanggung Karyawan)")} />
            </> : <SummaryItem label={t("Compensation")} value={t("Not changed")} />}
            <SummaryItem label={t("PTKP Status")} value={values.ptkp_status || '-'} />
            <SummaryItem label={t("Bank")} value={values.bank_name ? `${values.bank_name} - ${values.bank_account_number || '-'}` : '-'} />
          </div>
        </div>

        <div className="ph-section ops-form-section">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-orange-600" />
            <h4 className="font-semibold text-gray-900">{t("Contact & Address")}</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label={t("Personal Email")} value={values.personal_email || '-'} />
            <SummaryItem label={t("Office Email")} value={values.has_office_email ? (values.email || '-') : t('N/A (uses personal email)')} />
            <SummaryItem label={t("Phone")} value={values.phone || '-'} />
            <SummaryItem label={t("Mobile")} value={values.mobile_number || '-'} />
            <SummaryItem label={t("KTP City")} value={values.city || '-'} />
            <SummaryItem label={t("Current City")} value={values.current_city || '-'} />
            <SummaryItem label={t("Emergency Contact")} value={values.emergency_contact_name ? `${values.emergency_contact_name} (${enumLabel(values.emergency_contact_relationship)})` : '-'} />
          </div>
        </div>

        <div className="ph-section ops-form-section">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-teal-600" />
            <h4 className="font-semibold text-gray-900">{t("BPJS & Asuransi")}</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label={t("BPJS TK")} value={values.bpjs_ketenagakerjaan_number || '-'} />
            <SummaryItem label={t("BPJS Kesehatan")} value={values.bpjs_kesehatan_number || '-'} />
            <SummaryItem label={t("JHT")} value={values.jht_registered ? t('Terdaftar') : t('Tidak')} />
            <SummaryItem label={t("JP")} value={values.jp_registered ? t('Terdaftar') : t('Tidak')} />
            <SummaryItem label={t("Asuransi Kesehatan")} value={values.medical_insurance ? t('Ya') : t('Tidak')} />
            <SummaryItem label={t("Asuransi Jiwa")} value={values.life_insurance ? t('Ya') : t('Tidak')} />
          </div>
        </div>
      </div>

      <div className="ops-record-block">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h5 className="font-semibold text-amber-800">{t("Please Review")}</h5>
          <p className="text-sm text-amber-700 mt-1">{t("Make sure all information is correct before submitting. You can go back to any step to make changes.")} </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Field primitives (RHF-aware wrappers)
// ============================================================================

const baseInput =
  'ops-input';

function FieldLabel({ label, required, name }: { label: string; required?: boolean; icon?: React.ReactNode; name?: string }) {
  useLocale();
  return (
    <label htmlFor={name} className="employee-field-label">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  useLocale();
  return (
    <p className="employee-field-hint">
      {children}
    </p>
  );
}

function FieldError({ msg }: { msg?: string }) {
  useLocale();
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{t(msg)}</p>;
}

type FieldName = keyof EmployeeFormInput;

function TextField({
  label,
  name,
  type = 'text',
  register,
  errors,
  placeholder,
  required,
  hint,
  icon,
}: {
  label: string;
  name: FieldName;
  type?: string;
  register: UseFormRegister<EmployeeFormInput>;
  errors: FieldErrors<EmployeeFormInput>;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  icon?: React.ReactNode;
}) {
  useLocale();
  // Numeric fields registered with valueAsNumber so Zod preprocess gets a number
  const isNumeric = type === 'number';
  const regOpts = isNumeric
    ? { valueAsNumber: false } // keep as string; Zod preprocess handles parsing
    : undefined;
  const errMsg = (errors[name] as { message?: string } | undefined)?.message;

  return (
    <div>
      <FieldLabel name={name} label={label} required={required} icon={icon} />
      <input
        id={name}
        type={type}
        {...register(name, regOpts)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
        className={baseInput}
      />
      {hint && <FieldHint>{hint}</FieldHint>}
      <FieldError msg={errMsg} />
    </div>
  );
}

function SelectField({
  label,
  name,
  register,
  errors,
  options,
  required,
  icon,
  hint,
  valueAsNumber,
}: {
  label: string;
  name: FieldName;
  register: UseFormRegister<EmployeeFormInput>;
  errors: FieldErrors<EmployeeFormInput>;
  options: { value: string; label: string }[];
  required?: boolean;
  icon?: React.ReactNode;
  hint?: string;
  valueAsNumber?: boolean;
}) {
  useLocale();
  const errMsg = (errors[name] as { message?: string } | undefined)?.message;
  return (
    <div>
      <FieldLabel name={name} label={label} required={required} icon={icon} />
      <select
        id={name}
        {...register(name, valueAsNumber ? { setValueAs: (v) => (v === '' ? undefined : Number(v)) } : undefined)}
        className={baseInput}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <FieldHint>{hint}</FieldHint>}
      <FieldError msg={errMsg} />
    </div>
  );
}

function TextareaField({
  label,
  name,
  register,
  errors,
  rows = 3,
  required,
  placeholder,
}: {
  label: string;
  name: FieldName;
  register: UseFormRegister<EmployeeFormInput>;
  errors: FieldErrors<EmployeeFormInput>;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  useLocale();
  const errMsg = (errors[name] as { message?: string } | undefined)?.message;
  return (
    <div>
      <FieldLabel name={name} label={label} required={required} />
      <textarea
        id={name}
        {...register(name)}
        rows={rows}
        placeholder={placeholder}
        className={`${baseInput} resize-none`}
      />
      <FieldError msg={errMsg} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  useLocale();
  return (
    <div className="ops-review-row">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

