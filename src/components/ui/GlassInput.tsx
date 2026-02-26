'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-3 rounded-[14px]',
              'bg-[rgba(255,255,255,0.05)]',
              'border border-[rgba(255,255,255,0.12)]',
              'text-white placeholder-[#64748B]',
              'backdrop-blur-[12px]',
              'transition-all duration-300',
              'focus:border-[rgba(124,58,237,0.6)]',
              'focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15),0_0_20px_rgba(124,58,237,0.1)]',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-12',
              error && 'border-red-500/50 focus:border-red-500/80',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
