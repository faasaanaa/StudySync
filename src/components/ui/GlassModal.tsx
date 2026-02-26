'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function GlassModal({ isOpen, onClose, children, title, className }: GlassModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn(
                'relative w-full max-w-lg max-h-[85vh] overflow-y-auto',
                'rounded-[20px] p-6',
                'bg-[rgba(255,255,255,0.08)]',
                'backdrop-blur-[32px] backdrop-saturate-[180%] backdrop-brightness-110',
                'border border-[rgba(255,255,255,0.15)]',
                'border-r-[rgba(255,255,255,0.05)] border-b-[rgba(255,255,255,0.05)]',
                'shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_60px_rgba(124,58,237,0.1)]',
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {title && (
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors text-text-secondary hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
