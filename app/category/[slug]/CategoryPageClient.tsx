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
}

export default function CategoryPageClient({ category, posts }: Props) {
  const { i18n } = useTranslation();
  const mainRef = useRef<HTMLDivElement | null>(null);

  const title =
    i18n.language === "ja"
      ? category.jname
      : i18n.language === "my"
      ? category.myname
      : category.name;

  return (
    <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="w-full h-screen overflow-hidden bg-white dark:bg-black">
        {/* LEFT SIDEBAR */}
        <aside
          className="
            hidden xl:flex flex-col
            fixed top-[4.3rem] left-0
            w-[320px] h-[calc(100vh-4.3rem)]
            bg-black text-white px-4 py-4
            border-r border-neutral-800
            overflow-y-auto
            z-30
          "
        >
          <p className="opacity-70">Categories</p>
        </aside>

        {/* RIGHT SIDEBAR */}
        <aside
          className="
            hidden xl:flex flex-col
            fixed top-[4.3rem] right-0
            w-[320px] h-[calc(100vh-4.3rem)]
            bg-black text-white px-4 py-4
            border-l border-neutral-800
            overflow-y-auto
            z-30
          "
        >
          <p>Related</p>
        </aside>

        {/* MAIN SCROLL AREA (same as HomePage) */}
        <main
          ref={mainRef}
          className="
            absolute
            top-[4.3rem]
            left-0 right-0
            xl:left-[320px] xl:right-[320px]
            h-[calc(100vh-4.3rem)]
            overflow-y-auto
            px-3 md:px-6
            pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
          "
        >
          <div className="max-w-2xl mx-auto py-6 space-y-10">
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {title}
            </h1>

            <CategoryPostListClient posts={posts} />
          </div>
        </main>
      </div>
    </div>
  );
}
