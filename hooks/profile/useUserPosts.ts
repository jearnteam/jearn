import { useCallback, useEffect, useState } from "react";
import { normalizePosts } from "@/lib/normalizePosts";
import type { Post } from "@/types/post";
import { useSSE } from "@/features/sse/SSEProvider";

export function useUserPosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { lastMessage } = useSSE(); // ✅ LISTEN

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const res = await fetch(`/api/posts/byUser/${userId}?limit=10`, {
      cache: "no-store",
    });
    const data = await res.json();

    setPosts(normalizePosts(data.posts ?? []));
    setCursor(data.nextCursor ?? null);
    setHasMore(Boolean(data.nextCursor));
    setLoading(false);
  }, [userId]);

  async function loadMore() {
    if (!hasMore || loadingMore || !cursor || !userId) return;

    setLoadingMore(true);
    const res = await fetch(
      `/api/posts/byUser/${userId}?limit=10&cursor=${cursor}`
    );
    const data = await res.json();

    setPosts((p) => [...p, ...normalizePosts(data.posts ?? [])]);
    setCursor(data.nextCursor ?? null);
    setHasMore(Boolean(data.nextCursor));
    setLoadingMore(false);
  }

  /* -------------------------------------------------------------------------- */
  /*                            GLOBAL SSE LISTENER                              */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!lastMessage || !userId) return;

    setPosts((prev) => {
      console.log(
        "🟡 PROFILE current post IDs:",
        prev.map((p) => p._id)
      );

      switch (lastMessage.type) {
        case "new-post":
          console.log("🟡 new-post event received");

          if (!lastMessage.post) {
            console.log("❌ No post in message");
            return prev;
          }

          console.log("🟡 new-post author:", lastMessage.post.authorId);

          if (lastMessage.post.authorId !== userId) {
            console.log("❌ Not this user's post");
            return prev;
          }

          if (prev.some((p) => p._id === lastMessage.post._id)) {
            console.log("❌ Already exists in profile");
            return prev;
          }

          console.log("✅ Adding new post to profile");
          return [lastMessage.post, ...prev];

        case "update-post":
        case "update-comment":
        case "update-reply":
          console.log("🟡 update event received");

          const exists = prev.some(
            (p) => String(p._id) === String(lastMessage.postId)
          );

          console.log("🟡 Exists in profile?", exists);

          if (!exists) {
            console.log("❌ Post not found in profile state");
          }

          return prev.map((p) =>
            String(p._id) === String(lastMessage.postId)
              ? { ...p, ...lastMessage.post }
              : p
          );

        case "delete-post":
          console.log("🟡 delete event received");

          return prev.filter((p) => String(p._id) !== String(lastMessage.id));

        default:
          return prev;
      }
    });
  }, [lastMessage, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, hasMore, loading, loadMore, reload: load };
}
