"use client";

import { Loader2 } from "lucide-react";
import type { SearchItem } from "@/types/search";
import SearchResultsList from "./SearchResultsList";
import { useMemo } from "react";

type HistoryItem = {
  type: "history";
  data: {
    id: string;
    label: string;
  };
};

type ExtendedItem = SearchItem | HistoryItem;

export default function SearchResults({
  results,
  loading,
  visible,
  query,
  history,
  activeIndex,
  setActiveIndex,
  onSelectItem,
}: {
  results: SearchItem[];
  loading: boolean;
  visible: boolean;
  query: string;
  history: string[];
  activeIndex: number;
  setActiveIndex: (n: number) => void;
  onSelectItem: (item: ExtendedItem) => void;
}) {
  if (!visible) return null;

  const filteredHistory = useMemo(() => {
    if (!query.trim()) return history.slice(0, 3);

    return history.filter((h) => h.toLowerCase().includes(query.toLowerCase()));
  }, [query, history]);

  const historyItems: HistoryItem[] = filteredHistory.map((h) => ({
    type: "history",
    data: {
      id: h,
      label: h,
    },
  }));

  const combined: ExtendedItem[] = [...historyItems, ...results];

  return (
    <div className="absolute top-full mt-2 w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
      {loading && (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching...
        </div>
      )}

      {!loading && combined.length > 0 && (
        <SearchResultsList
          results={combined}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onSelectItem={onSelectItem}
        />
      )}

      {!loading && combined.length === 0 && (
        <div className="px-4 py-4 text-sm text-gray-500">No results found</div>
      )}
    </div>
  );
}
