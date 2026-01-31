import { Link } from 'react-router-dom';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

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
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="flex w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500" />

        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="gridForgot" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridForgot)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo */}
          <div>
            <img
              src="/images/logo/logo.png"
              alt="P&C Logo"
              className="h-20 w-auto drop-shadow-lg"
            />
          </div>

          {/* Main Message */}
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                Reset Your
                <br />
                <span className="text-cyan-300">Password</span>
              </h2>
              <p className="mt-4 text-lg text-blue-100 max-w-md">
                No worries! Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {/* Info Box */}
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 max-w-md">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-cyan-400/20">
                  <Mail className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Check Your Inbox</h3>
                  <p className="text-sm text-blue-100 mt-1">
                    After submitting, check your email for a password reset link. The link will expire in 60 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-blue-100">
            <p>&copy; {new Date().getFullYear()} PeopleHUB. All rights reserved.</p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-400/30 rounded-full blur-3xl" />
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Back to Login */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
                <p className="mt-2 text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      className={`
                        w-full h-12 pl-12 pr-4 rounded-xl border bg-white text-gray-900
                        placeholder:text-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'}
                      `}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    w-full h-12 rounded-xl font-semibold text-white
                    bg-gradient-to-r from-blue-600 to-indigo-600
                    hover:from-blue-700 hover:to-indigo-700
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200 shadow-lg shadow-blue-500/25
                    flex items-center justify-center gap-2
                  "
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to:
              </p>
              <p className="font-medium text-gray-900 bg-gray-100 rounded-lg px-4 py-2 mb-6">
                {submittedEmail}
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={onTryAgain}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Try another email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
