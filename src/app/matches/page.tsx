'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { findMatches } from '@/lib/matching';
import type { MatchResult } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import toast from 'react-hot-toast';
import {
  Zap,
  Search,
  Filter,
  User,
  GraduationCap,
  BookOpen,
  Clock,
  MessageSquare,
  Eye,
  Sparkles,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';

// ── Circular progress ring ───────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{score}%</span>
      </div>
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('all');

  // ── fetch matches from Firestore ───────────────────────────────────────

  useEffect(() => {
    const loadMatches = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const results = await findMatches(profile);
        setMatches(results);
      } catch (error) {
        console.error('Error finding matches:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMatches();
  }, [profile]);

  // ── all subjects for filter dropdown ───────────────────────────────────

  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      m.matchingSubjects.forEach((s) => set.add(s));
    });
    return Array.from(set).sort();
  }, [matches]);

  // ── filtered matches ───────────────────────────────────────────────────

  const filteredMatches = useMemo(() => {
    if (filterSubject === 'all') return matches;
    return matches.filter(
      (m) =>
        m.matchingTeach.some((s) => s.toLowerCase() === filterSubject.toLowerCase()) ||
        m.matchingLearn.some((s) => s.toLowerCase() === filterSubject.toLowerCase()),
    );
  }, [matches, filterSubject]);

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-24">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10" />
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-6 relative z-10">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="p-2 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30">
              <Zap className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Your Smart Matches</h1>
          </motion.div>
          <motion.p
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-gray-400 text-sm ml-14"
          >
            AI-powered recommendations based on your subjects, schedule &amp; academic profile
          </motion.p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-3 mb-8"
        >
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#7C3AED]/50 appearance-none"
            >
              <option value="all" className="bg-[#12121A]">
                All Subjects
              </option>
              {allSubjects.map((s) => (
                <option key={s} value={s} className="bg-[#12121A]">
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          <GlassCard className="px-3 py-2 text-sm text-gray-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            {loading ? 'Calculating...' : `${filteredMatches.length} matches found`}
          </GlassCard>
        </motion.div>

        {/* ── Loading skeleton ────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <GlassCard className="p-6 flex gap-5">
                  <div className="w-20 h-20 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-48 rounded bg-white/5" />
                    <div className="h-3 w-32 rounded bg-white/5" />
                    <div className="h-3 w-64 rounded bg-white/5" />
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>
        )}

        {/* ── Match cards ─────────────────────────────────────────────── */}
        {!loading && filteredMatches.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div className="space-y-4" key={filterSubject}>
              {filteredMatches.map((match, idx) => (
                <motion.div
                  key={match.user.uid}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                >
                  <GlassCard className="p-5 md:p-6 hover:border-[#7C3AED]/30 transition-colors">
                    <div className="flex flex-col md:flex-row gap-5">
                      {/* Score ring */}
                      <div className="flex md:flex-col items-center gap-4 md:gap-2">
                        <ScoreRing score={match.score} />
                        <span className="text-xs text-gray-500 hidden md:block">Match Score</span>
                      </div>

                      {/* Profile info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-lg font-bold flex-shrink-0">
                            {match.user.name?.charAt(0) ?? 'U'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base truncate">{match.user.name}</h3>
                            <p className="text-sm text-gray-400 flex items-center gap-1 truncate">
                              <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                              {match.user.university}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/20">
                              {match.user.role === 'tutor'
                                ? 'Tutor'
                                : match.user.role === 'learner'
                                ? 'Learner'
                                : 'Tutor & Learner'}
                            </span>
                          </div>
                        </div>

                        {/* Matching subjects */}
                        {match.matchingTeach.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> Can teach you
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {match.matchingTeach.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded-full text-xs bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {match.matchingLearn.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> Wants to learn from you
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {match.matchingLearn.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded-full text-xs bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reasons / meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                          {match.overlappingSlots > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {match.overlappingSlots} time slots overlap
                            </span>
                          )}
                          {match.reasons.includes('Same university') && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> Same university
                            </span>
                          )}
                          {match.reasons.includes('Similar academic standing') && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> Similar CGPA
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-4">
                          <GlassButton
                            onClick={() => router.push(`/profile/${match.user.uid}`)}
                            className="text-xs flex items-center gap-1.5 px-3 py-2"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </GlassButton>
                          <GlassButton
                            onClick={() => {
                              toast.success(`Message sent to ${match.user.name}`);
                              router.push('/messages');
                            }}
                            className="text-xs flex items-center gap-1.5 px-3 py-2 bg-[#06B6D4]/10 border-[#06B6D4]/20 hover:bg-[#06B6D4]/20"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Send Message
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {!loading && filteredMatches.length === 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <GlassCard className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#7C3AED]/10 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-[#7C3AED]" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Matches Found</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                {filterSubject !== 'all'
                  ? `No matches for "${filterSubject}". Try selecting a different subject or "All Subjects".`
                  : 'Complete your profile with subjects and availability to get personalized matches.'}
              </p>
              <GlassButton onClick={() => router.push('/settings')} className="mx-auto flex items-center gap-2">
                <User className="w-4 h-4" /> Update Profile
              </GlassButton>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
