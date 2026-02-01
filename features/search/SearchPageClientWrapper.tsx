"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import SearchPageClient from "./SearchPageClient";
import { SearchMode, SearchItem } from "./types";
import type { Post } from "@/types/post";

export default function SearchPageClientWrapper({
  scrollContainerRef,
}: {
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";

  const [mode, setMode] = useState<SearchMode>("all");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [usersRes, postsRes, categoriesRes] = await Promise.all([
          fetch(`/api/search/users?q=${encodeURIComponent(query)}`),
          fetch(`/api/search?q=${encodeURIComponent(query)}`),
          fetch(`/api/categories/usage`),
        ]);

        if (cancelled) return;

        const mixed: SearchItem[] = [];

        /* USERS */
        if (usersRes.ok) {
          const data = await usersRes.json();
          mixed.push(
            ...data.users.map((u: any) => ({
              type: "user",
              data: u,
            }))
          );
        }

        /* CATEGORIES */
        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          Object.keys(data.usage)
            .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .forEach((name) => {
              mixed.push({
                type: "category",
                data: {
                  id: name,
                  name,
                  jname: "",
                  myname: "",
                },
              });
            });
        }

        /* POSTS */
        if (postsRes.ok) {
          const data = await postsRes.json();
          mixed.push(
            ...data.results.map((p: any) => ({
              type: "post",
              data: p,
            }))
          );
        }

        setResults(mixed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (loading) {
    return <FullScreenLoader text={`Searching “${query}”…`} />;
  }

  return (
    <SearchPageClient
      query={query}
      mode={mode}
      results={results}
      onChangeMode={setMode}
      scrollContainerRef={scrollContainerRef}
    />
  );
}
