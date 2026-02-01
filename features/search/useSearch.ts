import { useEffect, useRef, useState } from "react";
import { SearchItem } from "@/features/search/types";

/**
 * Unified search hook
 * - Debounced
 * - Abort-safe
 * - Flattens API response into SearchItem[]
 */
export function useSearch(query: string) {
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();

    /* ---------------- RESET ---------------- */
    if (q.length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      return;
    }

    /* ---------------- DEBOUNCE ---------------- */
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setLoading(true);

        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();

        if (controller.signal.aborted) return;

        /* ---------------- FLATTEN ---------------- */
        const mixed: SearchItem[] = [];

        /* USERS */
        if (Array.isArray(data.users)) {
          data.users.forEach((u: any) => {
            mixed.push({
              type: "user",
              data: u,
            });
          });
        }

        /* CATEGORIES */
        if (Array.isArray(data.categories)) {
          data.categories.forEach((c: any) => {
            mixed.push({
              type: "category",
              data: c,
            });
          });
        }

        /* POSTS */
        if (Array.isArray(data.posts)) {
          data.posts.forEach((p: any) => {
            mixed.push({
              type: "post",
              data: p,
            });
          });
        }

        setResults(mixed);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("❌ useSearch error:", err);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return {
    results,
    loading,
    hasResults: results.length > 0,
  };
}
