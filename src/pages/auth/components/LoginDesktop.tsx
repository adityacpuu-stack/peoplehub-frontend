import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Users, BarChart3, Calendar, Shield } from 'lucide-react';

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

const features = [
  { icon: Users, title: 'Employee Management', description: 'Comprehensive employee data management' },
  { icon: Calendar, title: 'Leave & Attendance', description: 'Track time-off and attendance seamlessly' },
  { icon: BarChart3, title: 'Analytics & Reports', description: 'Data-driven insights for better decisions' },
  { icon: Shield, title: 'Secure & Compliant', description: 'Enterprise-grade security standards' },
];

export function LoginDesktop({
  register,
  errors,
  isLoading,
  showPassword,
  setShowPassword,
  onSubmit,
}: LoginDesktopProps) {
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
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
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
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                Empower Your
                <br />
                <span className="text-cyan-300">Workforce</span>
              </h2>
              <p className="mt-4 text-lg text-blue-100 max-w-md">
                Streamline P&C operations with our comprehensive people management platform designed for modern enterprises.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-colors"
                >
                  <feature.icon className="h-6 w-6 text-cyan-300 mb-2" />
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-blue-100 mt-1">{feature.description}</p>
                </div>
              ))}
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

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">Please enter your credentials to continue</p>
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
                  w-full h-12 px-4 rounded-xl border bg-white text-gray-900
                  placeholder:text-gray-400 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'}
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
                    w-full h-12 px-4 pr-12 rounded-xl border bg-white text-gray-900
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
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
