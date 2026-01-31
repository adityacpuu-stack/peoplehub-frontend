import { Link } from 'react-router-dom';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Mail, ArrowLeft, Send, CheckCircle2, Lock, Shield, KeyRound } from 'lucide-react';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordMobileProps {
  register: UseFormRegister<ForgotPasswordFormData>;
  errors: FieldErrors<ForgotPasswordFormData>;
  isLoading: boolean;
  isSubmitted: boolean;
  submittedEmail: string;
  onSubmit: (e: React.FormEvent) => void;
  onTryAgain: () => void;
}

export function ForgotPasswordMobile({
  register,
  errors,
  isLoading,
  isSubmitted,
  submittedEmail,
  onSubmit,
  onTryAgain,
}: ForgotPasswordMobileProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500" />

        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="gridMobileForgot" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridMobileForgot)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/30 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 px-6 pt-12 pb-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/images/logo/logo.png"
              alt="PeopleHUB"
              className="h-16 w-auto drop-shadow-lg"
            />
          </div>

          {/* Tagline */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">
              Reset Your <span className="text-cyan-300">Password</span>
            </h1>
            <p className="mt-2 text-blue-100 text-sm">
              We'll help you recover your account
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <Lock className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-xs font-medium text-white/90">Secure Password Reset</span>
            </div>
          </div>
        </div>

        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-white rounded-t-[2rem]" />
      </div>

      {/* Form Container */}
      <div className="flex-1 px-6 pt-2 pb-8">
        {/* Back to Login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        {!isSubmitted ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Forgot Password?</h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your email and we'll send you a reset link.
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
                      w-full h-14 pl-12 pr-4 rounded-xl border bg-gray-50 text-gray-900
                      placeholder:text-gray-400 transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white
                      ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'}
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
                  w-full h-14 rounded-xl font-semibold text-white
                  bg-gradient-to-r from-blue-600 to-indigo-600
                  hover:from-blue-700 hover:to-indigo-700
                  active:scale-[0.98]
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

            {/* Features */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Quick Reset</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Secure Link</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-sm text-gray-600 mb-4">
              We've sent a password reset link to:
            </p>
            <p className="font-medium text-gray-900 bg-gray-100 rounded-xl px-4 py-3 mb-4 text-sm">
              {submittedEmail}
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={onTryAgain}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
            >
              Try another email
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} PeopleHUB. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Enterprise P&C Management System
          </p>
        </div>
      </div>
    </div>
  );
}
