"use client";

import CategoryPostListClient from "@/components/category/CategoryPostListClient";

interface Props {
  tag: string;
  posts: any[];
}

export default function TagPageClient({ tag, posts }: Props) {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6 mt-16">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        #{tag}
      </h1>

      <CategoryPostListClient posts={posts} />
    </main>
  );
}
