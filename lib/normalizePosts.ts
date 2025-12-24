// lib/normalizePosts.ts
import type { Post } from "@/types/post";

export function normalizePosts(input: any): Post[] {
  if (Array.isArray(input)) return input;

  if (Array.isArray(input?.posts)) return input.posts;

  if (Array.isArray(input?.items)) return input.items;

  return [];
}
