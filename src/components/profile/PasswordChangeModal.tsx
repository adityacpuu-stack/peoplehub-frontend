import { t, useLocale } from '@/i18n';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import './onboarding.css';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'Minimal 8 karakter', test: (p) => p.length >= 8 },
  { label: 'Mengandung huruf besar', test: (p) => /[A-Z]/.test(p) },
  { label: 'Mengandung huruf kecil', test: (p) => /[a-z]/.test(p) },
  { label: 'Mengandung angka', test: (p) => /[0-9]/.test(p) },
];

export function PasswordChangeModal({ isOpen, onComplete }: PasswordChangeModalProps) {
  useLocale();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Password saat ini wajib diisi';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Password baru wajib diisi';
    } else {
      // Check all requirements
      const failedRequirements = PASSWORD_REQUIREMENTS.filter(
        (req) => !req.test(newPassword)
      );
      if (failedRequirements.length > 0) {
        newErrors.newPassword = 'Password tidak memenuhi persyaratan';
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword = 'Password baru harus berbeda dari password saat ini';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success(t("Password berhasil diubah!"));
      onComplete();
    } catch (error: any) {
      const message = error.response?.data?.message || t('Gagal mengubah password');
      if (message.includes('incorrect') || message.includes('salah')) {
        setErrors({ currentPassword: 'Password saat ini tidak benar' });
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return <Modal role="alertdialog" busy={isLoading} isOpen={isOpen} onClose={keepPasswordFlowOpen} showCloseButton={false}
    title={t("Ubah Password")} description={t("Demi keamanan, silakan ubah password Anda")}>
    <div className="ph-onboarding ph-workflow" aria-busy={isLoading}>
      <fieldset disabled={isLoading} className="ph-onboarding-password-fields">
        <legend className="sr-only">{t("Ubah Password")}</legend>
        {([
          { key: 'currentPassword', label: 'Password Saat Ini', placeholder: 'Masukkan password saat ini', value: currentPassword, setValue: setCurrentPassword, visible: showCurrentPassword, setVisible: setShowCurrentPassword, autocomplete: 'current-password' },
          { key: 'newPassword', label: 'Password Baru', placeholder: 'Masukkan password baru', value: newPassword, setValue: setNewPassword, visible: showNewPassword, setVisible: setShowNewPassword, autocomplete: 'new-password' },
          { key: 'confirmPassword', label: 'Konfirmasi Password Baru', placeholder: 'Konfirmasi password baru', value: confirmPassword, setValue: setConfirmPassword, visible: showConfirmPassword, setVisible: setShowConfirmPassword, autocomplete: 'new-password' },
        ] as const).map(field => <div key={field.key} className="ph-field">
          <label htmlFor={`force-${field.key}`} className="ph-onboarding-label">{t(field.label)} <span aria-hidden="true">*</span></label>
          <div className="ph-onboarding-password">
            <input id={`force-${field.key}`} type={field.visible ? 'text' : 'password'} autoComplete={field.autocomplete}
              value={field.value} placeholder={t(field.placeholder)} className="ph-onboarding-input" aria-invalid={!!errors[field.key]}
              aria-describedby={errors[field.key] ? `force-error-${field.key}` : field.key === 'newPassword' ? 'force-requirements' : undefined}
              onChange={event => { field.setValue(event.target.value); if (errors[field.key]) setErrors(previous => ({ ...previous, [field.key]: '' })); }} />
            <button type="button" onClick={() => field.setVisible(!field.visible)} aria-label={t(field.visible ? 'Sembunyikan {field}' : 'Tampilkan {field}', { field: t(field.label) })} aria-pressed={field.visible}>
              {field.visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors[field.key] && <p id={`force-error-${field.key}`} role="alert" className="ph-onboarding-error">{t(errors[field.key])}</p>}
          {field.key === 'newPassword' && <ul id="force-requirements" className="ph-onboarding-requirements">
            {PASSWORD_REQUIREMENTS.map((req, index) => <li key={index} data-valid={newPassword ? req.test(newPassword) : undefined}>
              {req.test(newPassword) ? <CheckCircle size={14} /> : <AlertCircle size={14} />}{t(req.label)}
            </li>)}
          </ul>}
        </div>)}
        {confirmPassword && newPassword === confirmPassword && <p className="ph-onboarding-match"><CheckCircle size={14} />{t("Password cocok")}</p>}
      </fieldset>
      <footer className="ph-onboarding-footer ph-dialog-footer"><button type="button" onClick={handleSubmit} disabled={isLoading} className="ph-button ph-button-primary"><Lock size={16} />{isLoading ? t("Menyimpan...") : t("Ubah Password")}</button></footer>
    </div>
  </Modal>;
}

function keepPasswordFlowOpen() {}
