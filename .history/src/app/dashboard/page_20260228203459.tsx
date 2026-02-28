'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { findMatches } from '@/lib/matching';
import type { MatchResult, Session, SessionProposal, UserProfile } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';

// ─── Recent Activity Feed Component ─────────────────────────────────────────────
import { GlassButton } from '@/components/ui/GlassButton';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  Flame,
  Star,
  BookOpen,
  Users,
  Calendar,
  CalendarCheck,
  Clock,
  ArrowRight,
  Activity,
  Bookmark,
  Monitor,
  MapPin,
  UserCheck,
  Sparkles,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

// ─── Recent Activity Feed Component ─────────────────────────────────────────────
function RecentActivityFeed({ user }: { user: any }) {
  const [activities, setActivities] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    const activityKey = `studysync_activities_${user.uid}`;
    const stored = localStorage.getItem(activityKey);
    if (stored) setActivities(JSON.parse(stored));
  }, [user]);
  if (!user) return null;
  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="w-10 h-10 text-white/20 mb-2" />
        <p className="text-white/40 text-sm">No recent activity</p>
      </div>
    );
  }
  const iconFor = (type: string) => {
    switch (type) {
      case 'bookmark': return <Bookmark className="w-5 h-5 text-pink-400" />;
      default: return <Activity className="w-5 h-5 text-white/40" />;
    }
  };
  return (
    <div className="flex flex-col">
      {activities.map((a, i) => (
        <div key={i} className="flex items-center gap-4 py-4 px-2">
          {iconFor(a.type)}
          <div className="flex-1 min-w-0">
            <span className="text-white font-medium">{a.user}</span>
            <span className="text-white/60 ml-2">{a.message}</span>
          </div>
          <span className="text-xs text-white/40 whitespace-nowrap">{relativeTime(a.time)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Animation Variants ─────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Animated Counter Hook ───────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) {
      setCount(0);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return count;
}

// ─── Circular Progress Component ─────────────────────────────────────────────────

function CircularProgress({ value, size = 52, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Activity Icon Map ───────────────────────────────────────────────────────────

const MATCH_COLORS = ['#7C3AED', '#06B6D4', '#F59E0B'];

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'session':
      return <BookOpen className="w-4 h-4 text-[#06B6D4]" />;
    case 'match':
      return <UserCheck className="w-4 h-4 text-[#7C3AED]" />;
    case 'rating':
      return <Star className="w-4 h-4 text-yellow-400" />;
    case 'streak':
      return <Flame className="w-4 h-4 text-orange-400" />;
    default:
      return <Activity className="w-4 h-4 text-white/60" />;
  }
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // ─── Proposal Accept/Reject Handlers ──────────────────────────────────────────
  const handleAcceptProposal = async (proposal: SessionProposal) => {
    try {
      // Mark proposal as accepted
      const proposalRef = doc(collection(db, 'proposals'), proposal.id);
      await updateDoc(proposalRef, { status: 'accepted' });

      // Create session
      const sessionRef = doc(collection(db, 'sessions'));
      await setDoc(sessionRef, {
        tutorId: proposal.fromId,
        learnerId: proposal.toId,
        subject: proposal.subject,
        dateTime: proposal.dateTime,
        duration: proposal.duration,
        mode: 'online',
        price: proposal.price,
        status: 'upcoming',
        tutorConfirmed: false,
        learnerConfirmed: false,
        createdAt: new Date().toISOString(),
      });
      // TODO: Prompt for room name and create room if needed
      window.location.reload();
    } catch (err) {
      console.error('Accept proposal error:', err);
      alert('Failed to accept proposal.');
    }
  };

  const handleRejectProposal = async (proposal: SessionProposal) => {
    try {
      // Mark proposal as declined
      const proposalRef = doc(collection(db, 'proposals'), proposal.id);
      await updateDoc(proposalRef, { status: 'declined' });
      // TODO: Send notification to requester
      window.location.reload();
    } catch (err) {
      console.error('Reject proposal error:', err);
      alert('Failed to reject proposal.');
    }
  };
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [topMatches, setTopMatches] = useState<MatchResult[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [pendingProposals, setPendingProposals] = useState<SessionProposal[]>([]);
  const [bookmarkedProfiles, setBookmarkedProfiles] = useState<UserProfile[]>([]);

  // Auth & onboarding redirects
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && profile && !profile.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [loading, user, profile, router]);

  // ── Fetch real matches and sessions from Firestore ─────────────────────────
  useEffect(() => {
    if (!profile || !user) return;
    const loadData = async () => {
      setDataLoading(true);
      try {
        // Fetch top 3 matches
        const matchResults = await findMatches(profile);
        setTopMatches(matchResults.slice(0, 3));

        // Fetch upcoming sessions where user is participant
        const sessionsRef = collection(db, 'sessions');
        const tutorQ = query(
          sessionsRef,
          where('tutorId', '==', user.uid),
          where('status', '==', 'upcoming'),
          orderBy('dateTime', 'asc'),
          limit(5),
        );
        const learnerQ = query(
          sessionsRef,
          where('learnerId', '==', user.uid),
          where('status', '==', 'upcoming'),
          orderBy('dateTime', 'asc'),
          limit(5),
        );
        const [tutorSnap, learnerSnap] = await Promise.all([
          getDocs(tutorQ),
          getDocs(learnerQ),
        ]);
        const allSessions: Session[] = [];
        const seen = new Set<string>();
        for (const snap of [tutorSnap, learnerSnap]) {
          snap.forEach((d) => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              allSessions.push({ id: d.id, ...d.data() } as Session);
            }
          });
        }
        allSessions.sort(
          (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        );
        setUpcomingSessions(allSessions.slice(0, 2));

        // Fetch pending proposals where user is recipient
        const proposalsRef = collection(db, 'proposals');
        const pendingQ = query(
          proposalsRef,
          where('toId', '==', user.uid),
          where('status', '==', 'pending')
        );
        const pendingSnap = await getDocs(pendingQ);
        const proposals: SessionProposal[] = [];
        pendingSnap.forEach((d) => {
          proposals.push({ id: d.id, ...d.data() } as SessionProposal);
        });
        setPendingProposals(proposals);

        // Fetch bookmarked profiles
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const bookmarks: string[] = (userSnap.exists() && Array.isArray(userSnap.data().bookmarked)) ? userSnap.data().bookmarked : [];
        if (bookmarks.length > 0) {
          // Firestore doesn't support 'in' queries with more than 10 items, so batch if needed
          const batches = [];
          for (let i = 0; i < bookmarks.length; i += 10) {
            batches.push(bookmarks.slice(i, i + 10));
          }
          let profiles: UserProfile[] = [];
          for (const batch of batches) {
            const q = query(collection(db, 'users'), where('__name__', 'in', batch));
            const snap = await getDocs(q);
            profiles = profiles.concat(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
          }
          setBookmarkedProfiles(profiles);
        } else {
          setBookmarkedProfiles([]);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [profile, user]);

  // Animated streak counter
  const streakValue = profile?.streak ?? 0;
  const animatedStreak = useAnimatedCounter(streakValue);

  // Profile completion percentage
  const profileCompletion = (() => {
    if (!profile) return 0;
    let filled = 0;
    const total = 8;
    if (profile.name) filled++;
    if (profile.university) filled++;
    if (profile.degree) filled++;
    if (profile.bio) filled++;
    if (profile.profilePhoto) filled++;
    if (profile.subjects_teaching?.length > 0) filled++;
    if (profile.subjects_learning?.length > 0) filled++;
    if (profile.onboardingComplete) filled++;
    return Math.round((filled / total) * 100);
  })();

  // Loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-72 rounded-lg bg-white/5 skeleton-shimmer" />
            <div className="h-5 w-56 rounded-lg bg-white/5 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;
  const firstName = profile?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#0A0A0F] px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto space-y-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
          {/* ── Greeting Section ──────────────────────────────────────────────── */}
          <motion.div variants={item} className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {getGreeting()}, {firstName}! <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
            </h1>
            <p className="text-white/50 text-lg">
              Ready to learn something new today?
            </p>
  
            {profileCompletion < 100 && (
              <motion.div
                variants={item}
                className="mt-4 max-w-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Profile completion</span>
                  <span className="text-sm font-medium text-[#7C3AED]">{profileCompletion}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
  
          {/* ── Quick Stats Row ───────────────────────────────────────────────── */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {/* Streak */}
            <GlassCard
              hover
              glowColor="rgba(249,115,22,0.15)"
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/15 ring-1 ring-orange-500/30">
                <Flame className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Study Streak</p>
                <p className="text-2xl font-bold text-white">
                  <span className="tabular-nums">{animatedStreak}</span>
                  <span className="text-sm font-normal text-white/40 ml-1">days</span>
                </p>
              </div>
              <span className="ml-auto text-2xl">🔥</span>
            </GlassCard>
  
            {/* Rating */}
            <GlassCard
              hover
              glowColor="rgba(234,179,8,0.12)"
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-500/15 ring-1 ring-yellow-500/30">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Rating</p>
                  <p className="text-2xl font-bold text-white">
                    {(profile?.rating || 0).toFixed(1)}
                  <span className="text-sm font-normal text-white/40 ml-1">/ 5.0</span>
                </p>
              </div>
              <span className="ml-auto text-2xl">⭐</span>
            </GlassCard>
  
            {/* Sessions */}
            <GlassCard
              hover
              glowColor="rgba(124,58,237,0.12)"
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#7C3AED]/15 ring-1 ring-[#7C3AED]/30">
                <BookOpen className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-sm text-white/50">Sessions</p>
                  <p className="text-2xl font-bold text-white">
                    {profile?.totalSessions || 0}
                  <span className="text-sm font-normal text-white/40 ml-1">completed</span>
                </p>
              </div>
              <span className="ml-auto text-2xl">📚</span>
            </GlassCard>
          </motion.div>
  
          {/* ── Main Grid: Matches + Sessions ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  
            {/* ── Smart Match Suggestions ──────────────────────────────────────── */}
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#7C3AED]" />
                  Your Top Matches
                </h2>
              </div>
  
              {topMatches.length > 0 ? (
                <div className="space-y-3">
                  {topMatches.map((match, idx) => {
                    const color = MATCH_COLORS[idx % MATCH_COLORS.length];
                    return (
                    <GlassCard
                      key={match.user.uid}
                      hover
                      className="flex items-center gap-4"
                    >
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ring-2 shrink-0"
                        style={{
                          backgroundColor: `${color}25`,
                          color,
                          boxShadow: `0 0 0 2px ${color}40`,
                        }}
                      >
                        {match.user.name?.charAt(0) ?? 'U'}{match.user.name?.split(' ')[1]?.charAt(0) ?? ''}
                      </div>
  
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{match.user.name}</p>
                        <p className="text-white/40 text-sm truncate">{match.user.university}</p>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-xs text-[#7C3AED] border border-[#7C3AED]/20">
                          {match.matchingSubjects[0] || 'Study Partner'}
                        </span>
                      </div>
  
                      {/* Compatibility */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="relative">
                          <CircularProgress value={match.score} />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {match.score}%
                          </span>
                        </div>
                      </div>
  
                      {/* Action */}
                      <GlassButton variant="primary" size="sm" className="shrink-0" onClick={() => router.push(`/profile/${match.user.uid}`)}>
                        View
                      </GlassButton>
                    </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <GlassCard hover={false} className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-white/50 font-medium">No matches yet</p>
                  <p className="text-white/30 text-sm mt-1">
                    Complete your profile to find study partners
                  </p>
                </GlassCard>
              )}
            </motion.div>
  
            {/* ── Upcoming Sessions & Pending Proposals ────────────────────────────── */}
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#06B6D4]" />
                  Upcoming Sessions
                </h2>
                <Link
                  href="/sessions"
                  className="text-sm text-[#06B6D4] hover:text-[#06B6D4]/80 transition-colors flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
  
              {/* Pending Proposals */}
              {pendingProposals.length > 0 && (
                <div className="space-y-3">
                  {pendingProposals.map((proposal) => (
                    <GlassCard key={proposal.id} hover className="space-y-3 border border-yellow-400/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-300 font-semibold">Session Request from {proposal.fromId}</p>
                          <p className="text-white/80 text-sm">{proposal.subject}</p>
                          <p className="text-white/40 text-xs">{formatDateTime(proposal.dateTime)}</p>
                        </div>
                        <div className="flex gap-2">
                          <GlassButton size="sm" variant="primary" onClick={async () => await handleAcceptProposal(proposal)}>
                            Accept
                          </GlassButton>
                          <GlassButton size="sm" variant="danger" onClick={async () => await handleRejectProposal(proposal)}>
                            Reject
                          </GlassButton>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
  
              {/* Upcoming Sessions */}
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => {
                    const partnerName = session.tutorId === user?.uid
                      ? session.learnerName || 'Learner'
                      : session.tutorName || 'Tutor';
                    return (
                    <GlassCard key={session.id} hover className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{partnerName}</p>
                          <p className="text-white/40 text-sm">{session.subject}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                            session.mode === 'online'
                              ? 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30'
                              : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                          }`}
                        >
                          {session.mode === 'online' ? (
                            <Monitor className="w-3 h-3" />
                          ) : (
                            <MapPin className="w-3 h-3" />
                          )}
                          {session.mode === 'online' ? 'Online' : 'In-person'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(session.dateTime)}
                      </div>
                    </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <GlassCard hover={false} className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-white/50 font-medium">No upcoming sessions</p>
                  <p className="text-white/30 text-sm mt-1">
                    Find a match and schedule your first session
                  </p>
                </GlassCard>
              )}
  
            </motion.div>
          </div>
          {/* ── Bottom Grid: Activity + Bookmarks ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Recent Activity Feed ────────────────────────────────────────── */}
            <motion.div variants={item} className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#7C3AED]" />
                Recent Activity
              </h2>
              <GlassCard hover={false} className="divide-y divide-white/5">
                <RecentActivityFeed user={user} />
              </GlassCard>
            {/* ─── Recent Activity Feed (Client Only) ──────────────────────────────────────── */}
            </motion.div>


// ─── Recent Activity Feed Component ─────────────────────────────────────────────
function RecentActivityFeed({ user }: { user: any }) {
  const [activities, setActivities] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    const activityKey = `studysync_activities_${user.uid}`;
    const stored = localStorage.getItem(activityKey);
    if (stored) setActivities(JSON.parse(stored));
  }, [user]);
  if (!user) return null;
  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="w-10 h-10 text-white/20 mb-2" />
        <p className="text-white/40 text-sm">No recent activity</p>
      </div>
    );
  }
  const iconFor = (type: string) => {
    switch (type) {
      case 'bookmark': return <Bookmark className="w-5 h-5 text-pink-400" />;
      default: return <Activity className="w-5 h-5 text-white/40" />;
    }
  };
  return (
    <div className="flex flex-col">
      {activities.map((a, i) => (
        <div key={i} className="flex items-center gap-4 py-4 px-2">
          {iconFor(a.type)}
          <div className="flex-1 min-w-0">
            <span className="text-white font-medium">{a.user}</span>
            <span className="text-white/60 ml-2">{a.message}</span>
          </div>
          <span className="text-xs text-white/40 whitespace-nowrap">{relativeTime(a.time)}</span>
        </div>
      ))}
    </div>
  );
}
            {/* ── Bookmarked Profiles ──────────────────────────────────────────── */}
            <motion.div variants={item} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-[#06B6D4]" />
                  Bookmarked
                </h2>
                <Link
                  href="/bookmarks"
                  className="text-sm text-[#06B6D4] hover:text-[#06B6D4]/80 transition-colors flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <GlassCard hover={false} className="space-y-4">
                {bookmarkedProfiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bookmark className="w-10 h-10 text-white/20 mb-2" />
                    <p className="text-white/40 text-sm">No bookmarks yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {bookmarkedProfiles.map((p) => (
                      <GlassCard key={p.uid} hover className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-[#06B6D4]/20 text-[#06B6D4]">
                          {p.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{p.name}</p>
                          <p className="text-white/40 text-sm truncate">{p.university}</p>
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#06B6D4]/15 text-xs text-[#06B6D4] border border-[#06B6D4]/20">
                            {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                          </span>
                        </div>
                        <GlassButton variant="primary" size="sm" className="shrink-0" onClick={() => router.push(`/profile/${p.uid}`)}>
                          View
                        </GlassButton>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

