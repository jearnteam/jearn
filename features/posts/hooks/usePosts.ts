"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostTypes, type Post, type PostType } from "@/types/post";
import { isRecentTx } from "@/lib/recentTx";
import { useSSE } from "@/features/sse/SSEProvider"; // GLOBAL SSE

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const { lastMessage } = useSSE(); // GLOBAL SSE

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
  }, [fetchNext]);

  /* -------------------------------------------------------------------------- */
  /*                            GLOBAL SSE LISTENER                              */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!lastMessage) return;

    setPosts((prev) => {
      switch (lastMessage.type) {
        case "new-post": {
          const post = lastMessage.post;

          if (!post || post.parentId) return prev;

          // prevent duplicates
          if (prev.some((p) => p._id === post._id)) return prev;

          return [...prev, post]; // append to bottom
        }

        case "update-post":
          return prev.map((p) =>
            p._id === lastMessage.postId ? { ...p, ...lastMessage.post } : p
          );

        case "delete-post":
          return prev.filter((p) => p._id !== lastMessage.id);

        case "upvote":
          if (isRecentTx(lastMessage.txId)) return prev;
          return prev.map((p) =>
            p._id === lastMessage.postId
              ? {
                  ...p,
                  upvoteCount:
                    (p.upvoteCount ?? 0) +
                    (lastMessage.action === "added" ? 1 : -1),
                  upvoters:
                    lastMessage.action === "added"
                      ? [...(p.upvoters ?? []), lastMessage.userId]
                      : (p.upvoters ?? []).filter(
                          (u) => u !== lastMessage.userId
                        ),
                }
              : p
          );

        case "update-comment-count":
          return prev.map((p) =>
            p._id === lastMessage.parentId
              ? {
                  ...p,
                  commentCount: (p.commentCount ?? 0) + lastMessage.delta,
                }
              : p
          );

        case "poll-vote":
          if (isRecentTx(lastMessage.txId)) return prev;

          return prev.map((p) =>
            p._id === lastMessage.postId && p.poll
              ? {
                  ...p,
                  poll: {
                    ...p.poll,
                    totalVotes: p.poll.totalVotes + 1,
                    options: p.poll.options.map((o) =>
                      o.id === lastMessage.optionId
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
  }, [lastMessage]);

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
      mentionedUserIds: string[],
      tags: string[],
      references?: string[],
      poll?: any,
      video?: any,
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
          mentionedUserIds,
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
  /*                               EDIT POST                                     */
  /* -------------------------------------------------------------------------- */

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

  const editPost = useCallback(
    async (
      id: string,
      originalContent: string,
      title: string,
      content: string,
      categories?: string[],
      tags?: string[],
      references?: string[],
      poll?: any,
      commentDisabled?: boolean
    ) => {
      const oldImages = extractCdnImages(originalContent);
      const newImages = extractCdnImages(content);
      const removedImages = [...oldImages].filter((url) => !newImages.has(url));

      setPosts((prev) =>
        prev.map((p) =>
          p._id === id
            ? {
                ...p,
                title,
                content,
                poll: poll ?? p.poll,
                edited: true,
                editedAt: new Date().toISOString(),
              }
            : p
        )
      );

      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          categories,
          tags,
          references,
          poll,
          removedImages,
          commentDisabled,
        }),
      });

      if (!res.ok) {
        console.error("❌ editPost failed");
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
