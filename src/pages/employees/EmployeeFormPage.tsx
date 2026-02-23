import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  ChevronRight,
  Hash,
  Calendar,
  Mail,
  Building,
  Clock,
  Wallet,
  Users,
  AlertCircle,
  FileText,
  GraduationCap,
  Key,
  Shield,
  Heart,
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
import { workLocationService, type WorkLocation } from '@/services/work-location.service';
import type { CreateEmployeeRequest, Department, Employee } from '@/types';

const STEPS = [
  { id: 1, title: 'Personal Info', subtitle: 'Basic details', icon: User },
  { id: 2, title: 'Employment', subtitle: 'Job info', icon: Briefcase },
  { id: 3, title: 'Payroll', subtitle: 'Salary & Tax', icon: Wallet },
  { id: 4, title: 'Contact', subtitle: 'Address', icon: MapPin },
  { id: 5, title: 'Review', subtitle: 'Confirm', icon: Check },
];

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState<string>('');
  const [isLoadingEmployeeId, setIsLoadingEmployeeId] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [resignData, setResignData] = useState({
    resign_date: '',
    resign_type: '',
    resign_reason: '',
    resign_notes: '',
  });
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    name: '',
    employee_id: '',
    email: '',
    phone: '',
    mobile_number: '',
    gender: '',
    date_of_birth: '',
    place_of_birth: '',
    marital_status: '',
    religion: '',
    nationality: 'Indonesia',
    // Alamat KTP
    address: '',
    city: '',
    province: '',
    postal_code: '',
    // Alamat Domisili
    current_address: '',
    current_city: '',
    current_province: '',
    current_postal_code: '',
    national_id: '',
    npwp_number: '',
    job_title: '',
    company_id: undefined,
    department_id: undefined,
    manager_id: undefined,
    leave_approver_id: undefined,
    overtime_approver_id: undefined,
    employment_type: 'permanent',
    employment_status: 'active',
    join_date: '',
    basic_salary: undefined,
    transport_allowance: undefined,
    meal_allowance: undefined,
    position_allowance: undefined,
    salary_currency: 'IDR',
    pay_type: '',
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
    family_card_number: '',
    passport_number: '',
    passport_expiry: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    emergency_contact_address: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptResponse, companyResponse, empResponse, workLocResponse] = await Promise.all([
          departmentService.getAll({ page: 1, limit: 100 }),
          companyService.getAll({ page: 1, limit: 100, is_active: true }),
          employeeService.getAll({ page: 1, limit: 500, employment_status: 'active' }),
          workLocationService.getAll().catch(() => []),
        ]);
        setDepartments(deptResponse.data);
        setCompanies(companyResponse.data);
        setEmployees(empResponse.data);
        setWorkLocations(Array.isArray(workLocResponse) ? workLocResponse : workLocResponse.data);

        if (id) {
          const employee = await employeeService.getById(parseInt(id));
          setFormData({
            name: employee.name,
            employee_id: employee.employee_id || '',
            email: employee.email || '',
            phone: employee.phone || '',
            mobile_number: employee.mobile_number || '',
            gender: employee.gender || '',
            date_of_birth: employee.date_of_birth?.split('T')[0] || '',
            place_of_birth: employee.place_of_birth || '',
            marital_status: employee.marital_status || '',
            religion: employee.religion || '',
            nationality: employee.nationality || 'Indonesia',
            // Alamat KTP
            address: employee.address || '',
            city: employee.city || '',
            province: employee.province || '',
            postal_code: employee.postal_code || '',
            // Alamat Domisili
            current_address: employee.current_address || '',
            current_city: employee.current_city || '',
            current_province: employee.current_province || '',
            current_postal_code: employee.current_postal_code || '',
            national_id: employee.national_id || '',
            npwp_number: employee.npwp_number || '',
            job_title: employee.job_title || employee.position?.name || '',
            company_id: employee.company_id,
            department_id: employee.department_id,
            position_id: employee.position_id,
            work_location_id: employee.work_location_id,
            manager_id: employee.manager_id,
            leave_approver_id: employee.leave_approver_id,
            overtime_approver_id: employee.overtime_approver_id,
            employment_type: employee.employment_type || 'permanent',
            employment_status: employee.employment_status || 'active',
            join_date: employee.join_date?.split('T')[0] || '',
            basic_salary: employee.basic_salary,
            transport_allowance: employee.transport_allowance,
            meal_allowance: employee.meal_allowance,
            position_allowance: employee.position_allowance,
            salary_currency: employee.salary_currency || 'IDR',
            pay_type: employee.pay_type || '',
            ptkp_status: employee.ptkp_status || '',
            bpjs_ketenagakerjaan_number: employee.bpjs_ketenagakerjaan_number || '',
            bpjs_kesehatan_number: employee.bpjs_kesehatan_number || '',
            jht_registered: employee.jht_registered || false,
            jp_registered: employee.jp_registered || false,
            medical_insurance: employee.medical_insurance || false,
            life_insurance: employee.life_insurance || false,
            bank_name: employee.bank_name || '',
            bank_account_number: employee.bank_account_number || '',
            bank_account_holder: employee.bank_account_holder || '',
            family_card_number: employee.family_card_number || '',
            passport_number: employee.passport_number || '',
            passport_expiry: employee.passport_expiry?.split('T')[0] || '',
            emergency_contact_name: employee.emergency_contact_name || '',
            emergency_contact_phone: employee.emergency_contact_phone || '',
            emergency_contact_relationship: employee.emergency_contact_relationship || '',
            emergency_contact_address: employee.emergency_contact_address || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fetch next employee ID when company is selected (only for new employees)
  useEffect(() => {
    const fetchNextEmployeeId = async () => {
      if (!isEdit && formData.company_id) {
        setIsLoadingEmployeeId(true);
        try {
          const nextId = await employeeService.getNextEmployeeId(formData.company_id);
          setGeneratedEmployeeId(nextId);
          setFormData(prev => ({ ...prev, employee_id: nextId }));
        } catch (error) {
          console.error('Failed to generate employee ID:', error);
        } finally {
          setIsLoadingEmployeeId(false);
        }
      }
    };

    fetchNextEmployeeId();
  }, [formData.company_id, isEdit]);

  // Filter departments by selected company
  const filteredDepartments = departments.filter(d => {
    if (!formData.company_id) return true;
    const deptCompanyId = d.company_id || d.company?.id;
    return deptCompanyId === formData.company_id;
  });

  // Auto-calculate probation dates when join_date changes
  useEffect(() => {
    if (formData.join_date) {
      // Set probation_start_date = join_date
      const probationStart = formData.join_date;

      // Set probation_end_date = join_date + 3 months
      const joinDate = new Date(formData.join_date);
      joinDate.setMonth(joinDate.getMonth() + 3);
      const probationEnd = joinDate.toISOString().split('T')[0];

      setFormData(prev => ({
        ...prev,
        probation_start_date: probationStart,
        probation_end_date: probationEnd,
      }));
    }
  }, [formData.join_date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only allow submit on final step (Review)
    if (currentStep !== STEPS.length) {
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await employeeService.update(parseInt(id), formData);
        toast.success('Employee updated successfully');
      } else {
        await employeeService.create(formData);
        toast.success('Employee created successfully');
      }
      navigate('/employees');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  const handleResign = async () => {
    if (!resignData.resign_date) {
      toast.error('Tanggal resign harus diisi');
      return;
    }
    if (!resignData.resign_type) {
      toast.error('Tipe resign harus dipilih');
      return;
    }

    setIsResigning(true);
    try {
      await employeeService.update(parseInt(id!), {
        ...formData,
        resign_date: resignData.resign_date,
        resign_type: resignData.resign_type,
        resign_reason: resignData.resign_reason,
        resign_notes: resignData.resign_notes,
        employment_status: 'resigned',
      });
      toast.success('Karyawan berhasil di-resign');
      setShowResignModal(false);
      navigate('/employees');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memproses resign');
    } finally {
      setIsResigning(false);
    }
  };

  if (isLoading) {
    return <PageSpinner />;
  }

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
              {/* Resign Button - Only show for existing active employees */}
              {isEdit && formData.employment_status === 'active' && (
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
              {/* Step Circle */}
              <button
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

              {/* Step Info */}
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

              {/* Connector Line */}
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

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        {/* Step Content - key forces re-render on step change */}
        <div key={`step-${currentStep}`}>
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
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

            {/* Basic Identity */}
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

              {/* Company Selection */}
              <div className="bg-white rounded-lg p-5 mb-6 border border-purple-100">
                <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="h-4 w-4 text-indigo-600" />
                  Company Assignment
                </h5>
                <div className="grid grid-cols-1 gap-6">
                  <FormSelect
                    label="Company"
                    name="company_id"
                    value={formData.company_id?.toString() || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value ? parseInt(e.target.value) : undefined, department_id: undefined }))}
                    options={[
                      { value: '', label: '-- Pilih Company --' },
                      ...companies.map(c => ({ value: c.id.toString(), label: `${c.name} (${c.code})` })),
                    ]}
                    required
                    hint="Pilih company dimana karyawan akan didaftarkan"
                    icon={<Building className="h-4 w-4 text-indigo-600" />}
                  />
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
                    <label htmlFor="employee_id" className="block text-sm font-bold text-gray-900 mb-2">
                      <span className="inline-flex mr-1"><Hash className="h-4 w-4 text-indigo-600" /></span>
                      Employee ID (NIK)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="employee_id"
                        name="employee_id"
                        value={formData.employee_id || ''}
                        onChange={handleChange}
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
                    <p className="mt-1 text-xs text-gray-500">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {generatedEmployeeId
                        ? `Format: ${generatedEmployeeId.split('-').slice(0, 2).join('-')}-YYNNNNN`
                        : 'Pilih company terlebih dahulu untuk generate ID otomatis'}
                    </p>
                  </div>
                  <FormInput
                    label="NIK KTP"
                    name="national_id"
                    value={formData.national_id || ''}
                    onChange={handleChange}
                    placeholder="1234567890123456"
                    hint="16-digit National ID Number"
                    icon={<CreditCard className="h-4 w-4 text-purple-600" />}
                  />
                  <FormInput
                    label="Family Card Number (KK)"
                    name="family_card_number"
                    value={formData.family_card_number || ''}
                    onChange={handleChange}
                    placeholder="1234567890123456"
                    hint="16-digit Family Card Number"
                    icon={<CreditCard className="h-4 w-4 text-indigo-600" />}
                  />
                  <FormInput
                    label="Passport Number"
                    name="passport_number"
                    value={formData.passport_number || ''}
                    onChange={handleChange}
                    placeholder="A1234567"
                    icon={<FileText className="h-4 w-4 text-teal-600" />}
                  />
                  <FormInput
                    label="Passport Expiry"
                    name="passport_expiry"
                    type="date"
                    value={formData.passport_expiry || ''}
                    onChange={handleChange}
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
                  <FormInput
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    hint="Full legal name as per ID card"
                    icon={<User className="h-4 w-4 text-blue-600" />}
                  />
                  <FormInput
                    label="Nickname"
                    name="nick_name"
                    value={formData.nick_name || ''}
                    onChange={handleChange}
                    placeholder="John"
                    hint="Preferred name or nickname"
                    icon={<User className="h-4 w-4 text-cyan-600" />}
                  />
                  <FormInput
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={handleChange}
                    icon={<Calendar className="h-4 w-4 text-green-600" />}
                  />
                  <FormInput
                    label="Place of Birth"
                    name="place_of_birth"
                    value={formData.place_of_birth || ''}
                    onChange={handleChange}
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
                  <FormSelect
                    label="Gender"
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: '-- Select Gender --' },
                      { value: 'male', label: 'Male (Laki-laki)' },
                      { value: 'female', label: 'Female (Perempuan)' },
                    ]}
                    icon={<Users className="h-4 w-4 text-purple-600" />}
                  />
                  <FormSelect
                    label="Marital Status"
                    name="marital_status"
                    value={formData.marital_status || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: '-- Select Status --' },
                      { value: 'single', label: 'Single (Belum Menikah)' },
                      { value: 'married', label: 'Married (Menikah)' },
                      { value: 'divorced', label: 'Divorced (Cerai)' },
                      { value: 'widowed', label: 'Widowed (Duda/Janda)' },
                    ]}
                    icon={<Users className="h-4 w-4 text-pink-600" />}
                  />
                  <FormSelect
                    label="Religion"
                    name="religion"
                    value={formData.religion || ''}
                    onChange={handleChange}
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
                    icon={<Users className="h-4 w-4 text-teal-600" />}
                  />
                  <FormInput
                    label="Nationality"
                    name="nationality"
                    value={formData.nationality || ''}
                    onChange={handleChange}
                    placeholder="Indonesia"
                    hint="Country of citizenship"
                    icon={<MapPin className="h-4 w-4 text-blue-600" />}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Employment Information */}
        {currentStep === 2 && (
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
                  <FormInput
                    label="Job Title"
                    name="job_title"
                    value={formData.job_title || ''}
                    onChange={handleChange}
                    placeholder="Software Engineer"
                    icon={<Briefcase className="h-4 w-4 text-blue-600" />}
                  />
                  <FormSelect
                    label="Department"
                    name="department_id"
                    value={formData.department_id?.toString() || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department_id: e.target.value ? parseInt(e.target.value) : undefined }))}
                    options={[
                      { value: '', label: formData.company_id ? '-- Select Department --' : '-- Pilih Company dulu --' },
                      ...filteredDepartments.map((d) => ({ value: d.id.toString(), label: d.name })),
                    ]}
                    icon={<Building className="h-4 w-4 text-indigo-600" />}
                  />
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      <span className="inline-flex mr-1"><Users className="h-4 w-4 text-purple-600" /></span>
                      Reports To (Manager)
                    </label>
                    <SearchableSelect
                      value={formData.manager_id || ''}
                      onChange={(val) => setFormData((prev) => ({ ...prev, manager_id: val ? Number(val) : undefined }))}
                      placeholder="-- No Manager (Top Level / Group CEO) --"
                      searchPlaceholder="Search by name..."
                      emptyMessage="No employees found"
                      options={employees
                        .filter(e => e.id !== (id ? parseInt(id) : 0))
                        .map((e) => ({
                          value: e.id,
                          label: e.name,
                          sublabel: `${e.job_title || e.position?.name || 'No Position'} • ${e.company?.name || ''}`,
                        }))}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Pilih atasan langsung. Kosongkan untuk posisi tertinggi (Group CEO)
                    </p>
                  </div>
                  <FormSelect
                    label="Work Location"
                    name="work_location_id"
                    value={formData.work_location_id?.toString() || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, work_location_id: e.target.value ? parseInt(e.target.value) : undefined }))}
                    icon={<MapPin className="h-4 w-4 text-purple-600" />}
                    options={[
                      { value: '', label: '-- Select Work Location --' },
                      ...workLocations.map((wl) => ({
                        value: String(wl.id),
                        label: `${wl.name}${wl.city ? ` - ${wl.city}` : ''}`,
                      })),
                    ]}
                  />
                  <FormInput
                    label="Work Schedule"
                    name="work_schedule"
                    value={formData.work_schedule || ''}
                    onChange={handleChange}
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
                  <FormSelect
                    label="Employment Type"
                    name="employment_type"
                    value={formData.employment_type || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: '-- Select Type --' },
                      { value: 'permanent', label: 'Permanent (Tetap)' },
                      { value: 'contract', label: 'Contract (Kontrak)' },
                      { value: 'intern', label: 'Intern (Magang)' },
                      { value: 'freelance', label: 'Freelance' },
                    ]}
                    icon={<FileText className="h-4 w-4 text-green-600" />}
                  />
                  <FormSelect
                    label="Employment Status"
                    name="employment_status"
                    value={formData.employment_status || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: '-- Select Status --' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'terminated', label: 'Terminated' },
                      { value: 'resigned', label: 'Resigned' },
                      { value: 'retired', label: 'Retired' },
                    ]}
                    icon={<Check className="h-4 w-4 text-emerald-600" />}
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
                  <FormInput
                    label="Join Date"
                    name="join_date"
                    type="date"
                    value={formData.join_date || ''}
                    onChange={handleChange}
                    hint="Tanggal mulai bekerja. Probation akan dihitung otomatis."
                    icon={<Calendar className="h-4 w-4 text-amber-600" />}
                  />
                  <div className="lg:col-span-1" />
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      <span className="inline-flex mr-1"><Calendar className="h-4 w-4 text-blue-600" /></span>
                      Probation Start
                    </label>
                    <input
                      type="date"
                      value={formData.probation_start_date || ''}
                      readOnly
                      className="block w-full rounded-xl border-gray-300 bg-gray-50 shadow-sm sm:text-sm cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Otomatis sama dengan Join Date
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      <span className="inline-flex mr-1"><Calendar className="h-4 w-4 text-green-600" /></span>
                      Probation End
                    </label>
                    <input
                      type="date"
                      value={formData.probation_end_date || ''}
                      readOnly
                      className="block w-full rounded-xl border-gray-300 bg-gray-50 shadow-sm sm:text-sm cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Otomatis Join Date + 3 bulan
                    </p>
                  </div>
                  <FormInput
                    label="Contract Start"
                    name="contract_start_date"
                    type="date"
                    value={formData.contract_start_date || ''}
                    onChange={handleChange}
                    icon={<Calendar className="h-4 w-4 text-purple-600" />}
                  />
                  <FormInput
                    label="Contract End"
                    name="contract_end_date"
                    type="date"
                    value={formData.contract_end_date || ''}
                    onChange={handleChange}
                    icon={<Calendar className="h-4 w-4 text-red-600" />}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payroll Information */}
        {currentStep === 3 && (
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
                  <FormInput
                    label="Basic Salary"
                    name="basic_salary"
                    type="number"
                    value={formData.basic_salary?.toString() || ''}
                    onChange={handleChange}
                    placeholder="10000000"
                    icon={<Wallet className="h-4 w-4 text-green-600" />}
                  />
                  <FormSelect
                    label="Currency"
                    name="salary_currency"
                    value={formData.salary_currency || 'IDR'}
                    onChange={handleChange}
                    options={[
                      { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'SGD', label: 'SGD - Singapore Dollar' },
                    ]}
                    icon={<CreditCard className="h-4 w-4 text-blue-600" />}
                  />
                  <FormSelect
                    label="Pay Frequency"
                    name="pay_frequency"
                    value={formData.pay_frequency || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: '-- Select Frequency --' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'biweekly', label: 'Bi-weekly' },
                      { value: 'weekly', label: 'Weekly' },
                    ]}
                    icon={<Calendar className="h-4 w-4 text-purple-600" />}
                  />
                  <FormSelect
                    label="Pay Type"
                    name="pay_type"
                    value={formData.pay_type || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: '-- Select Pay Type --' },
                      { value: 'gross', label: 'Gross (Pajak Ditanggung Karyawan)' },
                      { value: 'nett', label: 'Nett (Pajak Ditanggung Perusahaan)' },
                    ]}
                    hint="Gross = PPh 21 dipotong dari gaji, Nett = perusahaan menanggung PPh 21"
                    icon={<Wallet className="h-4 w-4 text-indigo-600" />}
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
                  <FormInput
                    label="Transport Allowance"
                    name="transport_allowance"
                    type="number"
                    value={formData.transport_allowance?.toString() || ''}
                    onChange={handleChange}
                    placeholder="500000"
                    icon={<Wallet className="h-4 w-4 text-blue-600" />}
                  />
                  <FormInput
                    label="Meal Allowance"
                    name="meal_allowance"
                    type="number"
                    value={formData.meal_allowance?.toString() || ''}
                    onChange={handleChange}
                    placeholder="500000"
                    icon={<Wallet className="h-4 w-4 text-orange-600" />}
                  />
                  <FormInput
                    label="Position Allowance"
                    name="position_allowance"
                    type="number"
                    value={formData.position_allowance?.toString() || ''}
                    onChange={handleChange}
                    placeholder="1000000"
                    icon={<Wallet className="h-4 w-4 text-purple-600" />}
                  />
                </div>
              </div>
            </div>

            {/* Bank Account */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200 p-6 mb-6">
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
                  <FormInput
                    label="Bank Name"
                    name="bank_name"
                    value={formData.bank_name || ''}
                    onChange={handleChange}
                    placeholder="BCA, Mandiri, BNI, etc."
                    icon={<Landmark className="h-4 w-4 text-amber-600" />}
                  />
                  <FormInput
                    label="Account Number"
                    name="bank_account_number"
                    value={formData.bank_account_number || ''}
                    onChange={handleChange}
                    placeholder="1234567890"
                    icon={<CreditCard className="h-4 w-4 text-amber-600" />}
                  />
                  <FormInput
                    label="Account Holder Name"
                    name="bank_account_holder"
                    value={formData.bank_account_holder || ''}
                    onChange={handleChange}
                    placeholder="Name as per bank account"
                    hint="Leave empty to use employee name"
                    icon={<User className="h-4 w-4 text-amber-600" />}
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
                  <FormInput
                    label="NPWP Number"
                    name="npwp_number"
                    value={formData.npwp_number || ''}
                    onChange={handleChange}
                    placeholder="XX.XXX.XXX.X-XXX.XXX"
                    hint="Nomor Pokok Wajib Pajak"
                    icon={<FileText className="h-4 w-4 text-blue-600" />}
                  />
                  <FormSelect
                    label="Status PTKP"
                    name="ptkp_status"
                    value={formData.ptkp_status || ''}
                    onChange={handleChange}
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
                    hint="Penghasilan Tidak Kena Pajak untuk perhitungan PPh 21"
                    icon={<FileText className="h-4 w-4 text-purple-600" />}
                  />
                </div>
              </div>
            </div>

            {/* BPJS & Insurance */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">BPJS & Asuransi</h4>
                  <p className="text-xs text-gray-600">Informasi BPJS dan asuransi karyawan</p>
                </div>
              </div>

              {/* BPJS Numbers */}
              <div className="bg-white rounded-lg p-5 border border-teal-100 mb-4">
                <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-teal-600" />
                  Nomor BPJS
                </h5>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FormInput
                    label="No. BPJS Ketenagakerjaan"
                    name="bpjs_ketenagakerjaan_number"
                    value={formData.bpjs_ketenagakerjaan_number || ''}
                    onChange={handleChange}
                    placeholder="Masukkan nomor BPJS TK"
                    icon={<CreditCard className="h-4 w-4 text-teal-600" />}
                  />
                  <FormInput
                    label="No. BPJS Kesehatan"
                    name="bpjs_kesehatan_number"
                    value={formData.bpjs_kesehatan_number || ''}
                    onChange={handleChange}
                    placeholder="Masukkan nomor BPJS Kesehatan"
                    icon={<CreditCard className="h-4 w-4 text-cyan-600" />}
                  />
                </div>
              </div>

              {/* BPJS Programs */}
              <div className="bg-white rounded-lg p-5 border border-teal-100 mb-4">
                <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-600" />
                  Program BPJS Ketenagakerjaan
                </h5>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormCheckbox
                    label="JHT (Jaminan Hari Tua)"
                    name="jht_registered"
                    checked={formData.jht_registered || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, jht_registered: e.target.checked }))}
                    description="Tabungan hari tua yang dapat dicairkan saat pensiun"
                  />
                  <FormCheckbox
                    label="JP (Jaminan Pensiun)"
                    name="jp_registered"
                    checked={formData.jp_registered || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, jp_registered: e.target.checked }))}
                    description="Jaminan pendapatan bulanan saat pensiun"
                  />
                </div>
              </div>

              {/* Other Insurance */}
              <div className="bg-white rounded-lg p-5 border border-teal-100">
                <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Asuransi Tambahan
                </h5>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormCheckbox
                    label="Asuransi Kesehatan"
                    name="medical_insurance"
                    checked={formData.medical_insurance || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, medical_insurance: e.target.checked }))}
                    description="Asuransi kesehatan tambahan dari perusahaan"
                  />
                  <FormCheckbox
                    label="Asuransi Jiwa"
                    name="life_insurance"
                    checked={formData.life_insurance || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, life_insurance: e.target.checked }))}
                    description="Asuransi jiwa dari perusahaan"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Contact & Address */}
        {currentStep === 4 && (
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
                  <FormInput
                    label="Phone Number"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    placeholder="+62 21 1234567"
                    hint="Office or home landline"
                    icon={<Phone className="h-4 w-4 text-blue-600" />}
                  />
                  <FormInput
                    label="Mobile Number"
                    name="mobile_number"
                    value={formData.mobile_number || ''}
                    onChange={handleChange}
                    placeholder="+62 812 3456 7890"
                    hint="Personal mobile/WhatsApp"
                    icon={<Phone className="h-4 w-4 text-green-600" />}
                  />
                  <FormInput
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    placeholder="employee@company.com"
                    hint="Official company email"
                    icon={<Mail className="h-4 w-4 text-purple-600" />}
                  />
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
                {/* Permanent Address (KTP) */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Permanent Address (KTP)</p>
                  <div className="space-y-4">
                    <FormTextarea
                      label="Full Address"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      placeholder="Full address as per ID card"
                      rows={2}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <FormInput
                        label="City"
                        name="city"
                        value={formData.city || ''}
                        onChange={handleChange}
                        placeholder="Bandar Lampung"
                        icon={<MapPin className="h-4 w-4 text-blue-600" />}
                      />
                      <FormInput
                        label="Province"
                        name="province"
                        value={formData.province || ''}
                        onChange={handleChange}
                        placeholder="Lampung"
                        icon={<MapPin className="h-4 w-4 text-green-600" />}
                      />
                      <FormInput
                        label="Postal Code"
                        name="postal_code"
                        value={formData.postal_code || ''}
                        onChange={handleChange}
                        placeholder="35141"
                        icon={<MapPin className="h-4 w-4 text-purple-600" />}
                      />
                    </div>
                  </div>
                </div>

                {/* Current Address */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Current Address (Domicile)</p>
                  <div className="space-y-4">
                    <FormTextarea
                      label="Full Address"
                      name="current_address"
                      value={formData.current_address || ''}
                      onChange={handleChange}
                      placeholder="Current residential address"
                      rows={2}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <FormInput
                        label="City"
                        name="current_city"
                        value={formData.current_city || ''}
                        onChange={handleChange}
                        placeholder="Tangerang Selatan"
                        icon={<MapPin className="h-4 w-4 text-blue-600" />}
                      />
                      <FormInput
                        label="Province"
                        name="current_province"
                        value={formData.current_province || ''}
                        onChange={handleChange}
                        placeholder="Banten"
                        icon={<MapPin className="h-4 w-4 text-green-600" />}
                      />
                      <FormInput
                        label="Postal Code"
                        name="current_postal_code"
                        value={formData.current_postal_code || ''}
                        onChange={handleChange}
                        placeholder="15417"
                        icon={<MapPin className="h-4 w-4 text-purple-600" />}
                      />
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
                  <FormInput
                    label="Contact Name"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name || ''}
                    onChange={handleChange}
                    placeholder="Full name"
                    icon={<User className="h-4 w-4 text-red-600" />}
                  />
                  <FormInput
                    label="Contact Phone"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone || ''}
                    onChange={handleChange}
                    placeholder="+62 812 3456 7890"
                    icon={<Phone className="h-4 w-4 text-red-600" />}
                  />
                  <FormSelect
                    label="Relationship"
                    name="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: '-- Select Relationship --' },
                      { value: 'spouse', label: 'Spouse' },
                      { value: 'parent', label: 'Parent' },
                      { value: 'sibling', label: 'Sibling' },
                      { value: 'child', label: 'Child' },
                      { value: 'other', label: 'Other' },
                    ]}
                    icon={<Users className="h-4 w-4 text-pink-600" />}
                  />
                  <FormInput
                    label="Contact Address"
                    name="emergency_contact_address"
                    value={formData.emergency_contact_address || ''}
                    onChange={handleChange}
                    placeholder="Full address"
                    icon={<MapPin className="h-4 w-4 text-red-600" />}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Info Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-purple-600" />
                  <h4 className="font-bold text-gray-900">Personal Information</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <SummaryItem label="Full Name" value={formData.name || '-'} />
                  <SummaryItem label="Employee ID" value={formData.employee_id || 'Auto-generated'} />
                  <SummaryItem label="Gender" value={formData.gender || '-'} />
                  <SummaryItem label="Date of Birth" value={formData.date_of_birth || '-'} />
                  <SummaryItem label="Nationality" value={formData.nationality || '-'} />
                </div>
              </div>

              {/* Employment Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <h4 className="font-bold text-gray-900">Employment</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <SummaryItem label="Company" value={companies.find(c => c.id === formData.company_id)?.name || '-'} />
                  <SummaryItem label="Job Title" value={formData.job_title || '-'} />
                  <SummaryItem label="Department" value={departments.find(d => d.id === formData.department_id)?.name || '-'} />
                  <SummaryItem label="Reports To" value={employees.find(e => e.id === formData.manager_id)?.name || 'No Manager (Top Level)'} />
                  <SummaryItem label="Employment Type" value={formData.employment_type || '-'} />
                  <SummaryItem label="Status" value={formData.employment_status || '-'} />
                  <SummaryItem label="Join Date" value={formData.join_date || '-'} />
                </div>
              </div>

              {/* Payroll Summary */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-5 w-5 text-green-600" />
                  <h4 className="font-bold text-gray-900">Payroll</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <SummaryItem
                    label="Basic Salary"
                    value={formData.basic_salary
                      ? `${formData.salary_currency} ${formData.basic_salary.toLocaleString()}`
                      : '-'
                    }
                  />
                  <SummaryItem label="Pay Frequency" value={formData.pay_frequency || '-'} />
                  <SummaryItem
                    label="Pay Type"
                    value={formData.pay_type ? (formData.pay_type === 'gross' ? 'Gross' : 'Nett') : '-'}
                  />
                  <SummaryItem label="PTKP Status" value={formData.ptkp_status || '-'} />
                  <SummaryItem label="Bank" value={formData.bank_name ? `${formData.bank_name} - ${formData.bank_account_number || '-'}` : '-'} />
                </div>
              </div>

              {/* Contact Summary */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-5 w-5 text-orange-600" />
                  <h4 className="font-bold text-gray-900">Contact & Address</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <SummaryItem label="Email" value={formData.email || '-'} />
                  <SummaryItem label="Phone" value={formData.phone || '-'} />
                  <SummaryItem label="Mobile" value={formData.mobile_number || '-'} />
                  <SummaryItem label="KTP City" value={formData.city || '-'} />
                  <SummaryItem label="Current City" value={formData.current_city || '-'} />
                  <SummaryItem label="Emergency Contact" value={formData.emergency_contact_name ? `${formData.emergency_contact_name} (${formData.emergency_contact_relationship || '-'})` : '-'} />
                </div>
              </div>

              {/* BPJS & Insurance Summary */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-teal-600" />
                  <h4 className="font-bold text-gray-900">BPJS & Asuransi</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <SummaryItem label="BPJS TK" value={formData.bpjs_ketenagakerjaan_number || '-'} />
                  <SummaryItem label="BPJS Kesehatan" value={formData.bpjs_kesehatan_number || '-'} />
                  <SummaryItem label="JHT" value={formData.jht_registered ? 'Terdaftar' : 'Tidak'} />
                  <SummaryItem label="JP" value={formData.jp_registered ? 'Terdaftar' : 'Tidak'} />
                  <SummaryItem label="Asuransi Kesehatan" value={formData.medical_insurance ? 'Ya' : 'Tidak'} />
                  <SummaryItem label="Asuransi Jiwa" value={formData.life_insurance ? 'Ya' : 'Tidak'} />
                </div>
              </div>
            </div>

            {/* Confirmation Notice */}
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
        )}
        </div>

        {/* Navigation Buttons */}
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
              {/* Show Next Step button for steps 1-4 */}
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
              {/* Show Submit button only on step 5 (Review) */}
              {currentStep === 5 && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-500/25 disabled:opacity-50"
                >
                  {isSaving ? (
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

      {/* Resign Modal */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowResignModal(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg transform rounded-2xl bg-white shadow-2xl transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                    <LogOut className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Resign Karyawan</h3>
                    <p className="text-sm text-gray-500">{formData.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResignModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Warning */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-amber-800">Perhatian</h5>
                    <p className="text-sm text-amber-700 mt-1">
                      Status karyawan akan diubah menjadi <strong>Resigned</strong>. Data resign akan disimpan dan karyawan tidak akan tampil di daftar aktif.
                    </p>
                  </div>
                </div>

                {/* Resign Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><Calendar className="h-4 w-4 text-red-600" /></span>
                    Tanggal Resign <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={resignData.resign_date}
                    onChange={(e) => setResignData(prev => ({ ...prev, resign_date: e.target.value }))}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  />
                </div>

                {/* Resign Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-orange-600" /></span>
                    Tipe Resign <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={resignData.resign_type}
                    onChange={(e) => setResignData(prev => ({ ...prev, resign_type: e.target.value }))}
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
                </div>

                {/* Resign Reason */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-purple-600" /></span>
                    Alasan Resign
                  </label>
                  <input
                    type="text"
                    value={resignData.resign_reason}
                    onChange={(e) => setResignData(prev => ({ ...prev, resign_reason: e.target.value }))}
                    placeholder="Contoh: Pindah ke perusahaan lain, Melanjutkan pendidikan, dll"
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all"
                  />
                </div>

                {/* Resign Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <span className="inline-flex mr-1"><FileText className="h-4 w-4 text-gray-600" /></span>
                    Catatan Tambahan
                  </label>
                  <textarea
                    value={resignData.resign_notes}
                    onChange={(e) => setResignData(prev => ({ ...prev, resign_notes: e.target.value }))}
                    placeholder="Catatan tambahan mengenai proses resign..."
                    rows={3}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm transition-all resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowResignModal(false)}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResign}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Form Components
function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  hint,
  icon,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900 mb-2">
        {icon && <span className="inline-flex mr-1">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm transition-all"
      />
      {hint && (
        <p className="mt-1 text-xs text-gray-500">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          {hint}
        </p>
      )}
    </div>
  );
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  required,
  icon,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900 mb-2">
        {icon && <span className="inline-flex mr-1">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm transition-all"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="mt-1 text-xs text-gray-500">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          {hint}
        </p>
      )}
    </div>
  );
}

function FormTextarea({
  label,
  name,
  value,
  onChange,
  rows = 3,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm transition-all resize-none"
      />
    </div>
  );
}

function FormCheckbox({
  label,
  name,
  checked,
  onChange,
  description,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
      />
      <div className="flex-1">
        <span className="text-sm font-bold text-gray-900">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
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
