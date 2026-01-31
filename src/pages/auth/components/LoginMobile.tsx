import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Lock, Fingerprint, Shield } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginMobileProps {
  register: UseFormRegister<LoginFormData>;
  errors: FieldErrors<LoginFormData>;
  isLoading: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginMobile({
  register,
  errors,
  isLoading,
  showPassword,
  setShowPassword,
  onSubmit,
}: LoginMobileProps) {
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
              <pattern id="gridMobile" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridMobile)" />
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
              Empower Your <span className="text-cyan-300">Workforce</span>
            </h1>
            <p className="mt-2 text-blue-100 text-sm">
              Comprehensive P&C Management Platform
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <Lock className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-xs font-medium text-white/90">256-bit SSL Encrypted</span>
            </div>
          </div>
        </div>

        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-white rounded-t-[2rem]" />
      </div>

      {/* Form Container */}
      <div className="flex-1 px-6 pt-2 pb-8">
        {/* Form Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
          <p className="mt-1 text-sm text-gray-500">Enter your credentials to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              className={`
                w-full h-14 px-4 rounded-xl border bg-gray-50 text-gray-900
                placeholder:text-gray-400 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white
                ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'}
              `}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`
                  w-full h-14 px-4 pr-12 rounded-xl border bg-gray-50 text-gray-900
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
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Forgot password?
            </Link>
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
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Fingerprint className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Secure Access</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Data Protected</span>
            </div>
          </div>
        </div>

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
