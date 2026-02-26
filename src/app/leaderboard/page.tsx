'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAuth } from '@/contexts/AuthContext';
import type { LeaderboardEntry } from '@/lib/types';
import { Trophy, Crown, Medal, Star, Flame, Filter, TrendingUp } from 'lucide-react';

const UNIVERSITIES = ['All', 'LUMS', 'NUST', 'FAST', 'GIKI', 'IBA', 'COMSATS', 'UET'];
const SUBJECTS = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'English', 'Economics'];
const SEMESTERS = ['All', '1', '2', '3', '4', '5', '6', '7', '8'];

function calcScore(entry: LeaderboardEntry): number {
  return (entry.totalSessions * 10) + (entry.rating * 20) + (entry.streak * 5);
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { profile } = useAuth();

  const [rawEntries, setRawEntries] = useState<LeaderboardEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'week' | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [universityFilter, setUniversityFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch leaderboard data from Firestore
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingData(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('onboardingComplete', '==', true),
          orderBy('totalSessions', 'desc'),
          limit(50),
        );
        const snapshot = await getDocs(q);
        const entries: LeaderboardEntry[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            name: data.name || 'Anonymous',
            profilePhoto: data.profilePhoto || '',
            university: data.university || '',
            totalSessions: data.totalSessions || 0,
            rating: data.rating || 0,
            streak: data.streak || 0,
            score: 0,
            rank: 0,
          };
        });
        setRawEntries(entries);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Calculate scores and rank
  const leaderboard = useMemo(() => {
    let entries = rawEntries.map((e) => ({ ...e, score: calcScore(e) }));

    // Apply university filter
    if (universityFilter !== 'All') {
      entries = entries.filter((e) => e.university === universityFilter);
    }

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks
    entries.forEach((e, i) => {
      e.rank = i + 1;
    });

    return entries;
  }, [universityFilter, timePeriod]);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const maxScore = topThree[0]?.score || 1;

  // ─── Podium order: #2 (left), #1 (center), #3 (right) ─────────────────────
  const podiumOrder = topThree.length >= 3
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree;

  const podiumConfig = [
    { glow: 'rgba(6,182,212,0.35)', border: 'border-[#06B6D4]', iconColor: 'text-gray-300', icon: Medal, label: '2nd', scale: 0.92 },
    { glow: 'rgba(124,58,237,0.45)', border: 'border-[#7C3AED]', iconColor: 'text-yellow-400', icon: Crown, label: '1st', scale: 1 },
    { glow: 'rgba(245,158,11,0.35)', border: 'border-amber-400', iconColor: 'text-amber-400', icon: Medal, label: '3rd', scale: 0.92 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white relative overflow-hidden">
      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] bg-[#7C3AED]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#06B6D4]/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[#7C3AED]" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
              Leaderboard
            </h1>
          </div>
          <p className="text-[#94A3B8] mt-1">Top tutors ranked by performance</p>
        </motion.div>

        {/* Time Period Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="relative inline-flex rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] p-1">
            <motion.div
              className="absolute top-1 bottom-1 rounded-xl bg-[#7C3AED]/30 border border-[#7C3AED]/40"
              animate={{
                left: timePeriod === 'week' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            {(['week', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`relative z-10 px-6 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  timePeriod === period ? 'text-white' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {period === 'week' ? 'This Week' : 'All Time'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filter Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center mb-6"
        >
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-[#94A3B8]"
          >
            <Filter className="w-4 h-4" />
            Filters
          </GlassButton>
        </motion.div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <GlassCard hover={false} className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Subject</label>
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-sm focus:border-[rgba(124,58,237,0.6)] focus:outline-none appearance-none cursor-pointer"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s} className="bg-[#1a1a2e] text-white">{s}</option>
                      ))}
                    </select>
                  </div>
                  {/* University */}
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">University</label>
                    <select
                      value={universityFilter}
                      onChange={(e) => setUniversityFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-sm focus:border-[rgba(124,58,237,0.6)] focus:outline-none appearance-none cursor-pointer"
                    >
                      {UNIVERSITIES.map((u) => (
                        <option key={u} value={u} className="bg-[#1a1a2e] text-white">{u}</option>
                      ))}
                    </select>
                  </div>
                  {/* Semester */}
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Semester</label>
                    <select
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white text-sm focus:border-[rgba(124,58,237,0.6)] focus:outline-none appearance-none cursor-pointer"
                    >
                      {SEMESTERS.map((s) => (
                        <option key={s} value={s} className="bg-[#1a1a2e] text-white">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {leaderboard.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <Trophy className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#94A3B8] mb-2">No Results</h2>
            <p className="text-[#64748B]">Try adjusting your filters to see leaderboard entries.</p>
          </motion.div>
        )}

        {/* ─── Podium (Top 3) ──────────────────────────────────────────────────── */}
        {topThree.length > 0 && (
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <TrendingUp className="w-5 h-5 text-[#7C3AED]" />
              <h2 className="text-lg font-semibold text-[#94A3B8]">Top Performers</h2>
            </motion.div>

            <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
              {podiumOrder.map((entry, i) => {
                if (!entry) return <div key={i} />;
                const config = podiumConfig[i];
                const Icon = config.icon;
                const isFirst = i === 1; // center is #1

                return (
                  <motion.div
                    key={entry.uid}
                    initial={{ opacity: 0, scale: 0.5, y: 40 }}
                    animate={{ opacity: 1, scale: config.scale, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <GlassCard
                      hover={true}
                      className={`text-center p-4 sm:p-6 ${config.border} ${isFirst ? 'sm:py-8' : ''}`}
                      glowColor={config.glow}
                    >
                      {/* Rank Icon */}
                      <div className="flex justify-center mb-3">
                        <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${config.iconColor}`} />
                      </div>

                      {/* Avatar */}
                      <div className="flex justify-center mb-3">
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 ${config.border} flex items-center justify-center text-xl font-bold bg-[rgba(255,255,255,0.08)]`}
                        >
                          {entry.profilePhoto ? (
                            <img
                              src={entry.profilePhoto}
                              alt={entry.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
                              {entry.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name & University */}
                      <h3 className="font-semibold text-sm sm:text-base truncate">{entry.name}</h3>
                      <p className="text-[10px] sm:text-xs text-[#94A3B8] truncate">{entry.university}</p>

                      {/* Score */}
                      <div className="mt-3 text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
                        {entry.score}
                      </div>
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Points</p>

                      {/* Stats */}
                      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] sm:text-xs text-[#94A3B8]">
                        <div className="flex flex-col items-center">
                          <span className="text-white font-medium">{entry.totalSessions}</span>
                          <span>Sessions</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="flex items-center gap-0.5 text-yellow-400 font-medium">
                            <Star className="w-3 h-3" fill="currentColor" />
                            {entry.rating}
                          </span>
                          <span>Rating</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="flex items-center gap-0.5 text-orange-400 font-medium">
                            <Flame className="w-3 h-3" />
                            {entry.streak}
                          </span>
                          <span>Streak</span>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Remaining List ──────────────────────────────────────────────────── */}
        {rest.length > 0 && (
          <div className="space-y-2">
            {rest.map((entry, i) => {
              const isCurrentUser = profile?.uid === entry.uid;
              const barWidth = Math.max((entry.score / maxScore) * 100, 8);

              return (
                <motion.div
                  key={entry.uid}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <GlassCard
                    hover={true}
                    className={`p-3 sm:p-4 ${
                      isCurrentUser
                        ? 'border-[#7C3AED] bg-[rgba(124,58,237,0.08)] shadow-[0_0_25px_rgba(124,58,237,0.2)]'
                        : ''
                    }`}
                    glowColor={isCurrentUser ? 'rgba(124,58,237,0.25)' : undefined}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Rank */}
                      <div className="w-8 text-center">
                        <span className="text-lg font-bold text-[#64748B]">
                          {entry.rank}
                        </span>
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.15)] flex items-center justify-center text-sm font-bold bg-[rgba(255,255,255,0.06)] flex-shrink-0">
                        {entry.profilePhoto ? (
                          <img
                            src={entry.profilePhoto}
                            alt={entry.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-[#94A3B8]">
                            {entry.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Info + Progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="min-w-0">
                            <span className="font-medium text-sm truncate block">
                              {entry.name}
                              {isCurrentUser && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#7C3AED]">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-[#64748B] truncate block">{entry.university}</span>
                          </div>

                          {/* Stats (desktop) */}
                          <div className="hidden sm:flex items-center gap-4 text-xs text-[#94A3B8] flex-shrink-0 ml-3">
                            <span>{entry.totalSessions} sessions</span>
                            <span className="flex items-center gap-0.5 text-yellow-400">
                              <Star className="w-3 h-3" fill="currentColor" />
                              {entry.rating}
                            </span>
                            <span className="flex items-center gap-0.5 text-orange-400">
                              <Flame className="w-3 h-3" />
                              {entry.streak}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ delay: 0.7 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
                          {entry.score}
                        </span>
                        <p className="text-[9px] text-[#64748B] uppercase tracking-wide">pts</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
