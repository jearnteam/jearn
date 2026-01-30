// components/follow/FollowStats.tsx
"use client";

import { useState } from "react";
import { useFollowCount } from "@/features/follow/hooks/useFollowCount";
import FollowListModal from "./FollowListModal";

export default function FollowStats({ userId }: { userId: string }) {
  const { followers, following, loading } = useFollowCount(userId);
  const [open, setOpen] = useState<null | "followers" | "following">(null);

  if (loading) return null;

  return (
    <>
      <div className="flex gap-6 text-sm mt-2">
        <button
          onClick={() => setOpen("followers")}
          className="hover:underline"
        >
          <span className="font-semibold">{followers}</span> Followers
        </button>

        <button
          onClick={() => setOpen("following")}
          className="hover:underline"
        >
          <span className="font-semibold">{following}</span> Following
        </button>
      </div>

      {open && (
        <FollowListModal
          userId={userId}
          type={open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
