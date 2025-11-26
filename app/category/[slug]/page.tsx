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

  // ⭐ The ONLY reliable method in Next.js 15 SSR
  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  console.log("⭐ Using baseUrl:", baseUrl);

  const catRes = await fetch(
    `${baseUrl}/api/category/by-name/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
    }
  );

  if (!catRes.ok) {
    console.error("❌ Category not found:", slug);
    return <h1 className="text-center mt-20">Category Not Found</h1>;
  }

  const category = await catRes.json();

  const postsRes = await fetch(
    `${baseUrl}/api/posts?category=${encodeURIComponent(category.id)}`,
    {
      cache: "no-store",
    }
  );

  const posts = postsRes.ok ? await postsRes.json() : [];

  return <CategoryPageClient category={category} posts={posts} />;
}
