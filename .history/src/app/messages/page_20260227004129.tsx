'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassModal } from '@/components/ui/GlassModal';
import { useAuth } from '@/contexts/AuthContext';
import { rtdb, db } from '@/lib/firebase';
import { ref, push, onValue, set, off } from 'firebase/database';
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type { Message, ChatConversation, SessionProposal } from '@/lib/types';
import toast from 'react-hot-toast';
import {
  Send,
  MessageSquare,
  Calendar,
  Check,
  X,
  User,
  ArrowLeft,
  Plus,
} from 'lucide-react';

// ─── Sample Data ────────────────────────────────────────────────────────────────

const SAMPLE_USER_ID = 'current-user';

const SAMPLE_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'chat-1',
    participants: [SAMPLE_USER_ID, 'user-2'],
    lastMessage: 'Sure, let\'s meet at 3pm tomorrow!',
    lastMessageTime: Date.now() - 1000 * 60 * 5,
    unreadCount: { [SAMPLE_USER_ID]: 2, 'user-2': 0 },
    participantNames: { [SAMPLE_USER_ID]: 'You', 'user-2': 'Sarah Ahmed' },
    participantPhotos: { [SAMPLE_USER_ID]: '', 'user-2': '' },
  },
  {
    id: 'chat-2',
    participants: [SAMPLE_USER_ID, 'user-3'],
    lastMessage: 'Thanks for the calculus help!',
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 2,
    unreadCount: { [SAMPLE_USER_ID]: 0, 'user-3': 0 },
    participantNames: { [SAMPLE_USER_ID]: 'You', 'user-3': 'Ali Hassan' },
    participantPhotos: { [SAMPLE_USER_ID]: '', 'user-3': '' },
  },
  {
    id: 'chat-3',
    participants: [SAMPLE_USER_ID, 'user-4'],
    lastMessage: 'Can you tutor me in Physics?',
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 24,
    unreadCount: { [SAMPLE_USER_ID]: 1, 'user-4': 0 },
    participantNames: { [SAMPLE_USER_ID]: 'You', 'user-4': 'Fatima Khan' },
    participantPhotos: { [SAMPLE_USER_ID]: '', 'user-4': '' },
  },
  {
    id: 'chat-4',
    participants: [SAMPLE_USER_ID, 'user-5'],
    lastMessage: 'See you in the library!',
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 48,
    unreadCount: { [SAMPLE_USER_ID]: 0, 'user-5': 0 },
    participantNames: { [SAMPLE_USER_ID]: 'You', 'user-5': 'Omar Raza' },
    participantPhotos: { [SAMPLE_USER_ID]: '', 'user-5': '' },
  },
];

const SAMPLE_MESSAGES: Record<string, Message[]> = {
  'chat-1': [
    { id: 'm1', senderId: 'user-2', text: 'Hey! Are you available for a study session?', timestamp: Date.now() - 1000 * 60 * 30, type: 'text' },
    { id: 'm2', senderId: SAMPLE_USER_ID, text: 'Hi Sarah! Yes, I\'m free tomorrow afternoon.', timestamp: Date.now() - 1000 * 60 * 25, type: 'text' },
    { id: 'm3', senderId: 'user-2', text: 'Great! What time works for you?', timestamp: Date.now() - 1000 * 60 * 20, type: 'text' },
    { id: 'm4', senderId: SAMPLE_USER_ID, text: 'How about 3pm? We can cover linear algebra.', timestamp: Date.now() - 1000 * 60 * 15, type: 'text' },
    { id: 'm5', senderId: 'user-2', text: 'Perfect! Should I bring my notes?', timestamp: Date.now() - 1000 * 60 * 10, type: 'text' },
    { id: 'm6', senderId: SAMPLE_USER_ID, text: 'Yes please, and the practice problems from chapter 5.', timestamp: Date.now() - 1000 * 60 * 8, type: 'text' },
    { id: 'm7', senderId: 'user-2', text: 'Sure, let\'s meet at 3pm tomorrow!', timestamp: Date.now() - 1000 * 60 * 5, type: 'text' },
  ],
  'chat-2': [
    { id: 'm1', senderId: SAMPLE_USER_ID, text: 'Hey Ali, how did the exam go?', timestamp: Date.now() - 1000 * 60 * 60 * 3, type: 'text' },
    { id: 'm2', senderId: 'user-3', text: 'It went really well! Got an A.', timestamp: Date.now() - 1000 * 60 * 60 * 2.5, type: 'text' },
    { id: 'm3', senderId: 'user-3', text: 'Thanks for the calculus help!', timestamp: Date.now() - 1000 * 60 * 60 * 2, type: 'text' },
  ],
  'chat-3': [
    { id: 'm1', senderId: 'user-4', text: 'Hi! I saw your profile on StudySync.', timestamp: Date.now() - 1000 * 60 * 60 * 25, type: 'text' },
    { id: 'm2', senderId: 'user-4', text: 'Can you tutor me in Physics?', timestamp: Date.now() - 1000 * 60 * 60 * 24, type: 'text' },
  ],
  'chat-4': [
    { id: 'm1', senderId: SAMPLE_USER_ID, text: 'Hey Omar, want to study together for the midterm?', timestamp: Date.now() - 1000 * 60 * 60 * 50, type: 'text' },
    { id: 'm2', senderId: 'user-5', text: 'Absolutely! Library at 2pm?', timestamp: Date.now() - 1000 * 60 * 60 * 49, type: 'text' },
    { id: 'm3', senderId: SAMPLE_USER_ID, text: 'Sounds good!', timestamp: Date.now() - 1000 * 60 * 60 * 48.5, type: 'text' },
    { id: 'm4', senderId: 'user-5', text: 'See you in the library!', timestamp: Date.now() - 1000 * 60 * 60 * 48, type: 'text' },
  ],
};

const SAMPLE_PROPOSALS: Record<string, SessionProposal> = {
  'proposal-1': {
    id: 'proposal-1',
    chatId: 'chat-1',
    fromId: 'user-2',
    toId: SAMPLE_USER_ID,
    subject: 'Linear Algebra',
    dateTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    duration: 60,
    price: 0,
    isMutual: true,
    status: 'pending',
  },
};

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Biology',
  'English', 'Economics', 'Business', 'Psychology', 'Statistics',
  'Engineering', 'Accounting', 'Marketing', 'History', 'Philosophy',
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatProposalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function shouldShowTimestamp(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const diff = messages[index].timestamp - messages[index - 1].timestamp;
  return diff > 1000 * 60 * 15; // 15 minutes gap
}

// ─── Typing Indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <User size={14} className="text-white/50" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-white/40 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Session Proposal Card ──────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  isMine,
  onAccept,
  onDecline,
}: {
  proposal: SessionProposal;
  isMine: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    accepted: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    declined: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`max-w-[320px] rounded-2xl p-4 border ${
        isMine
          ? 'ml-auto bg-[#7C3AED]/15 border-[#7C3AED]/30'
          : 'mr-auto bg-[#06B6D4]/10 border-[#06B6D4]/25'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} className="text-[#06B6D4]" />
        <span className="text-sm font-semibold text-white">Session Proposal</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/50">Subject</span>
          <span className="text-white font-medium">{proposal.subject}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Date & Time</span>
          <span className="text-white font-medium">{formatProposalDate(proposal.dateTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Duration</span>
          <span className="text-white font-medium">
            {proposal.duration >= 60
              ? `${proposal.duration / 60}h`
              : `${proposal.duration}m`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Price</span>
          <span className="text-white font-medium">
            {proposal.isMutual ? '🤝 Mutual Exchange' : `Rs. ${proposal.price}`}
          </span>
        </div>
      </div>

      {isMine ? (
        <div className="mt-3 flex justify-end">
          <span
            className={`text-xs px-3 py-1 rounded-full border ${statusColors[proposal.status]}`}
          >
            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
          </span>
        </div>
      ) : proposal.status === 'pending' ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            <Check size={14} /> Accept
          </button>
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            <X size={14} /> Decline
          </button>
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <span
            className={`text-xs px-3 py-1 rounded-full border ${statusColors[proposal.status]}`}
          >
            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────────


import { useSearchParams } from 'next/navigation';

export default function MessagesPage() {
  const { user, profile: _profile } = useAuth();
  const currentUserId = user?.uid || SAMPLE_USER_ID;

  // State
  const [conversations, setConversations] = useState<ChatConversation[]>(SAMPLE_CONVERSATIONS);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposals, setProposals] = useState<Record<string, SessionProposal>>(SAMPLE_PROPOSALS);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [usingSampleData, setUsingSampleData] = useState(false);

  // Proposal form
  const [proposalSubject, setProposalSubject] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [proposalTime, setProposalTime] = useState('');
  const [proposalDuration, setProposalDuration] = useState(60);
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalMutual, setProposalMutual] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Open chat from query param
  const searchParams = useSearchParams();
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId) {
      setActiveChat(chatId);
      setShowMobileChat(true);
    }
  }, [searchParams]);

  // ─── Firebase: Load Conversations ───────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) {
      setUsingSampleData(true);
      setConversations(SAMPLE_CONVERSATIONS);
      return;
    }

    let cancelled = false;

    async function loadConversations() {
      try {
        const q = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user!.uid)
        );
        const snap = await getDocs(q);

        if (snap.empty && !cancelled) {
          setUsingSampleData(true);
          setConversations(SAMPLE_CONVERSATIONS);
          return;
        }

        if (!cancelled) {
          const convos = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ChatConversation));
          convos.sort((a: ChatConversation, b: ChatConversation) => b.lastMessageTime - a.lastMessageTime);
          setConversations(convos);
          setUsingSampleData(false);
        }
      } catch {
        if (!cancelled) {
          setUsingSampleData(true);
          setConversations(SAMPLE_CONVERSATIONS);
        }
      }
    }

    loadConversations();
    return () => { cancelled = true; };
  }, [user]);

  // ─── Firebase: Load Messages for Active Chat ───────────────────────────────

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    if (usingSampleData) {
      setMessages(SAMPLE_MESSAGES[activeChat] || []);
      // Simulate typing indicator briefly
      setIsTyping(true);
      const t = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(t);
    }

    const messagesRef = ref(rtdb, `messages/${activeChat}`);

    const handleValue = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const msgList: Message[] = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          senderId: val.senderId,
          text: val.text,
          timestamp: val.timestamp,
          type: val.type || 'text',
          proposalId: val.proposalId,
        }));
        msgList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    };

    onValue(messagesRef, handleValue);

    return () => {
      off(messagesRef, 'value', handleValue);
    };
  }, [activeChat, usingSampleData]);

  // ─── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const otherName = Object.entries(c.participantNames).find(
        ([id]) => id !== currentUserId
      )?.[1];
      return otherName?.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, currentUserId]);

  const activeChatData = useMemo(
    () => conversations.find((c) => c.id === activeChat),
    [conversations, activeChat]
  );

  const recipientName = useMemo(() => {
    if (!activeChatData) return '';
    const entry = Object.entries(activeChatData.participantNames).find(
      ([id]) => id !== currentUserId
    );
    return entry?.[1] || 'Unknown';
  }, [activeChatData, currentUserId]);

  const recipientId = useMemo(() => {
    if (!activeChatData) return '';
    return activeChatData.participants.find((id) => id !== currentUserId) || '';
  }, [activeChatData, currentUserId]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const selectChat = useCallback((chatId: string) => {
    setActiveChat(chatId);
    setShowMobileChat(true);
  }, []);

  const goBackToList = useCallback(() => {
    setShowMobileChat(false);
    // Delay clearing activeChat so animation plays
    setTimeout(() => setActiveChat(null), 300);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || !activeChat) return;

    setNewMessage('');

    if (usingSampleData) {
      const msg: Message = {
        id: `m-${Date.now()}`,
        senderId: currentUserId,
        text,
        timestamp: Date.now(),
        type: 'text',
      };
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat
            ? { ...c, lastMessage: text, lastMessageTime: Date.now() }
            : c
        )
      );
      // Simulate reply
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const reply: Message = {
            id: `m-${Date.now()}-reply`,
            senderId: recipientId,
            text: getAutoReply(text),
            timestamp: Date.now(),
            type: 'text',
          };
          setMessages((prev) => [...prev, reply]);
        }, 1500);
      }, 500);
      return;
    }

    try {
      const messagesRef = ref(rtdb, `messages/${activeChat}`);
      const newRef = push(messagesRef);
      await set(newRef, {
        senderId: currentUserId,
        text,
        timestamp: Date.now(),
        type: 'text',
      });

      const convoRef = doc(db, 'conversations', activeChat);
      await updateDoc(convoRef, {
        lastMessage: text,
        lastMessageTime: Date.now(),
        [`unreadCount.${recipientId}`]: (activeChatData?.unreadCount?.[recipientId] || 0) + 1,
      });
    } catch (err) {
      console.error('Send message error:', err);
      toast.error('Failed to send message');
    }
  }, [newMessage, activeChat, currentUserId, recipientId, usingSampleData, activeChatData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleAcceptProposal = useCallback(
    async (proposalId: string) => {
      const proposal = proposals[proposalId];
      if (!proposal) return;

      const updated = { ...proposal, status: 'accepted' as const };
      setProposals((prev) => ({ ...prev, [proposalId]: updated }));
      toast.success('Session proposal accepted!');

      if (!usingSampleData) {
        try {
          const proposalRef = doc(db, 'proposals', proposalId);
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
        } catch (err) {
          console.error('Accept proposal error:', err);
        }
      }
    },
    [proposals, usingSampleData]
  );

  const handleDeclineProposal = useCallback(
    async (proposalId: string) => {
      const proposal = proposals[proposalId];
      if (!proposal) return;

      const updated = { ...proposal, status: 'declined' as const };
      setProposals((prev) => ({ ...prev, [proposalId]: updated }));
      toast('Session proposal declined', { icon: '❌' });

      if (!usingSampleData) {
        try {
          const proposalRef = doc(db, 'proposals', proposalId);
          await updateDoc(proposalRef, { status: 'declined' });
        } catch (err) {
          console.error('Decline proposal error:', err);
        }
      }
    },
    [proposals, usingSampleData]
  );

  const sendProposal = useCallback(async () => {
    if (!proposalSubject || !proposalDate || !proposalTime || !activeChat) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSendingProposal(true);

    const dateTime = new Date(`${proposalDate}T${proposalTime}`).toISOString();
    const proposalId = `proposal-${Date.now()}`;
    const newProposal: SessionProposal = {
      id: proposalId,
      chatId: activeChat,
      fromId: currentUserId,
      toId: recipientId,
      subject: proposalSubject,
      dateTime,
      duration: proposalDuration,
      price: proposalMutual ? 0 : Number(proposalPrice) || 0,
      isMutual: proposalMutual,
      status: 'pending',
    };

    setProposals((prev) => ({ ...prev, [proposalId]: newProposal }));

    // Add a proposal message to chat
    const proposalMsg: Message = {
      id: `m-${Date.now()}-p`,
      senderId: currentUserId,
      text: `📅 Session Proposal: ${proposalSubject}`,
      timestamp: Date.now(),
      type: 'proposal',
      proposalId,
    };

    if (usingSampleData) {
      setMessages((prev) => [...prev, proposalMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat
            ? { ...c, lastMessage: `📅 Session Proposal: ${proposalSubject}`, lastMessageTime: Date.now() }
            : c
        )
      );
    } else {
      try {
        const messagesRef = ref(rtdb, `messages/${activeChat}`);
        const newRef = push(messagesRef);
        await set(newRef, {
          senderId: currentUserId,
          text: `📅 Session Proposal: ${proposalSubject}`,
          timestamp: Date.now(),
          type: 'proposal',
          proposalId,
        });

        const proposalRef = doc(db, 'proposals', proposalId);
        await setDoc(proposalRef, newProposal);

        const convoRef = doc(db, 'conversations', activeChat);
        await updateDoc(convoRef, {
          lastMessage: `📅 Session Proposal: ${proposalSubject}`,
          lastMessageTime: Date.now(),
        });
      } catch (err) {
        console.error('Send proposal error:', err);
        toast.error('Failed to send proposal');
      }
    }

    toast.success('Session proposal sent!');
    setShowProposalModal(false);
    setProposalSubject('');
    setProposalDate('');
    setProposalTime('');
    setProposalDuration(60);
    setProposalPrice('');
    setProposalMutual(false);
    setSendingProposal(false);
  }, [
    proposalSubject, proposalDate, proposalTime, proposalDuration,
    proposalPrice, proposalMutual, activeChat, currentUserId,
    recipientId, usingSampleData,
  ]);

  // ─── Auto Reply (demo) ─────────────────────────────────────────────────────

  function getAutoReply(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
      return 'Hey there! How can I help you today? 😊';
    if (lower.includes('session') || lower.includes('study'))
      return 'Sure, I\'d love to schedule a study session! When works for you?';
    if (lower.includes('thanks') || lower.includes('thank'))
      return 'You\'re welcome! Happy to help anytime 🙌';
    if (lower.includes('?'))
      return 'That\'s a great question! Let me think about it.';
    return 'Sounds good! 👍';
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-[#7C3AED]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-[#06B6D4]/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-white/[0.06]"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare size={24} className="text-[#7C3AED]" />
              <h1 className="text-xl font-bold">Messages</h1>
            </div>
            {usingSampleData && (
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                Demo Mode
              </span>
            )}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl w-full mx-auto flex overflow-hidden">
          {/* ─── Left Panel: Conversation List ────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`w-full md:w-[340px] lg:w-[360px] flex-shrink-0 border-r border-white/[0.06] flex flex-col ${
              showMobileChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search */}
            <div className="p-4">
              <GlassInput
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                }
              />
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/30">
                  <MessageSquare size={48} className="mb-4 opacity-50" />
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs mt-1 text-white/20">
                    Start connecting with study partners
                  </p>
                </div>
              ) : (
                filteredConversations.map((convo) => {
                  const otherEntry = Object.entries(convo.participantNames).find(
                    ([id]) => id !== currentUserId
                  );
                  const otherName = otherEntry?.[1] || 'Unknown';
                  const unread = convo.unreadCount?.[currentUserId] || 0;
                  const isActive = activeChat === convo.id;

                  return (
                    <motion.button
                      key={convo.id}
                      onClick={() => selectChat(convo.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-white/[0.08] border-l-2 border-l-[#7C3AED]'
                          : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                      }`}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                          isActive
                            ? 'bg-[#7C3AED]/30 text-[#7C3AED]'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {getInitials(otherName)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                            {otherName}
                          </span>
                          <span className="text-[11px] text-white/30 flex-shrink-0 ml-2">
                            {formatTime(convo.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-white/40 truncate pr-2">
                            {convo.lastMessage}
                          </p>
                          {unread > 0 && (
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#7C3AED] text-[10px] font-bold text-white">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* ─── Right Panel: Chat Window ─────────────────────────────── */}
          <div
            className={`flex-1 flex flex-col ${
              showMobileChat ? 'flex' : 'hidden md:flex'
            }`}
          >
            {!activeChat ? (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 rounded-3xl bg-[#7C3AED]/10 flex items-center justify-center mx-auto mb-6">
                    <MessageSquare size={36} className="text-[#7C3AED]/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/60 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-sm text-white/30 max-w-[260px]">
                    Choose a conversation from the list to start messaging
                  </p>
                </motion.div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Back Arrow (mobile) */}
                    <button
                      onClick={goBackToList}
                      className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>

                    {/* Recipient Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-sm font-bold text-[#7C3AED]">
                      {getInitials(recipientName)}
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold text-white">
                        {recipientName}
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] text-white/40">Online</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => setShowProposalModal(true)}
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">Propose Session</span>
                    </GlassButton>
                  </div>
                </motion.div>

                {/* Messages Area */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                >
                  <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => {
                      const isMine = msg.senderId === currentUserId;
                      const showTs = shouldShowTimestamp(messages, idx);

                      return (
                        <div key={msg.id}>
                          {/* Timestamp separator */}
                          {showTs && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-[11px] text-white/20 bg-white/[0.03] px-3 py-1 rounded-full">
                                {formatMessageTime(msg.timestamp)}
                              </span>
                            </div>
                          )}

                          {/* Proposal Card */}
                          {msg.type === 'proposal' && msg.proposalId && proposals[msg.proposalId] ? (
                            <div className="mb-3">
                              <ProposalCard
                                proposal={proposals[msg.proposalId]}
                                isMine={proposals[msg.proposalId].fromId === currentUserId}
                                onAccept={() => handleAcceptProposal(msg.proposalId!)}
                                onDecline={() => handleDeclineProposal(msg.proposalId!)}
                              />
                            </div>
                          ) : (
                            /* Regular Message Bubble */
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`flex mb-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isMine && (
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mr-2 mt-auto">
                                  <span className="text-[10px] font-bold text-white/40">
                                    {getInitials(recipientName)}
                                  </span>
                                </div>
                              )}
                              <div
                                className={`max-w-[75%] sm:max-w-[60%] px-4 py-2.5 text-sm leading-relaxed ${
                                  isMine
                                    ? 'bg-[#7C3AED]/25 border border-[#7C3AED]/20 text-white rounded-2xl rounded-br-md'
                                    : 'bg-white/[0.06] border border-white/[0.08] text-white/90 rounded-2xl rounded-bl-md'
                                }`}
                              >
                                {msg.text}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Typing Indicator */}
                  {isTyping && <TypingIndicator />}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C3AED]/50 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] transition-all"
                      />
                    </div>
                    <motion.button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="w-11 h-11 rounded-2xl bg-[#7C3AED]/30 border border-[#7C3AED]/30 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#7C3AED]/50 transition-colors flex-shrink-0"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Send size={18} />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Session Proposal Modal ──────────────────────────────────────── */}
      <GlassModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        title="Propose a Session"
      >
        <div className="space-y-5">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Subject</label>
            <select
              value={proposalSubject}
              onChange={(e) => setProposalSubject(e.target.value)}
              className="w-full px-4 py-3 rounded-[14px] bg-white/[0.05] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-[#7C3AED]/60 appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1a1a2e]">Select a subject</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s} className="bg-[#1a1a2e]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Date</label>
            <input
              type="date"
              value={proposalDate}
              onChange={(e) => setProposalDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-[14px] bg-white/[0.05] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-[#7C3AED]/60 [color-scheme:dark]"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Time</label>
            <input
              type="time"
              value={proposalTime}
              onChange={(e) => setProposalTime(e.target.value)}
              className="w-full px-4 py-3 rounded-[14px] bg-white/[0.05] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-[#7C3AED]/60 [color-scheme:dark]"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Duration</label>
            <select
              value={proposalDuration}
              onChange={(e) => setProposalDuration(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-[14px] bg-white/[0.05] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-[#7C3AED]/60 appearance-none cursor-pointer"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1a2e]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price / Mutual */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/60">Price (Rs.)</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proposalMutual}
                  onChange={(e) => setProposalMutual(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#7C3AED] focus:ring-[#7C3AED]/50 focus:ring-offset-0 accent-[#7C3AED]"
                />
                <span className="text-xs text-white/50">Mutual Exchange</span>
              </label>
            </div>
            {!proposalMutual && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input
                  type="number"
                  value={proposalPrice}
                  onChange={(e) => setProposalPrice(e.target.value)}
                  placeholder="e.g. 500"
                  min="0"
                  className="w-full px-4 py-3 rounded-[14px] bg-white/[0.05] border border-white/[0.12] text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C3AED]/60"
                />
              </motion.div>
            )}
          </div>

          {/* Submit */}
          <GlassButton
            variant="primary"
            className="w-full mt-2"
            onClick={sendProposal}
            disabled={sendingProposal}
            loading={sendingProposal}
          >
            <Calendar size={18} className="mr-2" />
            Send Proposal
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}
