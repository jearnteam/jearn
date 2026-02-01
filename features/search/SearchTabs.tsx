"use client";

import { SearchMode } from "./types";

export default function SearchTabs({
  mode,
  onChange,
}: {
  mode: SearchMode;
  onChange: (m: SearchMode) => void;
}) {
  const tabs: { id: SearchMode; label: string }[] = [
    { id: "all", label: "All" },
    { id: "posts", label: "Posts" },
    { id: "users", label: "People" },
    { id: "categories", label: "Categories" },
  ];

  return (
    <div className="fixed top-[4.3rem] left-0 right-0 z-50 bg-white dark:bg-black border-b">
      <div className="flex gap-2 px-4 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`
              px-4 py-2 rounded-full text-sm
              ${mode === t.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-neutral-800"}
            `}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
