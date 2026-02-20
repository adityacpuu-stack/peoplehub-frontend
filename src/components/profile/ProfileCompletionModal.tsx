import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle, ChevronRight, ChevronLeft, User, Phone, FileText,
  CreditCard, MapPin, Shield, Heart, Mail, Calendar, Droplets,
  Users, Building2, Hash, Loader2
} from 'lucide-react';
import { profileService } from '@/services/profile.service';
import type { UpdateProfileDTO } from '@/services/profile.service';
import type { Employee } from '@/types';
import toast from 'react-hot-toast';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface FormData {
  name: string;
  place_of_birth: string;
  date_of_birth: string;
  blood_type: string;
  gender: string;
  personal_email: string;
  phone: string;
  mobile_number: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  current_address: string;
  current_city: string;
  current_province: string;
  current_postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  national_id: string;
  family_card_number: string;
  npwp_number: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
}

interface StepConfig {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: typeof User;
  fields: (keyof FormData)[];
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    title: 'Data Pribadi',
    shortTitle: 'Pribadi',
    description: 'Lengkapi identitas diri Anda',
    icon: User,
    fields: ['name', 'place_of_birth', 'date_of_birth', 'gender', 'blood_type', 'personal_email'],
  },
  {
    id: 2,
    title: 'Alamat',
    shortTitle: 'Alamat',
    description: 'Isi alamat sesuai KTP dan domisili saat ini',
    icon: MapPin,
    fields: ['address', 'city', 'province', 'postal_code', 'current_address', 'current_city', 'current_province', 'current_postal_code'],
  },
  {
    id: 3,
    title: 'Informasi Kontak',
    shortTitle: 'Kontak',
    description: 'Nomor telepon dan kontak darurat',
    icon: Phone,
    fields: ['phone', 'mobile_number', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'],
  },
  {
    id: 4,
    title: 'Dokumen Identitas',
    shortTitle: 'Dokumen',
    description: 'Nomor KTP, Kartu Keluarga, dan NPWP',
    icon: FileText,
    fields: ['national_id', 'family_card_number', 'npwp_number'],
  },
  {
    id: 5,
    title: 'Informasi Bank',
    shortTitle: 'Bank',
    description: 'Data rekening untuk pembayaran gaji',
    icon: CreditCard,
    fields: ['bank_name', 'bank_account_number'],
  },
];

const FIELD_LABELS: Record<keyof FormData, string> = {
  name: 'Nama Lengkap',
  place_of_birth: 'Tempat Lahir',
  date_of_birth: 'Tanggal Lahir',
  blood_type: 'Golongan Darah',
  gender: 'Jenis Kelamin',
  personal_email: 'Email Pribadi',
  phone: 'Nomor Telepon',
  mobile_number: 'Nomor HP',
  address: 'Alamat Lengkap (Sesuai KTP)',
  city: 'Kota',
  province: 'Provinsi',
  postal_code: 'Kode Pos',
  current_address: 'Alamat Lengkap (Domisili)',
  current_city: 'Kota',
  current_province: 'Provinsi',
  current_postal_code: 'Kode Pos',
  emergency_contact_name: 'Nama Kontak Darurat',
  emergency_contact_phone: 'Telepon Kontak Darurat',
  emergency_contact_relationship: 'Hubungan',
  national_id: 'Nomor KTP (NIK)',
  family_card_number: 'Nomor Kartu Keluarga (KK)',
  npwp_number: 'Nomor NPWP',
  bank_name: 'Nama Bank',
  bank_account_number: 'Nomor Rekening',
  bank_account_holder: 'Nama Pemilik Rekening',
};

const FIELD_PLACEHOLDERS: Record<keyof FormData, string> = {
  name: 'Nama sesuai KTP',
  place_of_birth: 'Jakarta',
  date_of_birth: '',
  blood_type: '',
  gender: '',
  personal_email: 'email.pribadi@gmail.com',
  phone: '021-12345678',
  mobile_number: '081234567890',
  address: 'Jl. Contoh No. 123, RT 01/RW 02, Kel., Kec.',
  city: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  postal_code: '12345',
  current_address: 'Jl. Contoh No. 456, RT 03/RW 04',
  current_city: 'Jakarta Selatan',
  current_province: 'DKI Jakarta',
  current_postal_code: '12345',
  emergency_contact_name: 'Nama lengkap',
  emergency_contact_phone: '081234567890',
  emergency_contact_relationship: 'Suami/Istri/Orang Tua',
  national_id: '3171234567890001',
  family_card_number: '3171234567890001',
  npwp_number: '12.345.678.9-012.345',
  bank_name: 'BCA / Mandiri / BNI',
  bank_account_number: '1234567890',
  bank_account_holder: 'Nama sesuai buku rekening',
};

const FIELD_ICONS: Partial<Record<keyof FormData, typeof User>> = {
  name: User,
  place_of_birth: MapPin,
  date_of_birth: Calendar,
  gender: Users,
  blood_type: Droplets,
  personal_email: Mail,
  phone: Phone,
  mobile_number: Phone,
  address: MapPin,
  current_address: MapPin,
  emergency_contact_name: Shield,
  emergency_contact_phone: Phone,
  emergency_contact_relationship: Heart,
  national_id: FileText,
  family_card_number: Users,
  npwp_number: Hash,
  bank_name: Building2,
  bank_account_number: CreditCard,
};

const OPTIONAL_FIELDS: (keyof FormData)[] = [
  'phone', 'blood_type', 'personal_email', 'npwp_number',
  'current_address', 'current_city', 'current_province', 'current_postal_code',
];

const INITIAL_FORM_DATA: FormData = {
  name: '', place_of_birth: '', date_of_birth: '', blood_type: '', gender: '',
  personal_email: '', phone: '', mobile_number: '', address: '', city: '',
  province: '', postal_code: '', current_address: '', current_city: '',
  current_province: '', current_postal_code: '', emergency_contact_name: '',
  emergency_contact_phone: '', emergency_contact_relationship: '', national_id: '',
  family_card_number: '', npwp_number: '', bank_name: '', bank_account_number: '',
  bank_account_holder: '',
};

export function ProfileCompletionModal({ isOpen, onComplete }: ProfileCompletionModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [employeeName, setEmployeeName] = useState('');
  const [sameAsKtp, setSameAsKtp] = useState(false);

  useEffect(() => {
    if (isOpen) fetchExistingProfile();
  }, [isOpen]);

  const fetchExistingProfile = async () => {
    setIsFetchingProfile(true);
    try {
      const profile: Employee = await profileService.getMyProfile();
      setEmployeeName(profile.name || '');
      setFormData({
        name: profile.name || '',
        place_of_birth: profile.place_of_birth || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
        blood_type: profile.blood_type || '',
        gender: profile.gender || '',
        personal_email: (profile as any).personal_email || '',
        phone: profile.phone || '',
        mobile_number: profile.mobile_number || '',
        address: profile.address || '',
        city: profile.city || '',
        province: profile.province || '',
        postal_code: profile.postal_code || '',
        current_address: profile.current_address || '',
        current_city: profile.current_city || '',
        current_province: profile.current_province || '',
        current_postal_code: profile.current_postal_code || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        emergency_contact_relationship: profile.emergency_contact_relationship || '',
        national_id: profile.national_id || '',
        family_card_number: profile.family_card_number || '',
        npwp_number: profile.npwp_number || '',
        bank_name: profile.bank_name || '',
        bank_account_number: profile.bank_account_number || '',
        bank_account_holder: profile.bank_account_holder || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSameAsKtpToggle = (checked: boolean) => {
    setSameAsKtp(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        current_address: prev.address,
        current_city: prev.city,
        current_province: prev.province,
        current_postal_code: prev.postal_code,
      }));
    } else {
      setFormData((prev) => ({
        ...prev, current_address: '', current_city: '', current_province: '', current_postal_code: '',
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    const stepConfig = STEPS.find((s) => s.id === step);
    if (!stepConfig) return false;
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    let isValid = true;
    for (const field of stepConfig.fields) {
      if (OPTIONAL_FIELDS.includes(field)) continue;
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${FIELD_LABELS[field]} wajib diisi`;
        isValid = false;
      }
    }
    if (formData.national_id && formData.national_id.length !== 16) {
      newErrors.national_id = 'NIK harus 16 digit';
      isValid = false;
    }
    if (formData.family_card_number && formData.family_card_number.length !== 16) {
      newErrors.family_card_number = 'Nomor KK harus 16 digit';
      isValid = false;
    }
    if (formData.mobile_number && !/^[0-9+\-\s]+$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Format nomor HP tidak valid';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setIsLoading(true);
    try {
      const updateData: UpdateProfileDTO = {
        name: formData.name,
        place_of_birth: formData.place_of_birth,
        date_of_birth: formData.date_of_birth || undefined,
        blood_type: formData.blood_type || undefined,
        gender: formData.gender,
        personal_email: formData.personal_email || undefined,
        phone: formData.phone,
        mobile_number: formData.mobile_number,
        address: formData.address, city: formData.city,
        province: formData.province, postal_code: formData.postal_code,
        current_address: formData.current_address, current_city: formData.current_city,
        current_province: formData.current_province, current_postal_code: formData.current_postal_code,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        national_id: formData.national_id,
        family_card_number: formData.family_card_number,
        npwp_number: formData.npwp_number,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_account_holder: employeeName,
      };
      await profileService.updateMyProfile(updateData);
      toast.success('Profil berhasil dilengkapi!');
      onComplete();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Gagal menyimpan profil. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepConfig = STEPS.find((s) => s.id === currentStep);
  const progress = (currentStep / STEPS.length) * 100;

  if (!isOpen) return null;

  const inputBaseClass = 'w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400';
  const inputErrorClass = 'border-red-400 bg-red-50/50';
  const inputNormalClass = 'border-gray-200 bg-white hover:border-gray-300';

  const renderField = (field: keyof FormData) => {
    const Icon = FIELD_ICONS[field];
    const isOptional = OPTIONAL_FIELDS.includes(field);
    const hasError = !!errors[field];
    const cls = `${inputBaseClass} ${hasError ? inputErrorClass : inputNormalClass}`;

    // Determine column span
    const isFullWidth = field === 'name' || field === 'address' || field === 'current_address';

    return (
      <div key={field} className={isFullWidth ? 'col-span-1 sm:col-span-2' : ''}>
        <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />}
          {FIELD_LABELS[field]}
          {isOptional
            ? <span className="text-gray-400 font-normal text-[10px]">(opsional)</span>
            : <span className="text-red-400 text-xs">*</span>
          }
        </label>

        {field === 'address' || field === 'current_address' ? (
          <textarea
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={FIELD_PLACEHOLDERS[field]}
            rows={2}
            className={`${cls} resize-none`}
          />
        ) : field === 'gender' ? (
          <select value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls}>
            <option value="">Pilih Jenis Kelamin</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
          </select>
        ) : field === 'blood_type' ? (
          <select value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls}>
            <option value="">Pilih</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </select>
        ) : field === 'date_of_birth' ? (
          <input type="date" value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls} />
        ) : field === 'emergency_contact_relationship' ? (
          <select value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls}>
            <option value="">Pilih Hubungan</option>
            <option value="Suami">Suami</option>
            <option value="Istri">Istri</option>
            <option value="Orang Tua">Orang Tua</option>
            <option value="Saudara">Saudara</option>
            <option value="Anak">Anak</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        ) : (
          <input
            type={field === 'personal_email' ? 'email' : field.includes('phone') || field.includes('mobile') ? 'tel' : 'text'}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={FIELD_PLACEHOLDERS[field]}
            className={cls}
          />
        )}

        {hasError && (
          <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
            <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
            {errors[field]}
          </p>
        )}
      </div>
    );
  };

  const renderSectionHeader = (title: string, icon: typeof MapPin, subtitle?: string) => (
    <div className="col-span-1 sm:col-span-2 pt-3 first:pt-0">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        {(() => { const I = icon; return <I className="w-4 h-4 text-blue-500" />; })()}
        <div>
          <p className="text-xs sm:text-sm font-semibold text-gray-800">{title}</p>
          {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative z-50 w-full sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[92vh] sm:mx-4 rounded-t-2xl sm:rounded-b-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

        {/* Header - Compact & Clean */}
        <div className="relative overflow-hidden flex-shrink-0">
          {/* Gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkg4di0yaDI4em0tOC04djJIMjR2LTJoNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />

          <div className="relative px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
            {/* Title area */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Lengkapi Profil Anda
                </h2>
                <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
                  Data diperlukan untuk administrasi perusahaan
                </p>
              </div>
            </div>

            {/* Step Pills - Horizontal scroll on mobile */}
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      // Allow navigating to completed steps or current
                      if (isCompleted) setCurrentStep(step.id);
                    }}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      isCurrent
                        ? 'bg-white text-blue-700 shadow-lg shadow-blue-900/20'
                        : isCompleted
                        ? 'bg-white/20 text-white hover:bg-white/30 cursor-pointer'
                        : 'bg-white/10 text-white/50 cursor-default'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                    ) : (
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCurrent ? 'text-blue-600' : ''}`} />
                    )}
                    <span className="hidden sm:inline">{step.shortTitle}</span>
                    <span className="sm:hidden">{step.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-black/10">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {isFetchingProfile ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-500">Memuat data profil...</p>
              </div>
            ) : (
              <>
                {/* Step Title */}
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">
                      {currentStep}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      {stepConfig?.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-8">
                    {stepConfig?.description}
                  </p>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {stepConfig?.fields.map((field) => (
                    <div key={`wrapper-${field}`} className="contents">
                      {/* Section headers for Alamat step */}
                      {field === 'current_address' && (
                        <div className="col-span-1 sm:col-span-2 pt-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-blue-500" />
                              <div>
                                <p className="text-xs sm:text-sm font-semibold text-gray-800">Alamat Domisili</p>
                                {!sameAsKtp && <p className="text-[10px] text-gray-400">Tempat tinggal saat ini</p>}
                              </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <div className={`relative w-9 h-5 rounded-full transition-colors ${sameAsKtp ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                <input
                                  type="checkbox"
                                  checked={sameAsKtp}
                                  onChange={(e) => handleSameAsKtpToggle(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sameAsKtp ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                              <span className="text-xs text-gray-600">Sama dengan KTP</span>
                            </label>
                          </div>
                          {sameAsKtp && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <p className="text-xs text-blue-600">Alamat domisili sama dengan alamat KTP</p>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Section headers for Kontak step */}
                      {field === 'phone' && renderSectionHeader('Kontak Pribadi', Phone)}
                      {field === 'emergency_contact_name' && renderSectionHeader('Kontak Darurat', Shield, 'Untuk keadaan mendesak')}

                      {/* Render field (skip domicile if same as KTP) */}
                      {!(sameAsKtp && field.startsWith('current_')) && renderField(field)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/80 backdrop-blur px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step.id === currentStep
                      ? 'w-6 bg-blue-500'
                      : step.id < currentStep
                      ? 'w-1.5 bg-blue-400'
                      : 'w-1.5 bg-gray-300'
                  }`}
                />
              ))}
              <span className="text-[11px] text-gray-400 ml-2 hidden sm:block">
                {currentStep}/{STEPS.length}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Kembali</span>
                </button>
              )}
              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-600/25"
                >
                  Lanjut
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-emerald-600/25"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Simpan
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
