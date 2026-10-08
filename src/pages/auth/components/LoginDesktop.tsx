import { t, useLocale } from '@/i18n';
import { AuthLayout } from './AuthLayout';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginDesktopProps {
  register: UseFormRegister<LoginFormData>;
  errors: FieldErrors<LoginFormData>;
  isLoading: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginDesktop({
  register,
  errors,
  isLoading,
  showPassword,
  setShowPassword,
  onSubmit,
}: LoginDesktopProps) {
  useLocale();
  return <AuthLayout employeePortal>
    <h1>{t("Welcome back")}</h1><p>{t("Sign in to your PeopleHub account.")}</p>
    <form onSubmit={onSubmit} className="ph-auth-form" aria-busy={isLoading}>
      <div className="ph-auth-field"><label htmlFor="email">{t("Email Address")}</label>
        <input id="email" type="email" autoComplete="email" placeholder={t("name@company.com")} className="ph-auth-input" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
        {errors.email && <p id="email-error" className="ph-auth-error" role="alert">{t(errors.email.message || '')}</p>}
      </div>
      <div className="ph-auth-field"><label htmlFor="password">{t("Password")}</label>
        <div className="ph-auth-password"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t("Enter your password")} className="ph-auth-input" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="ph-auth-reveal" aria-label={showPassword ? t("Hide password") : t("Show password")} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>{errors.password && <p id="password-error" className="ph-auth-error" role="alert">{t(errors.password.message || '')}</p>}
      </div>
      <div className="ph-auth-options"><Link to="/forgot-password">{t("Forgot password?")}</Link></div>
      <button type="submit" disabled={isLoading} className="ph-auth-submit">{isLoading ? t("Signing in…") : t("Sign In")}</button>
    </form>
  </AuthLayout>;
}
