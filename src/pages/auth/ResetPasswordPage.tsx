import { t, useLocale } from '@/i18n';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AuthLayout } from './components/AuthLayout';
import { authService } from '@/services/auth.service';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ResetPasswordMobile } from './components/ResetPasswordMobile';
import { ResetPasswordDesktop } from './components/ResetPasswordDesktop';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const isMobile = useIsMobile();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password', '');

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !email) {
      toast.error(t("Invalid reset link"));
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        email,
        token,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
      setIsSuccess(true);
      toast.success(t("Password reset successfully!"));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('Failed to reset password. The link may have expired.'), { id: 'api-error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  // Invalid token or email state
  if (!token || !email) {
    return <AuthLayout employeePortal recovery>
      <h1>{t("Invalid Reset Link")}</h1>
      <p>{t("This password reset link is invalid or has expired. Please request a new one.")}</p>
      <Link to="/forgot-password" className="ph-auth-submit">{t("Request New Link")}</Link>
    </AuthLayout>;
  }

  const sharedProps = {
    register,
    errors,
    isLoading,
    isSuccess,
    showPassword,
    showConfirmPassword,
    setShowPassword,
    setShowConfirmPassword,
    passwordRequirements,
    onSubmit: handleSubmit(onSubmit),
    onGoToLogin: handleGoToLogin,
  };

  if (isMobile) {
    return <ResetPasswordMobile {...sharedProps} />;
  }

  return <ResetPasswordDesktop {...sharedProps} />;
}
