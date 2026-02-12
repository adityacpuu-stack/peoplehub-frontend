import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LoginMobile } from './components/LoginMobile';
import { LoginDesktop } from './components/LoginDesktop';
import { ErrorModal } from '@/components/ui';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isMobile = useIsMobile();

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'error' | 'network';
  }>({ isOpen: false, message: '', type: 'error' });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      // Always redirect to dashboard after login for security
      // This prevents users from being redirected to pages they don't have access to
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      const isNetworkError = !error.response || error.message === 'Network Error';
      const errorMessage = isNetworkError
        ? 'Unable to connect to server. Please check your internet connection and try again.'
        : error.response?.data?.error?.message || 'The email or password you entered is incorrect. Please try again.';

      setErrorModal({
        isOpen: true,
        message: errorMessage,
        type: isNetworkError ? 'network' : 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sharedProps = {
    register,
    errors,
    isLoading,
    showPassword,
    setShowPassword,
    onSubmit: handleSubmit(onSubmit),
  };

  return (
    <>
      {isMobile ? <LoginMobile {...sharedProps} /> : <LoginDesktop {...sharedProps} />}

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        message={errorModal.message}
        type={errorModal.type}
        onRetry={errorModal.type === 'network' ? handleSubmit(onSubmit) : undefined}
      />
    </>
  );
}
