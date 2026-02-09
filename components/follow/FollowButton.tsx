"use client";

import { motion } from "framer-motion";
import { Check, HelpCircle, UserPlus } from "lucide-react";
import { useFollow } from "@/features/follow/hooks/useFollow";

interface FollowButtonProps {
  /** ObjectId */
  targetUserId: string;
}

export default function FollowButton({ targetUserId }: FollowButtonProps) {
  const { following, loading, toggleFollow } = useFollow(targetUserId);

  // ✅ 未確定 or 通信中は必ず spinner
  if (loading || following === null) {
    return (
      <div className="px-4 h-9 rounded-full border border-gray-300 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <motion.button
      onClick={toggleFollow}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={[
        "group relative inline-flex items-center gap-2",
        "px-4 h-9 rounded-full text-sm font-semibold select-none",
        "transition-colors duration-300 ease-out",
        following
          ? "bg-blue-600 text-white hover:bg-red-600"
          : "border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40",
      ].join(" ")}
    >
      {!following && <UserPlus size={16} />}

      {following && (
        <>
          <Check size={16} className="group-hover:hidden" />
          <HelpCircle size={16} className="hidden group-hover:inline" />
        </>
      )}

      <span>
        {!following && "Follow"}
        {following && (
          <>
            <span className="group-hover:hidden">Following</span>
            <span className="hidden group-hover:inline">Unfollow</span>
          </>
        )}
      </span>
    </motion.button>
  );
}

function Spinner() {
  return (
    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}
