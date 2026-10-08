import { t, useLocale, intlLocale } from '@/i18n';
import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { BriefcaseBusiness, CircleAlert, LockKeyhole, Pencil, Save, UserRound } from 'lucide-react';
import type { AccountSectionProps } from '@/pages/settings/account-section';
import { AccountDiscardDialog } from '@/pages/settings/AccountDiscardDialog';
import { useAccountDiscard } from '@/pages/settings/useAccountDiscard';
import './profile.css';
import { useAuthStore } from '@/stores/auth.store';
import { profileService } from '@/services/profile.service';
import type { UpdateProfileDTO } from '@/services/profile.service';
import type { Employee } from '@/types';
import { profileSchema, type ProfileFormInput, type ProfileFormValues } from '@/schemas/profile.schema';

const roleLabels: Record<string, string> = { 'Super Admin': 'Super Admin', 'Group CEO': 'Group CEO', CEO: 'CEO', 'HR Manager': 'HR Manager', 'HR Staff': 'HR Staff', 'Tax Manager': 'Tax Manager', 'Tax Staff': 'Tax Staff', 'Finance Manager': 'Finance Manager', Manager: 'Manager', Employee: 'Employee', User: 'User' };

// Helper functions
const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getStatusColor = (status: string | null | undefined) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'inactive':
    case 'terminated': return 'bg-red-100 text-red-700';
    case 'suspended': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case 'active': return t('Active');
    case 'inactive': return t('Inactive');
    case 'terminated': return t('Terminated');
    case 'suspended': return t('Suspended');
    case 'resigned': return t('Resigned');
    default: return status || '-';
  }
};

const getEmploymentTypeLabel = (type: string | undefined) => {
  switch (type) {
    case 'permanent': return t('Permanent');
    case 'contract': return t('Contract');
    case 'internship': return t('Internship');
    case 'part_time': return t('Part Time');
    case 'freelance': return t('Freelance');
    default: return type || '-';
  }
};

const getGenderLabel = (gender: string | undefined) => {
  switch (gender) {
    case 'male': return t('Male');
    case 'female': return t('Female');
    default: return gender || '-';
  }
};

const getMaritalStatusLabel = (status: string | undefined) => {
  switch (status) {
    case 'single': return t('Single');
    case 'married': return t('Married');
    case 'divorced': return t('Divorced');
    case 'widowed': return t('Widowed');
    default: return status || '-';
  }
};

const getEducationLabel = (edu: string | undefined) => {
  switch (edu) {
    case 'sd': return t('Elementary School');
    case 'smp': return t('Junior High School');
    case 'sma': return t('Senior High School');
    case 'd1': return t('Diploma 1');
    case 'd2': return t('Diploma 2');
    case 'd3': return t('Diploma 3');
    case 'd4': return t('Diploma 4');
    case 's1': return t('Bachelor\'s Degree');
    case 's2': return t('Master\'s Degree');
    case 's3': return t('Doctoral Degree');
    default: return edu || '-';
  }
};

type ProfileTab = 'personal' | 'employment' | 'account';
const profileTabs = [
  { id: 'personal', label: 'Pribadi', icon: UserRound },
  { id: 'employment', label: 'Pekerjaan', icon: BriefcaseBusiness },
  { id: 'account', label: 'Akun', icon: LockKeyhole },
] as const;

// Sub-components defined OUTSIDE the main component
function InfoItem({ label, value, mono = false }: { label: string; value: string | undefined | null; mono?: boolean }) {
  useLocale();
  return (
    <dl className="ph-profile-value">
      <dt className="ph-profile-label">{label}</dt>
      <dd className={mono ? 'ph-profile-identifier' : undefined}>{value || '-'}</dd>
    </dl>
  );
}

function Section({ title, children, badge, tab, activeTab }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; badge?: string;
  tab: ProfileTab; activeTab: ProfileTab;
}) {
  useLocale();
  const headingId = useId();
  return <section className="ph-profile-section ph-section" hidden={activeTab !== tab} aria-labelledby={headingId}>
    <header className="ph-profile-section-heading">
      <h3 id={headingId}>{title}</h3>
      {badge && <span className="ph-profile-editable">{badge}</span>}
    </header>
    <div className="ph-profile-section-body">{children}</div>
  </section>;
}

// Shared input classes (preserve original styling)
const inputClass = 'ph-profile-input';
const textareaClass = `${inputClass} resize-none`;
const selectClass = `${inputClass} bg-white`;
const errorClass = 'text-red-500 text-xs mt-1';

const emptyFormValues: ProfileFormInput = {
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
  last_education: '',
  education_major: '',
  education_institution: '',
  graduation_year: undefined,
  spouse_name: '',
  children_count: undefined,
  number_of_dependents: undefined,
};

const employeeToFormValues = (data: Employee): ProfileFormInput => ({
  phone: data.phone || '',
  mobile_number: data.mobile_number || '',
  address: data.address || '',
  city: data.city || '',
  province: data.province || '',
  postal_code: data.postal_code || '',
  current_address: data.current_address || '',
  current_city: data.current_city || '',
  current_province: data.current_province || '',
  current_postal_code: data.current_postal_code || '',
  emergency_contact_name: data.emergency_contact_name || '',
  emergency_contact_phone: data.emergency_contact_phone || '',
  emergency_contact_relationship: data.emergency_contact_relationship || '',
  emergency_contact_address: data.emergency_contact_address || '',
  last_education: (data.last_education as ProfileFormInput['last_education']) || '',
  education_major: data.education_major || '',
  education_institution: data.education_institution || '',
  graduation_year: data.graduation_year ?? undefined,
  spouse_name: data.spouse_name || '',
  children_count: data.children_count ?? undefined,
  number_of_dependents: data.number_of_dependents ?? undefined,
});

export function ProfilePage({ navigationRef, onBusyChange }: AccountSectionProps) {
  useLocale();
  const { user } = useAuthStore();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasEmployee = !!user?.employee;
  const profileScope = JSON.stringify([user?.id, user?.employee?.id, user?.employee?.employee_id]);
  const active = hasEmployee ? activeTab : 'account';
  const visibleTabs = hasEmployee ? profileTabs : profileTabs.filter(tab => tab.id === 'account');

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: emptyFormValues,
  });
  const discard = useAccountDiscard(profileScope, isSubmitting);

  useEffect(() => {
    let cancelled = false;
    setEmployee(null); setLoadError(false); setIsEditing(false);
    reset(emptyFormValues);
    if (!hasEmployee) { setLoading(false); return; }
    setLoading(true);
    profileService.getMyProfile().then(data => {
      if (cancelled) return;
      setEmployee(data); reset(employeeToFormValues(data));
    }).catch(() => {
      if (!cancelled) { toast.remove('api-error'); setLoadError(true); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileScope, hasEmployee, reset, retry]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if ((isEditing && isDirty) || isSubmitting) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isEditing, isDirty, isSubmitting]);

  const leave = (action: () => void) => {
    if (isSubmitting) return;
    if (isEditing && isDirty) { discard.request(action); return; }
    action();
  };
  useImperativeHandle(navigationRef, () => ({ leave }));
  useEffect(() => { onBusyChange(isSubmitting); return () => onBusyChange(false); }, [isSubmitting, onBusyChange]);

  const changeTab = (tab: ProfileTab) => {
    if (isSubmitting) return;
    setActiveTab(tab);
    contentRef.current?.scrollTo(0, 0);
  };

  const onSubmit = handleSubmit(async (values) => {
    // Safety guard: edit→save click-through can fire submit when user
    // only meant to click "Edit Profile" (button at same coords as Save
    // after re-render). Skip when not actively editing.
    if (!isEditing || !employee) return;

    // Strip empty strings → undefined so backend Zod whitelist treats them as unset
    const payload: UpdateProfileDTO = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as UpdateProfileDTO;

    try {
      const updated = await profileService.updateMyProfile(payload);
      setEmployee(updated);
      reset(employeeToFormValues(updated));
      setIsEditing(false);
      toast.success(t("Profil berhasil diperbarui"), { toasterId: 'account' });
    } catch (error) {
      toast.remove('api-error');
      const message = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(message || t('Gagal menyimpan profil. Perubahan Anda masih ada di formulir.'), { id: 'api-error', toasterId: 'account' });
    }
  }, validationErrors => {
    setActiveTab('personal');
    const first = Object.keys(validationErrors)[0] as keyof ProfileFormInput | undefined;
    if (first) requestAnimationFrame(() => setFocus(first));
  });

  const handleCancel = () => {
    if (employee) {
      reset(employeeToFormValues(employee));
    } else {
      reset(emptyFormValues);
    }
    setIsEditing(false);
  };

  const displayName = employee?.name || user?.employee?.name || user?.email || t('User');

  return (
    <div className="ph-profile ph-workflow">
      <div className="ph-profile-identity">
        {employee?.avatar ? <img src={employee.avatar} alt={displayName} className="ph-profile-avatar" />
          : <div className="ph-profile-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</div>}
        <div className="ph-profile-name">
          <h2>{displayName}</h2>
          <p>{employee?.employee_id || user?.employee?.employee_id || user?.email}</p>
          {employee && <p>{[employee.position?.name, employee.department?.name, employee.company?.name].filter(Boolean).join(', ')}</p>}
        </div>
        {employee?.employment_status && <span className={`ph-profile-status ${getStatusColor(employee.employment_status)}`}>{getStatusLabel(employee.employment_status)}</span>}
      </div>
      <nav className="ph-profile-nav" aria-label={t("Kategori profil")}>
        <div className="ph-profile-tabs ph-tabs">{visibleTabs.map(tab => <button type="button" key={tab.id} aria-current={active === tab.id ? 'page' : undefined}
          disabled={isSubmitting} onClick={() => changeTab(tab.id)}><tab.icon size={17} aria-hidden="true" />{t(tab.label)}</button>)}</div>
      </nav>
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        // Block Enter-key auto-submit from input fields (textarea/select unaffected).
        // Without this, typing Enter in any text input immediately saves the profile.
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
        }
      }}
      className="ph-profile-form"
      noValidate
    >
      <div className="ph-profile-content" ref={contentRef}>
      {loading ? <div className="ph-profile-loading" role="status">{t("Memuat profil…")}</div>
        : loadError && active !== 'account' ? <div className="ph-profile-notice" role="alert"><CircleAlert size={22} aria-hidden="true" />
          <div><h3>{t("Profil belum dapat dimuat")}</h3><p>{t("Coba lagi untuk melihat data terbaru.")}</p>
            <button type="button" className="ph-profile-button" onClick={() => setRetry(value => value + 1)}>{t("Coba Lagi")}</button></div></div>
        : <>
      {!hasEmployee && <div className="ph-profile-notice"><UserRound size={22} aria-hidden="true" />
        <div><h3>{t("Akun belum terhubung ke data karyawan")}</h3><p>{t("Hubungi P&C untuk menghubungkan profil karyawan Anda.")}</p></div></div>}
      {isEditing && <div className="ph-profile-edit-notice ph-callout">{t("Anda dapat mengubah kontak, pendidikan, dan informasi keluarga. Data lainnya dikelola oleh P&C.")}</div>}
      <fieldset className="ph-profile-fieldset" disabled={isSubmitting}>
        <legend className="sr-only">{t("Data profil")}</legend>
      {/* Content Grid */}
      <div className="ph-profile-sections">
        {/* Personal Data */}
        <Section title={t("Personal Data")} tab="personal" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
          <div className="ph-form-grid">
            <InfoItem label={t("Full Name")} value={employee?.name} />
            <InfoItem label={t("Nickname")} value={employee?.nick_name} />
            <InfoItem label={t("Place of Birth")} value={employee?.place_of_birth} />
            <InfoItem label={t("Date of Birth")} value={formatDate(employee?.date_of_birth)} />
            <InfoItem label={t("Gender")} value={getGenderLabel(employee?.gender)} />
            <InfoItem label={t("Marital Status")} value={getMaritalStatusLabel(employee?.marital_status)} />
            <InfoItem label={t("Religion")} value={employee?.religion} />
            <InfoItem label={t("Blood Type")} value={employee?.blood_type} />
            <InfoItem label={t("Nationality")} value={employee?.nationality} />
          </div>
        </Section>

        {/* Contact - EDITABLE */}
        <Section title={t("Contact Information")} tab="personal" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} badge={isEditing ? t('Editable') : undefined}>
          <div className="ph-form-grid">
            <InfoItem label={t("Work Email")} value={employee?.email} />
            <InfoItem label={t("Login Email")} value={user?.email} />

            {/* Phone */}
            <div>
              <label htmlFor="profile-phone" className="ph-profile-label">{t("Phone")} <span className="text-gray-400 normal-case font-normal">{t("(opsional)")}</span>
              </label>
              {isEditing ? (
                <>
                  {/*
                    Use type="text" + inputMode="tel" instead of type="tel".
                    Safari on macOS US locale ignores our placeholder for
                    type="tel" and shows "+1-xxx-xxx-xxxx" instead. With
                    type="text" the Indonesian placeholder is honored, and
                    inputMode="tel" still pops the numeric keypad on mobile.
                    autoComplete="tel-national" keeps iOS Contacts autofill
                    flowing, the BE phoneSchema normalizes spaces/dashes anyway.
                  */}
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="tel-national"
                    id="profile-phone" {...register('phone')}
                    placeholder={t("08123456789 atau +6281234567890")}
                    className={inputClass}
                  />
                  {errors.phone && <p className={errorClass}>{t(errors.phone.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.phone || '-'}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor="profile-mobile_number" className="ph-profile-label">{t("Mobile")} <span className="text-gray-400 normal-case font-normal">{t("(opsional)")}</span>
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="tel-national"
                    id="profile-mobile_number" {...register('mobile_number')}
                    placeholder={t("08123456789 atau +6281234567890")}
                    className={inputClass}
                  />
                  {errors.mobile_number && <p className={errorClass}>{t(errors.mobile_number.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.mobile_number || '-'}</p>
              )}
            </div>

            {/* Subheader: Legal Address */}
            <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">{t("Legal Address (ID Card)")}</p>
            </div>

            {/* Legal Address */}
            <div className="col-span-2">
              <label htmlFor="profile-address" className="ph-profile-label">{t("Full Address")}</label>
              {isEditing ? (
                <>
                  <textarea id="profile-address" {...register('address')} rows={2} placeholder={t("Full address as per ID card")} className={textareaClass} />
                  {errors.address && <p className={errorClass}>{t(errors.address.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.address || '-'}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label htmlFor="profile-city" className="ph-profile-label">{t("City")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-city" {...register('city')} placeholder="New York" className={inputClass} />
                  {errors.city && <p className={errorClass}>{t(errors.city.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.city || '-'}</p>
              )}
            </div>

            {/* Province/State */}
            <div>
              <label htmlFor="profile-province" className="ph-profile-label">{t("Province/State")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-province" {...register('province')} placeholder="New York" className={inputClass} />
                  {errors.province && <p className={errorClass}>{t(errors.province.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.province || '-'}</p>
              )}
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="profile-postal_code" className="ph-profile-label">{t("Postal Code")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-postal_code" {...register('postal_code')} placeholder="10001" className={inputClass} />
                  {errors.postal_code && <p className={errorClass}>{t(errors.postal_code.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.postal_code || '-'}</p>
              )}
            </div>

            {/* Subheader: Current Address */}
            <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">{t("Current Address (Residential)")}</p>
            </div>

            {/* Current Address */}
            <div className="col-span-2">
              <label htmlFor="profile-current_address" className="ph-profile-label">{t("Full Address")}</label>
              {isEditing ? (
                <>
                  <textarea id="profile-current_address" {...register('current_address')} rows={2} placeholder={t("Current residential address")} className={textareaClass} />
                  {errors.current_address && <p className={errorClass}>{t(errors.current_address.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_address || '-'}</p>
              )}
            </div>

            {/* Current City */}
            <div>
              <label htmlFor="profile-current_city" className="ph-profile-label">{t("City")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-current_city" {...register('current_city')} placeholder="Los Angeles" className={inputClass} />
                  {errors.current_city && <p className={errorClass}>{t(errors.current_city.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_city || '-'}</p>
              )}
            </div>

            {/* Current Province/State */}
            <div>
              <label htmlFor="profile-current_province" className="ph-profile-label">{t("Province/State")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-current_province" {...register('current_province')} placeholder="California" className={inputClass} />
                  {errors.current_province && <p className={errorClass}>{t(errors.current_province.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_province || '-'}</p>
              )}
            </div>

            {/* Current Postal Code */}
            <div>
              <label htmlFor="profile-current_postal_code" className="ph-profile-label">{t("Postal Code")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-current_postal_code" {...register('current_postal_code')} placeholder="90001" className={inputClass} />
                  {errors.current_postal_code && <p className={errorClass}>{t(errors.current_postal_code.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_postal_code || '-'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Identity Documents */}
        <Section title={t("Identity Documents")} tab="personal" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>}>
          <div className="ph-form-grid">
            <InfoItem label={t("National ID (NIK)")} value={employee?.national_id} mono />
            <InfoItem label={t("Tax ID (NPWP)")} value={employee?.npwp_number} mono />
            <InfoItem label={t("Passport No.")} value={employee?.passport_number} mono />
            <InfoItem label={t("Passport Expiry")} value={formatDate(employee?.passport_expiry)} />
          </div>
        </Section>

        {/* Emergency Contact - EDITABLE */}
        <Section title={t("Emergency Contact")} tab="personal" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} badge={isEditing ? t('Editable') : undefined}>
          <div className="ph-form-grid">
            {/* Name */}
            <div>
              <label htmlFor="profile-emergency_contact_name" className="ph-profile-label">{t("Name")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-emergency_contact_name" {...register('emergency_contact_name')} placeholder={t("Full name")} className={inputClass} />
                  {errors.emergency_contact_name && <p className={errorClass}>{t(errors.emergency_contact_name.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_name || '-'}</p>
              )}
            </div>

            {/* Relationship */}
            <div>
              <label htmlFor="profile-emergency_contact_relationship" className="ph-profile-label">{t("Relationship")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-emergency_contact_relationship" {...register('emergency_contact_relationship')} placeholder={t("e.g. Spouse, Parent")} className={inputClass} />
                  {errors.emergency_contact_relationship && <p className={errorClass}>{t(errors.emergency_contact_relationship.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_relationship || '-'}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="profile-emergency_contact_phone" className="ph-profile-label">{t("Phone")} <span className="text-gray-400 normal-case font-normal">{t("(opsional)")}</span>
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="tel-national"
                    id="profile-emergency_contact_phone" {...register('emergency_contact_phone')}
                    placeholder={t("08123456789 atau 0211234567 (landline)")}
                    className={inputClass}
                  />
                  {errors.emergency_contact_phone && <p className={errorClass}>{t(errors.emergency_contact_phone.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_phone || '-'}</p>
              )}
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label htmlFor="profile-emergency_contact_address" className="ph-profile-label">{t("Address")}</label>
              {isEditing ? (
                <>
                  <textarea id="profile-emergency_contact_address" {...register('emergency_contact_address')} rows={2} placeholder={t("Emergency contact address")} className={textareaClass} />
                  {errors.emergency_contact_address && <p className={errorClass}>{t(errors.emergency_contact_address.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_address || '-'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Employment Information */}
        <Section title={t("Employment Information")} tab="employment" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}>
          <div className="ph-form-grid">
            <InfoItem label={t("Employee ID")} value={employee?.employee_id} mono />
            <InfoItem label={t("Position")} value={employee?.position?.name} />
            <InfoItem label={t("Department")} value={employee?.department?.name} />
            <InfoItem label={t("Company")} value={employee?.company?.name} />
            <InfoItem label={t("Work Location")} value={employee?.workLocationRef?.name} />
            <InfoItem label={t("Employment Type")} value={getEmploymentTypeLabel(employee?.employment_type)} />
            <InfoItem label={t("Join Date")} value={formatDate(employee?.join_date)} />
            <InfoItem label={t("Hire Date")} value={formatDate(employee?.hire_date)} />
            <InfoItem label={t("Direct Manager")} value={employee?.manager?.name} />
            <InfoItem label={t("Organization Level")} value={employee?.organizational_level} />
          </div>
        </Section>

        {/* Contract Information */}
        <Section title={t("Contract Information")} tab="employment" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
          <div className="ph-form-grid">
            <InfoItem label={t("Probation Start")} value={formatDate(employee?.probation_start_date)} />
            <InfoItem label={t("Probation End")} value={formatDate(employee?.probation_end_date)} />
            <InfoItem label={t("Confirmation Date")} value={formatDate(employee?.confirmation_date)} />
            <InfoItem label={t("Contract Start")} value={formatDate(employee?.contract_start_date)} />
            <InfoItem label={t("Contract End")} value={formatDate(employee?.contract_end_date)} />
            <InfoItem label={t("Work Schedule")} value={employee?.work_schedule} />
            <InfoItem label={t("Shift")} value={employee?.assigned_shift} />
          </div>
        </Section>

        {/* Social Security & Tax */}
        <Section title={t("Social Security & Tax")} tab="employment" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}>
          <div className="ph-form-grid">
            <InfoItem label={t("BPJS Employment No.")} value={employee?.bpjs_ketenagakerjaan_number} mono />
            <InfoItem label={t("BPJS Health No.")} value={employee?.bpjs_kesehatan_number} mono />
            <InfoItem label={t("BPJS Employment Date")} value={formatDate(employee?.bpjs_ketenagakerjaan_date)} />
            <InfoItem label={t("BPJS Health Date")} value={formatDate(employee?.bpjs_kesehatan_date)} />
            <InfoItem label={t("Tax Status (PTKP)")} value={employee?.ptkp_status || employee?.tax_status} />
            <div>
              <label className="ph-profile-label">{t("JHT Status")}</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.jht_registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.jht_registered ? t("Registered") : t("Not Registered")}
              </span>
            </div>
            <div>
              <label className="ph-profile-label">{t("JP Status")}</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.jp_registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.jp_registered ? t("Registered") : t("Not Registered")}
              </span>
            </div>
            <div>
              <label className="ph-profile-label">{t("Medical Insurance")}</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.medical_insurance ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.medical_insurance ? t("Registered") : t("Not Registered")}
              </span>
            </div>
            <div>
              <label className="ph-profile-label">{t("Life Insurance")}</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.life_insurance ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.life_insurance ? t("Registered") : t("Not Registered")}
              </span>
            </div>
          </div>
        </Section>

        {/* Bank Information */}
        <Section title={t("Bank Information")} tab="employment" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}>
          <div className="ph-form-grid">
            <InfoItem label={t("Bank Name")} value={employee?.bank_name} />
            <InfoItem label={t("Branch")} value={employee?.bank_branch} />
            <InfoItem label={t("Account Number")} value={employee?.bank_account_number} mono />
            <InfoItem label={t("Account Holder")} value={employee?.bank_account_holder} />
          </div>
        </Section>

        {/* Education - EDITABLE */}
        <Section title={t("Education")} tab="personal" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>} badge={isEditing ? t('Editable') : undefined}>
          <div className="ph-form-grid">
            {/* Education Level */}
            <div>
              <label htmlFor="profile-last_education" className="ph-profile-label">{t("Education Level")}</label>
              {isEditing ? (
                <>
                  <select id="profile-last_education" {...register('last_education')} className={selectClass}>
                    <option value="">{t("Select Level")}</option>
                    <option value="sd">{t("Elementary School")}</option>
                    <option value="smp">{t("Junior High School")}</option>
                    <option value="sma">{t("Senior High School")}</option>
                    <option value="d1">{t("Diploma 1")}</option>
                    <option value="d2">{t("Diploma 2")}</option>
                    <option value="d3">{t("Diploma 3")}</option>
                    <option value="d4">{t("Diploma 4")}</option>
                    <option value="s1">{t("Bachelor's Degree")}</option>
                    <option value="s2">{t("Master's Degree")}</option>
                    <option value="s3">{t("Doctoral Degree")}</option>
                  </select>
                  {errors.last_education && <p className={errorClass}>{t(errors.last_education.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{getEducationLabel(employee?.last_education)}</p>
              )}
            </div>

            {/* Major */}
            <div>
              <label htmlFor="profile-education_major" className="ph-profile-label">{t("Major")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-education_major" {...register('education_major')} placeholder={t("Computer Science")} className={inputClass} />
                  {errors.education_major && <p className={errorClass}>{t(errors.education_major.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.education_major || '-'}</p>
              )}
            </div>

            {/* Institution */}
            <div>
              <label htmlFor="profile-education_institution" className="ph-profile-label">{t("Institution")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-education_institution" {...register('education_institution')} placeholder="Harvard University" className={inputClass} />
                  {errors.education_institution && <p className={errorClass}>{t(errors.education_institution.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.education_institution || '-'}</p>
              )}
            </div>

            {/* Graduation Year */}
            <div>
              <label htmlFor="profile-graduation_year" className="ph-profile-label">{t("Graduation Year")}</label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    id="profile-graduation_year" {...register('graduation_year')}
                    placeholder="2020"
                    min={1950}
                    max={2030}
                    className={inputClass}
                  />
                  {errors.graduation_year && <p className={errorClass}>{t(errors.graduation_year.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.graduation_year?.toString() || '-'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Family Information - EDITABLE */}
        <Section title={t("Family Information")} tab="personal" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} badge={isEditing ? t('Editable') : undefined}>
          <div className="ph-form-grid">
            {/* Spouse Name */}
            <div>
              <label htmlFor="profile-spouse_name" className="ph-profile-label">{t("Spouse Name")}</label>
              {isEditing ? (
                <>
                  <input type="text" id="profile-spouse_name" {...register('spouse_name')} placeholder={t("Spouse full name")} className={inputClass} />
                  {errors.spouse_name && <p className={errorClass}>{t(errors.spouse_name.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.spouse_name || '-'}</p>
              )}
            </div>

            {/* Number of Children */}
            <div>
              <label htmlFor="profile-children_count" className="ph-profile-label">{t("Number of Children")}</label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    id="profile-children_count" {...register('children_count')}
                    placeholder="0"
                    min={0}
                    max={20}
                    className={inputClass}
                  />
                  {errors.children_count && <p className={errorClass}>{t(errors.children_count.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.children_count?.toLocaleString(intlLocale()) || '0'}</p>
              )}
            </div>

            {/* Number of Dependents */}
            <div>
              <label htmlFor="profile-number_of_dependents" className="ph-profile-label">{t("Number of Dependents")}</label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    id="profile-number_of_dependents" {...register('number_of_dependents')}
                    placeholder="0"
                    min={0}
                    max={20}
                    className={inputClass}
                  />
                  {errors.number_of_dependents && <p className={errorClass}>{t(errors.number_of_dependents.message || '', { year: new Date().getFullYear() + 10, max: 20 })}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.number_of_dependents?.toLocaleString(intlLocale()) || '0'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Roles & Access */}
        <Section title={t("System Access")} tab="account" activeTab={active} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}>
          <div className="space-y-4">
            <div>
              <label className="ph-profile-label">{t("Roles")}</label>
              <div className="flex flex-wrap gap-2">
                {user?.roles?.map((role, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                    {Object.hasOwn(roleLabels, role) ? t(roleLabels[role]) : role}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="ph-profile-label">{t("Account Status")}</label>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${user?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {user?.is_active ? t("Active") : t("Inactive")}
              </span>
            </div>
          </div>
        </Section>
      </div>

      </fieldset>
      {employee && <p className="ph-profile-updated">{t("Terakhir diperbarui:")} {formatDate(employee.updated_at)}</p>}
      </>}
      </div>
      <footer className="ph-profile-footer">
        <p role="status">{isSubmitting ? t("Menyimpan perubahan…") : isEditing && isDirty ? t("Ada perubahan yang belum disimpan.") : isEditing ? t("Ubah informasi pribadi yang diperlukan.") : t("Data pribadi Anda di PeopleHub.")}</p>
        {employee && !loading && !loadError && <div className="ph-profile-actions ph-actions">
          {isEditing ? <>
            <button type="button" onClick={handleCancel} disabled={isSubmitting} className="ph-profile-button">{t("Batal")}</button>
            <button key="save" type="submit" disabled={isSubmitting || !isDirty} className="ph-profile-button ph-profile-primary">
              <Save size={16} aria-hidden="true" />{isSubmitting ? t("Menyimpan…") : t("Simpan")}
            </button>
          </> : <button key="edit" type="button" className="ph-profile-button ph-profile-primary" onClick={event => {
            event.preventDefault(); event.stopPropagation(); setIsEditing(true); changeTab('personal');
          }}><Pencil size={16} aria-hidden="true" />{t("Edit profil")}</button>}
        </div>}
      </footer>
    </form>
      <AccountDiscardDialog isOpen={discard.isOpen} busy={isSubmitting}
        message={t("Perubahan profil belum disimpan. Tinggalkan perubahan ini?")}
        onCancel={discard.cancel} onDiscard={discard.discard} />
    </div>
  );
}
