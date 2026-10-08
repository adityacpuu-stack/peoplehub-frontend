import { t, useLocale } from '@/i18n';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, ...props }, ref) => {
    useLocale();
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[var(--ph-ink)]"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-[var(--ph-focus)] focus:border-[var(--ph-accent)]',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-[var(--ph-line)]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{t(error)}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[var(--ph-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
