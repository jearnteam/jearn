"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import SearchPageClient from "./SearchPageClient";
import { SearchItem, SearchMode } from "@/types/search";

/* ================= ENDPOINT RESOLVER ================= */

function getSearchEndpoint(mode: SearchMode) {
  switch (mode) {
    case "all":
      return "/api/search";

    case "posts":
      return "/api/search/posts";
    case "questions":
      return "/api/search/questions";
    case "answers":
      return "/api/search/answers";
    case "polls":
      return "/api/search/polls";
    case "videos":
      return "/api/search/videos";

    case "tags":
      return "/api/search/tags";
    case "users":
      return "/api/search/users";

    default:
      return "/api/search";
  }
}

/* ================= NORMALIZER ================= */

function normalizeResults(mode: SearchMode, data: any): SearchItem[] {
  if (mode === "all") {
    return [
      ...(data.users ?? []).map((u: any) => ({ type: "user", data: u })),
      ...(data.categories ?? []).map((c: any) => ({
        type: "category",
        data: c,
      })),
      ...(data.posts ?? []).map((p: any) => ({ type: "post", data: p })),
    ];
  }

  if (mode === "users") {
    return (data.users ?? []).map((u: any) => ({
      type: "user",
      data: u,
    }));
  }

  // posts / questions / answers / polls / videos / tags
  return (data.posts ?? []).map((p: any) => ({
    type: "post",
    data: p,
  }));
}

/* ================= COMPONENT ================= */

export default function SearchPageClientWrapper({
  scrollContainerRef,
}: {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";

  const [mode, setMode] = useState<SearchMode>("all");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* ================= LOAD MORE ================= */

  async function loadMore() {
    if (loadingMore || !cursor || mode === "users") return;

    setLoadingMore(true);

    try {
      const endpoint = getSearchEndpoint(mode);
      const res = await fetch(
        `${endpoint}?q=${encodeURIComponent(query)}&cursor=${cursor}`
      );
      const data = await res.json();

      setItems((prev) => [
        ...prev,
        ...normalizeResults(mode, data),
      ]);

      setCursor(data.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  /* ================= INITIAL / MODE CHANGE LOAD ================= */

  useEffect(() => {
    if (!query || query.length < 2) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setItems([]);
      setCursor(null);

      try {
        const endpoint = getSearchEndpoint(mode);
        const res = await fetch(
          `${endpoint}?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();

        if (cancelled) return;

        setItems(normalizeResults(mode, data));
        setCursor(data.nextCursor ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, mode]);

  /* ================= RENDER ================= */

  if (loading) {
    return <FullScreenLoader text={`Searching “${query}”…`} />;
  }

  return (
    <SearchPageClient
      query={query}
      mode={mode}
      results={items}
      onChangeMode={setMode}
      scrollContainerRef={scrollContainerRef}
      onLoadMore={loadMore}
      loadingMore={loadingMore}
      hasMore={!!cursor}
    />
  );
}
