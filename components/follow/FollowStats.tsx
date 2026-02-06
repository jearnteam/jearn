// components/follow/FollowStats.tsx
"use client";

import { useState } from "react";
import { useFollowCount } from "@/features/follow/hooks/useFollowCount";
import FollowListModal from "./FollowListModal";

interface FollowStatsProps {
  userId?: string;
  direction?: "row" | "column";
}

export default function FollowStats({
  userId,
  direction = "row",
}: FollowStatsProps) {
  if (!userId) return null;

  const { followers, following, loading } = useFollowCount(userId);
  const [open, setOpen] = useState<null | "followers" | "following">(null);

  if (loading) return null;

  const isColumn = direction === "column";

  return (
    <>
      {/* Stats */}
      <div
        className={
          isColumn
            ? "flex flex-col items-start gap-1 text-sm mt-2"
            : "flex items-center gap-6 text-sm mt-2"
        }
      >
        <button
          onClick={() => setOpen("followers")}
          className="hover:underline text-left"
        >
          <span className="font-semibold">{followers}</span>{" "}
          <span className="text-neutral-500">Followers</span>
        </button>

        <button
          onClick={() => setOpen("following")}
          className="hover:underline text-left"
        >
          <span className="font-semibold">{following}</span>{" "}
          <span className="text-neutral-500">Following</span>
        </button>
      </div>

      {/* Modal */}
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
