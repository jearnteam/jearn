"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Post } from "@/types/post";
import { isRecentTx } from "@/lib/recentTx";

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const sseRef = useRef<EventSource | null>(null);

  /** --------------------------------------
   *  Initial Load — run ONLY once
   * -------------------------------------- */
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();

      const topLevel = Array.isArray(data)
        ? data.filter((p) => !p.parentId)
        : data.posts || [];

      setPosts(topLevel);
    } catch (err) {
      console.error("❌ Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** --------------------------------------
   *  SSE setup — run only once
   * -------------------------------------- */
  useEffect(() => {
    fetchPosts(); // Initial fetch only

    const es = new EventSource("/api/stream");
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setPosts((prev) => {
          switch (data.type) {
            case "new-post":
              if (!data.post || data.post.parentId) return prev;
              if (prev.some((x) => x._id === data.post._id)) return prev;
              return [data.post, ...prev];

            case "update-post":
              return prev.map((p) =>
                p._id === data.postId ? { ...p, ...data.post } : p
              );

            case "delete-post":
              return prev.filter((p) => p._id !== data.id);

            case "upvote":
              if (isRecentTx(data.txId)) return prev;
              return prev.map((p) =>
                p._id === data.postId
                  ? {
                      ...p,
                      upvoteCount:
                        (p.upvoteCount ?? 0) +
                        (data.action === "added" ? 1 : -1),
                      upvoters:
                        data.action === "added"
                          ? [...(p.upvoters ?? []), data.userId]
                          : (p.upvoters ?? []).filter((u) => u !== data.userId),
                    }
                  : p
              );

            case "update-comment-count":
              return prev.map((p) =>
                p._id === data.parentId
                  ? { ...p, commentCount: (p.commentCount ?? 0) + data.delta }
                  : p
              );

            default:
              return prev;
          }
        });
      } catch {
        console.warn("⚠️ Malformed SSE payload");
      }
    };

    es.onerror = () => console.warn("⚠️ SSE Error — Retrying...");

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, []); // ❗ EMPTY DEP ARRAY — runs once

  /** --------------------------------------
   *  Add Post
   * -------------------------------------- */
  const addPost = useCallback(
    async (
      title: string,
      content: string,
      authorId: string | null,
      categories: string[]
    ) => {
      if (!authorId) {
        console.warn("Skipping post: no author ID");
        return;
      }
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, authorId, categories }),
      }).catch((err) => console.error("🔥 addPost error:", err));
    },
    []
  );

  /** --------------------------------------
   *  Edit Post
   * -------------------------------------- */
  const editPost = useCallback(
    async (id: string, title: string, content: string) => {
      // optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, title, content } : p
        )
      );

      const res = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, content }),
      });

      if (!res.ok) fetchPosts();
    },
    [fetchPosts]
  );

  /** --------------------------------------
   *  Delete Post
   * -------------------------------------- */
  const deletePost = useCallback(async (id: string) => {
    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch((e) => console.error("❌ deletePost:", e));
  }, []);

  /** --------------------------------------
   *  Upvote Post
   * -------------------------------------- */
  const upvotePost = useCallback(
    async (id: string, userId: string, txId: string) => {
      await fetch(`/api/posts/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, txId }),
      }).catch((e) => console.error("❌ upvotePost:", e));
    },
    []
  );

  return {
    posts,
    loading,
    refetch: fetchPosts,
    addPost,
    editPost,
    deletePost,
    upvotePost,
  };
}
