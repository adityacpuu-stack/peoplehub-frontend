import { Link } from 'react-router-dom';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle2, KeyRound, Shield } from 'lucide-react';

interface ResetPasswordFormData {
  password: string;
  password_confirmation: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface ResetPasswordMobileProps {
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

export function ResetPasswordMobile({
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
}: ResetPasswordMobileProps) {
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
              <pattern id="gridMobileReset" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridMobileReset)" />
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
              Create New <span className="text-cyan-300">Password</span>
            </h1>
            <p className="mt-2 text-blue-100 text-sm">
              Choose a strong and secure password
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <Lock className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-xs font-medium text-white/90">Secure Password Update</span>
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

        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <p className="mt-1 text-sm text-gray-500">
                Please enter your new password below.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className={`
                      w-full h-14 pl-12 pr-12 rounded-xl border bg-gray-50 text-gray-900
                      placeholder:text-gray-400 transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white
                      ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'}
                    `}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>
                )}

                {/* Password Requirements */}
                <div className="mt-3 space-y-2">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        req.met ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {req.met ? (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        )}
                      </div>
                      <span className={`text-xs ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    id="password_confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className={`
                      w-full h-14 pl-12 pr-12 rounded-xl border bg-gray-50 text-gray-900
                      placeholder:text-gray-400 transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white
                      ${errors.password_confirmation ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'}
                    `}
                    {...register('password_confirmation')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.password_confirmation.message}</p>
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
                    <Lock className="h-5 w-5" />
                    Reset Password
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
                  <span className="text-xs font-medium text-gray-700">Strong Security</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Encrypted</span>
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset Successful</h2>
            <p className="text-sm text-gray-600 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button
              onClick={onGoToLogin}
              className="
                w-full h-14 rounded-xl font-semibold text-white
                bg-gradient-to-r from-blue-600 to-indigo-600
                hover:from-blue-700 hover:to-indigo-700
                active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transition-all duration-200 shadow-lg shadow-blue-500/25
                flex items-center justify-center gap-2
              "
            >
              Go to Login
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
