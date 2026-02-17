"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostTypes, type Post, type PostType } from "@/types/post";
import { isRecentTx } from "@/lib/recentTx";

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const sseRef = useRef<EventSource | null>(null);
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  /* -------------------------------------------------------------------------- */
  /*                               FETCH NEXT BATCH                              */
  /* -------------------------------------------------------------------------- */
  const fetchNext = useCallback(async () => {
    if (!hasMore || fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      const params = new URLSearchParams();
      params.set("limit", "10");
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/posts?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch posts");

      const data = await res.json();

      setPosts((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      console.error("❌ fetchNext failed:", err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [cursor, hasMore]);

  /* -------------------------------------------------------------------------- */
  /*                               PULL TO REFRESH                               */
  /* -------------------------------------------------------------------------- */
  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", "10");

      const res = await fetch(`/api/posts?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to refresh posts");

      const data = await res.json();

      // 🔑 状態をすべて初期化
      setPosts(data.items);
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      console.error("❌ refresh failed:", err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                               VOTE POLL                                     */
  /* -------------------------------------------------------------------------- */
  const votePoll = async (postId: string, optionId: string) => {
    const res = await fetch("/api/posts/polls/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, optionId }),
    });

    if (!res.ok) return;

    const { poll, votedOptionIds } = await res.json();

    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              poll: {
                ...poll,
                votedOptionIds: Array.isArray(votedOptionIds)
                  ? votedOptionIds
                  : [],
              },
            }
          : p
      )
    );
  };

  /* -------------------------------------------------------------------------- */
  /*                               INITIAL LOAD                                  */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    fetchNext();

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

            case "poll-vote":
              if (isRecentTx(data.txId)) return prev;

              return prev.map((p) =>
                p._id === data.postId && p.poll
                  ? {
                      ...p,
                      poll: {
                        ...p.poll,
                        totalVotes: p.poll.totalVotes + 1,
                        options: p.poll.options.map((o) =>
                          o.id === data.optionId
                            ? { ...o, voteCount: o.voteCount + 1 }
                            : o
                        ),
                      },
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
      console.warn("⚠️ SSE error — reconnecting automatically");
    };

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [fetchNext]);

  /* -------------------------------------------------------------------------- */
  /*                               CREATE POST                                   */
  /* -------------------------------------------------------------------------- */
  const addPost = useCallback(
    async (
      postType: PostType,
      title: string,
      content: string,
      authorId: string | null,
      categories: string[],
      tags: string[],
      references?: string[],
      poll?: {
        options: {
          id: string;
          text: string;
          voteCount: number;
        }[];
        totalVotes: number;
        allowMultiple?: boolean;
        expiresAt?: string | null;
      },
      video?: {
        url: string;
        thumbnailUrl?: string;
        duration?: number;
        aspectRatio?: number;
      },
      commentDisabled?: boolean
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
          references,
          poll,
          video,
          commentDisabled,
        }),
      }).catch((e) => console.error("🔥 addPost error:", e));
    },
    []
  );

  /* -------------------------------------------------------------------------- */
  /*                               ADD ANSWER                                    */
  /* -------------------------------------------------------------------------- */
  const addAnswer = useCallback(
    async (
      _postType: PostType,
      title: string,
      content: string,
      authorId: string | null,
      parentId: string,
      tags: string[],
      references?: string[],
      commentDisabled?: boolean
    ) => {
      if (!authorId) return;

      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: PostTypes.ANSWER,
          title,
          content,
          authorId,
          parentId,
          tags,
          references,
          commentDisabled,
        }),
      }).catch((e) => console.error("🔥 addAnswer error:", e));
    },
    []
  );

  /* -------------------------------------------------------------------------- */
  /*                               EDIT POST                                    */
  /* -------------------------------------------------------------------------- */
  /* helper */
  function extractCdnImages(html?: string): Set<string> {
    if (!html) return new Set();

    const doc = new DOMParser().parseFromString(html, "text/html");

    return new Set(
      Array.from(doc.querySelectorAll("img"))
        .map((img) => img.getAttribute("src"))
        .filter(
          (src): src is string =>
            !!src && src.startsWith("https://cdn.jearn.site/")
        )
    );
  }

  /* -------------------------------------------------------------------------- */
  const editPost = useCallback(
    async (
      id: string,
      originalContent: string,
      title: string,
      content: string,
      categories?: string[],
      tags?: string[],
      references?: string[],
      commentDisabled?: boolean
    ) => {
      // 🧮 compute removed images
      const oldImages = extractCdnImages(originalContent);
      const newImages = extractCdnImages(content);

      const removedImages = [...oldImages].filter((url) => !newImages.has(url));

      // ⚡ optimistic update
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

      // 🌐 API request
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          categories,
          tags,
          references,
          removedImages,
          commentDisabled,
        }),
      });

      if (!res.ok) {
        console.error("❌ editPost failed, refetching");
        return;
      }

      const { post: updated } = await res.json();
      if (updated) {
        setPosts((prev) => prev.map((p) => (p._id === id ? updated : p)));
      }
    },
    []
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
  /*                               RETURN                                        */
  /* -------------------------------------------------------------------------- */
  return {
    posts,
    setPosts,
    loading,
    hasMore,
    fetchNext,
    refresh,
    addPost,
    addAnswer,
    editPost,
    deletePost,
    votePoll,
  };
}
