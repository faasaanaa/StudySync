'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);

      toast.success('Welcome back!');

      // Profile is now set in context after signIn
      // We need to check onboarding status - use a small delay for state to propagate
      // or just redirect to dashboard, the dashboard will redirect if needed
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues('email');
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error('Please enter a valid email address first');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Background glow effects */}
      <div
        className="absolute top-1/3 -left-32 w-96 h-96 rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ backgroundColor: '#7C3AED' }}
      />
      <div
        className="absolute bottom-1/3 -right-32 w-80 h-80 rounded-full opacity-15 blur-[120px] pointer-events-none"
        style={{ backgroundColor: '#06B6D4' }}
      />

      <motion.div
        className="w-full max-w-md relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <GlassCard className="p-8">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <motion.div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
              }}
              whileHover={{ scale: 1.05, rotate: -5 }}
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm">
              Sign in to continue your academic journey
            </p>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <motion.div variants={itemVariants}>
              <GlassInput
                icon={<Mail className="w-4 h-4" />}
                type="email"
                placeholder="Email Address"
                {...register('email')}
                error={errors.email?.message}
              />
            </motion.div>

            {/* Password */}
            <motion.div variants={itemVariants}>
              <div className="relative">
                <GlassInput
                  icon={<Lock className="w-4 h-4" />}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  {...register('password')}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  style={{ top: errors.password ? 'calc(50% - 10px)' : '50%' }}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Forgot Password */}
            <motion.div variants={itemVariants} className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting}
                className="text-sm font-medium transition-colors hover:underline disabled:opacity-50"
                style={{ color: '#7C3AED' }}
              >
                {isResetting ? 'Sending...' : 'Forgot Password?'}
              </button>
            </motion.div>

            {/* Submit */}
            <motion.div variants={itemVariants} className="pt-1">
              <GlassButton
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </GlassButton>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 my-6"
          >
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </motion.div>

          {/* Footer link */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-gray-400"
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="font-medium transition-colors hover:underline"
              style={{ color: '#7C3AED' }}
            >
              Create one
            </Link>
          </motion.p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
