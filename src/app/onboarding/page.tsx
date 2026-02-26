'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { useAuth } from '@/contexts/AuthContext';
import type {
  UserRole,
  StudyMode,
  SubjectGrade,
  Availability,
} from '@/lib/types';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  BookOpen,
  Users,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  CheckCircle,
  Clock,
  MapPin,
  Monitor,
  DollarSign,
  FileText,
  Sparkles,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

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

// ─── Animation Variants ─────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

const chipVariant = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Role
  const [role, setRole] = useState<UserRole | ''>('');

  // Step 2: Subjects
  const [subjectSearch, setSubjectSearch] = useState('');
  const [goodAt, setGoodAt] = useState<SubjectGrade[]>([]);
  const [needHelp, setNeedHelp] = useState<string[]>([]);

  // Step 3: Availability
  const [availability, setAvailability] = useState<Availability>({
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
  });

  // Step 4: Preferences
  const [studyMode, setStudyMode] = useState<StudyMode>('online');
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [isMutual, setIsMutual] = useState(true);
  const [bio, setBio] = useState('');

  // Step 5: Verification
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // ─── Step validation ────────────────────────────────────────────────────────

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: return role !== '';
      case 2: return goodAt.length > 0 || needHelp.length > 0;
      case 3: return true;
      case 4: return bio.trim().length > 0;
      case 5: return true; // optional
      case 6: return true;
      default: return false;
    }
  }, [currentStep, role, goodAt, needHelp, bio]);

  // ─── Subject helpers ────────────────────────────────────────────────────────

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.toLowerCase();
    return SUBJECTS.filter((s) => s.toLowerCase().includes(q));
  }, [subjectSearch]);

  const addGoodAt = (subject: string) => {
    if (!goodAt.find((s) => s.subject === subject)) {
      setGoodAt((prev) => [...prev, { subject, grade: 'A' }]);
    }
  };

  const removeGoodAt = (subject: string) => {
    setGoodAt((prev) => prev.filter((s) => s.subject !== subject));
  };

  const updateGrade = (subject: string, grade: SubjectGrade['grade']) => {
    setGoodAt((prev) =>
      prev.map((s) => (s.subject === subject ? { ...s, grade } : s))
    );
  };

  const addNeedHelp = (subject: string) => {
    if (!needHelp.includes(subject)) {
      setNeedHelp((prev) => [...prev, subject]);
    }
  };

  const removeNeedHelp = (subject: string) => {
    setNeedHelp((prev) => prev.filter((s) => s !== subject));
  };

  // ─── Availability helpers ───────────────────────────────────────────────────

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

  // ─── Upload handler ─────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!verificationFile || !user) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(
        storage,
        `verifications/${user.uid}/${verificationFile.name}`
      );

      // Simulate progress since uploadBytes doesn't support progress
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 15, 90));
      }, 200);

      const snap = await uploadBytes(storageRef, verificationFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const url = await getDownloadURL(snap.ref);
      setUploadedUrl(url);
      toast.success('Document uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Final save ─────────────────────────────────────────────────────────────

  const handleComplete = async () => {
    setSaving(true);
    try {
      await updateProfile({
        role: role as UserRole,
        subjects_teaching: goodAt,
        subjects_learning: needHelp,
        availability,
        preferredMode: studyMode,
        hourlyRate: isMutual ? 0 : hourlyRate,
        isMutual,
        bio,
        verificationDoc: uploadedUrl || '',
        onboardingComplete: true,
      });
      toast.success('Profile setup complete! Welcome to StudySync 🎉');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Count selected availability slots ──────────────────────────────────────

  const totalSlots = useMemo(() => {
    return DAYS.reduce((sum, day) => sum + availability[day].length, 0);
  }, [availability]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] bg-[#7C3AED]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#06B6D4]/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
            Set Up Your Profile
          </h1>
          <p className="text-[#94A3B8] mt-2">Step {currentStep} of {TOTAL_STEPS}</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden backdrop-blur-sm border border-[rgba(255,255,255,0.06)]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`text-xs font-medium transition-colors duration-300 ${
                  i + 1 <= currentStep ? 'text-[#7C3AED]' : 'text-[#64748B]'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <StepRoleSelection role={role} setRole={setRole} />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <StepSubjectSelection
                subjectSearch={subjectSearch}
                setSubjectSearch={setSubjectSearch}
                filteredSubjects={filteredSubjects}
                goodAt={goodAt}
                needHelp={needHelp}
                addGoodAt={addGoodAt}
                removeGoodAt={removeGoodAt}
                updateGrade={updateGrade}
                addNeedHelp={addNeedHelp}
                removeNeedHelp={removeNeedHelp}
              />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <StepAvailability
                availability={availability}
                isSlotSelected={isSlotSelected}
                toggleSlot={toggleSlot}
                totalSlots={totalSlots}
              />
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <StepPreferences
                studyMode={studyMode}
                setStudyMode={setStudyMode}
                sessionDuration={sessionDuration}
                setSessionDuration={setSessionDuration}
                hourlyRate={hourlyRate}
                setHourlyRate={setHourlyRate}
                isMutual={isMutual}
                setIsMutual={setIsMutual}
                bio={bio}
                setBio={setBio}
              />
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step5"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <StepVerification
                verificationFile={verificationFile}
                setVerificationFile={setVerificationFile}
                uploadProgress={uploadProgress}
                uploadedUrl={uploadedUrl}
                uploading={uploading}
                handleUpload={handleUpload}
              />
            </motion.div>
          )}

          {currentStep === 6 && (
            <motion.div
              key="step6"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <StepProfilePreview
                profile={profile}
                role={role as UserRole}
                goodAt={goodAt}
                needHelp={needHelp}
                availability={availability}
                studyMode={studyMode}
                hourlyRate={hourlyRate}
                isMutual={isMutual}
                bio={bio}
                totalSlots={totalSlots}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <motion.div
          className="flex justify-between mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <GlassButton
            variant="ghost"
            size="md"
            onClick={goBack}
            disabled={currentStep === 1}
            className={currentStep === 1 ? 'invisible' : ''}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </GlassButton>

          {currentStep < TOTAL_STEPS ? (
            <GlassButton
              variant="primary"
              size="md"
              onClick={goNext}
              disabled={!canProceed}
            >
              {currentStep === 5 ? (
                <>
                  {uploadedUrl ? 'Next' : 'Skip'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </GlassButton>
          ) : (
            <GlassButton
              variant="primary"
              size="lg"
              onClick={handleComplete}
              loading={saving}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Looks Good! Complete Setup
            </GlassButton>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: Role Selection
// ═══════════════════════════════════════════════════════════════════════════════

function StepRoleSelection({
  role,
  setRole,
}: {
  role: UserRole | '';
  setRole: (r: UserRole) => void;
}) {
  const roles: { value: UserRole; label: string; desc: string; icon: typeof GraduationCap }[] = [
    { value: 'tutor', label: 'I want to Teach', desc: 'Share your knowledge and help others excel', icon: GraduationCap },
    { value: 'learner', label: 'I want to Learn', desc: 'Find tutors and study partners for your courses', icon: BookOpen },
    { value: 'both', label: 'Both', desc: 'Teach subjects you ace, learn ones you need help with', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-semibold">What brings you here?</h2>
        <p className="text-[#94A3B8] mt-1">Choose your primary role on StudySync</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {roles.map((r, i) => {
          const isSelected = role === r.value;
          const Icon = r.icon;
          return (
            <motion.div
              key={r.value}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard
                className={`cursor-pointer text-center transition-all duration-300 ${
                  isSelected
                    ? 'border-[#7C3AED] shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                    : ''
                }`}
                glowColor={isSelected ? 'rgba(124,58,237,0.4)' : undefined}
                onClick={() => setRole(r.value)}
              >
                <div className="flex flex-col items-center gap-3 py-4">
                  <div
                    className={`p-4 rounded-2xl transition-colors ${
                      isSelected
                        ? 'bg-[#7C3AED]/30 text-[#7C3AED]'
                        : 'bg-[rgba(255,255,255,0.06)] text-[#94A3B8]'
                    }`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg">{r.label}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{r.desc}</p>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[#7C3AED]"
                    >
                      <CheckCircle className="w-6 h-6" />
                    </motion.div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: Subject Selection
// ═══════════════════════════════════════════════════════════════════════════════

function StepSubjectSelection({
  subjectSearch,
  setSubjectSearch,
  filteredSubjects,
  goodAt,
  needHelp,
  addGoodAt,
  removeGoodAt,
  updateGrade,
  addNeedHelp,
  removeNeedHelp,
}: {
  subjectSearch: string;
  setSubjectSearch: (s: string) => void;
  filteredSubjects: string[];
  goodAt: SubjectGrade[];
  needHelp: string[];
  addGoodAt: (s: string) => void;
  removeGoodAt: (s: string) => void;
  updateGrade: (s: string, g: SubjectGrade['grade']) => void;
  addNeedHelp: (s: string) => void;
  removeNeedHelp: (s: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-semibold">Your Subjects</h2>
        <p className="text-[#94A3B8] mt-1">Add subjects you can teach and ones you need help with</p>
      </div>

      {/* Search */}
      <GlassInput
        placeholder="Search subjects..."
        icon={<Search className="w-4 h-4" />}
        value={subjectSearch}
        onChange={(e) => setSubjectSearch(e.target.value)}
      />

      {/* Subject List */}
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
                title="Add to Good At"
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
                title="Add to Need Help"
              >
                <BookOpen className="w-3 h-3" />
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Good At Chips */}
      <div>
        <h3 className="text-sm font-medium text-[#7C3AED] mb-2 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Subjects I&apos;m Good At
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
                    <option key={g} value={g} className="bg-[#1a1a2e] text-white">
                      {g}
                    </option>
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
            <p className="text-xs text-[#64748B] italic">Click a subject above to add it here</p>
          )}
        </div>
      </div>

      {/* Need Help Chips */}
      <div>
        <h3 className="text-sm font-medium text-[#06B6D4] mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Subjects I Need Help In
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
            <p className="text-xs text-[#64748B] italic">Click the book icon on a subject to add it here</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: Availability Calendar
// ═══════════════════════════════════════════════════════════════════════════════

function StepAvailability({
  availability: _availability,
  isSlotSelected,
  toggleSlot,
  totalSlots,
}: {
  availability: Availability;
  isSlotSelected: (day: typeof DAYS[number], time: string) => boolean;
  toggleSlot: (day: typeof DAYS[number], time: string) => void;
  totalSlots: number;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-semibold">Your Availability</h2>
        <p className="text-[#94A3B8] mt-1">
          Select time slots when you&apos;re free for study sessions
          <span className="ml-2 text-[#7C3AED] font-medium">({totalSlots} slots selected)</span>
        </p>
      </div>

      <GlassCard hover={false} className="p-3 sm:p-4 overflow-x-auto">
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
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: Preferences
// ═══════════════════════════════════════════════════════════════════════════════

function StepPreferences({
  studyMode,
  setStudyMode,
  sessionDuration,
  setSessionDuration,
  hourlyRate,
  setHourlyRate,
  isMutual,
  setIsMutual,
  bio,
  setBio,
}: {
  studyMode: StudyMode;
  setStudyMode: (m: StudyMode) => void;
  sessionDuration: number;
  setSessionDuration: (d: number) => void;
  hourlyRate: number;
  setHourlyRate: (r: number) => void;
  isMutual: boolean;
  setIsMutual: (m: boolean) => void;
  bio: string;
  setBio: (b: string) => void;
}) {
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

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-semibold">Preferences</h2>
        <p className="text-[#94A3B8] mt-1">Customize your study session preferences</p>
      </div>

      {/* Study Mode */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-3">Study Mode</label>
        <div className="grid grid-cols-3 gap-3">
          {modeOptions.map((opt) => {
            const isSelected = studyMode === opt.value;
            const Icon = opt.icon;
            return (
              <GlassCard
                key={opt.value}
                className={`cursor-pointer text-center py-4 ${
                  isSelected ? 'border-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.25)]' : ''
                }`}
                glowColor={isSelected ? 'rgba(124,58,237,0.3)' : undefined}
                onClick={() => setStudyMode(opt.value)}
              >
                <div className="flex flex-col items-center gap-2">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#7C3AED]' : 'text-[#94A3B8]'}`} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-[#94A3B8]'}`}>
                    {opt.label}
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
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

      {/* Rate */}
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
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-[#94A3B8] mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Bio
        </label>
        <div className="relative">
          <textarea
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= 300) setBio(e.target.value);
            }}
            placeholder="Tell others about yourself, your experience, and what you're looking for..."
            rows={4}
            className="w-full px-4 py-3 rounded-[14px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#64748B] backdrop-blur-[12px] transition-all duration-300 focus:border-[rgba(124,58,237,0.6)] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] focus:outline-none resize-none"
          />
          <span
            className={`absolute bottom-3 right-3 text-xs ${
              bio.length >= 280 ? 'text-red-400' : 'text-[#64748B]'
            }`}
          >
            {bio.length}/300
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5: Grade Verification
// ═══════════════════════════════════════════════════════════════════════════════

function StepVerification({
  verificationFile,
  setVerificationFile,
  uploadProgress,
  uploadedUrl,
  uploading,
  handleUpload,
}: {
  verificationFile: File | null;
  setVerificationFile: (f: File | null) => void;
  uploadProgress: number;
  uploadedUrl: string;
  uploading: boolean;
  handleUpload: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-semibold">Grade Verification</h2>
        <p className="text-[#94A3B8] mt-1">Optional — upload your transcript for a Verified badge</p>
      </div>

      <GlassCard hover={false} className="text-center py-10">
        {uploadedUrl ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="p-4 rounded-full bg-green-500/20">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-green-400">Document Uploaded!</p>
              <p className="text-sm text-[#94A3B8] mt-1">
                Your profile will get a Verified badge once approved.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="p-4 rounded-full bg-[rgba(255,255,255,0.06)]"
            >
              <Upload className="w-10 h-10 text-[#94A3B8]" />
            </motion.div>

            <div>
              <p className="text-lg font-medium">Upload Transcript / Grade Screenshot</p>
              <p className="text-sm text-[#64748B] mt-1">PDF, PNG, or JPEG — Max 10MB</p>
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setVerificationFile(file);
                }}
              />
              <GlassButton variant="default" size="md" className="pointer-events-none">
                Choose File
              </GlassButton>
            </label>

            {verificationFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm space-y-3"
              >
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
                  <span className="text-sm text-[#94A3B8] truncate">{verificationFile.name}</span>
                  <button
                    onClick={() => setVerificationFile(null)}
                    className="text-[#64748B] hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {uploading && (
                  <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleUpload}
                  loading={uploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </GlassButton>
              </motion.div>
            )}

            <p className="text-xs text-[#64748B] mt-2 max-w-xs">
              Your profile will get a <span className="text-[#06B6D4] font-medium">Verified</span> badge once your documents are reviewed and approved.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6: Profile Preview
// ═══════════════════════════════════════════════════════════════════════════════

function StepProfilePreview({
  profile,
  role,
  goodAt,
  needHelp,
  availability,
  studyMode,
  hourlyRate,
  isMutual,
  bio,
  totalSlots,
}: {
  profile: any;
  role: UserRole;
  goodAt: SubjectGrade[];
  needHelp: string[];
  availability: Availability;
  studyMode: StudyMode;
  hourlyRate: number;
  isMutual: boolean;
  bio: string;
  totalSlots: number;
}) {
  const roleLabels: Record<UserRole, string> = {
    tutor: 'Tutor',
    learner: 'Learner',
    both: 'Tutor & Learner',
  };

  const modeLabels: Record<StudyMode, string> = {
    online: 'Online',
    'in-person': 'In-Person',
    both: 'Online & In-Person',
  };

  const activeDays = DAYS.filter((d) => availability[d].length > 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-semibold">Profile Preview</h2>
        <p className="text-[#94A3B8] mt-1">Here&apos;s how your profile will look to others</p>
      </div>

      <GlassCard hover={false} className="space-y-5">
        {/* Name & Role */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{profile?.name || 'Your Name'}</h3>
            <p className="text-sm text-[#94A3B8]">{profile?.university || 'University'}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30">
            {roleLabels[role]}
          </span>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-sm text-[#CBD5E1] leading-relaxed">{bio}</p>
        )}

        {/* Subjects Teaching */}
        {goodAt.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#7C3AED] font-semibold mb-2">
              Teaching
            </h4>
            <div className="flex flex-wrap gap-2">
              {goodAt.map((sg) => (
                <span
                  key={sg.subject}
                  className="px-2.5 py-1 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-xs text-white"
                >
                  {sg.subject} <span className="text-[#7C3AED] font-medium">({sg.grade})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Subjects Learning */}
        {needHelp.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#06B6D4] font-semibold mb-2">
              Learning
            </h4>
            <div className="flex flex-wrap gap-2">
              {needHelp.map((subj) => (
                <span
                  key={subj}
                  className="px-2.5 py-1 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/20 text-xs text-white"
                >
                  {subj}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <Clock className="w-4 h-4 text-[#7C3AED]" />
            <span>{totalSlots} slots/week</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <Monitor className="w-4 h-4 text-[#06B6D4]" />
            <span>{modeLabels[studyMode]}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span>{isMutual ? 'Free / Mutual' : `${hourlyRate}/hr`}</span>
          </div>
        </div>

        {/* Availability Summary */}
        {activeDays.length > 0 && (
          <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <h4 className="text-xs uppercase tracking-wider text-[#64748B] font-semibold mb-2">
              Available Days
            </h4>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium border ${
                    availability[day].length > 0
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED]/40 text-[#7C3AED]'
                      : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[#64748B]'
                  }`}
                >
                  {DAY_LABELS[day]}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Final CTA note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <p className="text-sm text-[#94A3B8]">
          Everything look right? Hit <span className="text-[#7C3AED] font-medium">&quot;Complete Setup&quot;</span> to start matching!
        </p>
      </motion.div>
    </div>
  );
}
