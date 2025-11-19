"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Post } from "@/types/post";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getSSE } from "../sse";

export function useComments(initialComments: Post[], postId: string) {
  const { user } = useCurrentUser();
  const [comments, setComments] = useState<Post[]>(initialComments);
  const sseRef = useRef<EventSource | null>(null);

  const dedupe = (arr: Post[]) =>
    Array.from(new Map(arr.map((c) => [c._id, c])).values());

  // REFRESH
  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        cache: "no-store",
      });
      if (res.ok) {
        const fresh = await res.json();
        setComments(dedupe(fresh));
      }
    } catch (err) {
      console.error("❌ Failed to refetch comments:", err);
    }
  }, [postId]);

  /* ============================================================
     SSE LISTENER — FIXED FILTER LOGIC
     ============================================================ */
  useEffect(() => {
    const { subscribe } = getSSE();

    const unsubscribe = subscribe((data) => {
      if (!data?.type) return;

      // Only handle for this post
      if (data.post?.parentId !== postId && data.parentId !== postId) return;

      setComments((prev) => {
        switch (data.type) {
          case "new-comment":
          case "new-reply":
            return dedupe([...prev, data.post]);

          case "update-comment":
          case "update-reply":
            return dedupe(
              prev.map((c) =>
                c._id === data.post._id ? { ...c, ...data.post } : c
              )
            );

          case "upvote-comment":
          case "upvote-reply":
            return dedupe(
              prev.map((c) =>
                c._id === data.postId
                  ? {
                      ...c,
                      upvoteCount:
                        (c.upvoteCount ?? 0) +
                        (data.action === "added" ? 1 : -1),
                      upvoters:
                        data.action === "added"
                          ? [...(c.upvoters ?? []), data.userId]
                          : (c.upvoters ?? []).filter((u) => u !== data.userId),
                    }
                  : c
              )
            );

          case "delete-comment":
          case "delete-reply":
            return prev.filter((c) => c._id !== data.id);

          default:
            return prev;
        }
      });
    });

    return unsubscribe;
  }, [postId]);

  /* ============================================================
      COMMENT ACTIONS
     ============================================================ */

  const addComment = useCallback(
    async (content: string) => {
      if (!user?._id) return alert("Please log in.");
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: user._id,
          content,
          parentId: postId,
          replyTo: null,
        }),
      });
    },
    [user, postId]
  );

  const addReply = useCallback(
    async (parentId: string, replyTo: string | null, content: string) => {
      if (!user?._id) return alert("Please log in.");
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: user._id,
          content,
          parentId,
          replyTo,
        }),
      });
    },
    [user]
  );

  const editComment = useCallback(async (id: string, content: string) => {
    await fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content }),
    });
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }, []);

  const upvoteComment = useCallback(async (id: string, userId: string) => {
    await fetch(`/api/posts/${id}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }, []);

  return {
    comments,
    refetch,
    addComment,
    addReply,
    editComment,
    deleteComment,
    upvoteComment,
  };
}
