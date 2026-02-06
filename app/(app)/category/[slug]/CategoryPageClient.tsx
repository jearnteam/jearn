// app/(app)/categories/[slug]/CategoryPageClient.tsx
"use client";

import { useTranslation } from "react-i18next";
import type { Post } from "@/types/post";
import CategoryPostListClient from "@/components/category/CategoryPostListClient";
import { useRef } from "react";

interface Props {
  category: {
    id: string;
    name: string;
    jname: string;
    myname: string;
  };
  posts: Post[];
  count: number;
  hasMore: boolean;
  onLoadMore: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * CategoryPageClient
 *
 * Responsibilities:
 * - Render category title (i18n-aware)
 * - Provide its own scroll container
 * - Delegate list rendering & pagination to CategoryPostListClient
 *
 * This component contains NO side effects.
 */
export default function CategoryPageClient({
  category,
  posts,
  count,
  hasMore,
  onLoadMore,
}: Props) {
  const { i18n } = useTranslation();

  // Local scroll container for category page
  const mainRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------------------------------
   * Localized title selection
   * ------------------------------------------------ */
  const title =
    i18n.language === "ja"
      ? category.jname
      : i18n.language === "my"
      ? category.myname
      : category.name;

  return (
    <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
      {/* Scrollable area below global navbar */}
      <main
        ref={mainRef}
        className="
          absolute top-[4.3rem]
          left-0 right-0
          h-[calc(100vh-4.3rem)]
          overflow-y-auto no-scrollbar
          pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
        "
      >
        <div className="feed-container py-6 space-y-10">
          {/* Category header */}
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 px-4">
            {title}{" "}
            <span className="opacity-60 text-lg">
              ({count})
            </span>
          </h1>

          {/* Category post list */}
          <CategoryPostListClient
            posts={posts}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            scrollContainerRef={mainRef}
          />
        </div>
      </main>
    </div>
  );
}
