import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { profileService } from '@/services/profile.service';
import type { UpdateProfileDTO } from '@/services/profile.service';
import type { Employee } from '@/types';
import { profileSchema, type ProfileFormInput, type ProfileFormValues } from '@/schemas/profile.schema';

// Helper functions
const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
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
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'terminated': return 'Terminated';
    case 'suspended': return 'Suspended';
    case 'resigned': return 'Resigned';
    default: return status || '-';
  }
};

const getEmploymentTypeLabel = (type: string | undefined) => {
  switch (type) {
    case 'permanent': return 'Permanent';
    case 'contract': return 'Contract';
    case 'internship': return 'Internship';
    case 'part_time': return 'Part Time';
    case 'freelance': return 'Freelance';
    default: return type || '-';
  }
};

const getGenderLabel = (gender: string | undefined) => {
  switch (gender) {
    case 'male': return 'Male';
    case 'female': return 'Female';
    default: return gender || '-';
  }
};

const getMaritalStatusLabel = (status: string | undefined) => {
  switch (status) {
    case 'single': return 'Single';
    case 'married': return 'Married';
    case 'divorced': return 'Divorced';
    case 'widowed': return 'Widowed';
    default: return status || '-';
  }
};

const getEducationLabel = (edu: string | undefined) => {
  switch (edu) {
    case 'sd': return 'Elementary School';
    case 'smp': return 'Junior High School';
    case 'sma': return 'Senior High School';
    case 'd1': return 'Diploma 1';
    case 'd2': return 'Diploma 2';
    case 'd3': return 'Diploma 3';
    case 'd4': return 'Diploma 4';
    case 's1': return 'Bachelor\'s Degree';
    case 's2': return 'Master\'s Degree';
    case 's3': return 'Doctoral Degree';
    default: return edu || '-';
  }
};

const getAvatarColor = (name: string) => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
    'from-red-500 to-red-600',
  ];
  const index = (name || 'U').charCodeAt(0) % colors.length;
  return colors[index];
};

// Sub-components defined OUTSIDE the main component
function InfoItem({ label, value, mono = false }: { label: string; value: string | undefined | null; mono?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <p className={`font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value || '-'}</p>
    </div>
  );
}

function Section({ title, icon, children, badge }: { title: string; icon: React.ReactNode; children: React.ReactNode; badge?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white">
              {icon}
            </div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          {badge && (
            <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// Shared input classes (preserve original styling)
const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500';
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

export function ProfilePage() {
  const { user } = useAuthStore();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: emptyFormValues,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileService.getMyProfile();
        setEmployee(data);
        reset(employeeToFormValues(data));
      } catch (error) {
        // Axios interceptor handles 4xx/5xx toast; catch is for logging only
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.employee) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user, reset]);

  const onSubmit = handleSubmit(async (values) => {
    // Safety guard: edit→save click-through can fire submit when user
    // only meant to click "Edit Profile" (button at same coords as Save
    // after re-render). Skip when not actively editing.
    if (!isEditing) return;

    // Strip empty strings → undefined so backend Zod whitelist treats them as unset
    const payload: UpdateProfileDTO = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as UpdateProfileDTO;

    try {
      const updated = await profileService.updateMyProfile(payload);
      setEmployee(updated);
      reset(employeeToFormValues(updated));
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      // Axios interceptor handles 4xx/5xx toasts — catch is for state cleanup only
      console.error('Failed to update profile:', error);
    }
  });

  const handleCancel = () => {
    if (employee) {
      reset(employeeToFormValues(employee));
    } else {
      reset(emptyFormValues);
    }
    setIsEditing(false);
  };

  const displayName = employee?.name || user?.employee?.name || user?.email || 'User';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        // Block Enter-key auto-submit from input fields (textarea/select unaffected).
        // Without this, typing Enter in any text input immediately saves the profile.
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
        }
      }}
      className="space-y-6"
      noValidate
    >
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-slate-400/10 rounded-full blur-3xl"></div>

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {employee?.avatar ? (
                <img src={employee.avatar} alt={displayName} className="w-24 h-24 rounded-2xl object-cover shadow-xl" />
              ) : (
                <div className={`w-24 h-24 bg-gradient-to-br ${getAvatarColor(displayName)} rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl`}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{displayName}</h1>
              <p className="text-slate-300 text-sm mt-1">{employee?.employee_id || user?.employee?.employee_id}</p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {employee?.position && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                    {employee.position.name}
                  </span>
                )}
                {employee?.department && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                    {employee.department.name}
                  </span>
                )}
                {employee?.company && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl text-sm text-white font-medium">
                    {employee.company.name}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button type="button" onClick={handleCancel} disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-200 font-medium">
                    <span>Cancel</span>
                  </button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50">
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div> : null}
                    <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              ) : (
                <>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getStatusColor(employee?.employment_status)}`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {getStatusLabel(employee?.employment_status)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      // Prevent the synthetic click from bubbling to the form (which
                      // can submit if the Save button re-renders at the same coords
                      // before mouseup). Defer the state flip so this click event
                      // fully resolves before the Save button mounts.
                      e.preventDefault();
                      e.stopPropagation();
                      setTimeout(() => setIsEditing(true), 0);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold shadow-lg"
                  >
                    <span>Edit Profile</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Mode Notice */}
      {isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <p className="text-sm text-blue-800">
            Edit mode is active. You can edit <strong>Contact Information</strong>, <strong>Emergency Contact</strong>, <strong>Education</strong>, and <strong>Family Information</strong>. Other data can only be modified by P&C.
          </p>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Data */}
        <Section title="Personal Data" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Full Name" value={employee?.name} />
            <InfoItem label="Nickname" value={employee?.nick_name} />
            <InfoItem label="Place of Birth" value={employee?.place_of_birth} />
            <InfoItem label="Date of Birth" value={formatDate(employee?.date_of_birth)} />
            <InfoItem label="Gender" value={getGenderLabel(employee?.gender)} />
            <InfoItem label="Marital Status" value={getMaritalStatusLabel(employee?.marital_status)} />
            <InfoItem label="Religion" value={employee?.religion} />
            <InfoItem label="Blood Type" value={employee?.blood_type} />
            <InfoItem label="Nationality" value={employee?.nationality} />
          </div>
        </Section>

        {/* Contact - EDITABLE */}
        <Section title="Contact Information" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} badge={isEditing ? 'Editable' : undefined}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Work Email" value={employee?.email} />
            <InfoItem label="Login Email" value={user?.email} />

            {/* Phone */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                Phone <span className="text-gray-400 normal-case font-normal">(opsional)</span>
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
                    {...register('phone')}
                    placeholder="08123456789 atau +6281234567890"
                    className={inputClass}
                  />
                  {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.phone || '-'}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                Mobile <span className="text-gray-400 normal-case font-normal">(opsional)</span>
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="tel-national"
                    {...register('mobile_number')}
                    placeholder="08123456789 atau +6281234567890"
                    className={inputClass}
                  />
                  {errors.mobile_number && <p className={errorClass}>{errors.mobile_number.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.mobile_number || '-'}</p>
              )}
            </div>

            {/* Subheader: Legal Address */}
            <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Legal Address (ID Card)</p>
            </div>

            {/* Legal Address */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Full Address</label>
              {isEditing ? (
                <>
                  <textarea {...register('address')} rows={2} placeholder="Full address as per ID card" className={textareaClass} />
                  {errors.address && <p className={errorClass}>{errors.address.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.address || '-'}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">City</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('city')} placeholder="New York" className={inputClass} />
                  {errors.city && <p className={errorClass}>{errors.city.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.city || '-'}</p>
              )}
            </div>

            {/* Province/State */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province/State</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('province')} placeholder="New York" className={inputClass} />
                  {errors.province && <p className={errorClass}>{errors.province.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.province || '-'}</p>
              )}
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Postal Code</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('postal_code')} placeholder="10001" className={inputClass} />
                  {errors.postal_code && <p className={errorClass}>{errors.postal_code.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.postal_code || '-'}</p>
              )}
            </div>

            {/* Subheader: Current Address */}
            <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Current Address (Residential)</p>
            </div>

            {/* Current Address */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Full Address</label>
              {isEditing ? (
                <>
                  <textarea {...register('current_address')} rows={2} placeholder="Current residential address" className={textareaClass} />
                  {errors.current_address && <p className={errorClass}>{errors.current_address.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_address || '-'}</p>
              )}
            </div>

            {/* Current City */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">City</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('current_city')} placeholder="Los Angeles" className={inputClass} />
                  {errors.current_city && <p className={errorClass}>{errors.current_city.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_city || '-'}</p>
              )}
            </div>

            {/* Current Province/State */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province/State</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('current_province')} placeholder="California" className={inputClass} />
                  {errors.current_province && <p className={errorClass}>{errors.current_province.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_province || '-'}</p>
              )}
            </div>

            {/* Current Postal Code */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Postal Code</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('current_postal_code')} placeholder="90001" className={inputClass} />
                  {errors.current_postal_code && <p className={errorClass}>{errors.current_postal_code.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_postal_code || '-'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Identity Documents */}
        <Section title="Identity Documents" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="National ID (NIK)" value={employee?.national_id} mono />
            <InfoItem label="Tax ID (NPWP)" value={employee?.npwp_number} mono />
            <InfoItem label="Passport No." value={employee?.passport_number} mono />
            <InfoItem label="Passport Expiry" value={formatDate(employee?.passport_expiry)} />
          </div>
        </Section>

        {/* Emergency Contact - EDITABLE */}
        <Section title="Emergency Contact" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} badge={isEditing ? 'Editable' : undefined}>
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Name</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('emergency_contact_name')} placeholder="Full name" className={inputClass} />
                  {errors.emergency_contact_name && <p className={errorClass}>{errors.emergency_contact_name.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_name || '-'}</p>
              )}
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Relationship</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('emergency_contact_relationship')} placeholder="e.g. Spouse, Parent" className={inputClass} />
                  {errors.emergency_contact_relationship && <p className={errorClass}>{errors.emergency_contact_relationship.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_relationship || '-'}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                Phone <span className="text-gray-400 normal-case font-normal">(opsional)</span>
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    inputMode="tel"
                    autoComplete="tel-national"
                    {...register('emergency_contact_phone')}
                    placeholder="08123456789 atau 0211234567 (landline)"
                    className={inputClass}
                  />
                  {errors.emergency_contact_phone && <p className={errorClass}>{errors.emergency_contact_phone.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_phone || '-'}</p>
              )}
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Address</label>
              {isEditing ? (
                <>
                  <textarea {...register('emergency_contact_address')} rows={2} placeholder="Emergency contact address" className={textareaClass} />
                  {errors.emergency_contact_address && <p className={errorClass}>{errors.emergency_contact_address.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_address || '-'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Employment Information */}
        <Section title="Employment Information" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Employee ID" value={employee?.employee_id} mono />
            <InfoItem label="Position" value={employee?.position?.name} />
            <InfoItem label="Department" value={employee?.department?.name} />
            <InfoItem label="Company" value={employee?.company?.name} />
            <InfoItem label="Work Location" value={employee?.workLocationRef?.name} />
            <InfoItem label="Employment Type" value={getEmploymentTypeLabel(employee?.employment_type)} />
            <InfoItem label="Join Date" value={formatDate(employee?.join_date)} />
            <InfoItem label="Hire Date" value={formatDate(employee?.hire_date)} />
            <InfoItem label="Direct Manager" value={employee?.manager?.name} />
            <InfoItem label="Organization Level" value={employee?.organizational_level} />
          </div>
        </Section>

        {/* Contract Information */}
        <Section title="Contract Information" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Probation Start" value={formatDate(employee?.probation_start_date)} />
            <InfoItem label="Probation End" value={formatDate(employee?.probation_end_date)} />
            <InfoItem label="Confirmation Date" value={formatDate(employee?.confirmation_date)} />
            <InfoItem label="Contract Start" value={formatDate(employee?.contract_start_date)} />
            <InfoItem label="Contract End" value={formatDate(employee?.contract_end_date)} />
            <InfoItem label="Work Schedule" value={employee?.work_schedule} />
            <InfoItem label="Shift" value={employee?.assigned_shift} />
          </div>
        </Section>

        {/* Social Security & Tax */}
        <Section title="Social Security & Tax" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="BPJS Employment No." value={employee?.bpjs_ketenagakerjaan_number} mono />
            <InfoItem label="BPJS Health No." value={employee?.bpjs_kesehatan_number} mono />
            <InfoItem label="BPJS Employment Date" value={formatDate(employee?.bpjs_ketenagakerjaan_date)} />
            <InfoItem label="BPJS Health Date" value={formatDate(employee?.bpjs_kesehatan_date)} />
            <InfoItem label="Tax Status (PTKP)" value={employee?.ptkp_status || employee?.tax_status} />
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">JHT Status</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.jht_registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.jht_registered ? 'Registered' : 'Not Registered'}
              </span>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">JP Status</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.jp_registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.jp_registered ? 'Registered' : 'Not Registered'}
              </span>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Medical Insurance</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.medical_insurance ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.medical_insurance ? 'Registered' : 'Not Registered'}
              </span>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Life Insurance</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee?.life_insurance ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {employee?.life_insurance ? 'Registered' : 'Not Registered'}
              </span>
            </div>
          </div>
        </Section>

        {/* Bank Information */}
        <Section title="Bank Information" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Bank Name" value={employee?.bank_name} />
            <InfoItem label="Branch" value={employee?.bank_branch} />
            <InfoItem label="Account Number" value={employee?.bank_account_number} mono />
            <InfoItem label="Account Holder" value={employee?.bank_account_holder} />
          </div>
        </Section>

        {/* Education - EDITABLE */}
        <Section title="Education" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>} badge={isEditing ? 'Editable' : undefined}>
          <div className="grid grid-cols-2 gap-4">
            {/* Education Level */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Education Level</label>
              {isEditing ? (
                <>
                  <select {...register('last_education')} className={selectClass}>
                    <option value="">Select Level</option>
                    <option value="sd">Elementary School</option>
                    <option value="smp">Junior High School</option>
                    <option value="sma">Senior High School</option>
                    <option value="d1">Diploma 1</option>
                    <option value="d2">Diploma 2</option>
                    <option value="d3">Diploma 3</option>
                    <option value="d4">Diploma 4</option>
                    <option value="s1">Bachelor's Degree</option>
                    <option value="s2">Master's Degree</option>
                    <option value="s3">Doctoral Degree</option>
                  </select>
                  {errors.last_education && <p className={errorClass}>{errors.last_education.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{getEducationLabel(employee?.last_education)}</p>
              )}
            </div>

            {/* Major */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Major</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('education_major')} placeholder="Computer Science" className={inputClass} />
                  {errors.education_major && <p className={errorClass}>{errors.education_major.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.education_major || '-'}</p>
              )}
            </div>

            {/* Institution */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Institution</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('education_institution')} placeholder="Harvard University" className={inputClass} />
                  {errors.education_institution && <p className={errorClass}>{errors.education_institution.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.education_institution || '-'}</p>
              )}
            </div>

            {/* Graduation Year */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Graduation Year</label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    {...register('graduation_year')}
                    placeholder="2020"
                    min={1950}
                    max={2030}
                    className={inputClass}
                  />
                  {errors.graduation_year && <p className={errorClass}>{errors.graduation_year.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.graduation_year?.toString() || '-'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Family Information - EDITABLE */}
        <Section title="Family Information" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} badge={isEditing ? 'Editable' : undefined}>
          <div className="grid grid-cols-2 gap-4">
            {/* Spouse Name */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Spouse Name</label>
              {isEditing ? (
                <>
                  <input type="text" {...register('spouse_name')} placeholder="Spouse full name" className={inputClass} />
                  {errors.spouse_name && <p className={errorClass}>{errors.spouse_name.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.spouse_name || '-'}</p>
              )}
            </div>

            {/* Number of Children */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Number of Children</label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    {...register('children_count')}
                    placeholder="0"
                    min={0}
                    max={20}
                    className={inputClass}
                  />
                  {errors.children_count && <p className={errorClass}>{errors.children_count.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.children_count?.toString() || '0'}</p>
              )}
            </div>

            {/* Number of Dependents */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Number of Dependents</label>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    {...register('number_of_dependents')}
                    placeholder="0"
                    min={0}
                    max={20}
                    className={inputClass}
                  />
                  {errors.number_of_dependents && <p className={errorClass}>{errors.number_of_dependents.message}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">{employee?.number_of_dependents?.toString() || '0'}</p>
              )}
            </div>
          </div>
        </Section>

        {/* Roles & Access */}
        <Section title="System Access" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Roles</label>
              <div className="flex flex-wrap gap-2">
                {user?.roles?.map((role, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Account Status</label>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${user?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </Section>
      </div>

      {/* Footer Info */}
      {employee && (
        <div className="bg-gray-50 rounded-xl px-6 py-4 text-center text-sm text-gray-500">
          Last updated: {formatDate(employee.updated_at)}
        </div>
      )}
    </form>
  );
}
