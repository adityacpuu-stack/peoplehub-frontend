import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, ChevronRight, ChevronLeft, User, Phone, FileText, CreditCard } from 'lucide-react';
import { profileService } from '@/services/profile.service';
import type { UpdateProfileDTO } from '@/services/profile.service';
import type { Employee } from '@/types';
import toast from 'react-hot-toast';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface FormData {
  // Step 1: Contact & KTP Address
  phone: string;
  mobile_number: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  // Step 2: Current Address (Domicile)
  current_address: string;
  current_city: string;
  current_province: string;
  current_postal_code: string;
  // Step 3: Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  // Step 4: Identity Documents
  national_id: string;
  npwp_number: string;
  // Step 5: Bank Information
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
}

interface StepConfig {
  id: number;
  title: string;
  description: string;
  icon: typeof User;
  fields: (keyof FormData)[];
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    title: 'Data Alamat',
    description: 'Alamat KTP dan Domisili',
    icon: User,
    fields: ['address', 'city', 'province', 'postal_code', 'current_address', 'current_city', 'current_province', 'current_postal_code'],
  },
  {
    id: 2,
    title: 'Kontak',
    description: 'Informasi kontak pribadi dan darurat',
    icon: Phone,
    fields: ['phone', 'mobile_number', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'],
  },
  {
    id: 3,
    title: 'Dokumen',
    description: 'Nomor KTP dan NPWP',
    icon: FileText,
    fields: ['national_id', 'npwp_number'],
  },
  {
    id: 4,
    title: 'Bank',
    description: 'Data rekening untuk pembayaran gaji',
    icon: CreditCard,
    fields: ['bank_name', 'bank_account_number'],
  },
];

const FIELD_LABELS: Record<keyof FormData, string> = {
  phone: 'Nomor Telepon',
  mobile_number: 'Nomor HP',
  address: 'Alamat Lengkap',
  city: 'Kota',
  province: 'Provinsi',
  postal_code: 'Kode Pos',
  current_address: 'Alamat Lengkap',
  current_city: 'Kota',
  current_province: 'Provinsi',
  current_postal_code: 'Kode Pos',
  emergency_contact_name: 'Nama Kontak Darurat',
  emergency_contact_phone: 'Telepon Kontak Darurat',
  emergency_contact_relationship: 'Hubungan',
  national_id: 'Nomor KTP (NIK)',
  npwp_number: 'Nomor NPWP',
  bank_name: 'Nama Bank',
  bank_account_number: 'Nomor Rekening',
  bank_account_holder: 'Nama Pemilik Rekening',
};

const FIELD_PLACEHOLDERS: Record<keyof FormData, string> = {
  phone: '021-12345678',
  mobile_number: '081234567890',
  address: 'Jl. Contoh No. 123, RT 01/RW 02, Kelurahan, Kecamatan',
  city: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  postal_code: '12345',
  current_address: 'Jl. Contoh No. 456, RT 03/RW 04, Kelurahan, Kecamatan',
  current_city: 'Jakarta Selatan',
  current_province: 'DKI Jakarta',
  current_postal_code: '12345',
  emergency_contact_name: 'Nama lengkap kontak darurat',
  emergency_contact_phone: '081234567890',
  emergency_contact_relationship: 'Suami/Istri/Orang Tua/Saudara',
  national_id: '3171234567890001',
  npwp_number: '12.345.678.9-012.345',
  bank_name: 'BCA / Mandiri / BNI / dll',
  bank_account_number: '1234567890',
  bank_account_holder: 'Nama sesuai buku rekening',
};

// Optional fields (not required for profile completion)
const OPTIONAL_FIELDS: (keyof FormData)[] = [
  'phone',
  'npwp_number',
  'current_address',
  'current_city',
  'current_province',
  'current_postal_code',
];

const INITIAL_FORM_DATA: FormData = {
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
  national_id: '',
  npwp_number: '',
  bank_name: '',
  bank_account_number: '',
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

  // Fetch existing profile data on mount
  useEffect(() => {
    if (isOpen) {
      fetchExistingProfile();
    }
  }, [isOpen]);

  const fetchExistingProfile = async () => {
    setIsFetchingProfile(true);
    try {
      const profile: Employee = await profileService.getMyProfile();
      setEmployeeName(profile.name || '');
      setFormData({
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
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSameAsKtpToggle = (checked: boolean) => {
    setSameAsKtp(checked);
    if (checked) {
      // Copy KTP address to current address
      setFormData((prev) => ({
        ...prev,
        current_address: prev.address,
        current_city: prev.city,
        current_province: prev.province,
        current_postal_code: prev.postal_code,
      }));
    } else {
      // Clear current address fields
      setFormData((prev) => ({
        ...prev,
        current_address: '',
        current_city: '',
        current_province: '',
        current_postal_code: '',
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    const currentStepConfig = STEPS.find((s) => s.id === step);
    if (!currentStepConfig) return false;

    const newErrors: Partial<Record<keyof FormData, string>> = {};
    let isValid = true;

    for (const field of currentStepConfig.fields) {
      // Skip validation for optional fields
      if (OPTIONAL_FIELDS.includes(field)) continue;

      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${FIELD_LABELS[field]} wajib diisi`;
        isValid = false;
      }
    }

    // Additional validations
    if (formData.national_id && formData.national_id.length !== 16) {
      newErrors.national_id = 'NIK harus 16 digit';
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
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    try {
      const updateData: UpdateProfileDTO = {
        phone: formData.phone,
        mobile_number: formData.mobile_number,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code,
        current_address: formData.current_address,
        current_city: formData.current_city,
        current_province: formData.current_province,
        current_postal_code: formData.current_postal_code,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        national_id: formData.national_id,
        npwp_number: formData.npwp_number,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_account_holder: employeeName, // Auto-fill with employee name
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

  const currentStepConfig = STEPS.find((s) => s.id === currentStep);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop - Non-dismissable */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-4 sm:px-6 sm:py-6 text-white flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold truncate">Lengkapi Profil Anda</h2>
              <p className="text-xs sm:text-sm text-slate-300 hidden sm:block">
                Data ini diperlukan untuk keperluan administrasi
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4 sm:mt-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-white text-slate-700'
                          : 'bg-white/20 text-white/60'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs mt-1 font-medium text-center ${
                        isCurrent ? 'text-white' : 'text-white/60'
                      } hidden sm:block`}
                    >
                      {step.title}
                    </span>
                    {/* Mobile: show step number */}
                    <span
                      className={`text-[10px] mt-0.5 font-medium sm:hidden ${
                        isCurrent ? 'text-white' : 'text-white/60'
                      }`}
                    >
                      {step.id}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 sm:mx-2 min-w-[16px] sm:min-w-[32px] ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto flex-1">
          {isFetchingProfile ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-700"></div>
            </div>
          ) : (
            <>
              {/* Step Title */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {currentStepConfig?.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">{currentStepConfig?.description}</p>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {currentStepConfig?.fields.map((field, index) => (
                  <>
                    {/* Section Header for Alamat KTP */}
                    {field === 'address' && (
                      <div key="header-ktp" className="col-span-1 md:col-span-2 pt-2 first:pt-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 pb-2 border-b border-gray-200">
                          Alamat KTP
                        </p>
                      </div>
                    )}
                    {/* Section Header for Alamat Domisili with Checkbox */}
                    {field === 'current_address' && (
                      <div key="header-domisili" className="col-span-1 md:col-span-2 pt-3 sm:pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 pb-2 border-b border-gray-200 gap-2 sm:gap-0">
                          <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Alamat Domisili
                          </p>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sameAsKtp}
                              onChange={(e) => handleSameAsKtpToggle(e.target.checked)}
                              className="w-4 h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500"
                            />
                            <span className="text-xs sm:text-sm text-gray-600">Sama dengan alamat KTP</span>
                          </label>
                        </div>
                      </div>
                    )}
                    {/* Section Header for Kontak Pribadi */}
                    {field === 'phone' && (
                      <div key="header-personal-contact" className="col-span-1 md:col-span-2 pt-2 first:pt-0">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 pb-2 border-b border-gray-200">
                          Kontak Pribadi
                        </p>
                      </div>
                    )}
                    {/* Section Header for Kontak Darurat */}
                    {field === 'emergency_contact_name' && (
                      <div key="header-emergency-contact" className="col-span-1 md:col-span-2 pt-3 sm:pt-4">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 pb-2 border-b border-gray-200">
                          Kontak Darurat
                        </p>
                      </div>
                    )}
                    {/* Hide current address fields when sameAsKtp is checked */}
                    {!(sameAsKtp && field.startsWith('current_')) && (
                      <div
                        key={field}
                        className={
                          field === 'address' || field === 'current_address' ? 'md:col-span-2' : ''
                        }
                      >
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          {FIELD_LABELS[field]}{' '}
                          {OPTIONAL_FIELDS.includes(field) ? (
                            <span className="text-gray-400 font-normal text-[10px] sm:text-xs">(opsional)</span>
                          ) : (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        {field === 'address' || field === 'current_address' ? (
                          <textarea
                            value={formData[field]}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            placeholder={FIELD_PLACEHOLDERS[field]}
                            rows={2}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 resize-none ${
                              errors[field] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[field]}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            placeholder={FIELD_PLACEHOLDERS[field]}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 ${
                              errors[field] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        )}
                        {errors[field] && (
                          <p className="mt-1 text-[10px] sm:text-xs text-red-500">{errors[field]}</p>
                        )}
                      </div>
                    )}
                  </>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-200 gap-3 sm:gap-0 flex-shrink-0">
          <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
            Langkah {currentStep} dari {STEPS.length}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex-1 sm:flex-none"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Kembali</span>
              </button>
            )}
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex-1 sm:flex-none"
              >
                Lanjut
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex-1 sm:flex-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Menyimpan...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Simpan & Selesai</span>
                    <span className="sm:hidden">Simpan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
