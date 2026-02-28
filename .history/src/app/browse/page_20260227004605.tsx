'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  Star,
  Heart,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Users,
  X,
  BookOpen,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { CardSkeleton } from '@/components/ui/Skeleton';
import type { UserProfile, UserRole } from '@/lib/types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SUBJECT_FILTERS = ['All', 'Math', 'Physics', 'CS', 'Business', 'Engineering'];

const AVATAR_COLORS = [
  '#7C3AED', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#EC4899',
  '#8B5CF6', '#14B8A6', '#F97316', '#6366F1', '#22D3EE', '#A855F7',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function matchesSubjectFilter(profile: UserProfile, filter: string): boolean {
  if (filter === 'All') return true;
  const allSubjects = [
    ...profile.subjects_teaching.map((s) => s.subject.toLowerCase()),
    ...profile.subjects_learning.map((s) => s.toLowerCase()),
    profile.degree.toLowerCase(),
  ].join(' ');

  const mapping: Record<string, string[]> = {
    Math: ['math', 'calculus', 'algebra', 'statistics', 'probability', 'linear algebra'],
    Physics: ['physics', 'mechanics', 'quantum', 'thermodynamics'],
    CS: ['computer', 'software', 'algorithm', 'data structure', 'machine learning', 'deep learning', 'web', 'database', 'python', 'oop', 'digital logic'],
    Business: ['business', 'finance', 'accounting', 'economics', 'econometrics', 'microeconomics', 'bba'],
    Engineering: ['engineering', 'circuit', 'signal', 'fluid', 'structural', 'mechanical', 'electrical', 'civil'],
  };

  return (mapping[filter] || []).some((kw) => allSubjects.includes(kw));
}

// ─── Grade Badge Colors ─────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  A: 'bg-green-500/20 text-green-400 border-green-500/30',
  'B+': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  B: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'C+': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  C: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// ─── 3D Tilt Hook ───────────────────────────────────────────────────────────────

function useTilt(maxTilt = 5) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setTilt({
        x: (y - 0.5) * -maxTilt * 2,
        y: (x - 0.5) * maxTilt * 2,
      });
    },
    [maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  return { ref, tilt, handleMouseMove, handleMouseLeave };
}

// ─── Profile Card Component ─────────────────────────────────────────────────────

function ProfileCard({
  profile,
  index,
  isLoggedIn,
}: {
  profile: UserProfile;
  index: number;
  isLoggedIn: boolean;
}) {
  const { ref, tilt, handleMouseMove, handleMouseLeave } = useTilt(5);
  const [saved, setSaved] = useState(false);
  const compatibility = isLoggedIn ? Math.floor(Math.random() * 36) + 60 : null;
  const avatarColor = getAvatarColor(profile.name);

  const roleBadge = () => {
    if (profile.role === 'tutor')
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30">
          <GraduationCap className="w-3 h-3" /> Tutor
        </span>
      );
    if (profile.role === 'learner')
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30">
          <BookOpen className="w-3 h-3" /> Learner
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#7C3AED]/20 to-[#06B6D4]/20 text-white border border-[#7C3AED]/20">
        <RefreshCw className="w-3 h-3" /> Both
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <GlassCard hover={false} className="relative overflow-hidden group h-full">
          {/* Compatibility Badge */}
          {compatibility !== null && (
            <div className="absolute top-4 right-4 z-10">
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white shadow-lg">
                {compatibility}% Match
              </span>
            </div>
          )}

          {/* Bookmark / Heart */}
          <motion.button
            className="absolute top-4 left-4 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSaved(!saved);
            }}
            whileTap={{ scale: 0.8 }}
          >
            <motion.div
              animate={saved ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  saved
                    ? 'fill-pink-500 text-pink-500'
                    : 'text-white/40 group-hover:text-white/70'
                }`}
              />
            </motion.div>
          </motion.button>

          <Link href={`/profile/${profile.uid}`} className="block">
            {/* Avatar + Info */}
            <div className="flex items-start gap-4 mb-4 mt-2">
              <div className="relative flex-shrink-0">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitials(profile.name)}
                </div>
                {profile.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0A0A0F] rounded-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold text-base truncate">{profile.name}</h3>
                <p className="text-white/50 text-sm truncate">{profile.university}</p>
                <p className="text-white/40 text-xs truncate">
                  Sem {profile.semester} &middot; {profile.degree}
                </p>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-2 mb-3">{roleBadge()}</div>

            {/* Subjects + Grades */}
            {profile.subjects_teaching.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.subjects_teaching.slice(0, 3).map((sg) => (
                  <span
                    key={sg.subject}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      GRADE_COLORS[sg.grade] || 'bg-white/10 text-white/60 border-white/10'
                    }`}
                  >
                    {sg.subject}
                    <span className="font-bold">{sg.grade}</span>
                  </span>
                ))}
                {profile.subjects_teaching.length > 3 && (
                  <span className="text-white/40 text-[10px] self-center">
                    +{profile.subjects_teaching.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(profile.rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-white/20'
                  }`}
                />
              ))}
              <span className="text-xs text-white/50 ml-1">
                {profile.rating.toFixed(1)} ({profile.totalRatings})
              </span>
            </div>

            {/* CGPA */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-white/60">
                CGPA <span className="font-semibold text-white">{profile.cgpa.toFixed(2)}</span>
              </span>
              {profile.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>

            {/* Rate / Mutual */}
            <div className="mb-4">
              {profile.isMutual ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#7C3AED]/15 to-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/20">
                  <RefreshCw className="w-3 h-3" /> Mutual Exchange
                </span>
              ) : (
                <span className="text-sm font-semibold text-white">
                  Rs. {profile.hourlyRate}
                  <span className="text-white/40 text-xs font-normal">/hr</span>
                </span>
              )}
            </div>

            {/* View Profile Button */}
            <GlassButton variant="primary" size="sm" className="w-full text-sm">
              View Profile
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    </motion.div>
  );
}

// ─── Main Browse Page ───────────────────────────────────────────────────────────

export default function BrowsePage() {
  const { user, profile: _authProfile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubject, setActiveSubject] = useState('All');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [_savedIds, _setSavedIds] = useState<Set<string>>(new Set());

  // Advanced filters
  const [semesterRange, setSemesterRange] = useState<[number, number]>([1, 8]);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [minRating, setMinRating] = useState(0);
  const [cgpaRange, setCgpaRange] = useState<[number, number]>([0, 4]);
  const [availabilityFilter, setAvailabilityFilter] = useState('any');
  const [universityFilter, setUniversityFilter] = useState('');

  // ── Fetch profiles ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('onboardingComplete', '==', true),
          orderBy('rating', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        setProfiles(data);
      } catch {
        // Firestore unavailable
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filtered = profiles.filter((p) => {
    // Show all users, including self

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const haystack = [
        p.name,
        p.university,
        p.degree,
        ...p.subjects_teaching.map((s) => s.subject),
        ...p.subjects_learning,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Subject chip
    if (!matchesSubjectFilter(p, activeSubject)) return false;

    // Advanced
    if (p.semester < semesterRange[0] || p.semester > semesterRange[1]) return false;
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (p.rating < minRating) return false;
    if (p.cgpa < cgpaRange[0] || p.cgpa > cgpaRange[1]) return false;
    if (universityFilter.trim() && !p.university.toLowerCase().includes(universityFilter.toLowerCase())) return false;

    return true;
  });

  // ── Animation variants ────────────────────────────────────────────────────────

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Background Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#7C3AED]/8 blur-[160px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#06B6D4]/8 blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold">
            Browse{' '}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
              Study Partners
            </span>
          </h1>
          <p className="text-white/50 mt-2">Find tutors, learners, and study buddies matched to your needs.</p>
        </motion.div>

        {/* ─── Search Bar ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <GlassInput
            placeholder="Search by name, subject, or university..."
            icon={<Search className="w-5 h-5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>

        {/* ─── Subject Filter Chips ────────────────────────────────────────── */}
        <motion.div
          className="flex flex-wrap gap-2 mb-4"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          {SUBJECT_FILTERS.map((subj, i) => (
            <motion.button
              key={subj}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.12 + i * 0.06 }}
              onClick={() => setActiveSubject(subj)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                activeSubject === subj
                  ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-[0_0_18px_rgba(124,58,237,0.4)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {subj}
            </motion.button>
          ))}

          {/* Advanced Filters Toggle */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.12 + SUBJECT_FILTERS.length * 0.06 }}
            onClick={() => setShowAdvanced((v) => !v)}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </motion.button>
        </motion.div>

        {/* ─── Advanced Filters Panel ──────────────────────────────────────── */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden mb-6"
            >
              <GlassCard hover={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 !p-5">
                {/* Semester Range */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    Semester Range: {semesterRange[0]} – {semesterRange[1]}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={semesterRange[0]}
                      onChange={(e) => setSemesterRange([+e.target.value, semesterRange[1]])}
                      className="w-full accent-[#7C3AED]"
                    />
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={semesterRange[1]}
                      onChange={(e) => setSemesterRange([semesterRange[0], +e.target.value])}
                      className="w-full accent-[#7C3AED]"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Role</label>
                  <div className="flex gap-2">
                    {(['all', 'tutor', 'learner', 'both'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRoleFilter(r)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          roleFilter === r
                            ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min Rating */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Min Rating: {minRating.toFixed(1)}</label>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={minRating}
                    onChange={(e) => setMinRating(+e.target.value)}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* CGPA Range */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    CGPA: {cgpaRange[0].toFixed(1)} – {cgpaRange[1].toFixed(1)}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={0.1}
                      value={cgpaRange[0]}
                      onChange={(e) => setCgpaRange([+e.target.value, cgpaRange[1]])}
                      className="w-full accent-[#06B6D4]"
                    />
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={0.1}
                      value={cgpaRange[1]}
                      onChange={(e) => setCgpaRange([cgpaRange[0], +e.target.value])}
                      className="w-full accent-[#06B6D4]"
                    />
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Availability</label>
                  <div className="flex gap-2">
                    {['any', 'online', 'in-person'].map((a) => (
                      <button
                        key={a}
                        onClick={() => setAvailabilityFilter(a)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          availabilityFilter === a
                            ? 'bg-[#06B6D4] border-[#06B6D4] text-white'
                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        {a === 'any' ? 'Any' : a === 'online' ? 'Online' : 'In-Person'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* University */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">University</label>
                  <GlassInput
                    placeholder="e.g. LUMS, NUST..."
                    value={universityFilter}
                    onChange={(e) => setUniversityFilter(e.target.value)}
                    className="!py-2 text-sm"
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Results Count ───────────────────────────────────────────────── */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-6 text-sm text-white/40"
          >
            <Users className="w-4 h-4" />
            <span>
              {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
            </span>
          </motion.div>
        )}

        {/* ─── Loading State ───────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <CardSkeleton />
              </motion.div>
            ))}
          </div>
        )}

        {/* ─── Empty State ─────────────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white/70 mb-2">No students found</h3>
            <p className="text-white/40 max-w-md">
              Try adjusting your filters or search for a different subject to find study partners.
            </p>
            <GlassButton
              variant="primary"
              size="sm"
              className="mt-6"
              onClick={() => {
                setSearchQuery('');
                setActiveSubject('All');
                setRoleFilter('all');
                setMinRating(0);
                setSemesterRange([1, 8]);
                setCgpaRange([0, 4]);
                setUniversityFilter('');
              }}
            >
              <X className="w-4 h-4" /> Clear All Filters
            </GlassButton>
          </motion.div>
        )}

        {/* ─── Profile Cards Grid ──────────────────────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filtered.map((p, i) => (
              <ProfileCard key={p.uid} profile={p} index={i} isLoggedIn={!!user} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
