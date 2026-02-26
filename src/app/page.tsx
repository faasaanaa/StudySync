'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Users, BookOpen, Target, Zap, Star, 
  ArrowRight, GraduationCap, Clock, Shield,
  ChevronRight, Sparkles, TrendingUp
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

const stats = [
  { label: 'Students Matched', value: '12,400+', icon: Users },
  { label: 'Sessions Completed', value: '48,200+', icon: BookOpen },
  { label: 'Universities', value: '150+', icon: GraduationCap },
];

const steps = [
  { step: '01', title: 'Create Your Profile', description: 'Sign up with your university email and tell us what subjects you excel at and where you need help.', icon: Users, color: '#7C3AED' },
  { step: '02', title: 'Get Smart Matches', description: 'Our algorithm finds the perfect study partners based on subjects, availability, and compatibility.', icon: Target, color: '#06B6D4' },
  { step: '03', title: 'Book Sessions', description: 'Schedule study sessions, negotiate terms, and connect with your matched partners instantly.', icon: Clock, color: '#7C3AED' },
  { step: '04', title: 'Learn & Grow', description: 'Track your progress, build streaks, climb the leaderboard, and achieve academic excellence.', icon: TrendingUp, color: '#06B6D4' },
];

const features = [
  { title: 'Smart Matching', description: 'AI-powered algorithm matches you with the most compatible study partners based on subjects, grades, and schedules.', icon: Zap },
  { title: 'Real-time Messaging', description: 'Chat with potential partners, send session proposals, and negotiate directly within the platform.', icon: Sparkles },
  { title: 'Study Rooms', description: 'Virtual study rooms with Pomodoro timers, shared to-do lists, and session notes to maximize productivity.', icon: BookOpen },
  { title: 'Verified Profiles', description: 'Grade verification system ensures you connect with genuine, high-performing study partners.', icon: Shield },
  { title: 'Leaderboard & Streaks', description: 'Gamified experience with study streaks, ratings, and leaderboards to keep you motivated.', icon: Star },
  { title: 'Flexible Scheduling', description: 'Calendar-based availability matching for finding overlapping free slots effortlessly.', icon: Clock },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25 } } };

function FloatingCard({ delay, className }: { delay: number; className: string }) {
  const names = ['Alex Kim', 'Sarah Chen', 'Mike Ross', 'Jane Doe'];
  const unis = ['MIT • CS', 'Stanford • Math', 'Harvard • Physics', 'Yale • Bio'];
  return (
    <motion.div className={`absolute ${className}`} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.3, duration: 0.8 }}>
      <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut' }}>
        <GlassCard hover={false} className="p-4 w-52">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/30 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary-light">{names[delay]?.charAt(0)}</div>
            <div><div className="text-sm font-medium text-white">{names[delay]}</div><div className="text-xs text-text-secondary">{unis[delay]}</div></div>
          </div>
          <div className="flex gap-1.5 mb-2">{['A+', 'A', 'B+'].map((g, i) => (<span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary-light border border-primary/20">{g}</span>))}</div>
          <div className="flex items-center gap-1">{[1,2,3,4,5].map(s => (<Star key={s} size={10} className={s <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />))}<span className="text-[10px] text-text-secondary ml-1">4.8</span></div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-20">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px]" />
        <FloatingCard delay={0} className="hidden lg:block top-32 left-[8%]" />
        <FloatingCard delay={1} className="hidden lg:block top-48 right-[8%]" />
        <FloatingCard delay={2} className="hidden xl:block bottom-32 left-[15%]" />
        <FloatingCard delay={3} className="hidden xl:block bottom-48 right-[15%]" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <motion.div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-sm font-medium mb-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Sparkles size={14} /> The #1 Study Partner Platform
            </motion.div>
          </motion.div>

          <motion.h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }}>
            Find Your Perfect{' '}<span className="gradient-text">Study Partner</span>
          </motion.h1>

          <motion.p className="text-lg sm:text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
            Connect with university students who complement your skills. Smart matching, real-time collaboration, and gamified learning to help you ace every semester.
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <Link href="/auth/signup">
              <GlassButton variant="primary" size="lg" className="group min-w-[200px]">
                Get Started Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </GlassButton>
            </Link>
            <Link href="/browse">
              <GlassButton size="lg" className="min-w-[200px]">Browse Partners</GlassButton>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative py-20 px-4">
        <motion.div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-100px' }}>
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <GlassCard className="text-center py-8" hover={false}>
                <stat.icon className="w-8 h-8 text-primary-light mx-auto mb-4" />
                <div className="text-3xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-sm text-text-secondary">{stat.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How <span className="gradient-text">StudySync</span> Works</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">Get matched with the perfect study partner in four simple steps.</p>
          </motion.div>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-100px' }}>
            {steps.map((step, i) => (
              <motion.div key={step.step} variants={item}>
                <GlassCard className="h-full relative group">
                  <div className="absolute top-4 right-4 text-4xl font-black opacity-10" style={{ color: step.color }}>{step.step}</div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${step.color}20`, border: `1px solid ${step.color}30` }}>
                    <step.icon size={24} style={{ color: step.color }} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
                  {i < steps.length - 1 && <ChevronRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-white/10" size={24} />}
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-4">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-secondary/5 rounded-full blur-[128px]" />
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to <span className="gradient-text">Excel</span></h2>
            <p className="text-text-secondary max-w-2xl mx-auto">Powerful features designed to make collaborative learning seamless and effective.</p>
          </motion.div>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-100px' }}>
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <GlassCard className="h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <feature.icon size={24} className="text-primary-light" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <GlassCard hover={false} className="text-center py-16 px-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
            <div className="relative z-10">
              <motion.h2 className="text-3xl sm:text-4xl font-bold mb-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                Ready to Find Your <span className="gradient-text">Study Partner</span>?
              </motion.h2>
              <motion.p className="text-text-secondary mb-8 max-w-xl mx-auto" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                Join thousands of university students already using StudySync to ace their courses and build lasting academic connections.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <Link href="/auth/signup">
                  <GlassButton variant="primary" size="lg" className="min-w-[250px]">
                    Get Started — It&apos;s Free <ArrowRight size={18} />
                  </GlassButton>
                </Link>
              </motion.div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary-light" />
            <span className="font-bold gradient-text">StudySync</span>
          </div>
          <p className="text-sm text-text-secondary">© 2026 StudySync. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
}
