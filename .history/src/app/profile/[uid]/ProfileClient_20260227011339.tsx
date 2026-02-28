'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, collection, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
// ...existing code...
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassModal } from '@/components/ui/GlassModal';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { UserProfile, Review } from '@/lib/types';
import toast from 'react-hot-toast';
import {
  User,
  GraduationCap,
  BookOpen,
  Star,
  Calendar,
  BadgeCheck,
  Flame,
  MessageSquare,
  CalendarCheck,
  ChevronDown,
  Flag,
  Ban,
  Edit3,
  Video,
  Users,
  Monitor,
  DollarSign,
  X,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

const gradeToWidth: Record<string, number> = {
  'A+': 100, A: 95, 'A-': 90,
  'B+': 85, B: 80, 'B-': 75,
  'C+': 70, C: 65, 'C-': 60,
  'D+': 55, D: 50, 'D-': 45,
  F: 20,
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS: Record<string, keyof import('@/lib/types').Availability> = {
  Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
};
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM – 7 PM

/** Check whether any day in the availability object has at least one slot */
function hasAnyAvailability(avail: import('@/lib/types').Availability): boolean {
  return Object.values(avail).some((slots) => slots.length > 0);
}

/** Check whether a specific day+hour is covered by any TimeSlot */
function isSlotFree(avail: import('@/lib/types').Availability, day: string, hour: number): boolean {
  const key = DAY_KEYS[day];
  if (!key) return false;
  const slots = avail[key];
  return slots.some((slot) => {
    const startH = parseInt(slot.start.split(':')[0], 10);
    const endH = parseInt(slot.end.split(':')[0], 10);
    return startH <= hour && endH > hour;
  });
}

const durationOptions = ['30 min', '1 hour', '1.5 hours', '2 hours'];
const modeOptions = [
  { label: 'Online', icon: Video },
  { label: 'In-Person', icon: Users },
  { label: 'Hybrid', icon: Monitor },
];

// ── sample reviews (fallback) ────────────────────────────────────────────────

const sampleReviews: Review[] = [
  {
    id: 'r1',
    reviewerId: 'u1',
    revieweeId: 'profile-user',
    reviewerName: 'Aisha Khan',
    reviewerPhoto: '',
    rating: 5,
    comment: 'Excellent tutor! Made complex topics easy to understand. Very patient and well-prepared.',
    createdAt: new Date('2025-12-15').toISOString(),
    sessionId: 's1',
  },
  {
    id: 'r2',
    reviewerId: 'u2',
    revieweeId: 'profile-user',
    reviewerName: 'Omar Farooq',
    reviewerPhoto: '',
    rating: 4,
    comment: 'Great session – helped me catch up before finals. Would book again.',
    createdAt: new Date('2026-01-08').toISOString(),
    sessionId: 's2',
  },
  {
    id: 'r3',
    reviewerId: 'u3',
    revieweeId: 'profile-user',
    reviewerName: 'Sara Ahmed',
    reviewerPhoto: '',
    rating: 5,
    comment: 'Very knowledgeable, especially in Data Structures. Highly recommend!',
    createdAt: new Date('2026-02-01').toISOString(),
    sessionId: 's3',
  },
];

// ── component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile: userProfile, loading } = useAuth();
  if (loading) return null;
  const uid = params?.uid as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // booking form
  const [bookSubject, setBookSubject] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookDuration, setBookDuration] = useState(durationOptions[1]);
  const [bookMode, setBookMode] = useState('Online');

  const isOwnProfile = user?.uid === uid;

  // ── fetch profile ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
        } else {
          toast.error('User not found');
        }
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  // load reviews (fallback to samples)
  useEffect(() => {
    if (!profile) return;
    // In production, fetch from Firestore sub-collection
    setReviews(sampleReviews);
  }, [profile]);

  // set default booking subject
  useEffect(() => {
    if (profile?.subjects_teaching?.length) {
      setBookSubject(profile.subjects_teaching[0].subject);
    }
  }, [profile]);

  // ── booking confirm ──────────────────────────────────────────────────────

  const handleBookingConfirm = async () => {
    if (!bookSubject || !bookDate || !bookTime) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!user || !profile) {
      toast.error('User not loaded');
      return;
    }
    try {
      // Find or create a conversation between the two users
      let chatId = null;
      const q = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.participants.includes(profile.uid)) {
          chatId = docSnap.id;
        }
      });
      if (!chatId) {
        // Create new conversation
        const convoRef = doc(collection(db, 'conversations'));
        await setDoc(convoRef, {
          participants: [user.uid, profile.uid],
          participantNames: { [user.uid]: userProfile?.name || 'You', [profile.uid]: profile.name },
          participantPhotos: { [user.uid]: '', [profile.uid]: profile.profilePhoto || '' },
          lastMessage: '',
          lastMessageTime: Date.now(),
          unreadCount: { [user.uid]: 0, [profile.uid]: 0 },
        });
        chatId = convoRef.id;
      }

      // Create session proposal
      const proposalRef = doc(collection(db, 'proposals'));
      await setDoc(proposalRef, {
        id: proposalRef.id,
        chatId,
        fromId: user.uid,
        toId: profile.uid,
        subject: bookSubject,
        dateTime: new Date(`${bookDate}T${bookTime}`).toISOString(),
        duration: parseInt(bookDuration) || 60,
        price: priceMap[bookDuration] ?? 450,
        isMutual: false,
        status: 'pending',
      });
      toast.success('Session request sent! Waiting for confirmation.');
      setBookingOpen(false);
    } catch (err) {
      toast.error('Failed to send session request');
    }
  };

  // ── price display ────────────────────────────────────────────────────────

  const priceMap: Record<string, number> = { '30 min': 250, '1 hour': 450, '1.5 hours': 650, '2 hours': 800 };

  // ── render ────────────────────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-4 text-white">
        <User className="w-16 h-16 text-gray-600" />
        <p className="text-xl font-semibold">Profile not found</p>
        <GlassButton onClick={() => router.push('/browse')}>Browse Tutors</GlassButton>
      </div>
    );
  }

  const avgRating =
    reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-24">
      {/* ── Cover gradient ─────────────────────────────────────────────── */}
      <div className="relative h-48 bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#06B6D4]">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* ── Profile header ─────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        {/* avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-24 h-24 rounded-full border-4 border-[#0A0A0F] overflow-hidden bg-gray-800 shadow-lg"
        >
          {profile.profilePhoto ? (
            <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#7C3AED]">
              {profile.name?.charAt(0) ?? 'U'}
            </div>
          )}
          {/* Online indicator */}
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0A0A0F] rounded-full" />
        </motion.div>

        {/* name + badges */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          {profile.isVerified && (
            <span className="flex items-center gap-1 text-[#06B6D4] text-sm">
              <BadgeCheck className="w-4 h-4" /> Verified
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30">
            {profile.role === 'tutor' ? 'Tutor' : profile.role === 'learner' ? 'Learner' : 'Both'}
          </span>
        </motion.div>

        {/* university */}
        {profile.university && (
          <p className="mt-1 text-gray-400 flex items-center gap-1 text-sm">
            <GraduationCap className="w-4 h-4" /> {profile.university}
          </p>
        )}

        {/* ── Info row ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-5 flex flex-wrap gap-4"
        >
          {profile.degree && (
            <GlassCard className="px-4 py-2 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-gray-300">{profile.degree}</span>
            </GlassCard>
          )}
          {profile.semester && (
            <GlassCard className="px-4 py-2 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-gray-300">Semester {profile.semester}</span>
            </GlassCard>
          )}
          {profile.cgpa !== undefined && (
            <GlassCard className="px-4 py-2 flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300">CGPA {profile.cgpa}</span>
            </GlassCard>
          )}
        </motion.div>

        {/* ── Bio ───────────────────────────────────────────────────────── */}
        {profile.bio && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <h2 className="text-lg font-semibold mb-2">About</h2>
            <GlassCard className="p-4">
              <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
            </GlassCard>
          </motion.div>
        )}

        {/* ── Subjects Teaching (proficiency bars) ─────────────────────── */}
        {profile.subjects_teaching && profile.subjects_teaching.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-8"
          >
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#7C3AED]" /> Subjects Teaching
            </h2>
            <GlassCard className="p-5 space-y-4">
              {profile.subjects_teaching.map((s, i) => {
                const width = gradeToWidth[s.grade] ?? 60;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-200">{s.subject}</span>
                      <span className="text-[#06B6D4] font-medium">{s.grade}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
                      />
                    </div>
                  </div>
                );
              })}
            </GlassCard>
          </motion.div>
        )}

        {/* ── Subjects Learning (chips) ────────────────────────────────── */}
        {profile.subjects_learning && profile.subjects_learning.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#06B6D4]" /> Subjects Learning
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.subjects_learning.map((s, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="px-3 py-1.5 rounded-full text-sm bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20"
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Availability calendar ────────────────────────────────────── */}
        {profile.availability && hasAnyAvailability(profile.availability) && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-8"
          >
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#7C3AED]" /> Availability
            </h2>
            <GlassCard className="p-4 overflow-x-auto">
              <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-1 min-w-[500px]">
                {/* header */}
                <div />
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">
                    {d}
                  </div>
                ))}
                {/* rows */}
                {HOURS.map((hour) => (
                  <>
                    <div key={`h-${hour}`} className="text-xs text-gray-500 pr-2 flex items-center">
                      {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                    </div>
                    {DAYS.map((day) => {
                      const slotKey = `${day}-${hour}`;
                      const isFree = profile.availability
                        ? isSlotFree(profile.availability, day, hour)
                        : false;
                      return (
                        <div
                          key={slotKey}
                          className={`h-6 rounded-sm transition-colors ${
                            isFree
                              ? 'bg-[#7C3AED]/40 border border-[#7C3AED]/30'
                              : 'bg-white/[0.02] border border-white/[0.04]'
                          }`}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          {[
            { label: 'Sessions', value: profile.totalSessions ?? 0, icon: CalendarCheck, color: '#7C3AED' },
            { label: 'Rating', value: avgRating, icon: Star, color: '#FBBF24' },
            { label: 'Streak', value: `${profile.streak ?? 0}d`, icon: Flame, color: '#F97316' },
          ].map((s, i) => (
            <GlassCard key={i} className="p-4 text-center">
              <s.icon className="w-6 h-6 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </GlassCard>
          ))}
        </motion.div>

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" /> Reviews ({reviews.length})
          </h2>
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <GlassCard className="p-6 text-center text-gray-500">No reviews yet.</GlassCard>
            ) : (
              reviews.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-sm font-bold text-[#7C3AED]">
                        {r.reviewerName?.charAt(0) ?? 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.reviewerName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`w-3.5 h-3.5 ${
                              j < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{r.comment}</p>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-8 flex flex-wrap items-center gap-3 relative"
        >
          {isOwnProfile ? (
            <GlassButton onClick={() => router.push('/settings')} className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </GlassButton>
          ) : (
            <>
              <GlassButton
                onClick={async () => {
                  if (!user || !profile) return;
                  // Find or create conversation
                  let chatId = null;
                  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
                  const snap = await getDocs(q);
                  snap.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (data.participants.includes(profile.uid)) {
                      chatId = docSnap.id;
                    }
                  });
                  if (!chatId) {
                    const convoRef = doc(collection(db, 'conversations'));
                    await setDoc(convoRef, {
                      participants: [user.uid, profile.uid],
                      participantNames: { [user.uid]: userProfile?.name || 'You', [profile.uid]: profile.name },
                      participantPhotos: { [user.uid]: '', [profile.uid]: profile.profilePhoto || '' },
                      lastMessage: '',
                      lastMessageTime: Date.now(),
                      unreadCount: { [user.uid]: 0, [profile.uid]: 0 },
                    });
                    chatId = convoRef.id;
                  }
                  router.push(`/messages?chat=${chatId}`);
                }}
                className="flex items-center gap-2 bg-[#06B6D4]/20 border-[#06B6D4]/30 hover:bg-[#06B6D4]/30"
              >
                <MessageSquare className="w-4 h-4" /> Send Message
              </GlassButton>
              <GlassButton
                onClick={() => setBookingOpen(true)}
                className="flex items-center gap-2 bg-[#7C3AED]/20 border-[#7C3AED]/30 hover:bg-[#7C3AED]/30"
              >
                <CalendarCheck className="w-4 h-4" /> Book Session
              </GlassButton>

              {/* Report / Block dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 mt-2 w-44 rounded-xl bg-[#12121A] border border-white/10 shadow-xl overflow-hidden z-30"
                    >
                      <button
                        onClick={() => {
                          toast.success('Report submitted');
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <Flag className="w-4 h-4 text-yellow-500" /> Report User
                      </button>
                      <button
                        onClick={() => {
                          toast.success('User blocked');
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <Ban className="w-4 h-4" /> Block User
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Booking Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {bookingOpen && (
          <GlassModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Book a Session</h2>
                <button
                  onClick={() => setBookingOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Subject</label>
                  <select
                    value={bookSubject}
                    onChange={(e) => setBookSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7C3AED]/50"
                  >
                    {profile.subjects_teaching?.map((s, i) => (
                      <option key={i} value={s.subject} className="bg-[#12121A]">
                        {s.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7C3AED]/50"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7C3AED]/50"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Duration</label>
                  <select
                    value={bookDuration}
                    onChange={(e) => setBookDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7C3AED]/50"
                  >
                    {durationOptions.map((d) => (
                      <option key={d} value={d} className="bg-[#12121A]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mode */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Mode</label>
                  <div className="flex gap-2">
                    {modeOptions.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => setBookMode(m.label)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          bookMode === m.label
                            ? 'bg-[#7C3AED]/20 border-[#7C3AED]/40 text-[#7C3AED]'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <m.icon className="w-4 h-4" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <GlassCard className="p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Estimated Price
                  </span>
                  <span className="text-lg font-bold text-[#06B6D4]">
                    Rs. {priceMap[bookDuration] ?? 450}
                  </span>
                </GlassCard>

                {/* Confirm */}
                <GlassButton
                  onClick={handleBookingConfirm}
                  className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold text-sm"
                >
                  Confirm Booking
                </GlassButton>
              </div>
            </motion.div>
          </GlassModal>
        )}
      </AnimatePresence>
    </div>
  );
}
