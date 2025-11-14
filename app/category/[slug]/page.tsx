import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Post } from "@/types/post";
import CategoryPostListClient from "@/components/category/CategoryPostListClient"; // ✅ clean import

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const category = decodeURIComponent(params.slug);

  const res = await fetch(`${baseUrl}/api/posts?category=${encodeURIComponent(category)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("❌ Failed to fetch category posts:", res.status);
    notFound();
  }

  const posts: Post[] = await res.json();

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 mt-16">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">
        {category}
      </h1>
      <CategoryPostListClient posts={posts} />
    </main>
  );
}
