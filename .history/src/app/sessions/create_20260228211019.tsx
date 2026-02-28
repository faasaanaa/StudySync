"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateSessionPage() {
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!subject.trim() || !user) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        tutorId: user.uid,
        subject,
        duration,
        status: "upcoming",
        createdAt: serverTimestamp(),
        tutorConfirmed: false,
        learnerConfirmed: false,
      });
      router.push(`/room/${docRef.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
      <GlassCard className="max-w-md w-full p-8 flex flex-col gap-6 items-center">
        <h2 className="text-2xl font-bold text-white mb-2">Create a Session</h2>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject (e.g. Calculus)"
          className="w-full p-3 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <input
          type="number"
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          min={15}
          max={240}
          className="w-full p-3 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <GlassButton variant="primary" size="lg" className="w-full" onClick={handleCreate} loading={loading}>
          Create Session
        </GlassButton>
      </GlassCard>
    </div>
  );
}
