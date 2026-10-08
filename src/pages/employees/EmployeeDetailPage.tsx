import { enumLabel } from '@/pages/employees/enum-labels';
import { t, useLocale } from '@/i18n';
import '@/components/ui/operations-refresh.css';
import '@/pages/employees/operations-workflows.css';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';
import { PageSpinner } from '@/components/ui';
import { employeeService } from '@/services/employee.service';
import type { Employee } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canEditEmployee, canViewCompensation } from '@/lib/actions';

export function EmployeeDetailPage() {
  useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const data = await employeeService.getById(parseInt(id));
        setEmployee(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch employee');
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
        <h2 className="text-xl font-semibold text-gray-900">{t("Employee Not Found")}</h2>
        <p className="text-gray-500 mt-2">{error === 'Failed to fetch employee' ? t(error) : error || t('The employee you are looking for does not exist.')}</p>
        <button
          onClick={() => navigate('/employees')}
          className="ph-button ph-button-primary"
        >
          <ArrowLeft className="h-4 w-4" />{t("Back to Employees")} </button>
      </div>
    );
  }

  // Existing administration roles remain the ceiling; the covered action narrows it.
  // The edit form needs the detail read + update (Group CEO stays read-only, as on the list).
  const canEdit = !user?.roles?.includes('Group CEO') && canEditEmployee(user);
  // Redacted values are null on the API; say so instead of showing empty fields.
  const showCompensation = canViewCompensation(user, employee.id);

  return (
    <div className="ph-workflow ops-workflow ph-detail-page ops-employee-detail operations-refresh-detail">
      {/* Header Banner */}
      <header className="ph-page-header ops-page-heading">
        <div><Link to="/employees" className="ops-back-link"><ArrowLeft aria-hidden="true" />{t("Back to Employees")}</Link><h1>{employee.name}</h1><p>{employee.employee_id || '-'} / {employee.job_title || t('Employee')}{employee.department && ` / ${employee.department.name}`}</p></div>
        <div className="ph-actions"><span className={`ow-status ${employee.employment_status === 'active' || !employee.employment_status ? 'text-emerald-700' : employee.employment_status === 'inactive' ? 'text-gray-700' : 'text-amber-700'}`}>{enumLabel(employee.employment_status || 'active')}</span>{canEdit && <Link className="ph-button ph-button-primary" to={`/employees/${employee.id}/edit`}><Edit aria-hidden="true" />{t("Edit")}</Link>}</div>
      </header>

<nav className="ops-dossier-nav" aria-label={t("Employee record sections")}><a href="#employee-section-0">{t("Basic Information")}</a><a href="#employee-section-1">{t("Contact & Address")}</a><a href="#employee-section-2">{t("Employment Information")}</a><a href="#employee-section-3">{t("Employment Dates")}</a><a href="#employee-section-4">{t("Compensation")}</a><a href="#employee-section-5">{t("Bank Account")}</a><a href="#employee-section-6">{t("Identity Documents")}</a><a href="#employee-section-7">{t("Emergency Contact")}</a><a href="#employee-section-8">{t("Benefits & Insurance")}</a></nav>
<section id="employee-section-0" className="ops-dossier-section"><h2>{t("Basic Information")}</h2><div className="p-6">
              <div className="ops-detail-fields">
                <InfoItem label={t("Employee ID")} value={employee.employee_id} />
                <InfoItem label={t("Full Name")} value={employee.name} />
                <InfoItem label={t("Nickname")} value={employee.nick_name} />
                <InfoItem label={t("Gender")} value={enumLabel(employee.gender)} />
                <InfoItem label={t("Date of Birth")} value={employee.date_of_birth ? formatDate(employee.date_of_birth) : null} />
                <InfoItem label={t("Place of Birth")} value={employee.place_of_birth} />
                <InfoItem label={t("Marital Status")} value={enumLabel(employee.marital_status)} />
                <InfoItem label={t("Religion")} value={enumLabel(employee.religion)} />
                <InfoItem label={t("Blood Type")} value={employee.blood_type} />
                <InfoItem label={t("Nationality")} value={employee.nationality} />
              </div>
            </div></section>
<section id="employee-section-1" className="ops-dossier-section"><h2>{t("Contact & Address")}</h2><div className="p-6">
              <div className="ops-detail-fields">
                <InfoItem label={t("Email")} value={employee.email} icon={<Mail className="h-4 w-4" />} />
                <InfoItem label={t("Personal Email")} value={employee.personal_email} icon={<Mail className="h-4 w-4" />} />
                <InfoItem label={t("Phone")} value={employee.phone} icon={<Phone className="h-4 w-4" />} />
                <InfoItem label={t("Mobile")} value={employee.mobile_number} />

                {/* Permanent Address (KTP) */}
                <div className="sm:col-span-2 pt-3 border-t border-gray-100 mt-2">
                  <p className="text-xs font-semibold text-slate-600 mb-3">{t("Permanent Address (KTP)")}</p>
                </div>
                <div className="sm:col-span-2">
                  <InfoItem label={t("Full Address")} value={employee.address} icon={<MapPin className="h-4 w-4" />} />
                </div>
                <InfoItem label={t("City")} value={employee.city} />
                <InfoItem label={t("Province")} value={employee.province} />
                <InfoItem label={t("Postal Code")} value={employee.postal_code} />

                {/* Current Address */}
                <div className="sm:col-span-2 pt-3 border-t border-gray-100 mt-2">
                  <p className="text-xs font-semibold text-slate-600 mb-3">{t("Current Address (Domicile)")}</p>
                </div>
                <div className="sm:col-span-2">
                  <InfoItem label={t("Full Address")} value={employee.current_address} />
                </div>
                <InfoItem label={t("City")} value={employee.current_city} />
                <InfoItem label={t("Province")} value={employee.current_province} />
                <InfoItem label={t("Postal Code")} value={employee.current_postal_code} />
              </div>
            </div></section>
<section id="employee-section-2" className="ops-dossier-section"><h2>{t("Employment Information")}</h2><div className="p-6">
              <div className="ops-detail-fields">
                <InfoItem label={t("Company")} value={employee.company?.name} />
                <InfoItem label={t("Department")} value={employee.department?.name} />
                <InfoItem label={t("Job Title")} value={employee.job_title} />
                <InfoItem label={t("Work Location")} value={employee.workLocationRef?.name} />
                <InfoItem label={t("Organizational Level")} value={employee.organizational_level} />
                <InfoItem label={t("Grade Level")} value={employee.grade_level} />
                <InfoItem label={t("Cost Center")} value={employee.cost_center} />
                <InfoItem label={t("Manager")} value={employee.manager?.name} />
                <InfoItem label={t("Employment Type")} value={enumLabel(employee.employment_type)} />
                <InfoItem label={t("Employment Status")} value={enumLabel(employee.employment_status)} />
                <InfoItem label={t("Work Schedule")} value={employee.work_schedule} />
              </div>
            </div></section>
<section id="employee-section-3" className="ops-dossier-section"><h2>{t("Employment Dates")}</h2><div className="p-6">
              <div className="ops-detail-fields">
                <InfoItem label={t("Hire Date")} value={employee.hire_date ? formatDate(employee.hire_date) : null} />
                <InfoItem label={t("Join Date")} value={employee.join_date ? formatDate(employee.join_date) : null} />
                <InfoItem label={t("Probation Start")} value={employee.probation_start_date ? formatDate(employee.probation_start_date) : null} />
                <InfoItem label={t("Probation End")} value={employee.probation_end_date ? formatDate(employee.probation_end_date) : null} />
                <InfoItem label={t("Confirmation Date")} value={employee.confirmation_date ? formatDate(employee.confirmation_date) : null} />
                <InfoItem label={t("Contract Start")} value={employee.contract_start_date ? formatDate(employee.contract_start_date) : null} />
                <InfoItem label={t("Contract End")} value={employee.contract_end_date ? formatDate(employee.contract_end_date) : null} />
              </div>
            </div></section>
<section id="employee-section-4" className="ops-dossier-section"><h2>{t("Compensation")}</h2><div className="p-6">
              {!showCompensation ? <p className="text-sm text-slate-600" data-testid="compensation-unavailable">{t("Compensation details are not available for your access.")}</p> :
              <div className="ops-detail-fields">
                <InfoItem label={t("Basic Salary")} value={employee.basic_salary != null ? formatCurrency(employee.basic_salary) : null} />
                <InfoItem label={t("Currency")} value={employee.salary_currency} />
                <InfoItem label={t("Pay Frequency")} value={enumLabel(employee.pay_frequency)} />
                <InfoItem label={t("Pay Type")} value={enumLabel(employee.pay_type)} />
                <InfoItem label={t("Transport Allowance")} value={employee.transport_allowance != null ? formatCurrency(employee.transport_allowance) : null} />
                <InfoItem label={t("Meal Allowance")} value={employee.meal_allowance != null ? formatCurrency(employee.meal_allowance) : null} />
                <InfoItem label={t("Position Allowance")} value={employee.position_allowance != null ? formatCurrency(employee.position_allowance) : null} />
                <InfoItem label={t("Housing Allowance")} value={employee.housing_allowance != null ? formatCurrency(employee.housing_allowance) : null} />
              </div>}
            </div></section>
<section id="employee-section-5" className="ops-dossier-section"><h2>{t("Bank Account")}</h2><div className="p-6">
              <div className="ops-detail-fields">
                <InfoItem label={t("Bank Name")} value={employee.bank_name} />
                <InfoItem label={t("Account Number")} value={employee.bank_account_number} />
              </div>
            </div></section>
<section id="employee-section-6" className="ops-dossier-section"><h2>{t("Identity Documents")}</h2><div className="p-6 space-y-3">
              <InfoItem label={t("National ID (KTP)")} value={employee.national_id} />
              <InfoItem label={t("Family Card (KK)")} value={employee.family_card_number} />
              <InfoItem label={t("NPWP")} value={employee.npwp_number} />
              <InfoItem label={t("Passport Number")} value={employee.passport_number} />
              <InfoItem label={t("Passport Expiry")} value={employee.passport_expiry ? formatDate(employee.passport_expiry) : null} />
            </div></section>
<section id="employee-section-7" className="ops-dossier-section"><h2>{t("Emergency Contact")}</h2><div className="p-6 space-y-3">
              <InfoItem label={t("Name")} value={employee.emergency_contact_name} />
              <InfoItem label={t("Phone")} value={employee.emergency_contact_phone} />
              <InfoItem label={t("Relationship")} value={enumLabel(employee.emergency_contact_relationship)} />
            </div></section>
<section id="employee-section-8" className="ops-dossier-section"><h2>{t("Benefits & Insurance")}</h2><div className="p-6 space-y-3">
              <InfoItem label={t("Tax Status")} value={employee.tax_status} />
              <InfoItem label={t("BPJS Ketenagakerjaan")} value={employee.bpjs_ketenagakerjaan_number} />
              <InfoItem label={t("BPJS Kesehatan")} value={employee.bpjs_kesehatan_number} />
              <div className="ops-record-block">
                <span className="text-sm text-gray-600">{t("JHT Registered")}</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.jht_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.jht_registered ? t("Yes") : t("No")}
                </span>
              </div>
              <div className="ops-record-block">
                <span className="text-sm text-gray-600">{t("JP Registered")}</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.jp_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.jp_registered ? t("Yes") : t("No")}
                </span>
              </div>
              <div className="ops-record-block">
                <span className="text-sm text-gray-600">{t("Medical Insurance")}</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.medical_insurance ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.medical_insurance ? t("Yes") : t("No")}
                </span>
              </div>
              <div className="ops-record-block">
                <span className="text-sm text-gray-600">{t("Life Insurance")}</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${employee.life_insurance ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {employee.life_insurance ? t("Yes") : t("No")}
                </span>
              </div>
            </div></section>
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
  useLocale();
  return (
    <div className="ops-record-block">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
    </div>
  );
}
