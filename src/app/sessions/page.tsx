'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassModal } from '@/components/ui/GlassModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from '@/lib/types';
import { format, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Star,
  X,
  List,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogIn,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// ─── Tabs ───────────────────────────────────────────────────────────────────────

type TabKey = 'upcoming' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: Clock },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

// ─── Confetti Burst ─────────────────────────────────────────────────────────────

function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null;
  const colors = ['#7C3AED', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#EC4899'];
  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const size = 6 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rotation = Math.random() * 360;
        return (
          <motion.div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${left}%`,
              top: '-10px',
              width: size,
              height: size * 0.6,
              backgroundColor: color,
              rotate: rotation,
            }}
            initial={{ y: -20, opacity: 1 }}
            animate={{
              y: window?.innerHeight ? window.innerHeight + 50 : 900,
              opacity: 0,
              rotate: rotation + 720,
              x: (Math.random() - 0.5) * 200,
            }}
            transition={{
              duration: 2 + Math.random() * 1.5,
              delay,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────────────

function getPartnerName(session: Session, currentUid: string) {
  return session.tutorId === currentUid
    ? session.learnerName || 'Learner'
    : session.tutorName || 'Tutor';
}

function getPartnerInitial(session: Session, currentUid: string) {
  return getPartnerName(session, currentUid).charAt(0).toUpperCase();
}

function needsConfirmation(session: Session, currentUid: string) {
  if (session.status !== 'completed') return false;
  const isTutor = session.tutorId === currentUid;
  return isTutor ? !session.tutorConfirmed : !session.learnerConfirmed;
}

function bothConfirmed(session: Session) {
  return session.tutorConfirmed && session.learnerConfirmed;
}

// ─── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Session['status'] }) {
  const map = {
    upcoming: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Upcoming' },
    completed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Completed' },
    cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelled' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {status === 'upcoming' && <AlertCircle size={12} />}
      {status === 'completed' && <CheckCircle2 size={12} />}
      {status === 'cancelled' && <XCircle size={12} />}
      {s.label}
    </span>
  );
}

// ─── Mode Badge ─────────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: Session['mode'] }) {
  if (mode === 'online' || mode === 'both') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
        <Video size={12} /> Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
      <MapPin size={12} /> In-person
    </span>
  );
}

// ─── Stagger Variants ───────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// ─── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const map = {
    upcoming: {
      icon: <Calendar size={48} className="text-violet-400" />,
      title: 'No upcoming sessions',
      desc: 'Browse tutors and book your next study session!',
    },
    completed: {
      icon: <CheckCircle2 size={48} className="text-emerald-400" />,
      title: 'No completed sessions yet',
      desc: 'Your completed sessions will appear here.',
    },
    cancelled: {
      icon: <XCircle size={48} className="text-red-400" />,
      title: 'No cancelled sessions',
      desc: 'Great — none of your sessions have been cancelled!',
    },
  };
  const s = map[tab];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="p-4 rounded-full bg-white/5 mb-4">{s.icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{s.title}</h3>
      <p className="text-sm text-white/50">{s.desc}</p>
    </motion.div>
  );
}

// ─── Session Card ───────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: Session;
  currentUid: string;
  onCancel: (session: Session) => void;
  onReview: (session: Session) => void;
  onConfirm: (session: Session) => void;
}

function SessionCard({ session, currentUid, onCancel, onReview, onConfirm }: SessionCardProps) {
  const dt = parseISO(session.dateTime);
  const dateStr = isToday(dt)
    ? 'Today'
    : format(dt, 'EEE, MMM d, yyyy');
  const timeStr = format(dt, 'h:mm a');
  const partner = getPartnerName(session, currentUid);
  const initial = getPartnerInitial(session, currentUid);

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
            {initial}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white truncate">{partner}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {session.subject}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <Calendar size={14} className="text-violet-400" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} className="text-cyan-400" />
              {timeStr}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} className="text-white/40" />
              {session.duration} min
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={session.mode} />
            <StatusBadge status={session.status} />
            {session.price > 0 && (
              <span className="text-xs text-white/50">Rs. {session.price}</span>
            )}
            {session.price === 0 && (
              <span className="text-xs text-emerald-400/80">Mutual (Free)</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {session.status === 'upcoming' && (
            <>
              <Link href={`/room/${session.id}`}>
                <GlassButton variant="primary" size="sm" className="gap-1.5">
                  <LogIn size={14} /> Join Room
                </GlassButton>
              </Link>
              <GlassButton
                variant="danger"
                size="sm"
                className="gap-1.5"
                onClick={() => onCancel(session)}
              >
                <X size={14} /> Cancel
              </GlassButton>
            </>
          )}

          {session.status === 'completed' && needsConfirmation(session, currentUid) && (
            <GlassButton
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => onConfirm(session)}
            >
              <CheckCircle2 size={14} /> Confirm Complete
            </GlassButton>
          )}

          {session.status === 'completed' && bothConfirmed(session) && (
            <GlassButton
              variant="primary"
              size="sm"
              className="gap-1.5"
              onClick={() => onReview(session)}
            >
              <Star size={14} /> Leave Review
            </GlassButton>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Calendar Grid View ─────────────────────────────────────────────────────────

function CalendarGridView({ sessions }: { sessions: Session[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [
    ...Array.from({ length: firstDay }, (): null => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const sessionsByDay = useMemo(() => {
    const map: Record<number, Session[]> = {};
    sessions.forEach((s) => {
      const d = parseISO(s.dateTime);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(s);
      }
    });
    return map;
  }, [sessions, year, month]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <GlassButton variant="ghost" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>
          <ChevronLeft size={18} />
        </GlassButton>
        <h3 className="text-white font-semibold">{format(viewDate, 'MMMM yyyy')}</h3>
        <GlassButton variant="ghost" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>
          <ChevronRight size={18} />
        </GlassButton>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs text-white/40 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isCurrentDay =
            day !== null &&
            isToday(new Date(year, month, day));
          const daySessions = day ? sessionsByDay[day] || [] : [];

          return (
            <motion.div
              key={i}
              className={`
                relative min-h-[72px] rounded-xl p-1.5 text-center text-xs
                ${day ? 'bg-white/[0.03] border border-white/[0.06]' : ''}
                ${isCurrentDay ? 'ring-1 ring-violet-500/50 bg-violet-500/10' : ''}
              `}
              whileHover={day ? { backgroundColor: 'rgba(255,255,255,0.06)' } : undefined}
            >
              {day && (
                <>
                  <span className={`font-medium ${isCurrentDay ? 'text-violet-400' : 'text-white/60'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {daySessions.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className={`
                          truncate rounded px-1 py-0.5 text-[10px] font-medium
                          ${s.status === 'upcoming' ? 'bg-violet-500/20 text-violet-300' : ''}
                          ${s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : ''}
                          ${s.status === 'cancelled' ? 'bg-red-500/20 text-red-300' : ''}
                        `}
                      >
                        {s.subject}
                      </div>
                    ))}
                    {daySessions.length > 2 && (
                      <div className="text-[10px] text-white/40">+{daySessions.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Star Rating ────────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <Star
            size={28}
            className={`transition-colors ${
              star <= (hover || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-white/20'
            }`}
          />
        </motion.button>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════════

export default function SessionsPage() {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || '';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(true);

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<Session | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<Session | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // ── Fetch sessions from Firestore ───────────────────────────────────────────

  useEffect(() => {
    if (!currentUid) return;
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const sessionsRef = collection(db, 'sessions');
        const tutorQ = query(sessionsRef, where('tutorId', '==', currentUid));
        const learnerQ = query(sessionsRef, where('learnerId', '==', currentUid));
        const [tutorSnap, learnerSnap] = await Promise.all([
          getDocs(tutorQ),
          getDocs(learnerQ),
        ]);
        const all: Session[] = [];
        const seen = new Set<string>();
        for (const snap of [tutorSnap, learnerSnap]) {
          snap.forEach((d) => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              all.push({ id: d.id, ...d.data() } as Session);
            }
          });
        }
        all.sort(
          (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
        );
        setSessions(all);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [currentUid]);

  // Filtered sessions
  const filtered = useMemo(
    () => sessions.filter((s) => s.status === activeTab),
    [sessions, activeTab]
  );

  // ── Cancel Handler ──────────────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!cancelModal) return;
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation.');
      return;
    }
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'sessions', cancelModal.id), {
        status: 'cancelled',
      });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === cancelModal.id ? { ...s, status: 'cancelled' as const } : s
        )
      );
      toast.success('Session cancelled.');
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error('Failed to cancel session.');
    } finally {
      setCancelling(false);
      setCancelModal(null);
      setCancelReason('');
    }
  };

  // ── Confirm Handler (with streak transaction) ──────────────────────────────

  const handleConfirm = async (session: Session) => {
    if (!currentUid) return;
    const isTutor = session.tutorId === currentUid;
    const confirmField = isTutor ? 'tutorConfirmed' : 'learnerConfirmed';

    try {
      // Update session confirmation
      const sessionRef = doc(db, 'sessions', session.id);
      await updateDoc(sessionRef, { [confirmField]: true });

      // Update local state
      const updatedSession = isTutor
        ? { ...session, tutorConfirmed: true }
        : { ...session, learnerConfirmed: true };

      setSessions((prev) =>
        prev.map((s) => (s.id !== session.id ? s : updatedSession))
      );

      // Check if both have now confirmed
      const otherConfirmed = isTutor
        ? session.learnerConfirmed
        : session.tutorConfirmed;

      if (otherConfirmed) {
        // Both confirmed => complete session & update streaks
        await updateDoc(sessionRef, { status: 'completed' });

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        for (const uid of [session.tutorId, session.learnerId]) {
          await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', uid);
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) return;

            const userData = userSnap.data();
            const lastDate = userData.lastSessionDate || '';
            const currentStreak = userData.streak || 0;

            let newStreak = 1;
            if (lastDate) {
              const lastSessionDate = new Date(lastDate);
              const daysDiff = Math.floor(
                (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysDiff <= 7) {
                newStreak = currentStreak + 1;
              }
            }

            transaction.update(userRef, {
              totalSessions: (userData.totalSessions || 0) + 1,
              streak: newStreak,
              lastSessionDate: today,
            });
          });
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === session.id ? { ...s, status: 'completed' as const, tutorConfirmed: true, learnerConfirmed: true } : s
          )
        );
      }

      toast.success('Session confirmed!');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error('Error confirming session:', error);
      toast.error('Failed to confirm session.');
    }
  };

  // ── Review Handler (write review + recalculate rating) ─────────────────────

  const handleSubmitReview = async () => {
    if (!reviewModal || !currentUid) return;
    if (reviewRating === 0) {
      toast.error('Please select a rating.');
      return;
    }
    setSubmittingReview(true);
    try {
      const revieweeId =
        reviewModal.tutorId === currentUid
          ? reviewModal.learnerId
          : reviewModal.tutorId;

      // Write review document
      await addDoc(collection(db, 'reviews'), {
        sessionId: reviewModal.id,
        reviewerId: currentUid,
        revieweeId,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString(),
        reviewerName: profile?.name || 'Anonymous',
        reviewerPhoto: profile?.profilePhoto || '',
      });

      // Recalculate average rating
      const reviewsSnapshot = await getDocs(
        query(collection(db, 'reviews'), where('revieweeId', '==', revieweeId))
      );
      let totalRating = 0;
      let count = 0;
      reviewsSnapshot.forEach((d) => {
        totalRating += d.data().rating;
        count++;
      });
      const averageRating =
        count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;

      await updateDoc(doc(db, 'users', revieweeId), {
        rating: averageRating,
        totalRatings: count,
      });

      toast.success('Review submitted — thanks!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
      setReviewModal(null);
      setReviewRating(0);
      setReviewComment('');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <ConfettiBurst show={showConfetti} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            My Sessions
          </h1>
          <p className="text-white/50 mt-1">Manage your study sessions and track progress.</p>
        </motion.div>

        {/* Tabs + View Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          {/* Tabs */}
          <div className="relative flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                  activeTab === tab.key ? 'text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute inset-0 rounded-xl bg-white/10 border border-white/[0.12]"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'calendar' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Grid3X3 size={18} />
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" count={3} />
          </div>
        ) : viewMode === 'calendar' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <GlassCard hover={false} className="p-6">
              <CalendarGridView sessions={sessions} />
            </GlassCard>
          </motion.div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((session) => (
                <motion.div
                  key={session.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                >
                  <SessionCard
                    session={session}
                    currentUid={currentUid}
                    onCancel={(s) => setCancelModal(s)}
                    onReview={(s) => {
                      setReviewModal(s);
                      setReviewRating(0);
                      setReviewComment('');
                    }}
                    onConfirm={handleConfirm}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Cancel Modal ───────────────────────────────────────────────────────── */}
      <GlassModal
        isOpen={!!cancelModal}
        onClose={() => {
          setCancelModal(null);
          setCancelReason('');
        }}
        title="Cancel Session"
      >
        {cancelModal && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm">
              Are you sure you want to cancel your <strong className="text-white">{cancelModal.subject}</strong>{' '}
              session with <strong className="text-white">{getPartnerName(cancelModal, currentUid)}</strong>?
            </p>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Reason for cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please share why you're cancelling..."
                rows={3}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCancelModal(null);
                  setCancelReason('');
                }}
              >
                Go Back
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                loading={cancelling}
                onClick={handleCancel}
              >
                Confirm Cancellation
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>

      {/* ── Review Modal ───────────────────────────────────────────────────────── */}
      <GlassModal
        isOpen={!!reviewModal}
        onClose={() => {
          setReviewModal(null);
          setReviewRating(0);
          setReviewComment('');
        }}
        title="Leave a Review"
      >
        {reviewModal && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {getPartnerInitial(reviewModal, currentUid)}
              </div>
              <div>
                <p className="text-white font-medium">{getPartnerName(reviewModal, currentUid)}</p>
                <p className="text-white/50 text-sm">{reviewModal.subject}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Rating</label>
              <StarRating value={reviewRating} onChange={setReviewRating} />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Comment (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How was your session?"
                rows={3}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReviewModal(null);
                  setReviewRating(0);
                  setReviewComment('');
                }}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                size="sm"
                loading={submittingReview}
                onClick={handleSubmitReview}
                className="gap-1.5"
              >
                <Sparkles size={14} /> Submit Review
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
