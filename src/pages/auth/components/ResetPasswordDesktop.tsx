import { Link } from 'react-router-dom';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react';

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
              <pattern id="gridReset" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridReset)" />
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
                Create New
                <br />
                <span className="text-cyan-300">Password</span>
              </h2>
              <p className="mt-4 text-lg text-blue-100 max-w-md">
                Choose a strong password to keep your account secure. Make sure it's something you can remember.
              </p>
            </div>

            {/* Security Tips */}
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 max-w-md">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-cyan-400/20">
                  <Lock className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Password Security Tips</h3>
                  <ul className="text-sm text-blue-100 mt-2 space-y-1">
                    <li>Use a mix of letters, numbers, and symbols</li>
                    <li>Avoid using personal information</li>
                    <li>Don't reuse passwords from other accounts</li>
                  </ul>
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

          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                <p className="mt-2 text-gray-600">
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
                        w-full h-12 pl-12 pr-12 rounded-xl border bg-white text-gray-900
                        placeholder:text-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'}
                      `}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                        w-full h-12 pl-12 pr-12 rounded-xl border bg-white text-gray-900
                        placeholder:text-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        ${errors.password_confirmation ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'}
                      `}
                      {...register('password_confirmation')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                      <Lock className="h-5 w-5" />
                      Reset Password
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful</h2>
              <p className="text-gray-600 mb-6">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <button
                onClick={onGoToLogin}
                className="
                  w-full h-12 rounded-xl font-semibold text-white
                  bg-gradient-to-r from-blue-600 to-indigo-600
                  hover:from-blue-700 hover:to-indigo-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  transition-all duration-200 shadow-lg shadow-blue-500/25
                  flex items-center justify-center gap-2
                "
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
