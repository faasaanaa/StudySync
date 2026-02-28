"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useRouter } from "next/navigation";

export default function JoinSessionPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (code.trim()) {
      router.push(`/room/${code.trim()}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
      <GlassCard className="max-w-md w-full p-8 flex flex-col gap-6 items-center">
        <h2 className="text-2xl font-bold text-white mb-2">Join a Session</h2>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Enter session ID (from creator)"
          className="w-full p-3 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <GlassButton variant="primary" size="lg" className="w-full" onClick={handleJoin}>
          Join Session
        </GlassButton>
      </GlassCard>
    </div>
  );
}
