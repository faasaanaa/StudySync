// Client-side matching algorithm for StudySync
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, MatchResult } from '@/lib/types';

/**
 * Fetch all eligible users and compute match scores against the current user.
 *
 * Scoring breakdown (max 100):
 *   +40  their teaching ∩ your learning
 *   +40  your teaching ∩ their learning
 *   +10  same university
 *   +5   overlapping availability slots
 *   +5   rating bonus (rating ≥ 4.0)
 */
export async function findMatches(currentUser: UserProfile): Promise<MatchResult[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('onboardingComplete', '==', true));
  const snapshot = await getDocs(q);

  const matches: MatchResult[] = [];

  const myTeaching = new Set(
    (currentUser.subjects_teaching || []).map((s) => s.subject.toLowerCase()),
  );
  const myLearning = new Set(
    (currentUser.subjects_learning || []).map((s) => s.toLowerCase()),
  );

  for (const docSnap of snapshot.docs) {
    if (docSnap.id === currentUser.uid) continue;

    const other = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    let score = 0;
    const matchingSubjects: string[] = [];
    const reasons: string[] = [];

    // 1. Their teaching ∩ your learning (40 pts max)
    const theirTeaching = (other.subjects_teaching || []).map((s) => s.subject.toLowerCase());
    const matchingTeachRaw: string[] = [];
    let teachScore = 0;
    for (const subject of theirTeaching) {
      if (myLearning.has(subject)) {
        teachScore += 13;
        matchingTeachRaw.push(subject);
        matchingSubjects.push(subject);
      }
    }
    score += Math.min(teachScore, 40);
    if (matchingTeachRaw.length > 0) {
      reasons.push('Teaches subjects you want to learn');
    }

    // 2. Your teaching ∩ their learning (40 pts max)
    const theirLearning = (other.subjects_learning || []).map((s) => s.toLowerCase());
    const matchingLearnRaw: string[] = [];
    let learnScore = 0;
    for (const subject of theirLearning) {
      if (myTeaching.has(subject)) {
        learnScore += 13;
        matchingLearnRaw.push(subject);
        if (!matchingSubjects.includes(subject)) {
          matchingSubjects.push(subject);
        }
      }
    }
    score += Math.min(learnScore, 40);
    if (matchingLearnRaw.length > 0) {
      reasons.push('Wants to learn subjects you teach');
    }

    // 3. Same university (10 pts)
    if (
      currentUser.university &&
      other.university &&
      currentUser.university.toLowerCase() === other.university.toLowerCase()
    ) {
      score += 10;
      reasons.push('Same university');
    }

    // 4. Overlapping availability (5 pts max)
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
    let overlappingSlots = 0;
    for (const day of days) {
      const mySlots = currentUser.availability?.[day] ?? [];
      const theirSlots = other.availability?.[day] ?? [];
      for (const ms of mySlots) {
        for (const ts of theirSlots) {
          if (ms.start === ts.start) {
            overlappingSlots++;
          }
        }
      }
    }
    score += Math.min(overlappingSlots, 5);
    if (overlappingSlots > 0) {
      reasons.push(`${overlappingSlots} overlapping time slots`);
    }

    // 5. Rating bonus (5 pts for users rated ≥ 4.0)
    if (other.rating >= 4.0) {
      score += 5;
      reasons.push('Highly rated');
    }

    score = Math.min(score, 100);

    if (score > 0) {
      const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

      matches.push({
        user: other,
        score,
        matchingSubjects: matchingSubjects.map(titleCase),
        matchingTeach: matchingTeachRaw.map(titleCase),
        matchingLearn: matchingLearnRaw.map(titleCase),
        overlappingSlots,
        reasons,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 20);
}
