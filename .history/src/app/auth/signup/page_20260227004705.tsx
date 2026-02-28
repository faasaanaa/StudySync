'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Mail,
  Lock,
  User,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';

const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  universityName: z
    .string()
    .min(2, 'University name is required')
    .max(200, 'University name is too long'),
  email: z
    .string()
    .email('Please enter a valid email')
    .refine(
      (email) => {
        const domain = email.split('@')[1]?.toLowerCase() ?? '';
        return (
          domain.endsWith('.edu') ||
          domain.endsWith('.edu.pk') ||
          domain.endsWith('.ac.uk') ||
          domain.endsWith('.edu.au') ||
          domain.includes('university') ||
          domain.includes('uni.') ||
          domain.includes('college')
        );
      },
      { message: 'Please use a valid university email address (.edu or university domain)' }
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  degreeProgram: z
    .string()
    .min(2, 'Degree program is required'),
  currentSemester: z
    .string()
    .min(1, 'Please select your current semester'),
  cgpa: z
    .string()
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0.0 && num <= 4.0;
      },
      { message: 'CGPA must be between 0.0 and 4.0' }
    ),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
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

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      currentSemester: '',
      cgpa: '',
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result as string);
      toast.success('Photo uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, {
        name: data.fullName,
        university: data.universityName,
        degree: data.degreeProgram,
        semester: parseInt(data.currentSemester),
        cgpa: parseFloat(data.cgpa),
        profilePhoto: profilePhoto || '',
        onboardingComplete: true,
      });
      toast.success('Account created successfully!');
      router.push('/onboarding');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ backgroundColor: '#7C3AED' }}
      />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-15 blur-[120px] pointer-events-none"
        style={{ backgroundColor: '#06B6D4' }}
      />

      <motion.div
        className="w-full max-w-lg relative z-10"
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
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Join StudySync
            </h1>
            <p className="text-gray-400 text-sm">
              Create your account and start your academic journey
            </p>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Profile Photo Upload */}
            <motion.div variants={itemVariants} className="flex justify-center mb-2">
              <label className="cursor-pointer group relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div
                  className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-solid"
                  style={{
                    borderColor: profilePhoto ? '#7C3AED' : '#374151',
                    background: profilePhoto ? 'transparent' : 'rgba(124, 58, 237, 0.05)',
                  }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-500 group-hover:text-violet-400 transition-colors" />
                  )}
                </div>
                <span className="block text-xs text-gray-500 text-center mt-1">
                  {profilePhoto ? 'Change photo' : 'Upload photo'}
                </span>
              </label>
            </motion.div>

            {/* Full Name */}
            <motion.div variants={itemVariants}>
              <GlassInput
                icon={<User className="w-4 h-4" />}
                placeholder="Full Name"
                {...register('fullName')}
                error={errors.fullName?.message}
              />
            </motion.div>

            {/* University Name */}
            <motion.div variants={itemVariants}>
              <GlassInput
                icon={<BookOpen className="w-4 h-4" />}
                placeholder="University Name"
                {...register('universityName')}
                error={errors.universityName?.message}
              />
            </motion.div>

            {/* Email */}
            <motion.div variants={itemVariants}>
              <GlassInput
                icon={<Mail className="w-4 h-4" />}
                type="email"
                placeholder="University Email (.edu)"
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

            {/* Degree Program */}
            <motion.div variants={itemVariants}>
              <GlassInput
                icon={<GraduationCap className="w-4 h-4" />}
                placeholder="Degree Program (e.g., BS Computer Science)"
                {...register('degreeProgram')}
                error={errors.degreeProgram?.message}
              />
            </motion.div>

            {/* Semester + CGPA row */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
              <div>
                <select
                  {...register('currentSemester')}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 focus:ring-2 appearance-none cursor-pointer"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  defaultValue=""
                >
                  <option value="" disabled className="bg-gray-900">
                    Semester
                  </option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={String(sem)} className="bg-gray-900">
                      Semester {sem}
                    </option>
                  ))}
                </select>
                {errors.currentSemester && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.currentSemester.message}
                  </p>
                )}
              </div>
              <div>
                <GlassInput
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.0"
                  placeholder="CGPA (0.0 - 4.0)"
                  {...register('cgpa')}
                  error={errors.cgpa?.message}
                />
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div variants={itemVariants} className="pt-2">
              <GlassButton
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </GlassButton>
            </motion.div>
          </form>

          {/* Footer link */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-gray-400 mt-6"
          >
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium transition-colors hover:underline"
              style={{ color: '#7C3AED' }}
            >
              Sign in
            </Link>
          </motion.p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
