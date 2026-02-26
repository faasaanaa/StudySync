'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  UserProfile,
  SubjectGrade,
  Availability,
  StudyMode,
} from '@/lib/types';
import {
  Settings,
  User,
  BookOpen,
  GraduationCap,
  Calendar,
  Sliders,
  Shield,
  Bell,
  Trash2,
  Camera,
  Save,
  Search,
  X,
  Monitor,
  MapPin,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Biology',
  'English', 'Economics', 'Business', 'Psychology', 'History',
  'Engineering', 'Statistics', 'Accounting', 'Marketing', 'Philosophy',
];

const GRADES: SubjectGrade['grade'][] = ['A+', 'A', 'B+', 'B', 'C+', 'C'];

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 21; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
}

const formatTime = (t: string) => {
  const hour = parseInt(t);
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: 'spring', stiffness: 300, damping: 30 },
  }),
};

const chipVariant = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading, updateProfile, signOut } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white relative overflow-hidden">
      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] bg-[#7C3AED]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#06B6D4]/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-[#7C3AED]" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
          <p className="text-[#94A3B8] mt-1">Manage your profile and preferences</p>
        </motion.div>

        <div className="space-y-8">
          {/* 1. Profile Information */}
          <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
            <ProfileSection profile={profile} updateProfile={updateProfile} />
          </motion.div>

          {/* 2. Subjects & Skills */}
          <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
            <SubjectsSection profile={profile} updateProfile={updateProfile} />
          </motion.div>

          {/* 3. Availability */}
          <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
            <AvailabilitySection profile={profile} updateProfile={updateProfile} />
          </motion.div>

          {/* 4. Preferences */}
          <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
            <PreferencesSection profile={profile} updateProfile={updateProfile} />
          </motion.div>

          {/* 5. Security */}
          <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
            <SecuritySection />
          </motion.div>

          {/* 6. Notifications */}
          <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
            <NotificationsSection profile={profile} updateProfile={updateProfile} />
          </motion.div>

          {/* 7. Account */}
          <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible">
            <AccountSection signOut={signOut} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Profile Information
// ═══════════════════════════════════════════════════════════════════════════════

function ProfileSection({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: profile.name,
      university: profile.university,
      degree: profile.degree,
      semester: profile.semester,
      bio: profile.bio,
    },
  });

  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(profile.profilePhoto || '');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await updateProfile({
        name: data.name,
        university: data.university,
        degree: data.degree,
        semester: Number(data.semester),
        bio: data.bio,
      });
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-[#7C3AED]" />
        <h2 className="text-lg font-semibold">Profile Information</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Photo Upload */}
        <div className="flex justify-center mb-2">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-2 border-[rgba(255,255,255,0.15)] overflow-hidden bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
                  {profile.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
            <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <GlassInput
          label="Full Name"
          placeholder="Your full name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
        />

        <GlassInput
          label="University"
          placeholder="Your university"
          {...register('university')}
        />

        <GlassInput
          label="Degree"
          placeholder="e.g. BS Computer Science"
          {...register('degree')}
        />

        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">Semester</label>
          <select
            {...register('semester')}
            className="w-full px-4 py-3 rounded-[14px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white backdrop-blur-[12px] focus:border-[rgba(124,58,237,0.6)] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] focus:outline-none appearance-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s} className="bg-[#1a1a2e] text-white">
                Semester {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">Bio</label>
          <textarea
            {...register('bio')}
            placeholder="Tell others about yourself..."
            rows={4}
            maxLength={300}
            className="w-full px-4 py-3 rounded-[14px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#64748B] backdrop-blur-[12px] transition-all duration-300 focus:border-[rgba(124,58,237,0.6)] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] focus:outline-none resize-none"
          />
        </div>

        <div className="flex justify-end">
          <GlassButton variant="primary" size="md" type="submit" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Subjects & Skills
// ═══════════════════════════════════════════════════════════════════════════════

function SubjectsSection({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}) {
  const [subjectSearch, setSubjectSearch] = useState('');
  const [goodAt, setGoodAt] = useState<SubjectGrade[]>(profile.subjects_teaching || []);
  const [needHelp, setNeedHelp] = useState<string[]>(profile.subjects_learning || []);
  const [saving, setSaving] = useState(false);

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.toLowerCase();
    return SUBJECTS.filter((s) => s.toLowerCase().includes(q));
  }, [subjectSearch]);

  const addGoodAt = (subject: string) => {
    if (!goodAt.find((s) => s.subject === subject)) {
      setGoodAt((prev) => [...prev, { subject, grade: 'A' }]);
    }
  };
  const removeGoodAt = (subject: string) => setGoodAt((prev) => prev.filter((s) => s.subject !== subject));
  const updateGrade = (subject: string, grade: SubjectGrade['grade']) => {
    setGoodAt((prev) => prev.map((s) => (s.subject === subject ? { ...s, grade } : s)));
  };
  const addNeedHelp = (subject: string) => {
    if (!needHelp.includes(subject)) setNeedHelp((prev) => [...prev, subject]);
  };
  const removeNeedHelp = (subject: string) => setNeedHelp((prev) => prev.filter((s) => s !== subject));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ subjects_teaching: goodAt, subjects_learning: needHelp });
      toast.success('Subjects updated!');
    } catch {
      toast.error('Failed to update subjects.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-[#06B6D4]" />
        <h2 className="text-lg font-semibold">Subjects & Skills</h2>
      </div>

      <div className="space-y-5">
        {/* Search */}
        <GlassInput
          placeholder="Search subjects..."
          icon={<Search className="w-4 h-4" />}
          value={subjectSearch}
          onChange={(e) => setSubjectSearch(e.target.value)}
        />

        {/* Subject grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredSubjects.map((subject) => {
            const inGood = goodAt.some((s) => s.subject === subject);
            const inNeed = needHelp.includes(subject);
            return (
              <div key={subject} className="flex gap-1">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => !inGood && addGoodAt(subject)}
                  className={`flex-1 text-xs sm:text-sm px-2 py-2 rounded-xl border transition-all ${
                    inGood
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED]/50 text-[#7C3AED]'
                      : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:border-[#7C3AED]/30'
                  }`}
                  title="Add to Teaching"
                >
                  <GraduationCap className="w-3 h-3 inline mr-1" />
                  {subject}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => !inNeed && addNeedHelp(subject)}
                  className={`px-2 py-2 rounded-xl border text-xs transition-all ${
                    inNeed
                      ? 'bg-[#06B6D4]/20 border-[#06B6D4]/50 text-[#06B6D4]'
                      : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:border-[#06B6D4]/30'
                  }`}
                  title="Add to Learning"
                >
                  <BookOpen className="w-3 h-3" />
                </motion.button>
              </div>
            );
          })}
        </div>

        {/* Teaching chips */}
        <div>
          <h3 className="text-sm font-medium text-[#7C3AED] mb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Teaching Subjects
          </h3>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            <AnimatePresence>
              {goodAt.map((sg) => (
                <motion.div
                  key={sg.subject}
                  variants={chipVariant}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-sm"
                >
                  <span className="text-white">{sg.subject}</span>
                  <select
                    value={sg.grade}
                    onChange={(e) => updateGrade(sg.subject, e.target.value as SubjectGrade['grade'])}
                    className="bg-[#7C3AED]/30 text-[#7C3AED] border-none rounded-md text-xs px-1 py-0.5 focus:outline-none cursor-pointer"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g} className="bg-[#1a1a2e] text-white">{g}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeGoodAt(sg.subject)}
                    className="text-[#94A3B8] hover:text-red-400 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {goodAt.length === 0 && (
              <p className="text-xs text-[#64748B] italic">No teaching subjects selected</p>
            )}
          </div>
        </div>

        {/* Learning chips */}
        <div>
          <h3 className="text-sm font-medium text-[#06B6D4] mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Learning Subjects
          </h3>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            <AnimatePresence>
              {needHelp.map((subj) => (
                <motion.div
                  key={subj}
                  variants={chipVariant}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#06B6D4]/15 border border-[#06B6D4]/30 text-sm"
                >
                  <span className="text-white">{subj}</span>
                  <button
                    onClick={() => removeNeedHelp(subj)}
                    className="text-[#94A3B8] hover:text-red-400 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {needHelp.length === 0 && (
              <p className="text-xs text-[#64748B] italic">No learning subjects selected</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <GlassButton variant="primary" size="md" onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Subjects
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Availability
// ═══════════════════════════════════════════════════════════════════════════════

function AvailabilitySection({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}) {
  const [availability, setAvailability] = useState<Availability>(
    profile.availability || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
  );
  const [saving, setSaving] = useState(false);

  const isSlotSelected = (day: typeof DAYS[number], time: string) => {
    return availability[day].some((s) => s.start === time);
  };

  const toggleSlot = (day: typeof DAYS[number], time: string) => {
    setAvailability((prev) => {
      const daySlots = prev[day];
      const endHour = parseInt(time) + 1;
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      const exists = daySlots.some((s) => s.start === time);
      return {
        ...prev,
        [day]: exists
          ? daySlots.filter((s) => s.start !== time)
          : [...daySlots, { start: time, end: endTime }].sort(
              (a, b) => parseInt(a.start) - parseInt(b.start)
            ),
      };
    });
  };

  const totalSlots = useMemo(() => {
    return DAYS.reduce((sum, day) => sum + availability[day].length, 0);
  }, [availability]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ availability });
      toast.success('Availability updated!');
    } catch {
      toast.error('Failed to update availability.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#7C3AED]" />
          <h2 className="text-lg font-semibold">Availability</h2>
        </div>
        <span className="text-sm text-[#7C3AED] font-medium">{totalSlots} slots selected</span>
      </div>

      <div className="overflow-x-auto mb-5">
        <div className="min-w-[640px]">
          {/* Header row */}
          <div className="grid grid-cols-[60px_repeat(14,1fr)] gap-1 mb-2">
            <div />
            {TIME_SLOTS.map((time) => (
              <div key={time} className="text-center text-[10px] sm:text-xs text-[#64748B] font-medium">
                {formatTime(time)}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map((day) => (
            <div key={day} className="grid grid-cols-[60px_repeat(14,1fr)] gap-1 mb-1">
              <div className="flex items-center text-sm font-medium text-[#94A3B8]">
                {DAY_LABELS[day]}
              </div>
              {TIME_SLOTS.map((time) => {
                const selected = isSlotSelected(day, time);
                return (
                  <motion.button
                    key={`${day}-${time}`}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleSlot(day, time)}
                    className={`h-8 sm:h-9 rounded-lg border transition-all duration-200 ${
                      selected
                        ? 'bg-[#7C3AED]/40 border-[#7C3AED]/60 shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                        : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)]'
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <GlassButton variant="primary" size="md" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save Availability
        </GlassButton>
      </div>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Preferences
// ═══════════════════════════════════════════════════════════════════════════════

function PreferencesSection({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}) {
  const [studyMode, setStudyMode] = useState<StudyMode>(profile.preferredMode || 'online');
  const [isMutual, setIsMutual] = useState(profile.isMutual ?? true);
  const [hourlyRate, setHourlyRate] = useState(profile.hourlyRate || 0);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [saving, setSaving] = useState(false);

  const modeOptions: { value: StudyMode; label: string; icon: typeof Monitor }[] = [
    { value: 'online', label: 'Online', icon: Monitor },
    { value: 'in-person', label: 'In-Person', icon: MapPin },
    { value: 'both', label: 'Both', icon: Users },
  ];

  const durations = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hr' },
    { value: 90, label: '1.5 hr' },
    { value: 120, label: '2 hr' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        preferredMode: studyMode,
        isMutual,
        hourlyRate: isMutual ? 0 : hourlyRate,
      });
      toast.success('Preferences updated!');
    } catch {
      toast.error('Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-6">
        <Sliders className="w-5 h-5 text-[#06B6D4]" />
        <h2 className="text-lg font-semibold">Preferences</h2>
      </div>

      <div className="space-y-6">
        {/* Study Mode */}
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-3">Study Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {modeOptions.map((opt) => {
              const isSelected = studyMode === opt.value;
              const Icon = opt.icon;
              return (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStudyMode(opt.value)}
                  className={`py-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED]/50 text-white'
                      : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#7C3AED]' : ''}`} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Pricing */}
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-3">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Pricing
          </label>
          <div className="flex items-center gap-3 mb-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMutual(!isMutual)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                isMutual
                  ? 'bg-[#06B6D4]/20 border-[#06B6D4]/40 text-[#06B6D4]'
                  : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[#94A3B8]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  isMutual ? 'bg-[#06B6D4] border-[#06B6D4]' : 'border-[#64748B]'
                }`}
              >
                {isMutual && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              Mutual Exchange / Free
            </motion.button>
          </div>
          <AnimatePresence>
            {!isMutual && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <GlassInput
                  type="number"
                  placeholder="Hourly rate (PKR)"
                  icon={<DollarSign className="w-4 h-4" />}
                  value={hourlyRate || ''}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  min={0}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Session Duration */}
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-3">
            <Clock className="w-4 h-4 inline mr-1" />
            Preferred Session Duration
          </label>
          <div className="relative">
            <select
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-[14px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white backdrop-blur-[12px] focus:border-[rgba(124,58,237,0.6)] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] focus:outline-none appearance-none cursor-pointer"
            >
              {durations.map((d) => (
                <option key={d.value} value={d.value} className="bg-[#1a1a2e] text-white">
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] rotate-90 pointer-events-none" />
          </div>
        </div>

        <div className="flex justify-end">
          <GlassButton variant="primary" size="md" onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Security
// ═══════════════════════════════════════════════════════════════════════════════

function SecuritySection() {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const newPassword = watch('newPassword');

  const onSubmit = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (data.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      if (!user || !user.email) throw new Error('Not authenticated');

      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);

      toast.success('Password updated successfully!');
      reset();
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect.');
      } else {
        toast.error('Failed to update password.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-[#7C3AED]" />
        <h2 className="text-lg font-semibold">Security</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative">
          <GlassInput
            label="Current Password"
            type={showCurrent ? 'text' : 'password'}
            placeholder="Enter current password"
            {...register('currentPassword', { required: 'Current password is required' })}
            error={errors.currentPassword?.message}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-4 top-[42px] text-[#64748B] hover:text-white transition-colors"
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <GlassInput
            label="New Password"
            type={showNew ? 'text' : 'password'}
            placeholder="Enter new password"
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
            error={errors.newPassword?.message}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-4 top-[42px] text-[#64748B] hover:text-white transition-colors"
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <GlassInput
            label="Confirm New Password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm new password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === newPassword || 'Passwords do not match',
            })}
            error={errors.confirmPassword?.message}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-4 top-[42px] text-[#64748B] hover:text-white transition-colors"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <GlassButton variant="primary" size="md" type="submit" loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Update Password
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Notifications
// ═══════════════════════════════════════════════════════════════════════════════

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
        enabled ? 'bg-[#7C3AED]' : 'bg-[rgba(255,255,255,0.12)]'
      }`}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ left: enabled ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function NotificationsSection({
  profile: _profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}) {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [matchNotifs, setMatchNotifs] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggles = [
    { label: 'Email Notifications', desc: 'Receive updates via email', value: emailNotifs, toggle: () => setEmailNotifs(!emailNotifs) },
    { label: 'New Match Notifications', desc: 'Get notified when you have new matches', value: matchNotifs, toggle: () => setMatchNotifs(!matchNotifs) },
    { label: 'Session Reminders', desc: 'Reminders before upcoming sessions', value: sessionReminders, toggle: () => setSessionReminders(!sessionReminders) },
    { label: 'Message Notifications', desc: 'Notifications for new messages', value: messageNotifs, toggle: () => setMessageNotifs(!messageNotifs) },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        // Store notification preferences in profile (as generic data)
        ...({
          notif_email: emailNotifs,
          notif_matches: matchNotifs,
          notif_sessions: sessionReminders,
          notif_messages: messageNotifs,
        } as any),
      });
      toast.success('Notification preferences saved!');
    } catch {
      toast.error('Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-[#06B6D4]" />
        <h2 className="text-lg font-semibold">Notifications</h2>
      </div>

      <div className="space-y-4">
        {toggles.map((t, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.06)] last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-white">{t.label}</p>
              <p className="text-xs text-[#64748B]">{t.desc}</p>
            </div>
            <ToggleSwitch enabled={t.value} onToggle={t.toggle} />
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-5">
        <GlassButton variant="primary" size="md" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save Notifications
        </GlassButton>
      </div>
    </GlassCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Account (Delete)
// ═══════════════════════════════════════════════════════════════════════════════

function AccountSection({ signOut: _signOut }: { signOut: () => Promise<void> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }

    setDeleting(true);
    try {
      if (!user) throw new Error('Not authenticated');

      // Delete user document
      await deleteDoc(doc(db, 'users', user.uid));

      // Delete auth account
      await user.delete();

      toast.success('Account deleted successfully.');
      router.push('/auth/login');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Please log in again before deleting your account.');
      } else {
        toast.error('Failed to delete account.');
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <GlassCard hover={false}>
        <div className="flex items-center gap-2 mb-6">
          <Trash2 className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold">Account</h2>
        </div>

        <p className="text-sm text-[#94A3B8] mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        <GlassButton
          variant="danger"
          size="md"
          onClick={() => setShowDeleteModal(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </GlassButton>
      </GlassCard>

      {/* Delete Confirmation Modal */}
      <GlassModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setConfirmText('');
        }}
        title="Delete Account"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">
              This will permanently delete your account, profile, and all data. This action cannot be undone.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-2">
              Type <span className="text-red-400 font-bold">DELETE</span> to confirm
            </label>
            <GlassInput
              placeholder="Type DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <GlassButton
              variant="ghost"
              size="md"
              onClick={() => {
                setShowDeleteModal(false);
                setConfirmText('');
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="danger"
              size="md"
              onClick={handleDelete}
              loading={deleting}
              disabled={confirmText !== 'DELETE'}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Forever
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </>
  );
}
