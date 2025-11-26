import { headers } from "next/headers";
import TagPageClient from "./TagPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/tags/${encodeURIComponent(tag)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return <h1 className="text-center mt-20">Tag Not Found</h1>;
  }

  const { posts } = await res.json();

  return <TagPageClient tag={tag} posts={posts} />;
}
