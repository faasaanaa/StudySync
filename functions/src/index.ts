// Cloud Functions for StudySync
// Deploy with: cd functions && npm install && npx firebase deploy --only functions

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

// ============================================================
// 1. onSessionComplete
// Triggers when both users confirm a session is complete
// Updates streaks, increments totalSessions, updates leaderboard
// ============================================================
export const onSessionComplete = functions.firestore
  .document('sessions/{sessionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if both users have now confirmed
    if (
      after.tutorConfirmed &&
      after.learnerConfirmed &&
      (!before.tutorConfirmed || !before.learnerConfirmed)
    ) {
      const sessionId = context.params.sessionId;
      const batch = db.batch();
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Update session status
      batch.update(change.after.ref, { status: 'completed' });

      // Update both users
      for (const uid of [after.tutorId, after.learnerId]) {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const userData = userDoc.data()!;
          const lastDate = userData.lastSessionDate || '';
          const currentStreak = userData.streak || 0;

          // Check if streak should increment or reset
          let newStreak = 1;
          if (lastDate) {
            const lastSessionDate = new Date(lastDate);
            const daysDiff = Math.floor(
              (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff <= 7) {
              newStreak = currentStreak + 1;
            }
          }

          batch.update(userRef, {
            totalSessions: admin.firestore.FieldValue.increment(1),
            streak: newStreak,
            lastSessionDate: today,
          });
        }
      }

      await batch.commit();
      console.log(`Session ${sessionId} completed. Updated both users.`);
    }
  });

// ============================================================
// 2. calculateMatch
// HTTP callable function for matching algorithm
// ============================================================
export const calculateMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to find matches.'
    );
  }

  const currentUid = context.auth.uid;
  const currentUserDoc = await db.collection('users').doc(currentUid).get();

  if (!currentUserDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }

  const currentUser = currentUserDoc.data()!;

  // Get all other users
  const usersSnapshot = await db
    .collection('users')
    .where('onboardingComplete', '==', true)
    .limit(100)
    .get();

  const matches: Array<{
    uid: string;
    score: number;
    matchingSubjects: string[];
    overlappingSlots: number;
  }> = [];

  for (const doc of usersSnapshot.docs) {
    if (doc.id === currentUid) continue;

    const otherUser = doc.data();
    let score = 0;
    const matchingSubjects: string[] = [];
    let overlappingSlots = 0;

    // 1. Their teaching matches your learning (30 points max)
    const theirTeachingSubjects = (otherUser.subjects_teaching || []).map(
      (s: any) => s.subject
    );
    const yourLearning = currentUser.subjects_learning || [];

    for (const subject of yourLearning) {
      if (theirTeachingSubjects.includes(subject)) {
        score += 10;
        matchingSubjects.push(subject);
      }
    }
    score = Math.min(score, 30);

    // 2. Your teaching matches their learning (30 points max)
    const yourTeachingSubjects = (currentUser.subjects_teaching || []).map(
      (s: any) => s.subject
    );
    const theirLearning = otherUser.subjects_learning || [];
    let reverseScore = 0;

    for (const subject of theirLearning) {
      if (yourTeachingSubjects.includes(subject)) {
        reverseScore += 10;
        if (!matchingSubjects.includes(subject)) {
          matchingSubjects.push(subject);
        }
      }
    }
    score += Math.min(reverseScore, 30);

    // 3. Same university bonus (15 points)
    if (
      currentUser.university &&
      otherUser.university &&
      currentUser.university.toLowerCase() === otherUser.university.toLowerCase()
    ) {
      score += 15;
    }

    // 4. Overlapping availability (10 points max)
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (const day of days) {
      const yourSlots = (currentUser.availability || {})[day] || [];
      const theirSlots = (otherUser.availability || {})[day] || [];

      for (const ys of yourSlots) {
        for (const ts of theirSlots) {
          if (ys.start === ts.start) {
            overlappingSlots++;
          }
        }
      }
    }
    score += Math.min(overlappingSlots * 2, 10);

    // 5. Similar CGPA (15 points)
    if (currentUser.cgpa && otherUser.cgpa) {
      const cgpaDiff = Math.abs(currentUser.cgpa - otherUser.cgpa);
      if (cgpaDiff <= 0.5) score += 15;
      else if (cgpaDiff <= 1.0) score += 8;
    }

    // Only include if there's some compatibility
    if (score > 0) {
      matches.push({
        uid: doc.id,
        score: Math.min(score, 100),
        matchingSubjects,
        overlappingSlots,
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return { matches: matches.slice(0, 20) };
});

// ============================================================
// 3. onNewReview
// Triggers when a review is created, recalculates average rating
// ============================================================
export const onNewReview = functions.firestore
  .document('reviews/{reviewId}')
  .onCreate(async (snap) => {
    const review = snap.data();
    const revieweeId = review.revieweeId;

    // Get all reviews for this user
    const reviewsSnapshot = await db
      .collection('reviews')
      .where('revieweeId', '==', revieweeId)
      .get();

    let totalRating = 0;
    let count = 0;

    reviewsSnapshot.forEach((doc) => {
      totalRating += doc.data().rating;
      count++;
    });

    const averageRating = count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;

    await db.collection('users').doc(revieweeId).update({
      rating: averageRating,
      totalRatings: count,
    });

    console.log(
      `Updated rating for user ${revieweeId}: ${averageRating} (${count} reviews)`
    );
  });

// ============================================================
// 4. weeklyStreakReset
// Scheduled function: resets streaks for inactive users
// Runs every day at midnight UTC
// ============================================================
export const weeklyStreakReset = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    const usersSnapshot = await db
      .collection('users')
      .where('streak', '>', 0)
      .get();

    const batch = db.batch();
    let resetCount = 0;

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.lastSessionDate && userData.lastSessionDate < cutoffString) {
        batch.update(doc.ref, { streak: 0 });
        resetCount++;
      }
    });

    if (resetCount > 0) {
      await batch.commit();
    }

    console.log(`Reset streaks for ${resetCount} inactive users.`);
  });

// ============================================================
// 5. verifyUniversityEmail
// Triggers on user creation, validates email domain format
// ============================================================
export const verifyUniversityEmail = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  if (!email) return;

  const domain = email.split('@')[1];
  const isEdu = domain?.endsWith('.edu') || domain?.endsWith('.edu.pk') || 
                domain?.endsWith('.ac.uk') || domain?.endsWith('.edu.au');

  // Store verification status
  await db.collection('users').doc(user.uid).set(
    {
      emailVerified: isEdu,
      emailDomain: domain,
    },
    { merge: true }
  );

  console.log(
    `User ${user.uid} (${email}): university email ${isEdu ? 'verified' : 'not recognized'}`
  );
});
