'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  glowColor?: string;
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ glowColor, className, children, hover = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative rounded-[20px] p-6',
          'bg-[rgba(255,255,255,0.06)]',
          'backdrop-blur-[24px] backdrop-saturate-[180%] backdrop-brightness-110',
          'border border-[rgba(255,255,255,0.15)]',
          'border-r-[rgba(255,255,255,0.05)] border-b-[rgba(255,255,255,0.05)]',
          'shadow-glass',
          className
        )}
        style={
          glowColor
            ? { boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 1px 0 0 rgba(255,255,255,0.08), 0 0 40px ${glowColor}` }
            : undefined
        }
        whileHover={
          hover
            ? {
                scale: 1.02,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderColor: 'rgba(255,255,255,0.25)',
                boxShadow: glowColor
                  ? `0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2), inset 1px 0 0 rgba(255,255,255,0.12), 0 0 60px ${glowColor}`
                  : '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2), inset 1px 0 0 rgba(255,255,255,0.12), 0 0 60px rgba(124,58,237,0.15)',
              }
            : undefined
        }
        whileTap={hover ? { scale: 0.98 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
