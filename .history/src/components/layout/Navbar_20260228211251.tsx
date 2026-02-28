'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Search, BookOpen, Trophy, Bell, 
  LayoutDashboard, User, Settings, LogOut,
  Menu, X, MessageSquare, Zap, Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassMenu, GlassMenuItem } from '@/components/ui/GlassMenu';
import { useState } from 'react';

const navLinks = [
  { href: '/browse', label: 'Browse', icon: Search },
  { href: '/matches', label: 'Matches', icon: Zap },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/reviews', label: 'My Reviews', icon: Star },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // Placeholder notifications
  const notifications = [
    { id: 1, text: 'You have a new match!' },
    { id: 2, text: 'Session starting soon.' },
    { id: 3, text: 'New message received.' },
  ];
  if (loading) return null;

  const _isLanding = pathname === '/';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 glass-nav"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary/30 flex items-center justify-center border border-primary/30">
                <BookOpen size={20} className="text-primary-light" />
              </div>
              <span className="text-lg font-bold gradient-text">StudySync</span>
            </Link>

            {/* Desktop Nav */}
            {user && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                  return (
                    <Link key={link.href} href={link.href}>
                      <motion.div
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          isActive ? 'text-white' : 'text-text-secondary hover:text-white'
                        }`}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <link.icon size={16} />
                        {link.label}
                        {isActive && (
                          <motion.div
                            layoutId="nav-indicator"
                            className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {user ? (
                <>

                  {/* Notification Bell with Dropdown */}
                  <div className="relative">
                    <motion.button
                      className="relative p-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setNotifOpen((v) => !v)}
                    >
                      <Bell size={20} />
                      {notifications.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                          {notifications.length}
                        </span>
                      )}
                    </motion.button>
                    {/* Dropdown */}
                    {notifOpen && (
                      <div className="absolute right-0 mt-2 min-w-[220px] z-50 rounded-[16px] p-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[32px] backdrop-saturate-[180%] backdrop-brightness-110 border border-[rgba(255,255,255,0.15)] shadow-glass">
                        <div className="font-semibold text-white mb-2 text-sm">Notifications</div>
                        {notifications.length === 0 ? (
                          <div className="text-xs text-text-secondary py-4 text-center">No notifications</div>
                        ) : (
                          notifications.map((notif) => (
                            <div key={notif.id} className="text-xs text-white px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
                              {notif.text}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Menu */}
                  <GlassMenu
                    trigger={
                      <div className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold text-primary-light border border-primary/20">
                          {profile?.name?.charAt(0) || 'U'}
                        </div>
                        <span className="hidden sm:block text-sm font-medium text-text-primary max-w-[100px] truncate">
                          {profile?.name || 'User'}
                        </span>
                      </div>
                    }
                  >
                    <GlassMenuItem onClick={() => router.push('/dashboard')}>
                      <LayoutDashboard size={16} /> Dashboard
                    </GlassMenuItem>
                    <GlassMenuItem onClick={() => router.push(`/profile/${user.uid}`)}>
                      <User size={16} /> My Profile
                    </GlassMenuItem>
                    <GlassMenuItem onClick={() => router.push('/sessions')}>
                      <BookOpen size={16} /> Sessions
                    </GlassMenuItem>
                    <GlassMenuItem onClick={() => router.push('/settings')}>
                      <Settings size={16} /> Settings
                    </GlassMenuItem>
                    <div className="my-1 border-t border-white/10" />
                    <GlassMenuItem onClick={handleSignOut} danger>
                      <LogOut size={16} /> Sign Out
                    </GlassMenuItem>
                  </GlassMenu>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/auth/login">
                    <motion.button
                      className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Log In
                    </motion.button>
                  </Link>
                  <Link href="/auth/signup">
                    <motion.button
                      className="px-5 py-2 text-sm font-medium text-white bg-primary/80 rounded-[14px] border border-primary/30 shadow-glass-btn relative overflow-hidden"
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(124,58,237,0.9)' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_60%)]" />
                      <span className="relative">Sign Up</span>
                    </motion.button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              {user && (
                <button
                  className="md:hidden p-2 rounded-xl text-text-secondary hover:text-white"
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-white/10">
          <div className="flex items-center justify-around py-2">
            {[
              { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
              ...navLinks.slice(0, 3),
              { href: '/sessions', icon: BookOpen, label: 'Sessions' },
            ].map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl ${
                      isActive ? 'text-primary-light' : 'text-text-secondary'
                    }`}
                    whileTap={{ scale: 0.9 }}
                  >
                    <link.icon size={20} />
                    <span className="text-[10px] font-medium">{link.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
