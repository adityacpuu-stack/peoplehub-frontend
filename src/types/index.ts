// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    errors?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// ==========================================
// AUTH TYPES
// ==========================================

export interface CompanyFeatures {
  attendance_enabled: boolean;
  leave_enabled: boolean;
  payroll_enabled: boolean;
  performance_enabled: boolean;
}

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  force_password_change: boolean;
  roles: string[];  // Array of role names from backend
  permissions: string[];  // Array of permission names
  accessibleCompanyIds: number[];
  companyFeatures?: CompanyFeatures;
  employee?: {
    id: number;
    employee_id: string;
    name: string;
    company_id: number;
    department_id: number;
    position_id: number;
    employment_status: string;
    profile_completed: boolean;
  };
}

export interface Role {
  id: number;
  name: string;
  level: number;
  description?: string;
  is_system: boolean;
}

export interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// ==========================================
// EMPLOYEE TYPES
// ==========================================

export interface Employee {
  id: number;
  employee_id: string | null;
  user_id?: number;
  name: string;
  nick_name?: string;
  email: string | null;
  phone?: string;
  mobile_number?: string;
  gender?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  marital_status?: string;
  religion?: string;
  blood_type?: string;
  nationality?: string;
  // Alamat KTP
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  // Alamat Domisili
  current_address?: string;
  current_city?: string;
  current_province?: string;
  current_postal_code?: string;
  national_id?: string;
  tax_id?: string;
  npwp_number?: string;
  passport_number?: string;
  passport_expiry?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_address?: string;
  job_title?: string;
  division?: string;
  organizational_level?: string;
  grade_level?: string;
  cost_center?: string;
  hire_date?: string;
  join_date?: string;
  probation_start_date?: string;
  probation_end_date?: string;
  confirmation_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  resign_date?: string;
  resign_type?: string;
  resign_reason?: string;
  resign_notes?: string;
  employment_status: string | null;
  employment_type?: string;
  work_schedule?: string;
  assigned_shift?: string;
  basic_salary?: number;
  salary_currency?: string;
  pay_frequency?: string;
  pay_type?: string;
  transport_allowance?: number;
  meal_allowance?: number;
  position_allowance?: number;
  communication_allowance?: number;
  housing_allowance?: number;
  performance_bonus?: number;
  tax_status?: string;
  ptkp_status?: string;
  bpjs_ketenagakerjaan_number?: string;
  bpjs_kesehatan_number?: string;
  jht_registered?: boolean;
  jp_registered?: boolean;
  medical_insurance?: boolean;
  life_insurance?: boolean;
  bpjs_ketenagakerjaan_date?: string;
  bpjs_kesehatan_date?: string;

  // Bank Info
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_branch?: string;

  // Education
  last_education?: string;
  education_major?: string;
  education_institution?: string;
  graduation_year?: number;

  // Family Info
  spouse_name?: string;
  children_count?: number;
  number_of_dependents?: number;

  avatar?: string;
  department_id?: number;
  position_id?: number;
  company_id?: number;
  manager_id?: number;
  leave_approver_id?: number;
  overtime_approver_id?: number;
  company?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  position?: { id: number; name: string } | null;
  manager?: { id: number; name: string } | null;
  leaveApprover?: { id: number; name: string } | null;
  overtimeApprover?: { id: number; name: string } | null;
  workLocationRef?: { id: number; name: string } | null;
  directManager?: { id: number; name: string } | null;
  skipLevelManager?: { id: number; name: string } | null;
  user?: { id: number; email: string; is_active: boolean } | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeRequest {
  name: string;
  employee_id?: string;
  nick_name?: string;
  email?: string;
  phone?: string;
  mobile_number?: string;
  gender?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  marital_status?: string;
  religion?: string;
  blood_type?: string;
  nationality?: string;
  // Alamat KTP
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  // Alamat Domisili
  current_address?: string;
  current_city?: string;
  current_province?: string;
  current_postal_code?: string;
  national_id?: string;
  tax_id?: string;
  npwp_number?: string;
  job_title?: string;
  department_id?: number;
  position_id?: number;
  company_id?: number;
  manager_id?: number;
  leave_approver_id?: number;
  overtime_approver_id?: number;
  division?: string;
  organizational_level?: string;
  grade_level?: string;
  cost_center?: string;
  hire_date?: string;
  join_date?: string;
  probation_start_date?: string;
  probation_end_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  resign_date?: string;
  resign_type?: string;
  resign_reason?: string;
  resign_notes?: string;
  employment_type?: string;
  employment_status?: string;
  work_schedule?: string;
  basic_salary?: number;
  salary_currency?: string;
  pay_frequency?: string;
  pay_type?: string;
  transport_allowance?: number;
  meal_allowance?: number;
  position_allowance?: number;
  communication_allowance?: number;
  housing_allowance?: number;
  ptkp_status?: string;
  bpjs_ketenagakerjaan_number?: string;
  bpjs_kesehatan_number?: string;
  jht_registered?: boolean;
  jp_registered?: boolean;
  medical_insurance?: boolean;
  life_insurance?: boolean;
}

// ==========================================
// DEPARTMENT TYPES
// ==========================================

export interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  head_id?: number;
  parent?: Department;
  head?: Employee;
  status: 'active' | 'inactive';
  company_id?: number;
  company?: { id: number; name: string };
  employee_count?: number;
  created_at: string;
  updated_at: string;
}

// ==========================================
// POSITION TYPES
// ==========================================

export interface Position {
  id: number;
  name: string;
  code?: string;
  description?: string;
  department_id?: number;
  level?: number;
  department?: Department;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// ATTENDANCE TYPES
// ==========================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early_leave' | 'half_day' | 'on_leave';

export interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  status: AttendanceStatus;
  work_hours?: number;
  overtime_hours?: number;
  notes?: string;
  employee?: Employee;
  created_at: string;
  updated_at: string;
}

// ==========================================
// LEAVE TYPES
// ==========================================

export interface LeaveType {
  id: number;
  name: string;
  code?: string;
  description?: string;
  default_days: number;
  is_paid: boolean;
  is_active: boolean;
  color?: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  start_half_day?: boolean;
  end_half_day?: boolean;
  total_days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  is_emergency?: boolean;
  work_handover?: string;
  contact_during_leave?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  rejected_by?: number;
  rejected_at?: string;
  document_path?: string;
  document_name?: string;
  employee?: {
    id: number;
    name: string;
    employee_id: string;
    department?: { id: number; name: string };
    position?: { id: number; name: string };
  };
  leaveType?: LeaveType;
  approver?: { id: number; name: string };
  created_at: string;
  updated_at?: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  leaveType?: LeaveType;
}

// ==========================================
// PAYROLL TYPES
// ==========================================

export interface Payroll {
  id: number;
  employee_id: number;
  period_start: string;
  period_end: string;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_salary: number;
  net_salary: number;
  status: 'draft' | 'pending' | 'approved' | 'paid';
  employee?: Employee;
  created_at: string;
  updated_at: string;
}

// ==========================================
// DASHBOARD TYPES
// ==========================================

export interface DashboardStats {
  total_employees: number;
  active_employees: number;
  new_hires_this_month: number;
  departments_count: number;
  attendance_today: {
    present: number;
    absent: number;
    late: number;
    on_leave: number;
  };
  pending_requests: {
    leave: number;
    overtime: number;
  };
}

// ==========================================
// COMMON TYPES
// ==========================================

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
