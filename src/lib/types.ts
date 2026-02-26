// StudySync Type Definitions

export interface SubjectGrade {
  subject: string;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C';
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "10:00"
}

export interface Availability {
  mon: TimeSlot[];
  tue: TimeSlot[];
  wed: TimeSlot[];
  thu: TimeSlot[];
  fri: TimeSlot[];
  sat: TimeSlot[];
  sun: TimeSlot[];
}

export type UserRole = 'tutor' | 'learner' | 'both';
export type StudyMode = 'online' | 'in-person' | 'both';
export type SessionStatus = 'upcoming' | 'completed' | 'cancelled';
export type ProposalStatus = 'pending' | 'accepted' | 'declined';
export type MessageType = 'text' | 'proposal';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  university: string;
  degree: string;
  semester: number;
  cgpa: number;
  profilePhoto: string;
  role: UserRole;
  bio: string;
  subjects_teaching: SubjectGrade[];
  subjects_learning: string[];
  availability: Availability;
  preferredMode: StudyMode;
  hourlyRate: number;
  isMutual: boolean;
  isVerified: boolean;
  verificationDoc: string;
  rating: number;
  totalRatings: number;
  totalSessions: number;
  streak: number;
  lastSessionDate: string;
  createdAt: string;
  isOnline: boolean;
  onboardingComplete: boolean;
}

export interface Session {
  id: string;
  tutorId: string;
  learnerId: string;
  subject: string;
  dateTime: string;
  duration: number;
  mode: StudyMode;
  price: number;
  status: SessionStatus;
  tutorConfirmed: boolean;
  learnerConfirmed: boolean;
  createdAt: string;
  tutorName?: string;
  learnerName?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: MessageType;
  proposalId?: string;
}

export interface SessionProposal {
  id: string;
  chatId: string;
  fromId: string;
  toId: string;
  subject: string;
  dateTime: string;
  duration: number;
  price: number;
  isMutual: boolean;
  status: ProposalStatus;
}

export interface Review {
  id: string;
  sessionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName?: string;
  reviewerPhoto?: string;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: Record<string, number>;
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
}

export interface MatchResult {
  user: UserProfile;
  score: number;
  matchingSubjects: string[];
  matchingTeach: string[];   // their teaching ∩ your learning
  matchingLearn: string[];   // your teaching ∩ their learning
  overlappingSlots: number;
  reasons: string[];
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  profilePhoto: string;
  university: string;
  totalSessions: number;
  rating: number;
  streak: number;
  score: number;
  rank: number;
}

export interface SessionNote {
  id: string;
  sessionId: string;
  content: string;
  updatedAt: number;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdBy: string;
}
