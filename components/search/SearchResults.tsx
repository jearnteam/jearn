"use client";

import { Loader2 } from "lucide-react";
import type { SearchItem } from "@/types/search";
import SearchResultsList from "./SearchResultsList";

export default function SearchResults({
  results,
  loading,
  visible,
}: {
  results: SearchItem[];
  loading: boolean;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      className="
        absolute top-full mt-2 w-full
        bg-white dark:bg-neutral-900
        border border-gray-200 dark:border-neutral-800
        rounded-2xl shadow-xl
        z-50
        max-h-[70vh] overflow-y-auto
      "
    >
      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching...
        </div>
      )}

      {/* RESULTS */}
      {!loading && results.length > 0 && (
        <div className="py-2">
          <SearchResultsList results={results} />
        </div>
      )}

      {/* EMPTY */}
      {!loading && results.length === 0 && (
        <div className="px-4 py-4 text-sm text-gray-500">
          No results found
        </div>
      )}
    </div>
  );
}
