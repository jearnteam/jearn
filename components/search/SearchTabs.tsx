"use client";

import { SearchMode } from "@/types/search";
import {
  Sparkle,
  Pencil,
  BarChart2,
  Video,
  User,
  Tag,
  BadgeQuestionMark,
  MessageSquareDiff,
  ChevronDown,
  Check,
} from "lucide-react";
import { ReactElement, memo, useState, useRef, useEffect } from "react";

type Tab = {
  id: SearchMode;
  label: string;
  icon: ReactElement;
};

const TABS: readonly Tab[] = [
  { id: "all", label: "All", icon: <Sparkle size={16} /> },
  { id: "posts", label: "Posts", icon: <Pencil size={16} /> },
  {
    id: "questions",
    label: "Questions",
    icon: <BadgeQuestionMark size={16} />,
  },
  { id: "answers", label: "Answers", icon: <MessageSquareDiff size={16} /> },
  { id: "polls", label: "Polls", icon: <BarChart2 size={16} /> },
  { id: "videos", label: "Videos", icon: <Video size={16} /> },
  { id: "tags", label: "Tags", icon: <Tag size={16} /> },
  { id: "users", label: "Users", icon: <User size={16} /> },
];

const SearchTabs = memo(function SearchTabs({
  mode,
  onChange,
}: {
  mode: SearchMode;
  onChange: (m: SearchMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = TABS.find((t) => t.id === mode)!;

  /* close on outside click */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="z-50 bg-white dark:bg-black border-b">
      {/* ---------------- MOBILE ---------------- */}
      <div className="md:hidden px-4 py-3 relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="
      w-full flex items-center justify-between gap-2
      rounded-full px-4 py-2
      bg-gray-100 dark:bg-neutral-800
      text-sm font-medium
      border border-gray-200 dark:border-neutral-700
    "
        >
          <div className="flex items-center gap-2">
            {active.icon}
            <span>{active.label}</span>
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            className="
        absolute left-0 right-0 top-full mt-2
        rounded-xl border
        bg-white dark:bg-neutral-900
        shadow-lg overflow-hidden
        z-50
      "
          >
            {TABS.map((t) => {
              const selected = t.id === mode;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                  className={`
              w-full flex items-center justify-between
              px-4 py-3 text-sm
              transition
              ${
                selected
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 dark:hover:bg-neutral-800"
              }
            `}
                >
                  <div className="flex items-center gap-3">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {selected && <Check size={16} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- DESKTOP (unchanged) ---------------- */}
      <div className="hidden md:flex justify-center gap-2 px-4 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`
              flex items-center gap-2
              px-4 py-2 rounded-full text-sm whitespace-nowrap
              transition-colors
              ${
                mode === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700"
              }
            `}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default SearchTabs;
