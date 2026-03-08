"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "jearn_search_history";
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // Load once
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setHistory(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const save = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setHistory((prev) => {
      const updated = [
        trimmed,
        ...prev.filter((v) => v !== trimmed),
      ].slice(0, MAX_HISTORY);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { history, save };
}