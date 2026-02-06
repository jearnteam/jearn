// app/(app)/categories/[slug]/CategoryPageClientWrapper.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import CategoryPageClient from "./CategoryPageClient";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import type { Post } from "@/types/post";
import { normalizePosts } from "@/lib/normalizePosts";

/**
 * Raw category shape returned by API
 * (fields may be missing depending on backend source)
 */
type Category = {
  id: string;
  name?: string;
  jname?: string;
  myname?: string;
};

/**
 * UI-safe category shape
 * (all fields normalized to strings)
 */
type UICategory = {
  id: string;
  name: string;
  jname: string;
  myname: string;
};

/**
 * CategoryPageClientWrapper
 *
 * Responsibilities:
 * - Resolve category from slug
 * - Fetch initial posts for category
 * - Handle infinite scroll pagination
 * - Fetch usage count
 * - Convert raw API data → UI-safe data
 *
 * This component owns ALL side effects.
 * Rendering is delegated to CategoryPageClient.
 */
export default function CategoryPageClientWrapper({
  slug,
  scrollContainerRef,
}: {
  slug: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  /* --------------------------------------------------
   * State
   * ------------------------------------------------ */
  const [category, setCategory] = useState<Category | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
   * Initial load
   * - Resolve category by slug
   * - Fetch first few posts
   * - Fetch usage count
   * ------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        /* ----------------- resolve category ----------------- */
        const catRes = await fetch(
          `/api/category/by-name/${encodeURIComponent(slug)}`,
          { cache: "no-store" }
        );

        if (!catRes.ok) return;

        const cat: Category = await catRes.json();
        if (cancelled) return;

        setCategory(cat);

        /* ----------------- fetch initial posts ----------------- */
        const postsRes = await fetch(
          `/api/posts?categoryId=${encodeURIComponent(cat.id)}&limit=10`,
          { cache: "no-store" }
        );

        const data = postsRes.ok ? await postsRes.json() : null;
        if (!data || cancelled) return;

        setPosts(normalizePosts(data.items ?? []));
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));

        /* ----------------- fetch category usage count ----------------- */
        const countRes = await fetch(`/api/category/usage/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryIds: [cat.id] }),
        });

        const usage = await countRes.json();
        if (!cancelled) {
          setCount(usage.usage?.[cat.id] ?? 0);
        }
      } finally {
        // Always exit loading state unless unmounted
        if (!cancelled) setLoading(false);
      }
    })();

    // Prevent state updates after unmount / slug change
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /* --------------------------------------------------
   * Load more (infinite scroll)
   * - Cursor-based pagination
   * - Guarded against double requests
   * ------------------------------------------------ */
  const loadMore = useCallback(async () => {
    if (!category || !hasMore || loadingMore || !cursor) return;

    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/posts?categoryId=${encodeURIComponent(
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

  /* --------------------------------------------------
   * Render
   * ------------------------------------------------ */
  if (loading) return <FullScreenLoader text="Loading category…" />;
  if (!category) return <div className="p-10">Category not found</div>;

  // Normalize category for UI (never pass undefined to UI)
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
