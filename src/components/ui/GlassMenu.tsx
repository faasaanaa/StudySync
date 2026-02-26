'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRef, useState, useEffect } from 'react';

interface GlassMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function GlassMenu({ trigger, children, className, align = 'right' }: GlassMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'absolute top-full mt-2 min-w-[200px] z-50',
              'rounded-[16px] p-2',
              'bg-[rgba(255,255,255,0.08)]',
              'backdrop-blur-[32px] backdrop-saturate-[180%] backdrop-brightness-110',
              'border border-[rgba(255,255,255,0.15)]',
              'border-r-[rgba(255,255,255,0.05)] border-b-[rgba(255,255,255,0.05)]',
              'shadow-glass',
              align === 'right' ? 'right-0' : 'left-0',
              className
            )}
          >
            {(children as any)?.map
              ? (children as React.ReactElement[]).map((child, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {child}
                  </motion.div>
                ))
              : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GlassMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  danger?: boolean;
}

export function GlassMenuItem({ children, onClick, className, danger }: GlassMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl',
        'text-sm text-left transition-all duration-200',
        'hover:bg-[rgba(255,255,255,0.08)]',
        danger ? 'text-red-400 hover:text-red-300' : 'text-text-primary hover:text-white',
        className
      )}
    >
      {children}
    </button>
  );
}
