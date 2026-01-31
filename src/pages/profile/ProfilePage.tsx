import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { profileService } from '@/services/profile.service';
import type { UpdateProfileDTO } from '@/services/profile.service';
import type { Employee } from '@/types';
import toast from 'react-hot-toast';

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

export function ProfilePage() {
  const { user } = useAuthStore();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProfileDTO>({
    phone: '',
    mobile_number: '',
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
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    emergency_contact_address: '',
    // Education
    last_education: '',
    education_major: '',
    education_institution: '',
    graduation_year: undefined,
    // Family
    spouse_name: '',
    children_count: undefined,
    number_of_dependents: undefined,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileService.getMyProfile();
        setEmployee(data);
        setEditForm({
          phone: data.phone || '',
          mobile_number: data.mobile_number || '',
          // Alamat KTP
          address: data.address || '',
          city: data.city || '',
          province: data.province || '',
          postal_code: data.postal_code || '',
          // Alamat Domisili
          current_address: data.current_address || '',
          current_city: data.current_city || '',
          current_province: data.current_province || '',
          current_postal_code: data.current_postal_code || '',
          // Emergency Contact
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relationship: data.emergency_contact_relationship || '',
          emergency_contact_address: data.emergency_contact_address || '',
          // Education
          last_education: data.last_education || '',
          education_major: data.education_major || '',
          education_institution: data.education_institution || '',
          graduation_year: data.graduation_year || undefined,
          // Family
          spouse_name: data.spouse_name || '',
          children_count: data.children_count || undefined,
          number_of_dependents: data.number_of_dependents || undefined,
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.employee) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await profileService.updateMyProfile(editForm);
      setEmployee(updated);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (employee) {
      setEditForm({
        phone: employee.phone || '',
        mobile_number: employee.mobile_number || '',
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
        // Emergency Contact
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        emergency_contact_relationship: employee.emergency_contact_relationship || '',
        emergency_contact_address: employee.emergency_contact_address || '',
        // Education
        last_education: employee.last_education || '',
        education_major: employee.education_major || '',
        education_institution: employee.education_institution || '',
        graduation_year: employee.graduation_year || undefined,
        // Family
        spouse_name: employee.spouse_name || '',
        children_count: employee.children_count || undefined,
        number_of_dependents: employee.number_of_dependents || undefined,
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof UpdateProfileDTO, value: string | number | undefined) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof UpdateProfileDTO, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setEditForm(prev => ({ ...prev, [field]: numValue }));
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
    <div className="space-y-6">
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
                  <button onClick={handleCancel} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-200 font-medium">
                    <span>Cancel</span>
                  </button>
                  <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50">
                    {saving ? <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div> : null}
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              ) : (
                <>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getStatusColor(employee?.employment_status)}`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {getStatusLabel(employee?.employment_status)}
                  </span>
                  <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 font-semibold shadow-lg">
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
            Edit mode is active. You can edit <strong>Contact Information</strong>, <strong>Emergency Contact</strong>, <strong>Education</strong>, and <strong>Family Information</strong>. Other data can only be modified by HR.
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
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</label>
              {isEditing ? (
                <input type="tel" value={editForm.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="+1-xxx-xxx-xxxx" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.phone || '-'}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Mobile</label>
              {isEditing ? (
                <input type="tel" value={editForm.mobile_number} onChange={(e) => handleInputChange('mobile_number', e.target.value)} placeholder="+1-xxx-xxx-xxxx" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
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
                <textarea value={editForm.address} onChange={(e) => handleInputChange('address', e.target.value)} rows={2} placeholder="Full address as per ID card" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 resize-none" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.address || '-'}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">City</label>
              {isEditing ? (
                <input type="text" value={editForm.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="New York" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.city || '-'}</p>
              )}
            </div>

            {/* Province/State */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province/State</label>
              {isEditing ? (
                <input type="text" value={editForm.province} onChange={(e) => handleInputChange('province', e.target.value)} placeholder="New York" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.province || '-'}</p>
              )}
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Postal Code</label>
              {isEditing ? (
                <input type="text" value={editForm.postal_code} onChange={(e) => handleInputChange('postal_code', e.target.value)} placeholder="10001" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
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
                <textarea value={editForm.current_address} onChange={(e) => handleInputChange('current_address', e.target.value)} rows={2} placeholder="Current residential address" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 resize-none" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_address || '-'}</p>
              )}
            </div>

            {/* Current City */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">City</label>
              {isEditing ? (
                <input type="text" value={editForm.current_city} onChange={(e) => handleInputChange('current_city', e.target.value)} placeholder="Los Angeles" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_city || '-'}</p>
              )}
            </div>

            {/* Current Province/State */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province/State</label>
              {isEditing ? (
                <input type="text" value={editForm.current_province} onChange={(e) => handleInputChange('current_province', e.target.value)} placeholder="California" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.current_province || '-'}</p>
              )}
            </div>

            {/* Current Postal Code */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Postal Code</label>
              {isEditing ? (
                <input type="text" value={editForm.current_postal_code} onChange={(e) => handleInputChange('current_postal_code', e.target.value)} placeholder="90001" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
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
                <input type="text" value={editForm.emergency_contact_name} onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)} placeholder="Full name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_name || '-'}</p>
              )}
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Relationship</label>
              {isEditing ? (
                <input type="text" value={editForm.emergency_contact_relationship} onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse, Parent" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_relationship || '-'}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</label>
              {isEditing ? (
                <input type="tel" value={editForm.emergency_contact_phone} onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)} placeholder="+1-xxx-xxx-xxxx" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.emergency_contact_phone || '-'}</p>
              )}
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Address</label>
              {isEditing ? (
                <textarea value={editForm.emergency_contact_address} onChange={(e) => handleInputChange('emergency_contact_address', e.target.value)} rows={2} placeholder="Emergency contact address" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 resize-none" />
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
            <InfoItem label="Job Title" value={employee?.job_title} />
            <InfoItem label="Department" value={employee?.department?.name} />
            <InfoItem label="Position" value={employee?.position?.name} />
            <InfoItem label="Company" value={employee?.company?.name} />
            <InfoItem label="Division" value={employee?.division} />
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
                <select value={editForm.last_education || ''} onChange={(e) => handleInputChange('last_education', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white">
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
              ) : (
                <p className="font-medium text-gray-900">{getEducationLabel(employee?.last_education)}</p>
              )}
            </div>

            {/* Major */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Major</label>
              {isEditing ? (
                <input type="text" value={editForm.education_major || ''} onChange={(e) => handleInputChange('education_major', e.target.value)} placeholder="Computer Science" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.education_major || '-'}</p>
              )}
            </div>

            {/* Institution */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Institution</label>
              {isEditing ? (
                <input type="text" value={editForm.education_institution || ''} onChange={(e) => handleInputChange('education_institution', e.target.value)} placeholder="Harvard University" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.education_institution || '-'}</p>
              )}
            </div>

            {/* Graduation Year */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Graduation Year</label>
              {isEditing ? (
                <input type="number" value={editForm.graduation_year || ''} onChange={(e) => handleNumberChange('graduation_year', e.target.value)} placeholder="2020" min="1950" max="2030" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
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
                <input type="text" value={editForm.spouse_name || ''} onChange={(e) => handleInputChange('spouse_name', e.target.value)} placeholder="Spouse full name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.spouse_name || '-'}</p>
              )}
            </div>

            {/* Number of Children */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Number of Children</label>
              {isEditing ? (
                <input type="number" value={editForm.children_count ?? ''} onChange={(e) => handleNumberChange('children_count', e.target.value)} placeholder="0" min="0" max="20" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
              ) : (
                <p className="font-medium text-gray-900">{employee?.children_count?.toString() || '0'}</p>
              )}
            </div>

            {/* Number of Dependents */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Number of Dependents</label>
              {isEditing ? (
                <input type="number" value={editForm.number_of_dependents ?? ''} onChange={(e) => handleNumberChange('number_of_dependents', e.target.value)} placeholder="0" min="0" max="20" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
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
    </div>
  );
}
