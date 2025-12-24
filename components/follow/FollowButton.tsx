"use client";

import { motion } from "framer-motion";
import { Check, HelpCircle, UserPlus } from "lucide-react";
import { useFollow } from "@/features/follow/hooks/useFollow";

interface FollowButtonProps {
  targetUserId: string;
}

export default function FollowButton({ targetUserId }: FollowButtonProps) {
  const { following, loading, toggleFollow } = useFollow(targetUserId);

  return (
    <motion.button
      onClick={toggleFollow}
      disabled={loading}
      whileTap={{ scale: 0.94 }}
      whileHover={!loading ? { scale: 1.06 } : undefined}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={[
        "group relative inline-flex items-center gap-2",
        "px-4 h-9 rounded-full text-sm font-semibold select-none",
        "transition-colors duration-300 ease-out",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        following
          ? "bg-blue-600 text-white hover:bg-red-600"
          : "border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40",
      ].join(" ")}
    >
      {!loading && !following && <UserPlus size={16} />}
      {!loading && following && (
        <>
          <Check size={16} className="group-hover:hidden" />
          <HelpCircle size={16} className="hidden group-hover:inline" />
        </>
      )}
      {loading && <Spinner />}
      <span className="relative">
        {!loading && !following && "Follow"}
        {!loading && following && (
          <>
            <span className="group-hover:hidden">Following</span>
            <span className="hidden group-hover:inline">Unfollow</span>
          </>
        )}
        {loading && "Processing"}
      </span>
    </motion.button>
  );
}

function Spinner() {
  return (
    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}
