"use client";

import CategoryPostListClient from "@/components/category/CategoryPostListClient";
import type { Post } from "@/types/post";
import { useRef } from "react";

interface Props {
  tag: string;
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TagPageClient({
  tag,
  posts,
  hasMore,
  onLoadMore,
  scrollContainerRef,
}: Props) {
  // 🔑 fallback for non-overlay pages
  const localScrollRef = useRef<HTMLDivElement | null>(null);

  // ✅ always provide a ref
  const activeScrollRef = scrollContainerRef ?? localScrollRef;

  return (
    <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
      <main
        ref={activeScrollRef}
        className="
          absolute
          top-[4.3rem]
          left-0 right-0
          h-[calc(100vh-4.3rem)]
          overflow-y-auto
          no-scrollbar
          pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
        "
      >
        <div className="feed-container py-6 space-y-10">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 px-4">
            #{tag}
            <span className="opacity-70 ml-2 text-lg">
              ({posts.length})
            </span>
          </h1>

          <CategoryPostListClient
            posts={posts}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            scrollContainerRef={activeScrollRef} // ✅ NEVER undefined
          />
        </div>
      </main>
    </div>
  );
}
