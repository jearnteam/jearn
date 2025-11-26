"use client";

import { useTranslation } from "react-i18next";
import type { Post } from "@/types/post";
import CategoryPostListClient from "@/components/category/CategoryPostListClient";

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

  const title =
    i18n.language === "ja"
      ? category.jname
      : i18n.language === "my"
      ? category.myname
      : category.name;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 mt-16">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        {title}
      </h1>

      <CategoryPostListClient posts={posts} />
    </main>
  );
}
