"use client";

import { useCallback, useState } from "react";
import { rememberTx } from "@/lib/recentTx";
import type { Post } from "@/types/post";

type UpvoteResult = {
  ok: boolean;
  action: "added" | "removed";
};

export function usePostUpvote(
  post: Post,
  setPost: React.Dispatch<React.SetStateAction<Post | null>>,
  onUpvote?: (
    postId: string,
    userId: string,
    txId?: string
  ) => Promise<UpvoteResult | void>
) {
  const [pending, setPending] = useState(false);

  const upvote = useCallback(
    async (userId: string) => {
      if (!userId || pending) return;

      const upvoters = (post.upvoters ?? []).map(String);
      const already = upvoters.includes(userId);

      const txId = crypto.randomUUID();
      rememberTx(txId);

      setPending(true);

      // ✅ optimistic update
      setPost((prev) => {
        if (!prev) return prev;

        const prevUpvoters = (prev.upvoters ?? []).map(String);
        const hasUpvoted = prevUpvoters.includes(userId);

        return {
          ...prev,
          upvoteCount:
            (prev.upvoteCount ?? 0) + (hasUpvoted ? -1 : 1),
          upvoters: hasUpvoted
            ? prevUpvoters.filter((id) => id !== userId)
            : [...prevUpvoters, userId],
        };
      });

      try {
        await onUpvote?.(post._id, userId, txId);
      } catch {
        // rollback handled by SSE
      } finally {
        setPending(false);
      }
    },
    [post, pending, setPost, onUpvote]
  );

  return { upvote, pending };
}
