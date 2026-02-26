'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#F1F5F9',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
          success: {
            iconTheme: { primary: '#7C3AED', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
        }}
      />
    </AuthProvider>
  );
}
