import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ForgotPasswordMobile } from './components/ForgotPasswordMobile';
import { ForgotPasswordDesktop } from './components/ForgotPasswordDesktop';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const isMobile = useIsMobile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success('Password reset link sent!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
  };

  const sharedProps = {
    register,
    errors,
    isLoading,
    isSubmitted,
    submittedEmail,
    onSubmit: handleSubmit(onSubmit),
    onTryAgain: handleTryAgain,
  };

  if (isMobile) {
    return <ForgotPasswordMobile {...sharedProps} />;
  }

  return <ForgotPasswordDesktop {...sharedProps} />;
}
