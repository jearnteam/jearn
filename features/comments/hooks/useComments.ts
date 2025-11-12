// features/comments/hooks/useComments.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Post } from "@/types/post";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useComments(initialComments: Post[], postId: string) {
  const { user } = useCurrentUser();
  const [comments, setComments] = useState<Post[]>(initialComments);
  const sseRef = useRef<EventSource | null>(null);

  // ✅ Helper to dedupe by Mongo _id
  const dedupe = (arr: Post[]) =>
    Array.from(new Map(arr.map((c) => [c._id, c])).values());

  // ✅ Refetch comments manually if needed
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

  // ✅ SSE Listener (works for ALL users)
  useEffect(() => {
    const es = new EventSource("/api/stream");
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data?.type || !data.post) return;
        // ✅ Only process if the event belongs to this post
        if (data.post.parentId !== postId) return;

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

            case "upvote":
            case "upvote-comment":
            case "upvote-reply":
              // ✅ apply to comment or reply inside this post
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
                            : (c.upvoters ?? []).filter(
                                (u) => u !== data.userId
                              ),
                      }
                    : c
                )
              );

            case "delete-comment":
            case "delete-reply":
            case "delete-post":
              return prev.filter((c) => c._id !== data.id);

            default:
              return prev;
          }
        });
      } catch (err) {
        console.error("❌ SSE parse error:", err);
      }
    };

    es.onerror = () => {
      console.warn("⚠️ SSE connection error — retrying…");
    };

    return () => {
      es.close();
    };
  }, [postId]);

  // ✅ Add new comment (no optimistic UI)
  const addComment = useCallback(
    async (content: string) => {
      if (!user) return alert("Please log in.");
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: user.uid,
          content,
          parentId: postId,
          replyTo: null,
        }),
      }).catch(console.error);
    },
    [user, postId]
  );

  // ✅ Add reply (no optimistic UI)
  const addReply = useCallback(
    async (parentId: string, replyTo: string | null, content: string) => {
      if (!user) return alert("Please log in to reply.");
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: user.uid,
          content,
          parentId,
          replyTo,
        }),
      }).catch(console.error);
    },
    [user]
  );

  // ✅ Edit / Delete / Upvote
  const editComment = useCallback(async (id: string, content: string) => {
    await fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content }),
    }).catch((e) => console.error("❌ editComment:", e));
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch((e) => console.error("❌ deleteComment:", e));
  }, []);

  const upvoteComment = useCallback(async (id: string, userId: string) => {
    await fetch(`/api/posts/${id}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch((e) => console.error("❌ upvoteComment:", e));
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
