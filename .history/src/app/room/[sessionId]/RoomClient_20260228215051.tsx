'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAuth } from '@/contexts/AuthContext';
import type { TodoItem } from '@/lib/types';
// Define ChatMessage type for chat panel
type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  firebaseKey?: string;
};

import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  Send,
  ArrowLeft,
  Clock,
  MessageSquare,
  FileText,
  Trash2,
  User,
  Coffee,
  BookOpen,
  LogOut,
} from 'lucide-react';


import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { rtdb } from '@/lib/firebase';
import { ref, onChildAdded, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

// ─── Constants ──────────────────────────────────────────────────────────────────

const WORK_DURATION = 25 * 60; // 25 min in seconds
const BREAK_DURATION = 5 * 60;  // 5 min in seconds
const TOTAL_POMODOROS = 4;

// User identity is now resolved from useAuth() inside each sub-component



// ─── Stagger Variants ───────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// ─── Format Timer ───────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
// removed stray closing brace

// ─── Circular Progress Ring ─────────────────────────────────────────────────────

function ProgressRing({
  progress,
  isBreak,
  size = 200,
  strokeWidth = 8,
}: {
  progress: number;
  isBreak: boolean;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const color = isBreak ? '#06B6D4' : '#7C3AED';
  const bgColor = isBreak ? 'rgba(6,182,212,0.12)' : 'rgba(124,58,237,0.12)';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        initial={false}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth + 2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        filter="url(#glow)"
        opacity={0.4}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </svg>
  );


// ─── Pomodoro Timer Panel ───────────────────────────────────────────────────────

function PomodoroPanel() {
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [running, setRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalDuration = isBreak ? BREAK_DURATION : WORK_DURATION;
  const progress = timeLeft / totalDuration;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            // Switch phase
            if (!isBreak) {
              toast.success('Work session complete! Time for a break.', { icon: '☕' });
              setIsBreak(true);
              setRunning(false);
              return BREAK_DURATION;
            } else {
              const nextCount = pomodoroCount + 1;
              if (nextCount > TOTAL_POMODOROS) {
                toast.success('All sessions complete! Great work!', { icon: '🎉' });
                setRunning(false);
                setPomodoroCount(1);
                setIsBreak(false);
                return WORK_DURATION;
              }
              toast.success(`Break over! Starting session ${nextCount}.`, { icon: '📚' });
              setPomodoroCount(nextCount);
              setIsBreak(false);
              setRunning(false);
              return WORK_DURATION;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, isBreak, pomodoroCount]);

  const handleReset = () => {
    setRunning(false);
    setIsBreak(false);
    setTimeLeft(WORK_DURATION);
    setPomodoroCount(1);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <GlassCard hover={false} className="p-6 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4">
        {isBreak ? (
          <Coffee size={18} className="text-cyan-400" />
        ) : (
          <BookOpen size={18} className="text-violet-400" />
        )}
        <h2 className="text-lg font-semibold text-white">
          {isBreak ? 'Break Time' : 'Focus Mode'}
        </h2>
      </div>

      {/* Ring */}
      <div className="relative mb-5">
        <ProgressRing progress={progress} isBreak={isBreak} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={timeLeft}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-4xl font-mono font-bold ${isBreak ? 'text-cyan-400' : 'text-violet-400'}`}
          >
            {formatTime(timeLeft)}
          </motion.span>
          <span className="text-xs text-white/40 mt-1">
            {isBreak ? 'Break' : 'Work'}
          </span>
        </div>
      </div>

      {/* Session count */}
      <div className="flex items-center gap-2 mb-5">
        {Array.from({ length: TOTAL_POMODOROS }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-3 h-3 rounded-full border transition-colors ${
              i < pomodoroCount
                ? isBreak
                  ? 'bg-cyan-400 border-cyan-400'
                  : 'bg-violet-400 border-violet-400'
                : 'border-white/20 bg-transparent'
            }`}
            animate={i === pomodoroCount - 1 && running ? { scale: [1, 1.3, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        ))}
        <span className="text-xs text-white/40 ml-2">
          Session {pomodoroCount} of {TOTAL_POMODOROS}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <GlassButton
          variant={running ? 'default' : 'primary'}
          size="sm"
          onClick={() => setRunning((r) => !r)}
          className="gap-1.5"
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? 'Pause' : 'Start'}
        </GlassButton>
        <GlassButton variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
          <RotateCcw size={16} /> Reset
        </GlassButton>
      </div>
    </GlassCard>
  );

export default StudyRoomPage;

export default StudyRoomPage;
// ─── Todo Panel ─────────────────────────────────────────────────────────────────

function TodoPanel() {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 'todo-1', text: 'Review integration by parts formula', completed: false, createdBy: 'Sarah Ahmed' },
    { id: 'todo-2', text: 'Solve practice problems 5-10', completed: false, createdBy: 'You' },
    { id: 'todo-3', text: 'Summarize key theorems', completed: true, createdBy: 'You' },
  ]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos((prev) => [
      ...prev,
      {
        id: `todo-${Date.now()}`,
        text: newTodo.trim(),
        completed: false,
        createdBy: 'You',
      },
    ]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <GlassCard hover={false} className="p-6 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Check size={18} className="text-emerald-400" />
        Shared Todo List
      </h2>

      {/* Add input */}
      <div className="flex items-center gap-2 mb-4">
        <input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a task..."
          className="flex-1 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <GlassButton variant="primary" size="sm" onClick={addTodo}>
          <Plus size={16} />
        </GlassButton>
      </div>

      {/* List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto space-y-2 custom-scrollbar"
      >
        <AnimatePresence mode="popLayout">
          {todos.map((todo) => (
            <motion.div
              key={todo.id}
              variants={itemVariants}
              layout
              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              className={`
                flex items-start gap-3 p-3 rounded-xl
                bg-white/[0.03] border border-white/[0.06]
                transition-colors hover:bg-white/[0.05]
              `}
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`
                  mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center
                  transition-all duration-200
                  ${
                    todo.completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-white/30 hover:border-violet-400'
                  }
                `}
              >
                {todo.completed && <Check size={12} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm transition-all duration-300 ${
                    todo.completed
                      ? 'line-through text-white/30'
                      : 'text-white'
                  }`}
                >
                  {todo.text}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1">
                  <User size={10} /> {todo.createdBy}
                </p>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {todos.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            No tasks yet. Add one above!
          </div>
        )}
      </motion.div>

      {/* Progress */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
          <span>Progress</span>
          <span>
            {todos.filter((t) => t.completed).length}/{todos.length} done
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{
              width: todos.length
                ? `${(todos.filter((t) => t.completed).length / todos.length) * 100}%`
                : '0%',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
    </GlassCard>
  );
// removed extra closing brace

export default StudyRoomPage;

// ─── Chat & Notes Panel ─────────────────────────────────────────────────────────

function ChatNotesPanel() {
  // sessionId is now only declared in the main component and can be passed as a prop if needed
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'notes'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Real-time listener for messages
  useEffect(() => {
    if (!sessionId) return;
    const messagesRef = ref(rtdb, `sessions/${sessionId}/messages`);
    setMessages([]); // Clear on session change
    onChildAdded(messagesRef, (snapshot) => {
      const msg = snapshot.val();
      const firebaseKey = snapshot.key;
      // Attach Firebase key to message
      const msgWithKey = { ...msg, firebaseKey };
      setMessages((prev) => {
        // Only add if not already present (by Firebase key)
        if (prev.some(m => m.firebaseKey === firebaseKey)) return prev;
        return [...prev, msgWithKey];
      });
    });
  }, [sessionId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch notes (simulate read-only)
  useEffect(() => {
    // In production, fetch notes from backend
    // setNotes(...)
  }, [sessionId]);

  return (
    <GlassCard hover={false} className="p-6 flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-4">
        <button
          onClick={() => setActiveSubTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors relative ${
            activeSubTab === 'chat' ? 'text-white' : 'text-white/50'
          }`}
        >
          <MessageSquare size={14} /> Chat
          {activeSubTab === 'chat' && (
            <motion.div
              layoutId="chat-notes-tab"
              className="absolute inset-0 rounded-lg bg-white/10"
              style={{ zIndex: -1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('notes')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors relative ${
            activeSubTab === 'notes' ? 'text-white' : 'text-white/50'
          }`}
        >
          <FileText size={14} /> Notes
          {activeSubTab === 'notes' && (
            <motion.div
              layoutId="chat-notes-tab"
              className="absolute inset-0 rounded-lg bg-white/10"
              style={{ zIndex: -1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'chat' ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3 custom-scrollbar pr-1">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex justify-start`}
                >
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm
                      bg-white/[0.06] border border-white/[0.08] text-white/90
                    `}
                  >
                    <p className="text-[11px] text-cyan-400 font-medium mb-0.5">{msg.senderName}</p>
                    <p>{msg.text}</p>
                    <p className="text-[10px] text-white/30 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="notes"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] text-white p-4 text-sm custom-scrollbar">
              {notes ? notes : <span className="text-white/30">No notes for this session.</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
	);
// removed extra closing brace
export default StudyRoomPage;
export default StudyRoomPage;

// ═════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════════

  const { sessionId } = useParams();
  const [sessionName, setSessionName] = useState<string>("");

  useEffect(() => {
    async function fetchSessionName() {
      if (!sessionId) return;
      const sessionRef = doc(db, 'sessions', String(sessionId));
      const snap = await getDoc(sessionRef);
      if (snap.exists()) {
        setSessionName(snap.data().sessionName || snap.data().subject || "Session");
      } else {
        setSessionName("Session");
      }
    }
    fetchSessionName();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0F]/80 border-b border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sessions">
              <GlassButton variant="ghost" size="sm">
                <ArrowLeft size={18} />
              </GlassButton>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen size={18} className="text-violet-400" />
                {sessionName}
              </h1>
              <p className="text-xs text-white/50">
                Session ID: <span className="text-cyan-400">{sessionId}</span>
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Main Layout ───────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Panel 2: Todos */}
          <motion.div variants={itemVariants} className="lg:min-h-[520px]">
            <TodoPanel />
          </motion.div>
          {/* Panel 3: Chat & Notes */}
          <motion.div variants={itemVariants} className="lg:min-h-[520px]">
            <ChatNotesPanel />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
