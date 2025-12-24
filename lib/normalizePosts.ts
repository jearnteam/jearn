// lib/normalizePosts.ts
import type { Post } from "@/types/post";

export function normalizePosts(input: unknown): Post[] {
  if (Array.isArray(input)) return input as Post[];

  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;

    if (Array.isArray(obj.posts)) {
      return obj.posts as Post[];
    }

    if (Array.isArray(obj.items)) {
      return obj.items as Post[];
    }
  }

  return [];
}
