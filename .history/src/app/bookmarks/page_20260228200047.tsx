"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import type { UserProfile } from "@/lib/types";
import Link from "next/link";
import { Bookmark } from "lucide-react";

export default function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarkedProfiles, setBookmarkedProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const fetchBookmarks = async () => {
      setLoading(true);
      const userRef = collection(db, "users");
      const userSnap = await getDocs(query(userRef, where("uid", "==", user.uid)));
      let bookmarks: string[] = [];
      userSnap.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.bookmarked)) bookmarks = data.bookmarked;
      });
      if (bookmarks.length > 0) {
        const batches = [];
        for (let i = 0; i < bookmarks.length; i += 10) {
          batches.push(bookmarks.slice(i, i + 10));
        }
        let profiles: UserProfile[] = [];
        for (const batch of batches) {
          const q = query(collection(db, "users"), where("__name__", "in", batch));
          const snap = await getDocs(q);
          profiles = profiles.concat(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
        }
        setBookmarkedProfiles(profiles);
      } else {
        setBookmarkedProfiles([]);
      }
      setLoading(false);
    };
    fetchBookmarks();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="w-7 h-7 text-[#06B6D4]" />
          <h1 className="text-2xl font-bold text-white">Bookmarked Profiles</h1>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bookmark className="w-10 h-10 text-white/20 mb-2" />
            <p className="text-white/40 text-sm">Loading...</p>
          </div>
        ) : bookmarkedProfiles.length === 0 ? (
          <GlassCard hover={false} className="flex flex-col items-center justify-center py-16 text-center">
            <Bookmark className="w-10 h-10 text-white/20 mb-2" />
            <p className="text-white/40 text-sm">No bookmarks yet</p>
            <Link href="/browse">
              <GlassButton variant="primary" size="sm" className="mt-4">Browse Profiles</GlassButton>
            </Link>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-4">
            {bookmarkedProfiles.map((p) => (
              <GlassCard key={p.uid} hover className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-[#06B6D4]/20 text-[#06B6D4]">
                  {p.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{p.name}</p>
                  <p className="text-white/40 text-sm truncate">{p.university}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#06B6D4]/15 text-xs text-[#06B6D4] border border-[#06B6D4]/20">
                    {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                  </span>
                </div>
                <GlassButton variant="primary" size="sm" className="shrink-0" onClick={() => router.push(`/profile/${p.uid}`)}>
                  View
                </GlassButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
