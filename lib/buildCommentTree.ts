// lib/buildCommentTree.ts
import type { Post } from "@/types/post";

export function buildCommentTree(comments: Post[]): Post[] {
  const map = new Map<string, Post & { children: Post[] }>();
  const roots: (Post & { children: Post[] })[] = [];

  // init map
  comments.forEach((c) => map.set(c._id, { ...c, children: [] }));

  // link children
  comments.forEach((c) => {
    const node = map.get(c._id)!;
    if (c.replyTo && map.has(c.replyTo)) {
      map.get(c.replyTo)!.children.push(node);
    } else if (!c.replyTo) {
      roots.push(node);
    }
  });

  return roots;
}
