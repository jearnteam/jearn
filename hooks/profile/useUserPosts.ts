import { useCallback, useEffect, useState } from "react";
import { normalizePosts } from "@/lib/normalizePosts";
import type { Post } from "@/types/post";

export function useUserPosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  return { posts, hasMore, loading, loadMore, reload: load };
}
