"use client";

import { useCallback, useEffect, useState } from "react";
import { rememberTx } from "@/lib/recentTx";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Post } from "@/types/post";

export function usePostUpvote(
  post: Post,
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>
) {
  const { user } = useCurrentUser();
  const userId = user?._id ?? "";

  const [postState, setPostState] = useState(post);
  const [pending, setPending] = useState(false);

  // sync when post updates from parent (SSE etc.)
  useEffect(() => {
    setPostState(post);
  }, [post]);

  const hasUpvoted = Boolean(
    userId && postState.upvoters?.includes(userId)
  );

  const handleUpvote = useCallback(async () => {
    if (!userId || pending) return;

    setPending(true);

    const already = postState.upvoters.includes(userId);
    const txId = crypto.randomUUID();
    rememberTx(txId);

    // optimistic update
    setPostState((prev) => ({
      ...prev,
      upvoteCount: already
        ? prev.upvoteCount - 1
        : prev.upvoteCount + 1,
      upvoters: already
        ? prev.upvoters.filter((id) => id !== userId)
        : [...prev.upvoters, userId],
    }));

    try {
      if (onUpvote) {
        await onUpvote(postState._id, userId, txId);
      } else {
        await fetch(`/api/posts/${postState._id}/upvote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, txId }),
        });
      }
    } catch {
      // rollback
      setPostState((prev) => ({
        ...prev,
        upvoteCount: already
          ? prev.upvoteCount + 1
          : prev.upvoteCount - 1,
        upvoters: already
          ? [...prev.upvoters, userId]
          : prev.upvoters.filter((id) => id !== userId),
      }));
    }

    setPending(false);
  }, [userId, pending, postState, onUpvote]);

  return {
    handleUpvote,
    hasUpvoted,
    pending,
    count: postState.upvoteCount ?? 0,
  };
}
