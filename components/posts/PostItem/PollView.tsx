"use client";

import type { Post } from "@/types/post";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useState, useMemo } from "react";

export default function PollView({
  post,
  onVote,
}: {
  post: Post;
  onVote: (postId: string, optionId: string) => Promise<void> | void;
}) {
  const { user } = useCurrentUser();
  const [isVoting, setIsVoting] = useState(false);

  /**
   * Local optimistic state:
   * - null → trust server
   * - [] / ["id"] / ["id","id"] → trust client
   */
  const [localVotedIds, setLocalVotedIds] = useState<string[] | null>(null);

  const poll = post.poll;
  const viewerId = user?._id ?? null;

  /* ─────────────────────────────────────────────
   * SERVER VOTE NORMALIZATION
   * ───────────────────────────────────────────── */
  const serverVotedIds = useMemo<string[]>(() => {
    if (!poll || !viewerId) return [];

    const v = poll.votedOptionIds;
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return [v];

    return [];
  }, [poll, viewerId]);

  /* ─────────────────────────────────────────────
   * FINAL SOURCE OF TRUTH
   * ───────────────────────────────────────────── */
  const votedIds = localVotedIds ?? serverVotedIds;

  /* ─────────────────────────────────────────────
   * DERIVED FLAGS
   * ───────────────────────────────────────────── */
  const isMulti = poll?.allowMultiple === true;

  const isExpired = useMemo(() => {
    if (!poll?.expiresAt) return false;
    return Date.now() > new Date(poll.expiresAt).getTime();
  }, [poll?.expiresAt]);

  const expiresLabel = useMemo(() => {
    if (!poll?.expiresAt) return null;

    const d = new Date(poll.expiresAt);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [poll?.expiresAt]);

  if (!user || !poll) return null;

  const hasVoted = votedIds.length > 0;
  const showResults = hasVoted || isExpired;

  /* ─────────────────────────────────────────────
   * ACTION
   * ───────────────────────────────────────────── */
  async function handleVote(optionId: string) {
    if (isVoting || isExpired) return;

    setIsVoting(true);

    // 🔥 optimistic update (single source: what user sees NOW)
    setLocalVotedIds((prev) => {
      const current = prev ?? serverVotedIds;

      if (isMulti) {
        return current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      }

      // single choice → toggle allowed
      return current[0] === optionId ? [] : [optionId];
    });

    try {
      await onVote(post._id, optionId);
    } finally {
      setTimeout(() => setIsVoting(false), 0);
    }
  }

  /* ─────────────────────────────────────────────
   * RENDER
   * ───────────────────────────────────────────── */
  return (
    <div
      className={`
        mt-4 rounded-lg border p-4 space-y-3
        bg-gray-50 dark:bg-neutral-800
        ${isVoting ? "opacity-70" : ""}
        ${isExpired ? "opacity-60" : ""}
      `}
    >
      {poll.options.map((opt) => {
        const percent =
          poll.totalVotes > 0
            ? Math.round((opt.voteCount / poll.totalVotes) * 100)
            : 0;

        const isSelected = votedIds.includes(opt.id);

        return (
          <label
            key={opt.id}
            className={`
              relative flex items-center gap-3 w-full
              px-3 py-2 rounded-md border
              transition cursor-pointer overflow-hidden
              ${
                isSelected
                  ? "ring-2 ring-blue-500 font-semibold"
                  : "hover:bg-gray-100 dark:hover:bg-neutral-700"
              }
              ${isVoting || isExpired ? "pointer-events-none" : ""}
            `}
          >
            <input
              type={isMulti ? "checkbox" : "radio"}
              name={`poll-${post._id}`}
              checked={isSelected}
              readOnly
              className="accent-blue-600"
            />

            {showResults && (
              <div
                className={`
                  absolute inset-y-0 left-0
                  ${isSelected ? "bg-blue-500/30" : "bg-gray-400/20"}
                `}
                style={{ width: `${percent}%` }}
              />
            )}

            <div
              className="relative z-10 flex-1 flex justify-between items-center"
              onClick={() => handleVote(opt.id)}
            >
              <span>{opt.text}</span>
              {showResults && (
                <span className="text-sm tabular-nums">{percent}%</span>
              )}
            </div>
          </label>
        );
      })}

      <div className="flex justify-between text-xs text-gray-500">
        <div>
          {expiresLabel && (
            <span>
              {isExpired ? "Closed" : "Ends"} • {expiresLabel}
            </span>
          )}
        </div>

        <div>
          {poll.totalVotes} votes
          {hasVoted && !isExpired && " • You voted"}
          {isMulti && hasVoted && !isExpired && " (multiple)"}
          {isVoting && " • submitting…"}
          {isExpired && " • Poll closed"}
        </div>
      </div>
    </div>
  );
}
