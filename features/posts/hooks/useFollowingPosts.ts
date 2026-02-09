"use client";

import { useEffect, useState, useCallback } from "react";
import type { Post } from "@/types/post";

export function useFollowingPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchNext = useCallback(async () => {
    if (!hasMore) return;

    const params = new URLSearchParams();
    params.set("limit", "10");
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/posts/following?${params}`, {
      cache: "no-store",
    });
    const data = await res.json();

    setPosts((prev) => [...prev, ...data.items]);
    setCursor(data.nextCursor);
    setHasMore(Boolean(data.nextCursor));
    setLoading(false);
  }, [cursor, hasMore]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setPosts([]);
    setCursor(null);
    setHasMore(true);

    const res = await fetch(`/api/posts/following?limit=10`, {
      cache: "no-store",
    });
    const data = await res.json();

    setPosts(data.items);
    setCursor(data.nextCursor);
    setHasMore(Boolean(data.nextCursor));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNext();
  }, []);

  return { posts, setPosts, hasMore, loading, fetchNext, refresh };
}
