'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  default: 'bg-[rgba(255,255,255,0.08)] text-white',
  primary: 'bg-primary/30 text-white border-primary/30',
  secondary: 'bg-secondary/30 text-white border-secondary/30',
  ghost: 'bg-transparent border-transparent shadow-none',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = 'default', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative rounded-[14px] font-medium',
          'backdrop-blur-[24px] backdrop-saturate-[180%]',
          'border border-[rgba(255,255,255,0.15)]',
          'border-r-[rgba(255,255,255,0.05)] border-b-[rgba(255,255,255,0.05)]',
          'shadow-glass-btn',
          'transition-colors duration-200',
          'select-none cursor-pointer',
          'overflow-hidden',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        whileHover={
          !disabled
            ? {
                scale: 1.03,
                backgroundColor: variant === 'primary' ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.14)',
                borderColor: 'rgba(255,255,255,0.25)',
              }
            : undefined
        }
        whileTap={!disabled ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {/* Top highlight reflection */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-1/2 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.18)_0%,transparent_60%)]" />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {children}
        </span>
      </motion.button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
