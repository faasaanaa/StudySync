import {
  Check,
  Plus,
  Trash2,
  User,
  MessageSquare,
  FileText,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  createdBy: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  firebaseKey?: string;
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { rtdb } from '@/lib/firebase';
import { ref, onChildAdded } from 'firebase/database';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

// ─── Chat & Notes Panel ─────────────────────────────────────────────────────────
function ChatNotesPanel({ sessionId }: { sessionId: string }) {
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

// ═════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════════
function StudyRoomPage() {
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
            <ChatNotesPanel sessionId={String(sessionId)} />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default StudyRoomPage;
