import { t, useLocale } from '@/i18n';
import { AuthLayout } from './AuthLayout';
import { Link } from 'react-router-dom';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordDesktopProps {
  register: UseFormRegister<ForgotPasswordFormData>;
  errors: FieldErrors<ForgotPasswordFormData>;
  isLoading: boolean;
  isSubmitted: boolean;
  submittedEmail: string;
  onSubmit: (e: React.FormEvent) => void;
  onTryAgain: () => void;
}

export function ForgotPasswordDesktop({
  register,
  errors,
  isLoading,
  isSubmitted,
  submittedEmail,
  onSubmit,
  onTryAgain,
}: ForgotPasswordDesktopProps) {
  useLocale();
  return <AuthLayout employeePortal recovery>
    <Link to="/login" className="ph-auth-back"><ArrowLeft size={16} />{t("Back to login")}</Link>
    {!isSubmitted ? <>
      <h1>{t("Forgot Password?")}</h1><p>{t("Enter your email address and we'll send you a link to reset your password.")}</p>
      <form onSubmit={onSubmit} className="ph-auth-form" aria-busy={isLoading}>
        <div className="ph-auth-field"><label htmlFor="email">{t("Email Address")}</label>
          <input id="email" type="email" autoComplete="email" placeholder={t("name@company.com")} className="ph-auth-input" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
          {errors.email && <p id="email-error" className="ph-auth-error" role="alert">{t(errors.email.message || '')}</p>}
        </div>
        <button type="submit" disabled={isLoading} className="ph-auth-submit">{isLoading ? t("Sending…") : t("Send Reset Link")}</button>
      </form>
    </> : <section className="ph-auth-result" aria-live="polite">
      <CheckCircle2 size={24} aria-hidden="true" /><h1>{t("Check Your Email")}</h1>
      <p>{t("We've sent a password reset link to:")}</p><strong>{submittedEmail}</strong>
      <p>{t("Didn't receive the email? Check your spam folder or try again.")}</p>
      <button onClick={onTryAgain} className="ph-auth-link">{t("Try another email")}</button>
    </section>}
  </AuthLayout>;
}
