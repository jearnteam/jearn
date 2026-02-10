"use client";

import type { Post } from "@/types/post";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useState, useMemo, useEffect } from "react";

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function PollView({
  post,
  onVote,
}: {
  post: Post;
  onVote: (
    postId: string,
    optionId: string
  ) => Promise<{
    poll: Post["poll"];
    votedOptionIds: string[];
  } | null>;
}) {
  const { user } = useCurrentUser();
  const [isVoting, setIsVoting] = useState(false);

  /* 🔥 SERVER-TRUTH POLL STATE */
  const [localPoll, setLocalPoll] = useState(post.poll);

  /* sync if parent updates (SSE, refetch, etc.) */
  useEffect(() => {
    setLocalPoll(post.poll);
  }, [post.poll]);

  const poll = localPoll;
  const viewerId = user?._id ?? null;

  const serverVotedIds = useMemo<string[]>(() => {
    if (!poll || !viewerId) return [];
    const v = poll.votedOptionIds;
    return Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  }, [poll, viewerId]);

  const isMulti = poll?.allowMultiple === true;

  const isExpired = useMemo(() => {
    if (!poll?.expiresAt) return false;
    return Date.now() > new Date(poll.expiresAt).getTime();
  }, [poll?.expiresAt]);

  const expiresLabel = useMemo(() => {
    if (!poll?.expiresAt) return null;
    return new Date(poll.expiresAt).toLocaleString();
  }, [poll?.expiresAt]);

  if (!user || !poll) return null;

  const hasVoted = serverVotedIds.length > 0;
  const showResults = hasVoted || isExpired;

  /* ─────────────────────────────────────────────
   * ACTION — FULLY SERVER-DRIVEN
   * ───────────────────────────────────────────── */
  async function handleVote(optionId: string) {
    if (isVoting || isExpired) return;

    setIsVoting(true);

    try {
      const res = await onVote(post._id, optionId);
      if (res?.poll) {
        setLocalPoll({
          ...res.poll,
          votedOptionIds: res.votedOptionIds,
        });
      }
    } finally {
      setIsVoting(false);
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
    transition
    ${
      isExpired
        ? "opacity-60 grayscale pointer-events-none"
        : isVoting
        ? "opacity-60 pointer-events-none"
        : ""
    }
  `}
    >
      {poll.options.map((opt) => {
        const percent =
          poll.totalVotes > 0
            ? Math.round((opt.voteCount / poll.totalVotes) * 100)
            : 0;

        const isSelected = serverVotedIds.includes(opt.id);
        const showSpinner = isVoting && isSelected && !isExpired;

        return (
          <label
            key={opt.id}
            className={`relative flex items-center gap-3 w-full px-3 py-2 rounded-md border overflow-hidden transition ${
              isExpired
                ? "cursor-default"
                : "cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
            } ${
              isSelected && !isExpired
                ? "ring-2 ring-blue-500 font-semibold"
                : ""
            }`}
            onClick={() => handleVote(opt.id)}
          >
            <input
              type={isMulti ? "checkbox" : "radio"}
              checked={isSelected}
              readOnly
              className="accent-blue-600"
            />

            {showResults && (
              <div
                className={`absolute inset-y-0 left-0 ${
                  isSelected ? "bg-blue-500/30" : "bg-gray-400/20"
                }`}
                style={{ width: `${percent}%` }}
              />
            )}

            <div className="relative z-10 flex-1 flex justify-between items-center">
              <span>{opt.text}</span>

              {showSpinner ? (
                <Spinner />
              ) : (
                showResults && (
                  <span className="text-sm tabular-nums">{percent}%</span>
                )
              )}
            </div>
          </label>
        );
      })}

      <div className="flex justify-between text-xs text-gray-500">
        <div>
        {isExpired
            ? `Expired • ${expiresLabel}`
            : `${!expiresLabel}`
            ? ""
            : `Ends • ${expiresLabel}`}
        </div>

        <div>
          {isExpired
            ? `(Poll closed) ${poll.totalVotes} votes`
            : isVoting
            ? "Submitting…"
            : `${poll.totalVotes} votes${hasVoted ? " • You voted" : ""}`}
        </div>
      </div>
    </div>
  );
}
