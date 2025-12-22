"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Post, PostType } from "@/types/post";
import { isRecentTx } from "@/lib/recentTx";

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const sseRef = useRef<EventSource | null>(null);
  const hasFetchedRef = useRef(false);


  /* -------------------------------------------------------------------------- */
  /*                                 INITIAL FETCH                               */
  /* -------------------------------------------------------------------------- */
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch posts");

      const data = await res.json();
      const topLevel = data.filter((p: Post) => !p.parentId);

      setPosts(topLevel);
    } catch (err) {
      console.error("❌ Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                                 SSE CONNECTION                              */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchPosts();

    const es = new EventSource("/api/stream");
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setPosts((prev) => {
          switch (data.type) {
            case "new-post":
              if (!data.post || data.post.parentId) return prev;
              if (prev.some((p) => p._id === data.post._id)) return prev;
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
                  ? {
                      ...p,
                      commentCount: (p.commentCount ?? 0) + data.delta,
                    }
                  : p
              );

            default:
              return prev;
          }
        });
      } catch {
        console.warn("⚠️ SSE parse error");
      }
    };

    es.onerror = () => {
      console.warn("⚠️ SSE Error — retrying…");
    };

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [fetchPosts]);

  /* -------------------------------------------------------------------------- */
  /*                               ADD POST                                      */
  /* -------------------------------------------------------------------------- */
  const addPost = useCallback(
    async (
      postType: PostType,
      title: string,
      content: string,
      authorId: string | null,
      categories: string[],
      tags: string[]
    ) => {
      if (!authorId) return;

      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType,
          title,
          content,
          authorId,
          categories,
          tags,
        }),
      }).catch((e) => console.error("🔥 addPost error:", e));
    },
    []
  );

  /* -------------------------------------------------------------------------- */
  /*                                 EDIT POST                                   */
  /* -------------------------------------------------------------------------- */
  const editPost = useCallback(
    async (
      id: string,
      title: string,
      content: string,
      categories?: string[],
      tags?: string[]
    ) => {
      // Optimistic: update title/content immediately
      setPosts((prev) =>
        prev.map((p) =>
          p._id === id
            ? {
                ...p,
                title,
                content,
                edited: true,
                editedAt: new Date().toISOString(),
              }
            : p
        )
      );

      const res = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, content, categories, tags }),
      });

      // If backend fails, refetch to stay consistent
      if (!res.ok) {
        console.error("❌ editPost() failed, refetching posts...");
        fetchPosts();
        return;
      }

      // Optional: merge latest version from server
      const { post: updated } = await res.json();
      if (updated) {
        setPosts((prev) => prev.map((p) => (p._id === id ? updated : p)));
      }
    },
    [fetchPosts]
  );

  /* -------------------------------------------------------------------------- */
  /*                               DELETE POST                                   */
  /* -------------------------------------------------------------------------- */
  const deletePost = useCallback(async (id: string) => {
    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch((e) => console.error("❌ deletePost:", e));
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                                 UPVOTE POST                                 */
  /* -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------- */
  /*                                   RETURN                                    */
  /* -------------------------------------------------------------------------- */
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
