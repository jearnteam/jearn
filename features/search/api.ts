import { SearchItem } from "@/types/search";

export async function searchPosts(query: string): Promise<SearchItem[]> {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}
