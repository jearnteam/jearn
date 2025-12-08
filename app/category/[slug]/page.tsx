import { headers } from "next/headers";
import CategoryPageClient from "./CategoryPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const catRes = await fetch(
    `${baseUrl}/api/category/by-name/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );

  if (!catRes.ok) {
    return <h1 className="text-center mt-20">Category Not Found</h1>;
  }

  const category = await catRes.json();

  // ① 投稿一覧取得
  const postsRes = await fetch(
    `${baseUrl}/api/posts?category=${encodeURIComponent(category.id)}`,
    { cache: "no-store" }
  );
  const posts = postsRes.ok ? await postsRes.json() : [];

  // ② 投稿数カウント API を呼ぶ
  const countRes = await fetch(`${baseUrl}/api/category/usage/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "app/json", 
    },
    body: JSON.stringify({ categoryIds: [category.id] }),
  });

  const usageJson = await countRes.json();
  const count = usageJson.usage[category.id] ?? 0;

  return <CategoryPageClient category={category} posts={posts} count={count} />;
}
