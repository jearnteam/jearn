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
}

export default function CategoryPageClient({
  category,
  posts,
  count,
  hasMore,
  onLoadMore,
}: Props) {
  const { i18n } = useTranslation();
  const mainRef = useRef<HTMLDivElement | null>(null);

  const title =
    i18n.language === "ja"
      ? category.jname
      : i18n.language === "my"
      ? category.myname
      : category.name;

  return (
    <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
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
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 px-4">
            {title} <span className="opacity-60 text-lg">({count})</span>
          </h1>

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
