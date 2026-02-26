# StudySync — Study Partner Finding Platform

A full-stack Next.js 14 web application that helps university students find compatible study partners through smart matching, real-time messaging, and gamified learning.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Static Export) |
| Language | TypeScript |
| Styling | Tailwind CSS, Custom Glass Morphism Design System |
| Animations | Framer Motion |
| Backend | Firebase (Auth, Firestore, Realtime Database, Storage, Cloud Functions) |
| Hosting | Firebase Hosting |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Dates | date-fns |
| Notifications | react-hot-toast |

## Features

- **Smart Matching** — Algorithm matches students by complementary subjects, availability, CGPA, and university
- **Real-time Messaging** — Firebase RTDB-powered chat with session proposals and accept/decline flows
- **Study Rooms** — Pomodoro timer, shared todo lists, session chat, and notes
- **Leaderboard** — Weekly/all-time rankings by sessions, rating, and streaks
- **Browse & Filter** — Search partners by subject, semester, role, rating, CGPA, and more
- **Session Booking** — Schedule, confirm, and review study sessions
- **Grade Verification** — Upload transcripts for a verified profile badge
- **Gamification** — Study streaks, star ratings, and rank progression

## Design System

Crystal Glass / Liquid Glass UI inspired by Apple visionOS:
- Dark theme only (background: `#0A0A0F`)
- Primary: Electric Violet (`#7C3AED`) / Secondary: Cyan (`#06B6D4`)
- Glassmorphism with `backdrop-filter: blur()`, subtle borders, inner highlights
- Reusable components: `GlassCard`, `GlassButton`, `GlassInput`, `GlassMenu`, `GlassModal`
- Every interaction has a Framer Motion animation

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── providers.tsx         # Auth provider + Toaster
│   ├── globals.css           # Global styles + glass classes
│   ├── auth/
│   │   ├── login/page.tsx    # Login
│   │   └── signup/page.tsx   # Sign up
│   ├── onboarding/page.tsx   # Multi-step onboarding
│   ├── dashboard/page.tsx    # Dashboard
│   ├── browse/page.tsx       # Browse partners
│   ├── profile/[uid]/page.tsx # User profile
│   ├── matches/page.tsx      # Smart matches
│   ├── messages/page.tsx     # Real-time messaging
│   ├── sessions/page.tsx     # Session management
│   ├── room/[sessionId]/page.tsx # Study room
│   ├── leaderboard/page.tsx  # Rankings
│   └── settings/page.tsx     # Profile settings
├── components/
│   ├── layout/
│   │   └── Navbar.tsx        # Glass navigation bar
│   └── ui/
│       ├── GlassCard.tsx     # Reusable glass card
│       ├── GlassButton.tsx   # Reusable glass button
│       ├── GlassInput.tsx    # Reusable glass input
│       ├── GlassMenu.tsx     # Dropdown menu
│       ├── GlassModal.tsx    # Modal dialog
│       └── Skeleton.tsx      # Loading skeletons
├── contexts/
│   └── AuthContext.tsx       # Firebase auth context
└── lib/
    ├── firebase.ts           # Firebase initialization
    ├── types.ts              # TypeScript type definitions
    └── utils.ts              # Utility functions (cn)

functions/
└── src/
    └── index.ts              # Cloud Functions (matching, streaks, reviews)
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project

### 1. Clone & Install

```bash
cd studysync-app
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable these services:
   - **Authentication** → Email/Password sign-in
   - **Cloud Firestore** → Start in test mode
   - **Realtime Database** → Create database
   - **Storage** → Start in test mode
   - **Functions** → Upgrade to Blaze plan (required)
3. Go to Project Settings → General → Your apps → Add Web App
4. Copy the config values

### 3. Environment Variables

Edit `.env.local` with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

### 4. Deploy Firebase Rules

```bash
firebase login
firebase init  # Select your project
firebase deploy --only firestore:rules,database,storage
```

### 5. Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Build & Deploy to Firebase Hosting

```bash
npm run build        # Creates static export in /out
firebase deploy --only hosting
```

## Firestore Data Model

```
users/{uid}           → UserProfile (name, email, university, subjects, etc.)
sessions/{sessionId}  → Session (tutor, learner, subject, status, etc.)
conversations/{id}    → ChatConversation (participants, lastMessage, etc.)
reviews/{reviewId}    → Review (sessionId, rating, comment, etc.)
bookmarks/{uid}/saved/{targetUid} → Bookmark flag
proposals/{id}        → SessionProposal (subject, dateTime, price, etc.)
```

## Cloud Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `onSessionComplete` | Firestore update | Updates streaks & session counts when both confirm |
| `calculateMatch` | HTTP callable | Runs matching algorithm, returns sorted matches |
| `onNewReview` | Firestore create | Recalculates user's average rating |
| `weeklyStreakReset` | Scheduled (daily) | Resets streaks for users inactive > 7 days |
| `verifyUniversityEmail` | Auth create | Validates .edu email domain |

## Security Rules

- Users can only edit their own profile
- Sessions are only readable by participants
- Reviews are write-once per user per session
- Storage files are size-limited and type-restricted
- Realtime Database messages require authentication

## License

MIT
