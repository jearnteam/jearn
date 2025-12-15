"use client";

import { useCallback, useState } from "react";
import { rememberTx } from "@/lib/recentTx";

export function usePostUpvote(
  post: any,
  setPost: any,
  onUpvote?: any
) {
  const [pending, setPending] = useState(false);

  const upvote = useCallback(
    async (userId: string) => {
      if (!userId || pending) return;

      const already = post.upvoters.includes(userId);
      const txId = crypto.randomUUID();
      rememberTx(txId);

      setPending(true);
      setPost((p: any) => ({
        ...p,
        upvoteCount: already ? p.upvoteCount - 1 : p.upvoteCount + 1,
        upvoters: already
          ? p.upvoters.filter((id: string) => id !== userId)
          : [...p.upvoters, userId],
      }));

      try {
        await onUpvote?.(post._id, userId, txId);
      } catch {
        // rollback handled by SSE anyway
      }

      setPending(false);
    },
    [post, pending]
  );

  return { upvote, pending };
}
