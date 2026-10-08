import { t, useLocale } from '@/i18n';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import './onboarding.css';
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

type FieldError = string | { source: string; field?: keyof FormData };

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
  useLocale();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, FieldError>>>({});
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
    const newErrors: Partial<Record<keyof FormData, FieldError>> = {};
    let isValid = true;
    for (const field of stepConfig.fields) {
      if (OPTIONAL_FIELDS.includes(field)) continue;
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = { source: '{field} wajib diisi', field };
        isValid = false;
      }
    }
    if (formData.national_id && formData.national_id.length !== 16) {
      newErrors.national_id = { source: 'NIK harus 16 digit' };
      isValid = false;
    }
    if (formData.family_card_number && formData.family_card_number.length !== 16) {
      newErrors.family_card_number = { source: 'Nomor KK harus 16 digit' };
      isValid = false;
    }
    if (formData.mobile_number && !/^[0-9+\-\s]+$/.test(formData.mobile_number)) {
      newErrors.mobile_number = { source: 'Format nomor HP tidak valid' };
      isValid = false;
    }
    // Bank account: mirror BE regex /^[\d\-\s]{5,30}$/ so we fail fast on the client
    if (formData.bank_account_number && !/^[\d\-\s]{5,30}$/.test(formData.bank_account_number)) {
      newErrors.bank_account_number = { source: 'Nomor rekening hanya angka, 5-30 digit' };
      isValid = false;
    }
    if (formData.bank_name && formData.bank_name.length > 100) {
      newErrors.bank_name = { source: 'Nama bank maksimal 100 karakter' };
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
      toast.success(t("Profil berhasil dilengkapi!"));
      onComplete();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      // BE returns { success: false, error: { message, code, errors: [{field, message}] } }
      // see peoplehub-backend/src/middlewares/error.middleware.ts:67-126
      const apiError = error?.response?.data?.error;
      const fieldErrors: Array<{ field: string; message: string }> = apiError?.errors || [];
      if (fieldErrors.length > 0) {
        // Map per-field errors back onto the form for inline display
        const mapped: Partial<Record<keyof FormData, string>> = {};
        for (const fe of fieldErrors) {
          const key = fe.field as keyof FormData;
          if (key in formData) mapped[key] = fe.message;
        }
        if (Object.keys(mapped).length > 0) setErrors((prev) => ({ ...prev, ...mapped }));
        // Jump back to the earliest step that has an error so user can fix it
        const stepWithError = STEPS.find((s) => s.fields.some((f) => mapped[f]));
        if (stepWithError) setCurrentStep(stepWithError.id);
        toast.error(fieldErrors[0].message || apiError?.message || t('Validasi gagal'));
      } else {
        toast.error(apiError?.message || t('Gagal menyimpan profil. Silakan coba lagi.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stepConfig = STEPS.find((s) => s.id === currentStep);

  if (!isOpen) return null;

  const inputBaseClass = 'ph-onboarding-input';
  const inputErrorClass = 'ph-onboarding-invalid';
  const inputNormalClass = '';

  const renderField = (field: keyof FormData) => {
    const Icon = FIELD_ICONS[field];
    const isOptional = OPTIONAL_FIELDS.includes(field);
    const hasError = !!errors[field];
    const cls = `${inputBaseClass} ${hasError ? inputErrorClass : inputNormalClass}`;

    // Determine column span
    const isFullWidth = field === 'name' || field === 'address' || field === 'current_address';

    return (
      <div key={field} className={`ph-field ${isFullWidth ? 'ph-onboarding-wide' : ''}`}>
        <label htmlFor={`onboarding-${field}`} className="ph-onboarding-label">
          {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />}
          {t(FIELD_LABELS[field])}
          {isOptional
            ? <span className="text-gray-400 font-normal text-[10px]">{t("(opsional)")}</span>
            : <span className="text-red-400 text-xs">*</span>
          }
        </label>

        {field === 'address' || field === 'current_address' ? (
          <textarea id={`onboarding-${field}`} aria-invalid={hasError} aria-describedby={hasError ? `onboarding-error-${field}` : undefined}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={t(FIELD_PLACEHOLDERS[field])}
            rows={2}
            className={`${cls} resize-none`}
          />
        ) : field === 'gender' ? (
          <select id={`onboarding-${field}`} aria-invalid={hasError} aria-describedby={hasError ? `onboarding-error-${field}` : undefined} value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls}>
            <option value="">{t("Pilih Jenis Kelamin")}</option>
            <option value="male">{t("Laki-laki")}</option>
            <option value="female">{t("Perempuan")}</option>
          </select>
        ) : field === 'blood_type' ? (
          <select id={`onboarding-${field}`} aria-invalid={hasError} aria-describedby={hasError ? `onboarding-error-${field}` : undefined} value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls}>
            <option value="">{t("Pilih")}</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </select>
        ) : field === 'date_of_birth' ? (
          <input id={`onboarding-${field}`} aria-invalid={hasError} aria-describedby={hasError ? `onboarding-error-${field}` : undefined} type="date" value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls} />
        ) : field === 'emergency_contact_relationship' ? (
          <select id={`onboarding-${field}`} aria-invalid={hasError} aria-describedby={hasError ? `onboarding-error-${field}` : undefined} value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} className={cls}>
            <option value="">{t("Pilih Hubungan")}</option>
            <option value="Suami">{t("Suami")}</option>
            <option value="Istri">{t("Istri")}</option>
            <option value="Orang Tua">{t("Orang Tua")}</option>
            <option value="Saudara">{t("Saudara")}</option>
            <option value="Anak">{t("Anak")}</option>
            <option value="Lainnya">{t("Lainnya")}</option>
          </select>
        ) : (
          <input id={`onboarding-${field}`} aria-invalid={hasError} aria-describedby={hasError ? `onboarding-error-${field}` : undefined}
            type={field === 'personal_email' ? 'email' : field.includes('phone') || field.includes('mobile') ? 'tel' : 'text'}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={t(FIELD_PLACEHOLDERS[field])}
            className={cls}
          />
        )}

        {hasError && (
          <p id={`onboarding-error-${field}`} role="alert" className="ph-onboarding-error">
            <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
            {typeof errors[field] === 'string' ? errors[field] : t(errors[field]?.source || '', { field: t(FIELD_LABELS[field]) })}
          </p>
        )}
      </div>
    );
  };

  const renderSectionHeader = (title: string, icon: typeof MapPin, subtitle?: string) => (
    <div className="ph-onboarding-wide ph-onboarding-subheading">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        {(() => { const I = icon; return <I className="w-4 h-4 text-[#187451]" />; })()}
        <div>
          <p className="text-xs sm:text-sm font-semibold text-gray-800">{t(title)}</p>
          {subtitle && <p className="text-[10px] text-gray-400">{t(subtitle)}</p>}
        </div>
      </div>
    </div>
  );

  return <Modal role="alertdialog" busy={isLoading} isOpen={isOpen} onClose={keepOnboardingOpen} showCloseButton={false} size="lg"
    title={t("Lengkapi Profil Anda")} description={t("Data diperlukan untuk administrasi perusahaan")}>
    <div className="ph-onboarding ph-workflow" aria-busy={isLoading || isFetchingProfile}>
      <nav className="ph-onboarding-steps" aria-label={t("Langkah melengkapi profil")}>
        {STEPS.map(step => <button key={step.id} type="button" disabled={isLoading || isFetchingProfile || currentStep < step.id}
          aria-current={currentStep === step.id ? 'step' : undefined}
          onClick={() => { if (currentStep > step.id) setCurrentStep(step.id); }}>
          <span className="ph-onboarding-step-number">{currentStep > step.id ? <CheckCircle size={16} /> : step.id}</span>
          <span>{t(step.shortTitle)}</span>
        </button>)}
      </nav>
      {isFetchingProfile ? <div className="ph-onboarding-loading" role="status"><Loader2 size={22} className="animate-spin" />{t("Memuat data profil...")}</div> : <>
        <header className="ph-onboarding-heading"><h3>{t(stepConfig?.title || '')}</h3><p>{t(stepConfig?.description || '')}</p></header>
        <fieldset disabled={isLoading} className="ph-onboarding-fields ph-form-grid">
          <legend className="sr-only">{t(stepConfig?.title || '')}</legend>
          {stepConfig?.fields.map(field => <div key={`wrapper-${field}`} className="contents">
            {field === 'current_address' && <section className="ph-onboarding-wide ph-onboarding-subheading">
              <div><h4>{t("Alamat Domisili")}</h4>{!sameAsKtp && <p>{t("Tempat tinggal saat ini")}</p>}</div>
              <label className="ph-onboarding-check"><input type="checkbox" checked={sameAsKtp} onChange={e => handleSameAsKtpToggle(e.target.checked)} />{t("Sama dengan KTP")}</label>
              {sameAsKtp && <p className="ph-callout">{t("Alamat domisili sama dengan alamat KTP")}</p>}
            </section>}
            {field === 'phone' && renderSectionHeader('Kontak Pribadi', Phone)}
            {field === 'emergency_contact_name' && renderSectionHeader('Kontak Darurat', Shield, 'Untuk keadaan mendesak')}
            {!(sameAsKtp && field.startsWith('current_')) && renderField(field)}
          </div>)}
        </fieldset>
      </>}
      <footer className="ph-onboarding-footer ph-dialog-footer">
        <p>{t("Langkah")} {currentStep}{' '}{t("dari")} {STEPS.length}</p>
        <div className="ph-actions">
          {currentStep > 1 && <button type="button" onClick={handleBack} disabled={isLoading} className="ph-button"><ChevronLeft size={16} />{t("Kembali")}</button>}
          {currentStep < STEPS.length
            ? <button type="button" onClick={handleNext} disabled={isFetchingProfile || isLoading} className="ph-button ph-button-primary">{t("Lanjut")}<ChevronRight size={16} /></button>
            : <button type="button" onClick={handleSubmit} disabled={isLoading} className="ph-button ph-button-primary">{isLoading ? <><Loader2 size={16} className="animate-spin" />{t("Menyimpan...")}</> : t("Simpan")}</button>}
        </div>
      </footer>
    </div>
  </Modal>;
}

// This workflow can only finish through its successful completion callback.
function keepOnboardingOpen() {}
