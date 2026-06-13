import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  User,
  Phone,
  Briefcase,
  CreditCard,
  MapPin,
  UserPlus,
  Check,
  Hash,
  Calendar,
  Mail,
  Building,
  Clock,
  Wallet,
  Users,
  AlertCircle,
  FileText,
  Shield,
  LogOut,
  X,
  Landmark,
  Contact,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSpinner, SearchableSelect } from '@/components/ui';
import { employeeService } from '@/services/employee.service';
import { departmentService } from '@/services/department.service';
import { companyService, type Company } from '@/services/company.service';
import { workLocationService, type WorkLocationOption } from '@/services/work-location.service';
import type { CreateEmployeeRequest, Department, Employee } from '@/types';
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

/** Strip empty strings + the UI-only `has_office_email` flag before sending. */
const buildPayload = (values: EmployeeFormValues): CreateEmployeeRequest => {
  // Defensively cast — Zod's optionalEnum yields '' | enum-string
  const stripped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (k === 'has_office_email') continue;
    if (v === '' || v === undefined || v === null) continue;
    stripped[k] = v;
  }
  // If office email toggle was off, ensure email isn't accidentally sent
  if (!values.has_office_email) {
    delete stripped.email;
  }
  return stripped as unknown as CreateEmployeeRequest;
};

// =============================================================================

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(isEdit);
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
    trigger,
    getValues,
    getFieldState,
    formState: { errors, isSubmitting },
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
    const fetchData = async () => {
      try {
        const [deptResponse, companyResponse, empResponse, workLocResponse] = await Promise.all([
          departmentService.getAll({ page: 1, limit: 100 }),
          companyService.getAll({ page: 1, limit: 100, is_active: true }),
          employeeService.getAll({ page: 1, limit: 200, employment_status: 'active' }),
          // Use lightweight /options endpoint to populate the work-location dropdown.
          workLocationService.getOptions().catch(() => [] as WorkLocationOption[]),
        ]);
        setDepartments(deptResponse.data);
        setCompanies(companyResponse.data);
        setEmployees(empResponse.data);
        setWorkLocations(workLocResponse);

        if (id) {
          const employee = await employeeService.getById(parseInt(id));
          reset(employeeToFormValues(employee));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, reset]);

  // ---- Auto-generate employee_id on company change (create mode) -----------
  useEffect(() => {
    const fetchNextEmployeeId = async () => {
      if (!isEdit && companyId) {
        setIsLoadingEmployeeId(true);
        try {
          const nextId = await employeeService.getNextEmployeeId(Number(companyId));
          setGeneratedEmployeeId(nextId);
          setValue('employee_id', nextId, { shouldValidate: false });
        } catch (error) {
          console.error('Failed to generate employee ID:', error);
        } finally {
          setIsLoadingEmployeeId(false);
        }
      }
    };

    fetchNextEmployeeId();
  }, [companyId, isEdit, setValue]);

  // ---- Auto-update BPJS defaults on employment_type change -----------------
  // Mirror old behavior: permanent => all 4 true; freelance => jht only; else => all false
  const [lastEmploymentType, setLastEmploymentType] = useState<string>('permanent');
  useEffect(() => {
    if (!employmentType || employmentType === lastEmploymentType) return;
    // Only auto-set in create mode (avoid stomping on user-edited values when loading edit data)
    if (isEdit && lastEmploymentType === 'permanent' && !employees.length) return;

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
  }, [employmentType, lastEmploymentType, isEdit, employees.length, setValue]);

  // ---- Auto-calculate probation dates when join_date changes ---------------
  useEffect(() => {
    if (joinDate && /^\d{4}-\d{2}-\d{2}$/.test(joinDate)) {
      const [year, month, day] = joinDate.split('-').map(Number);
      const probationDate = new Date(Date.UTC(year, month - 1 + 3, day));
      const probationEnd = probationDate.toISOString().split('T')[0];
      setValue('probation_start_date', joinDate);
      setValue('probation_end_date', probationEnd);
    }
  }, [joinDate, setValue]);

  // ---- Reset office email value when toggle disabled -----------------------
  useEffect(() => {
    if (!hasOfficeEmail) {
      setValue('email', '');
    }
  }, [hasOfficeEmail, setValue]);

  // ---- Derived: departments filtered by company ----------------------------
  const companyIdNum = companyId != null && companyId !== '' ? Number(companyId) : undefined;
  const filteredDepartments = departments.filter((d) => {
    if (!companyIdNum) return true;
    const deptCompanyId = d.company_id || d.company?.id;
    return deptCompanyId === companyIdNum;
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
          const label = FIELD_LABELS[f] || f.replace(/_/g, ' ');
          const msg = state.error?.message;
          return msg ? `${label}: ${msg}` : label;
        })
        .filter((x): x is string => x !== null);

      if (invalid.length > 0) {
        const preview = invalid.slice(0, 3).join('\n• ');
        const extra = invalid.length > 3 ? `\n…and ${invalid.length - 3} more` : '';
        toast.error(`Please fix the following:\n• ${preview}${extra}`, { duration: 5000 });
      } else {
        toast.error('Please fix validation errors before continuing');
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
    if (step <= currentStep || step === currentStep + 1) {
      setCurrentStep(step);
    }
  };

  // ---- Submit --------------------------------------------------------------
  const onSubmit = handleSubmit(async (values) => {
    if (currentStep !== STEPS.length) {
      // Block accidental submits triggered from earlier steps
      return;
    }
    const payload = buildPayload(values);
    try {
      if (isEdit && id) {
        await employeeService.update(parseInt(id), payload);
        toast.success('Employee updated successfully');
      } else {
        await employeeService.create(payload);
        toast.success('Employee created successfully');
      }
      navigate('/employees');
    } catch (error) {
      // Axios interceptor handles toast for HTTP errors
      console.error('Failed to save employee:', error);
    }
  });

  // ---- Resign action -------------------------------------------------------
  const closeResignModal = () => {
    resetResign();
    setShowResignModal(false);
  };

  const onResign = handleSubmitResign(async (data) => {
    try {
      const currentValues = getValues();
      const payload = buildPayload(currentValues as EmployeeFormValues);
      await employeeService.update(parseInt(id!), {
        ...payload,
        resign_date: data.resign_date,
        resign_type: data.resign_type,
        resign_reason: data.resign_reason,
        resign_notes: data.resign_notes,
        employment_status: 'resigned',
      });
      toast.success('Karyawan berhasil di-resign');
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

  // Get current form values for review step (read-only display)
  const values = watch();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10 relative">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="employee-form-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#employee-form-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                  <UserPlus className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {isEdit ? 'Edit Employee' : 'Add New Employee'}
                  </h1>
                  <p className="text-blue-100 text-sm mt-1">
                    Step <span className="font-bold">{currentStep}</span> of <span className="font-bold">{STEPS.length}</span> - Complete all required information
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isEdit && values.employment_status === 'active' && (
                <button
                  type="button"
                  onClick={() => setShowResignModal(true)}
                  className="px-5 py-3 bg-red-500/80 backdrop-blur-xl text-white rounded-xl hover:bg-red-600 transition-all duration-200 flex items-center gap-2 font-bold border-2 border-red-400/50 shadow-lg"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Resign</span>
                </button>
              )}
              <Link
                to="/employees"
                className="px-5 py-3 bg-white/20 backdrop-blur-xl text-white rounded-xl hover:bg-white/30 transition-all duration-200 flex items-center gap-2 font-bold border-2 border-white/30 shadow-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to List</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Registration Progress</h3>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <span className="text-sm font-bold text-gray-700">Step</span>
            <span className="text-lg font-bold text-blue-600">{currentStep}</span>
            <span className="text-sm text-gray-500">/</span>
            <span className="text-sm font-bold text-gray-500">{STEPS.length}</span>
          </div>
        </div>

        {/* Progress Bar (Mobile) */}
        <div className="md:hidden mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop Steps */}
        <div className="hidden md:flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''} min-w-0`}>
              <button
                type="button"
                onClick={() => goToStep(step.id)}
                className={`relative flex items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all duration-500 shadow-lg ${
                  currentStep >= step.id
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 text-white scale-110'
                    : currentStep + 1 === step.id
                    ? 'border-blue-300 text-blue-600 bg-blue-50 shadow-xl cursor-pointer hover:border-blue-400'
                    : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                }`}
                disabled={step.id > currentStep + 1}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
                {currentStep === step.id && (
                  <span className="absolute inline-flex h-full w-full rounded-2xl bg-blue-400 opacity-75 animate-ping" />
                )}
              </button>

              <div className="ml-3 min-w-0">
                <div className={`text-sm font-bold transition-all duration-300 ${
                  currentStep >= step.id
                    ? 'text-blue-600'
                    : currentStep + 1 === step.id
                    ? 'text-gray-800'
                    : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{step.subtitle}</div>
              </div>

              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-3 h-1 rounded-full bg-gray-200 relative overflow-hidden">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                    style={{ width: currentStep > step.id ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} noValidate>
        {/* Each step is conditionally hidden via className so RHF state is preserved */}
        <div className={currentStep === 1 ? '' : 'hidden'}>
          <Step1Personal
            register={register}
            errors={errors}
            companies={companies}
            generatedEmployeeId={generatedEmployeeId}
            isLoadingEmployeeId={isLoadingEmployeeId}
            isEdit={isEdit}
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
          />
        </div>
        <div className={currentStep === 3 ? '' : 'hidden'}>
          <Step3Payroll register={register} errors={errors} />
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
          />
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 mt-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentStep < 5 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {currentStep === 5 && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-500/25 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEdit ? 'Update Employee' : 'Create Employee'}
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={closeResignModal}
            />

            <form
              onSubmit={onResign}
              onKeyDown={(e) => {
                // Block accidental Enter-submit from text inputs (textarea/select unaffected).
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              noValidate
              className="relative w-full max-w-lg transform rounded-2xl bg-white shadow-2xl transition-all"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                    <LogOut className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Resign Karyawan</h3>
                    <p className="text-sm text-gray-500">{values.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeResignModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-amber-800">Perhatian</h5>
                    <p className="text-sm text-amber-700 mt-1">
                      Status karyawan akan diubah menjadi <strong>Resigned</strong>. Data resign akan disimpan dan karyawan tidak akan tampil di daftar aktif.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><Calendar className="h-4 w-4 text-red-600" /></span>
                    Tanggal Resign <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...registerResign('resign_date')}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  />
                  {resignErrors.resign_date && (
                    <p className="mt-1 text-sm text-red-600">{resignErrors.resign_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-orange-600" /></span>
                    Tipe Resign <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...registerResign('resign_type')}
                    defaultValue=""
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  >
                    <option value="">-- Pilih Tipe Resign --</option>
                    <option value="voluntary">Voluntary (Mengundurkan Diri)</option>
                    <option value="involuntary">Involuntary (PHK)</option>
                    <option value="retirement">Retirement (Pensiun)</option>
                    <option value="contract_end">Contract End (Kontrak Berakhir)</option>
                    <option value="mutual_agreement">Mutual Agreement (Kesepakatan Bersama)</option>
                    <option value="other">Other (Lainnya)</option>
                  </select>
                  {resignErrors.resign_type && (
                    <p className="mt-1 text-sm text-red-600">{resignErrors.resign_type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-purple-600" /></span>
                    Alasan Resign
                  </label>
                  <input
                    type="text"
                    {...registerResign('resign_reason')}
                    placeholder="Contoh: Pindah ke perusahaan lain, Melanjutkan pendidikan, dll"
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  />
                  {resignErrors.resign_reason && (
                    <p className="mt-1 text-sm text-red-600">{resignErrors.resign_reason.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-gray-600" /></span>
                    Catatan Tambahan
                  </label>
                  <textarea
                    {...registerResign('resign_notes')}
                    placeholder="Catatan tambahan mengenai proses resign..."
                    rows={3}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all resize-none"
                  />
                  {resignErrors.resign_notes && (
                    <p className="mt-1 text-sm text-red-600">{resignErrors.resign_notes.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeResignModal}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResigning}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-orange-700 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center gap-2"
                >
                  {isResigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Konfirmasi Resign
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
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
}: StepProps & {
  companies: Company[];
  generatedEmployeeId: string;
  isLoadingEmployeeId: boolean;
  isEdit: boolean;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 transition-all">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
          <p className="text-sm text-gray-600">Basic identity and demographic details</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Basic Identity</h4>
            <p className="text-xs text-gray-600">Personal identification information</p>
          </div>
        </div>

        {/* Company */}
        <div className="bg-white rounded-lg p-5 mb-6 border border-purple-100">
          <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="h-4 w-4 text-indigo-600" />
            Company Assignment
          </h5>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <FieldLabel label="Company" required icon={<Building className="h-4 w-4 text-indigo-600" />} />
              <select
                {...register('company_id', {
                  // `valueAsNumber: true` turns '' (no selection) into NaN, which
                  // breaks the Zod union schema. `setValueAs` returns undefined
                  // for empty and Number(v) otherwise — schema-friendly.
                  setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
                })}
                className={baseInput}
              >
                <option value="">-- Pilih Company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
              <FieldHint>Pilih company dimana karyawan akan didaftarkan</FieldHint>
              <FieldError msg={errors.company_id?.message} />
            </div>
          </div>
        </div>

        {/* Identity Numbers */}
        <div className="bg-white rounded-lg p-5 mb-6 border border-purple-100">
          <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Hash className="h-4 w-4 text-purple-600" />
            Identity Numbers
          </h5>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <FieldLabel label="Employee ID (NIK)" icon={<Hash className="h-4 w-4 text-indigo-600" />} />
              <div className="relative">
                <input
                  type="text"
                  {...register('employee_id')}
                  placeholder={isLoadingEmployeeId ? 'Generating...' : 'Pilih company untuk generate otomatis'}
                  readOnly={!isEdit && !!generatedEmployeeId}
                  className={`block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm transition-all ${
                    !isEdit && generatedEmployeeId ? 'bg-gray-50 font-mono font-bold text-indigo-700' : ''
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
                  ? `Format: ${generatedEmployeeId.split('-').slice(0, 2).join('-')}-YYNNNNN`
                  : 'Pilih company terlebih dahulu untuk generate ID otomatis'}
              </FieldHint>
              <FieldError msg={errors.employee_id?.message} />
            </div>
            <TextField
              label="NIK KTP"
              name="national_id"
              register={register}
              errors={errors}
              placeholder="1234567890123456"
              hint="16-digit National ID Number"
              icon={<CreditCard className="h-4 w-4 text-purple-600" />}
            />
            <TextField
              label="Family Card Number (KK)"
              name="family_card_number"
              register={register}
              errors={errors}
              placeholder="1234567890123456"
              hint="16-digit Family Card Number"
              icon={<CreditCard className="h-4 w-4 text-indigo-600" />}
            />
            <TextField
              label="Passport Number"
              name="passport_number"
              register={register}
              errors={errors}
              placeholder="A1234567"
              icon={<FileText className="h-4 w-4 text-teal-600" />}
            />
            <TextField
              label="Passport Expiry"
              name="passport_expiry"
              type="date"
              register={register}
              errors={errors}
              icon={<Calendar className="h-4 w-4 text-red-600" />}
            />
          </div>
        </div>

        {/* Personal Details */}
        <div className="bg-white rounded-lg p-5 mb-6 border border-purple-100">
          <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Personal Details
          </h5>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField
              label="Full Name"
              name="name"
              register={register}
              errors={errors}
              placeholder="John Doe"
              required
              hint="Full legal name as per ID card"
              icon={<User className="h-4 w-4 text-blue-600" />}
            />
            <TextField
              label="Nickname"
              name="nick_name"
              register={register}
              errors={errors}
              placeholder="John"
              hint="Preferred name or nickname"
              icon={<User className="h-4 w-4 text-cyan-600" />}
            />
            <TextField
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              register={register}
              errors={errors}
              icon={<Calendar className="h-4 w-4 text-green-600" />}
            />
            <TextField
              label="Place of Birth"
              name="place_of_birth"
              register={register}
              errors={errors}
              placeholder="Jakarta"
              hint="City/regency of birth"
              icon={<MapPin className="h-4 w-4 text-red-600" />}
            />
          </div>
        </div>

        {/* Demographics */}
        <div className="bg-white rounded-lg p-5 border border-purple-100">
          <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-600" />
            Demographics
          </h5>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SelectField
              label="Gender"
              name="gender"
              register={register}
              errors={errors}
              icon={<Users className="h-4 w-4 text-purple-600" />}
              options={[
                { value: '', label: '-- Select Gender --' },
                { value: 'male', label: 'Male (Laki-laki)' },
                { value: 'female', label: 'Female (Perempuan)' },
              ]}
            />
            <SelectField
              label="Marital Status"
              name="marital_status"
              register={register}
              errors={errors}
              icon={<Users className="h-4 w-4 text-pink-600" />}
              options={[
                { value: '', label: '-- Select Status --' },
                { value: 'single', label: 'Single (Belum Menikah)' },
                { value: 'married', label: 'Married (Menikah)' },
                { value: 'divorced', label: 'Divorced (Cerai)' },
                { value: 'widowed', label: 'Widowed (Duda/Janda)' },
              ]}
            />
            <SelectField
              label="Religion"
              name="religion"
              register={register}
              errors={errors}
              icon={<Users className="h-4 w-4 text-teal-600" />}
              options={[
                { value: '', label: '-- Select Religion --' },
                { value: 'islam', label: 'Islam' },
                { value: 'kristen', label: 'Kristen' },
                { value: 'katolik', label: 'Katolik' },
                { value: 'hindu', label: 'Hindu' },
                { value: 'buddha', label: 'Buddha' },
                { value: 'konghucu', label: 'Konghucu' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <TextField
              label="Nationality"
              name="nationality"
              register={register}
              errors={errors}
              placeholder="Indonesia"
              hint="Country of citizenship"
              icon={<MapPin className="h-4 w-4 text-blue-600" />}
            />
          </div>
        </div>
      </div>

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
}: StepProps & {
  control: Control<EmployeeFormInput>;
  departments: Department[];
  workLocations: WorkLocationOption[];
  employees: Employee[];
  companyId: number | undefined;
  currentEmployeeId: number;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 transition-all">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
          <Briefcase className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Employment Information</h3>
          <p className="text-sm text-gray-600">Job position and employment details</p>
        </div>
      </div>

      {/* Job Details */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Job Details</h4>
            <p className="text-xs text-gray-600">Position and department information</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-blue-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField
              label="Position"
              name="job_title"
              register={register}
              errors={errors}
              placeholder="Software Engineer"
              icon={<Briefcase className="h-4 w-4 text-blue-600" />}
            />
            <SelectField
              label="Department"
              name="department_id"
              register={register}
              errors={errors}
              valueAsNumber
              icon={<Building className="h-4 w-4 text-indigo-600" />}
              options={[
                { value: '', label: companyId ? '-- Select Department --' : '-- Pilih Company dulu --' },
                ...departments.map((d) => ({ value: d.id.toString(), label: d.name })),
              ]}
            />
            <div>
              <FieldLabel label="Reports To (Manager)" icon={<Users className="h-4 w-4 text-purple-600" />} />
              <Controller
                name="manager_id"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ''}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    placeholder="-- No Manager (Top Level / Group CEO) --"
                    searchPlaceholder="Search by name..."
                    emptyMessage="No employees found"
                    options={employees
                      .filter((e) => e.id !== currentEmployeeId)
                      .map((e) => ({
                        value: e.id,
                        label: e.name,
                        sublabel: `${e.position?.name || e.job_title || 'No Position'} • ${e.company?.name || ''}`,
                      }))}
                  />
                )}
              />
              <FieldHint>Pilih atasan langsung. Kosongkan untuk posisi tertinggi (Group CEO)</FieldHint>
              <FieldError msg={errors.manager_id?.message} />
            </div>
            <SelectField
              label="Work Location"
              name="work_location_id"
              register={register}
              errors={errors}
              valueAsNumber
              icon={<MapPin className="h-4 w-4 text-purple-600" />}
              options={[
                { value: '', label: '-- Select Work Location --' },
                ...workLocations.map((wl) => ({
                  value: String(wl.id),
                  label: wl.code ? `${wl.name} (${wl.code})` : wl.name,
                })),
              ]}
            />
            <TextField
              label="Work Schedule"
              name="work_schedule"
              register={register}
              errors={errors}
              placeholder="Mon-Fri, 09:00-18:00"
              icon={<Clock className="h-4 w-4 text-orange-600" />}
            />
          </div>
        </div>
      </div>

      {/* Employment Status */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Check className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Employment Status</h4>
            <p className="text-xs text-gray-600">Type and status of employment</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-green-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SelectField
              label="Employment Type"
              name="employment_type"
              register={register}
              errors={errors}
              icon={<FileText className="h-4 w-4 text-green-600" />}
              options={[
                { value: '', label: '-- Select Type --' },
                { value: 'permanent', label: 'Permanent (Tetap)' },
                { value: 'contract', label: 'Contract (Kontrak)' },
                { value: 'internship', label: 'Internship (Magang)' },
                { value: 'freelance', label: 'Freelance' },
              ]}
            />
            <SelectField
              label="Employment Status"
              name="employment_status"
              register={register}
              errors={errors}
              icon={<Check className="h-4 w-4 text-emerald-600" />}
              options={[
                { value: '', label: '-- Select Status --' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'terminated', label: 'Terminated' },
                { value: 'resigned', label: 'Resigned' },
                { value: 'retired', label: 'Retired' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Important Dates */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Important Dates</h4>
            <p className="text-xs text-gray-600">Employment and contract dates</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-orange-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField
              label="Join Date"
              name="join_date"
              type="date"
              register={register}
              errors={errors}
              hint="Tanggal mulai bekerja. Probation akan dihitung otomatis."
              icon={<Calendar className="h-4 w-4 text-amber-600" />}
            />
            <div className="lg:col-span-1" />
            <div>
              <FieldLabel label="Probation Start" icon={<Calendar className="h-4 w-4 text-blue-600" />} />
              <input
                type="date"
                {...register('probation_start_date')}
                readOnly
                className="block w-full rounded-xl border-gray-300 bg-gray-50 shadow-sm sm:text-sm cursor-not-allowed"
              />
              <FieldHint>Otomatis sama dengan Join Date</FieldHint>
            </div>
            <div>
              <FieldLabel label="Probation End" icon={<Calendar className="h-4 w-4 text-green-600" />} />
              <input
                type="date"
                {...register('probation_end_date')}
                readOnly
                className="block w-full rounded-xl border-gray-300 bg-gray-50 shadow-sm sm:text-sm cursor-not-allowed"
              />
              <FieldHint>Otomatis Join Date + 3 bulan</FieldHint>
            </div>
            <TextField
              label="Contract Start"
              name="contract_start_date"
              type="date"
              register={register}
              errors={errors}
              icon={<Calendar className="h-4 w-4 text-purple-600" />}
            />
            <TextField
              label="Contract End"
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

function Step3Payroll({ register, errors }: StepProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 transition-all">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
          <Wallet className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Payroll Information</h3>
          <p className="text-sm text-gray-600">Salary and compensation details</p>
        </div>
      </div>

      {/* Basic Salary */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Basic Salary</h4>
            <p className="text-xs text-gray-600">Monthly base salary information</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-green-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField
              label="Basic Salary"
              name="basic_salary"
              type="number"
              register={register}
              errors={errors}
              placeholder="10000000"
              icon={<Wallet className="h-4 w-4 text-green-600" />}
            />
            <SelectField
              label="Currency"
              name="salary_currency"
              register={register}
              errors={errors}
              icon={<CreditCard className="h-4 w-4 text-blue-600" />}
              options={[
                { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
                { value: 'USD', label: 'USD - US Dollar' },
                { value: 'SGD', label: 'SGD - Singapore Dollar' },
              ]}
            />
            <SelectField
              label="Pay Frequency"
              name="pay_frequency"
              register={register}
              errors={errors}
              icon={<Calendar className="h-4 w-4 text-purple-600" />}
              options={[{ value: 'monthly', label: 'Monthly' }]}
            />
            <SelectField
              label="Pay Type"
              name="pay_type"
              register={register}
              errors={errors}
              icon={<Wallet className="h-4 w-4 text-indigo-600" />}
              hint="Semua karyawan PFI menggunakan tipe Gross — PPh 21 dipotong dari gaji"
              options={[
                { value: 'gross', label: 'Gross (Pajak Ditanggung Karyawan)' },
              ]}
            />
            <SelectField
              label="Status Karyawan (Payroll)"
              name="salary_status"
              register={register}
              errors={errors}
              icon={<Shield className="h-4 w-4 text-indigo-600" />}
              hint="Existing: karyawan lama dari skema net. New (Gross): karyawan baru, gaji pure gross."
              options={[
                {
                  value: 'existing',
                  label:
                    'Existing (Legacy Net→Gross) — THP = Basic, tunjangan pajak otomatis',
                },
                {
                  value: 'new_gross',
                  label: 'New (Gross) — Karyawan bayar PPh21, THP < Basic',
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Allowances */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Allowances</h4>
            <p className="text-xs text-gray-600">Additional compensation and benefits</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-blue-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TextField
              label="Transport Allowance"
              name="transport_allowance"
              type="number"
              register={register}
              errors={errors}
              placeholder="500000"
              icon={<Wallet className="h-4 w-4 text-blue-600" />}
            />
            <TextField
              label="Meal Allowance"
              name="meal_allowance"
              type="number"
              register={register}
              errors={errors}
              placeholder="500000"
              icon={<Wallet className="h-4 w-4 text-orange-600" />}
            />
            <TextField
              label="Position Allowance"
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

      {/* Bank Account */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200 p-6 mt-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Landmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Bank Account</h4>
            <p className="text-xs text-gray-600">Bank account for salary disbursement</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-amber-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField
              label="Bank Name"
              name="bank_name"
              register={register}
              errors={errors}
              placeholder="BCA, Mandiri, BNI, etc."
              icon={<Landmark className="h-4 w-4 text-amber-600" />}
            />
            <TextField
              label="Account Number"
              name="bank_account_number"
              register={register}
              errors={errors}
              placeholder="1234567890"
              icon={<CreditCard className="h-4 w-4 text-amber-600" />}
            />
          </div>
        </div>
      </div>

      {/* Tax Information */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Tax Information</h4>
            <p className="text-xs text-gray-600">PTKP status dan informasi pajak karyawan</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-purple-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField
              label="NPWP Number"
              name="npwp_number"
              register={register}
              errors={errors}
              placeholder="XX.XXX.XXX.X-XXX.XXX"
              hint="Nomor Pokok Wajib Pajak"
              icon={<FileText className="h-4 w-4 text-blue-600" />}
            />
            <SelectField
              label="Status PTKP"
              name="ptkp_status"
              register={register}
              errors={errors}
              hint="Penghasilan Tidak Kena Pajak untuk perhitungan PPh 21"
              icon={<FileText className="h-4 w-4 text-purple-600" />}
              options={[
                { value: '', label: '-- Pilih Status PTKP --' },
                { value: 'TK/0', label: 'TK/0 - Tidak Kawin, Tanpa Tanggungan' },
                { value: 'TK/1', label: 'TK/1 - Tidak Kawin, 1 Tanggungan' },
                { value: 'TK/2', label: 'TK/2 - Tidak Kawin, 2 Tanggungan' },
                { value: 'TK/3', label: 'TK/3 - Tidak Kawin, 3 Tanggungan' },
                { value: 'K/0', label: 'K/0 - Kawin, Tanpa Tanggungan' },
                { value: 'K/1', label: 'K/1 - Kawin, 1 Tanggungan' },
                { value: 'K/2', label: 'K/2 - Kawin, 2 Tanggungan' },
                { value: 'K/3', label: 'K/3 - Kawin, 3 Tanggungan' },
                { value: 'K/I/0', label: 'K/I/0 - Kawin, Penghasilan Istri Digabung' },
                { value: 'K/I/1', label: 'K/I/1 - Kawin, Penghasilan Istri Digabung, 1 Tanggungan' },
                { value: 'K/I/2', label: 'K/I/2 - Kawin, Penghasilan Istri Digabung, 2 Tanggungan' },
                { value: 'K/I/3', label: 'K/I/3 - Kawin, Penghasilan Istri Digabung, 3 Tanggungan' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* BPJS */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-6 mt-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">BPJS & Asuransi</h4>
            <p className="text-xs text-gray-600">Informasi BPJS dan asuransi karyawan</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-teal-100 mb-4">
          <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-teal-600" />
            Nomor BPJS
          </h5>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField
              label="No. BPJS Ketenagakerjaan"
              name="bpjs_ketenagakerjaan_number"
              register={register}
              errors={errors}
              placeholder="Masukkan nomor BPJS TK"
              icon={<CreditCard className="h-4 w-4 text-teal-600" />}
            />
            <TextField
              label="No. BPJS Kesehatan"
              name="bpjs_kesehatan_number"
              register={register}
              errors={errors}
              placeholder="Masukkan nomor BPJS Kesehatan"
              icon={<CreditCard className="h-4 w-4 text-cyan-600" />}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-teal-100">
          <p className="text-sm text-gray-500">
            Program BPJS Ketenagakerjaan dan asuransi akan diatur otomatis berdasarkan tipe karyawan yang dipilih.
          </p>
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
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 transition-all">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
          <MapPin className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Contact & Address</h3>
          <p className="text-sm text-gray-600">Contact information and addresses</p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Contact Information</h4>
            <p className="text-xs text-gray-600">Phone and email details</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-blue-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TextField
              label="Phone Number"
              name="phone"
              register={register}
              errors={errors}
              placeholder="+62 21 1234567"
              hint="Office or home landline"
              icon={<Phone className="h-4 w-4 text-blue-600" />}
            />
            <TextField
              label="Mobile Number"
              name="mobile_number"
              register={register}
              errors={errors}
              placeholder="+62 812 3456 7890"
              hint="Personal mobile/WhatsApp"
              icon={<Phone className="h-4 w-4 text-green-600" />}
            />
            <TextField
              label="Personal Email"
              name="personal_email"
              type="email"
              register={register}
              errors={errors}
              required
              placeholder="name@gmail.com"
              hint={hasOfficeEmail ? 'For onboarding credentials' : 'Used as login & for notifications'}
              icon={<Mail className="h-4 w-4 text-orange-500" />}
            />
            <div className="lg:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none mb-3">
                <div
                  className={`relative w-10 h-5 rounded-full transition-colors ${hasOfficeEmail ? 'bg-purple-500' : 'bg-gray-300'}`}
                  onClick={() => setValue('has_office_email', !hasOfficeEmail)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hasOfficeEmail ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Employee has office email</span>
              </label>
              {hasOfficeEmail && (
                <TextField
                  label="Office Email"
                  name="email"
                  type="email"
                  register={register}
                  errors={errors}
                  required
                  placeholder="employee@company.com"
                  hint="Official company email (M365 / Google Workspace)"
                  icon={<Mail className="h-4 w-4 text-purple-600" />}
                />
              )}
              {!hasOfficeEmail && (
                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  Login credential will be sent to personal email. Office email can be added later.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Address Information</h4>
            <p className="text-xs text-gray-600">Permanent (KTP) and current address</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-orange-100 space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Permanent Address (KTP)</p>
            <div className="space-y-4">
              <TextareaField
                label="Full Address"
                name="address"
                register={register}
                errors={errors}
                rows={2}
                placeholder="Full address as per ID card"
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <TextField label="City" name="city" register={register} errors={errors} placeholder="Bandar Lampung" icon={<MapPin className="h-4 w-4 text-blue-600" />} />
                <TextField label="Province" name="province" register={register} errors={errors} placeholder="Lampung" icon={<MapPin className="h-4 w-4 text-green-600" />} />
                <TextField label="Postal Code" name="postal_code" register={register} errors={errors} placeholder="35141" icon={<MapPin className="h-4 w-4 text-purple-600" />} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Current Address (Domicile)</p>
            <div className="space-y-4">
              <TextareaField
                label="Full Address"
                name="current_address"
                register={register}
                errors={errors}
                rows={2}
                placeholder="Current residential address"
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <TextField label="City" name="current_city" register={register} errors={errors} placeholder="Tangerang Selatan" icon={<MapPin className="h-4 w-4 text-blue-600" />} />
                <TextField label="Province" name="current_province" register={register} errors={errors} placeholder="Banten" icon={<MapPin className="h-4 w-4 text-green-600" />} />
                <TextField label="Postal Code" name="current_postal_code" register={register} errors={errors} placeholder="15417" icon={<MapPin className="h-4 w-4 text-purple-600" />} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border-2 border-red-200 p-6 mt-6">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
            <Contact className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">Emergency Contact</h4>
            <p className="text-xs text-gray-600">Person to contact in case of emergency</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-red-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TextField label="Contact Name" name="emergency_contact_name" register={register} errors={errors} placeholder="Full name" icon={<User className="h-4 w-4 text-red-600" />} />
            <TextField label="Contact Phone" name="emergency_contact_phone" register={register} errors={errors} placeholder="+62 812 3456 7890" icon={<Phone className="h-4 w-4 text-red-600" />} />
            <SelectField
              label="Relationship"
              name="emergency_contact_relationship"
              register={register}
              errors={errors}
              icon={<Users className="h-4 w-4 text-pink-600" />}
              options={[
                { value: '', label: '-- Pilih Hubungan --' },
                { value: 'Suami', label: 'Suami' },
                { value: 'Istri', label: 'Istri' },
                { value: 'Orang Tua', label: 'Orang Tua' },
                { value: 'Ayah', label: 'Ayah' },
                { value: 'Ibu', label: 'Ibu' },
                { value: 'Anak', label: 'Anak' },
                { value: 'Saudara', label: 'Saudara' },
                { value: 'Kakak', label: 'Kakak' },
                { value: 'Adik', label: 'Adik' },
                { value: 'Lainnya', label: 'Lainnya' },
              ]}
            />
            <TextField label="Contact Address" name="emergency_contact_address" register={register} errors={errors} placeholder="Full address" icon={<MapPin className="h-4 w-4 text-red-600" />} />
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
}: {
  values: EmployeeFormInput;
  companies: Company[];
  departments: Department[];
  employees: Employee[];
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 transition-all">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
          <Check className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Review & Confirm</h3>
          <p className="text-sm text-gray-600">Review all information before submitting</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-purple-600" />
            <h4 className="font-bold text-gray-900">Personal Information</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label="Full Name" value={values.name || '-'} />
            <SummaryItem label="Employee ID" value={values.employee_id || 'Auto-generated'} />
            <SummaryItem label="Gender" value={values.gender || '-'} />
            <SummaryItem label="Date of Birth" value={values.date_of_birth || '-'} />
            <SummaryItem label="Nationality" value={values.nationality || '-'} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h4 className="font-bold text-gray-900">Employment</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label="Company" value={companies.find((c) => c.id === values.company_id)?.name || '-'} />
            <SummaryItem label="Position" value={values.job_title || '-'} />
            <SummaryItem label="Department" value={departments.find((d) => d.id === values.department_id)?.name || '-'} />
            <SummaryItem label="Reports To" value={employees.find((e) => e.id === values.manager_id)?.name || 'No Manager (Top Level)'} />
            <SummaryItem label="Employment Type" value={values.employment_type || '-'} />
            <SummaryItem label="Status" value={values.employment_status || '-'} />
            <SummaryItem label="Join Date" value={values.join_date || '-'} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-green-600" />
            <h4 className="font-bold text-gray-900">Payroll</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem
              label="Basic Salary"
              value={values.basic_salary ? `${values.salary_currency} ${Number(values.basic_salary).toLocaleString()}` : '-'}
            />
            <SummaryItem label="Pay Frequency" value={values.pay_frequency || '-'} />
            <SummaryItem label="Pay Type" value="Gross (Pajak Ditanggung Karyawan)" />
            <SummaryItem label="PTKP Status" value={values.ptkp_status || '-'} />
            <SummaryItem label="Bank" value={values.bank_name ? `${values.bank_name} - ${values.bank_account_number || '-'}` : '-'} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-orange-600" />
            <h4 className="font-bold text-gray-900">Contact & Address</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label="Personal Email" value={values.personal_email || '-'} />
            <SummaryItem label="Office Email" value={values.has_office_email ? (values.email || '-') : 'N/A (uses personal email)'} />
            <SummaryItem label="Phone" value={values.phone || '-'} />
            <SummaryItem label="Mobile" value={values.mobile_number || '-'} />
            <SummaryItem label="KTP City" value={values.city || '-'} />
            <SummaryItem label="Current City" value={values.current_city || '-'} />
            <SummaryItem label="Emergency Contact" value={values.emergency_contact_name ? `${values.emergency_contact_name} (${values.emergency_contact_relationship || '-'})` : '-'} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-teal-600" />
            <h4 className="font-bold text-gray-900">BPJS & Asuransi</h4>
          </div>
          <div className="space-y-2 text-sm">
            <SummaryItem label="BPJS TK" value={values.bpjs_ketenagakerjaan_number || '-'} />
            <SummaryItem label="BPJS Kesehatan" value={values.bpjs_kesehatan_number || '-'} />
            <SummaryItem label="JHT" value={values.jht_registered ? 'Terdaftar' : 'Tidak'} />
            <SummaryItem label="JP" value={values.jp_registered ? 'Terdaftar' : 'Tidak'} />
            <SummaryItem label="Asuransi Kesehatan" value={values.medical_insurance ? 'Ya' : 'Tidak'} />
            <SummaryItem label="Asuransi Jiwa" value={values.life_insurance ? 'Ya' : 'Tidak'} />
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-amber-800">Please Review</h5>
          <p className="text-sm text-amber-700 mt-1">
            Make sure all information is correct before submitting. You can go back to any step to make changes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Field primitives (RHF-aware wrappers)
// ============================================================================

const baseInput =
  'block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm transition-all';

function FieldLabel({ label, required, icon }: { label: string; required?: boolean; icon?: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-gray-900 mb-2">
      {icon && <span className="inline-flex mr-1">{icon}</span>}
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-xs text-gray-500">
      <AlertCircle className="h-3 w-3 inline mr-1" />
      {children}
    </p>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
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
  // Numeric fields registered with valueAsNumber so Zod preprocess gets a number
  const isNumeric = type === 'number';
  const regOpts = isNumeric
    ? { valueAsNumber: false } // keep as string; Zod preprocess handles parsing
    : undefined;
  const errMsg = (errors[name] as { message?: string } | undefined)?.message;

  return (
    <div>
      <FieldLabel label={label} required={required} icon={icon} />
      <input
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
  const errMsg = (errors[name] as { message?: string } | undefined)?.message;
  return (
    <div>
      <FieldLabel label={label} required={required} icon={icon} />
      <select
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
  const errMsg = (errors[name] as { message?: string } | undefined)?.message;
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <textarea
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
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

