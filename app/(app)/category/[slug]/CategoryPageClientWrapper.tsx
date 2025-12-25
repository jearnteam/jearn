"use client";

import { useEffect, useState, useCallback } from "react";
import CategoryPageClient from "./CategoryPageClient";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import type { Post } from "@/types/post";
import { normalizePosts } from "@/lib/normalizePosts";

type Category = {
  id: string;
  name?: string;
  jname?: string;
  myname?: string;
};

type UICategory = {
  id: string;
  name: string;
  jname: string;
  myname: string;
};

export default function CategoryPageClientWrapper({
  slug,
  scrollContainerRef,
}: {
  slug: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [category, setCategory] = useState<Category | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
   * Initial load
   * ------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const catRes = await fetch(
          `/api/category/by-name/${encodeURIComponent(slug)}`,
          { cache: "no-store" }
        );
        if (!catRes.ok) return;

        const cat: Category = await catRes.json();
        if (cancelled) return;

        setCategory(cat);

        const postsRes = await fetch(
          `/api/posts?category=${encodeURIComponent(cat.id)}&limit=10`,
          { cache: "no-store" }
        );

        const data = postsRes.ok ? await postsRes.json() : null;
        if (!data || cancelled) return;

        setPosts(normalizePosts(data.items ?? []));
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));

        const countRes = await fetch(`/api/category/usage/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryIds: [cat.id] }),
        });

        const usage = await countRes.json();
        setCount(usage.usage?.[cat.id] ?? 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  /* --------------------------------------------------
   * Load more (infinite scroll)
   * ------------------------------------------------ */
  const loadMore = useCallback(async () => {
    if (!category || !hasMore || loadingMore || !cursor) return;

    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/posts?category=${encodeURIComponent(
          category.id
        )}&limit=10&cursor=${encodeURIComponent(cursor)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setPosts((prev) => [...prev, ...normalizePosts(data.items ?? [])]);

      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } finally {
      setLoadingMore(false);
    }
  }, [category, cursor, hasMore, loadingMore]);

  if (loading) return <FullScreenLoader text="Loading category…" />;
  if (!category) return <div className="p-10">Category not found</div>;

  const uiCategory: UICategory = {
    id: category.id,
    name: category.name ?? "",
    jname: category.jname ?? "",
    myname: category.myname ?? "",
  };

  return (
    <CategoryPageClient
      category={uiCategory}
      posts={posts}
      count={count}
      hasMore={hasMore}
      onLoadMore={loadMore}
      scrollContainerRef={scrollContainerRef}
    />
  );
}
