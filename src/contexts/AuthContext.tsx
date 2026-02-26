'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, data: Partial<UserProfile>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profileData = { uid, ...docSnap.data() } as UserProfile;

        // Passive weekly streak reset: if last session was > 7 days ago, reset streak
        if (profileData.streak > 0 && profileData.lastSessionDate) {
          const lastDate = new Date(profileData.lastSessionDate);
          const daysSince = Math.floor(
            (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince > 7) {
            await updateDoc(docRef, { streak: 0 });
            profileData.streak = 0;
          }
        }

        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, data: Partial<UserProfile>) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Send email verification
    try {
      await sendEmailVerification(result.user);
    } catch (e) {
      console.warn('Could not send verification email:', e);
    }

    const userData: Partial<UserProfile> = {
      uid: result.user.uid,
      email,
      name: data.name || '',
      university: data.university || '',
      degree: data.degree || '',
      semester: data.semester || 1,
      cgpa: data.cgpa || 0,
      profilePhoto: '',
      role: 'both',
      bio: '',
      subjects_teaching: [],
      subjects_learning: [],
      availability: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
      preferredMode: 'both',
      hourlyRate: 0,
      isMutual: true,
      isVerified: false,
      verificationDoc: '',
      rating: 0,
      totalRatings: 0,
      totalSessions: 0,
      streak: 0,
      lastSessionDate: '',
      createdAt: new Date().toISOString(),
      isOnline: true,
      onboardingComplete: false,
      ...data,
    };
    await setDoc(doc(db, 'users', result.user.uid), userData);
    setProfile(userData as UserProfile);
  };

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchProfile(result.user.uid);
    await updateDoc(doc(db, 'users', result.user.uid), { isOnline: true });
  };

  const signOut = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { isOnline: false });
      } catch {}
    }
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfileFn = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), data as any);
    setProfile((prev) => prev ? { ...prev, ...data } : null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile: updateProfileFn,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
