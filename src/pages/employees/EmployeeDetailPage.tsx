import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  User,
  CreditCard,
  Shield,
  AlertCircle,
  Clock,
  Landmark,
} from 'lucide-react';
import { PageSpinner } from '@/components/ui';
import { employeeService } from '@/services/employee.service';
import type { Employee } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const data = await employeeService.getById(parseInt(id));
        setEmployee(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch employee');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="p-4 rounded-2xl bg-red-100 mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Employee Not Found</h2>
        <p className="text-gray-500 mt-2">{error || 'The employee you are looking for does not exist.'}</p>
        <button
          onClick={() => navigate('/employees')}
          className="mt-6 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-500/25 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/employees')}
                className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {employee.name}
                </h1>
                <p className="text-emerald-100 text-sm mt-1">
                  {employee.job_title || employee.position?.name || 'Employee'}
                  {employee.department && ` • ${employee.department.name}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                employee.employment_status === 'active' || !employee.employment_status
                  ? 'bg-emerald-100 text-emerald-700'
                  : employee.employment_status === 'inactive'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {employee.employment_status || 'Active'}
              </span>
              <Link to={`/employees/${employee.id}/edit`}>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all duration-200 font-semibold shadow-lg">
                  <Edit className="w-5 h-5" />
                  <span>Edit</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{employee.employee_id || '-'}</p>
          <p className="text-sm text-gray-500">Employee ID</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1 truncate">{employee.department?.name || '-'}</p>
          <p className="text-sm text-gray-500">Department</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1 truncate">{employee.position?.name || employee.job_title || '-'}</p>
          <p className="text-sm text-gray-500">Position</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{employee.hire_date ? formatDate(employee.hire_date) : '-'}</p>
          <p className="text-sm text-gray-500">Hire Date</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                Basic Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Employee ID" value={employee.employee_id} />
                <InfoItem label="Full Name" value={employee.name} />
                <InfoItem label="Nickname" value={employee.nick_name} />
                <InfoItem label="Gender" value={employee.gender} />
                <InfoItem label="Date of Birth" value={employee.date_of_birth ? formatDate(employee.date_of_birth) : null} />
                <InfoItem label="Place of Birth" value={employee.place_of_birth} />
                <InfoItem label="Marital Status" value={employee.marital_status} />
                <InfoItem label="Religion" value={employee.religion} />
                <InfoItem label="Blood Type" value={employee.blood_type} />
                <InfoItem label="Nationality" value={employee.nationality} />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                Contact & Address
              </h3>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Email" value={employee.email} icon={<Mail className="h-4 w-4" />} />
                <InfoItem label="Personal Email" value={employee.personal_email} icon={<Mail className="h-4 w-4" />} />
                <InfoItem label="Phone" value={employee.phone} icon={<Phone className="h-4 w-4" />} />
                <InfoItem label="Mobile" value={employee.mobile_number} />

                {/* Permanent Address (KTP) */}
                <div className="sm:col-span-2 pt-3 border-t border-gray-100 mt-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Permanent Address (KTP)</p>
                </div>
                <div className="sm:col-span-2">
                  <InfoItem label="Full Address" value={employee.address} icon={<MapPin className="h-4 w-4" />} />
                </div>
                <InfoItem label="City" value={employee.city} />
                <InfoItem label="Province" value={employee.province} />
                <InfoItem label="Postal Code" value={employee.postal_code} />

                {/* Current Address */}
                <div className="sm:col-span-2 pt-3 border-t border-gray-100 mt-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Current Address (Domicile)</p>
                </div>
                <div className="sm:col-span-2">
                  <InfoItem label="Full Address" value={employee.current_address} />
                </div>
                <InfoItem label="City" value={employee.current_city} />
                <InfoItem label="Province" value={employee.current_province} />
                <InfoItem label="Postal Code" value={employee.current_postal_code} />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                Employment Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Company" value={employee.company?.name} />
                <InfoItem label="Department" value={employee.department?.name} />
                <InfoItem label="Position" value={employee.position?.name} />
                <InfoItem label="Job Title" value={employee.job_title} />
                <InfoItem label="Work Location" value={employee.workLocationRef?.name} />
                <InfoItem label="Organizational Level" value={employee.organizational_level} />
                <InfoItem label="Grade Level" value={employee.grade_level} />
                <InfoItem label="Cost Center" value={employee.cost_center} />
                <InfoItem label="Manager" value={employee.manager?.name} />
                <InfoItem label="Employment Type" value={employee.employment_type} />
                <InfoItem label="Employment Status" value={employee.employment_status} />
                <InfoItem label="Work Schedule" value={employee.work_schedule} />
              </div>
            </div>
          </div>

          {/* Employment Dates */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                Employment Dates
              </h3>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Hire Date" value={employee.hire_date ? formatDate(employee.hire_date) : null} />
                <InfoItem label="Join Date" value={employee.join_date ? formatDate(employee.join_date) : null} />
                <InfoItem label="Probation Start" value={employee.probation_start_date ? formatDate(employee.probation_start_date) : null} />
                <InfoItem label="Probation End" value={employee.probation_end_date ? formatDate(employee.probation_end_date) : null} />
                <InfoItem label="Confirmation Date" value={employee.confirmation_date ? formatDate(employee.confirmation_date) : null} />
                <InfoItem label="Contract Start" value={employee.contract_start_date ? formatDate(employee.contract_start_date) : null} />
                <InfoItem label="Contract End" value={employee.contract_end_date ? formatDate(employee.contract_end_date) : null} />
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                Compensation
              </h3>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Basic Salary" value={employee.basic_salary ? formatCurrency(employee.basic_salary) : null} />
                <InfoItem label="Currency" value={employee.salary_currency} />
                <InfoItem label="Pay Frequency" value={employee.pay_frequency} />
                <InfoItem label="Pay Type" value={employee.pay_type} />
                <InfoItem label="Transport Allowance" value={employee.transport_allowance ? formatCurrency(employee.transport_allowance) : null} />
                <InfoItem label="Meal Allowance" value={employee.meal_allowance ? formatCurrency(employee.meal_allowance) : null} />
                <InfoItem label="Position Allowance" value={employee.position_allowance ? formatCurrency(employee.position_allowance) : null} />
                <InfoItem label="Housing Allowance" value={employee.housing_allowance ? formatCurrency(employee.housing_allowance) : null} />
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-100">
                  <Landmark className="h-4 w-4 text-teal-600" />
                </div>
                Bank Account
              </h3>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Bank Name" value={employee.bank_name} />
                <InfoItem label="Account Number" value={employee.bank_account_number} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Identity Documents */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Shield className="h-4 w-4 text-indigo-600" />
                </div>
                Identity Documents
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <InfoItem label="National ID (KTP)" value={employee.national_id} />
              <InfoItem label="Family Card (KK)" value={employee.family_card_number} />
              <InfoItem label="NPWP" value={employee.npwp_number} />
              <InfoItem label="Passport Number" value={employee.passport_number} />
              <InfoItem label="Passport Expiry" value={employee.passport_expiry ? formatDate(employee.passport_expiry) : null} />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                Emergency Contact
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <InfoItem label="Name" value={employee.emergency_contact_name} />
              <InfoItem label="Phone" value={employee.emergency_contact_phone} />
              <InfoItem label="Relationship" value={employee.emergency_contact_relationship} />
              <InfoItem label="Address" value={employee.emergency_contact_address} />
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-100">
                  <Shield className="h-4 w-4 text-cyan-600" />
                </div>
                Benefits & Insurance
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <InfoItem label="Tax Status" value={employee.tax_status} />
              <InfoItem label="BPJS Ketenagakerjaan" value={employee.bpjs_ketenagakerjaan_number} />
              <InfoItem label="BPJS Kesehatan" value={employee.bpjs_kesehatan_number} />
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm text-gray-600">JHT Registered</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.jht_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.jht_registered ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm text-gray-600">JP Registered</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.jp_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.jp_registered ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm text-gray-600">Medical Insurance</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.medical_insurance ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.medical_insurance ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm text-gray-600">Life Insurance</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.life_insurance ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.life_insurance ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-100">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
    </div>
  );
}
