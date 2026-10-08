import { t, useLocale } from '@/i18n';
import { AuthLayout } from './AuthLayout';
import { Link } from 'react-router-dom';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';

interface ResetPasswordFormData {
  password: string;
  password_confirmation: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface ResetPasswordDesktopProps {
  register: UseFormRegister<ResetPasswordFormData>;
  errors: FieldErrors<ResetPasswordFormData>;
  isLoading: boolean;
  isSuccess: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  setShowPassword: (show: boolean) => void;
  setShowConfirmPassword: (show: boolean) => void;
  passwordRequirements: PasswordRequirement[];
  onSubmit: (e: React.FormEvent) => void;
  onGoToLogin: () => void;
}

export function ResetPasswordDesktop({
  register,
  errors,
  isLoading,
  isSuccess,
  showPassword,
  showConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  passwordRequirements,
  onSubmit,
  onGoToLogin,
}: ResetPasswordDesktopProps) {
  useLocale();
  return <AuthLayout employeePortal recovery>
    <Link to="/login" className="ph-auth-back"><ArrowLeft size={16} />{t("Back to login")}</Link>
    {!isSuccess ? <>
      <h1>{t("Reset Password")}</h1><p>{t("Please enter your new password below.")}</p>
      <form onSubmit={onSubmit} className="ph-auth-form" aria-busy={isLoading}>
        <div className="ph-auth-field"><label htmlFor="password">{t("New Password")}</label>
          <div className="ph-auth-password"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={t("Enter new password")} className="ph-auth-input" aria-invalid={!!errors.password} aria-describedby="password-requirements password-error" {...register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="ph-auth-reveal" aria-label={showPassword ? t("Hide password") : t("Show password")} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div><p id="password-error" className="ph-auth-error" role={errors.password ? 'alert' : undefined}>{t(errors.password?.message || '')}</p>
          <ul id="password-requirements" className="ph-auth-requirements">{passwordRequirements.map((req, index) => <li key={index} data-met={req.met}>{req.met ? <CheckCircle2 size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}{t(req.label)}</li>)}</ul>
        </div>
        <div className="ph-auth-field"><label htmlFor="password_confirmation">{t("Confirm New Password")}</label>
          <div className="ph-auth-password"><input id="password_confirmation" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder={t("Confirm new password")} className="ph-auth-input" aria-invalid={!!errors.password_confirmation} aria-describedby={errors.password_confirmation ? 'confirmation-error' : undefined} {...register('password_confirmation')} />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="ph-auth-reveal" aria-label={showConfirmPassword ? t("Hide confirmation password") : t("Show confirmation password")} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>{errors.password_confirmation && <p id="confirmation-error" className="ph-auth-error" role="alert">{t(errors.password_confirmation.message || '')}</p>}
        </div>
        <button type="submit" disabled={isLoading} className="ph-auth-submit">{isLoading ? t("Resetting…") : t("Reset Password")}</button>
      </form>
    </> : <section className="ph-auth-result" aria-live="polite">
      <CheckCircle2 size={24} aria-hidden="true" /><h1>{t("Password Reset Successful")}</h1>
      <p>{t("Your password has been reset successfully. You can now log in with your new password.")}</p>
      <button onClick={onGoToLogin} className="ph-auth-submit">{t("Go to Login")}</button>
    </section>}
  </AuthLayout>;
}
