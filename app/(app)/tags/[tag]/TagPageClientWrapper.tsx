"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import TagPageClient from "./TagPageClient";
import type { Post } from "@/types/post";
import { normalizePosts } from "@/lib/normalizePosts";

const PAGE_SIZE = 10;

interface Props {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TagPageClientWrapper({
  scrollContainerRef,
}: Props) {
  const params = useParams();
  const tag = params.tag as string;

  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* ---------------------------
     Reset + Fetch (overlay-safe)
  --------------------------- */
  useEffect(() => {
    if (!tag) return;

    let cancelled = false;

    setPosts([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/tags/${encodeURIComponent(tag)}?limit=${PAGE_SIZE}`,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const data = await res.json();
        const normalized = normalizePosts(data.posts);

        if (cancelled) return;

        setPosts(normalized);
        setCursor(data.nextCursor ?? null);
        setHasMore(!!data.nextCursor);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tag]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;

    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/tags/${encodeURIComponent(tag)}?limit=${PAGE_SIZE}&cursor=${cursor}`,
        { cache: "no-store" }
      );

      if (!res.ok) return;

      const data = await res.json();
      const next = normalizePosts(data.posts);

      setPosts((prev) => [...prev, ...next]);
      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [tag, cursor, hasMore, loadingMore]);

  if (loading) {
    return <FullScreenLoader text="Loading tag…" />;
  }

  return (
    <TagPageClient
      tag={tag}
      posts={posts}
      hasMore={hasMore}
      onLoadMore={loadMore}
      scrollContainerRef={scrollContainerRef} // ✅ optional
    />
  );
}
