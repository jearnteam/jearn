import { Post } from "@/types/post";

export interface CommentNode extends Post {
  children: CommentNode[];
}

export function buildCommentTree(comments: Post[]): CommentNode[] {
  // ✅ 修正: comments が undefined / null / 配列以外 の場合は空配列を返してクラッシュを防ぐ
  if (!Array.isArray(comments)) {
    return [];
  }

  const map: Record<string, CommentNode> = {};
  const roots: CommentNode[] = [];

  // 1. Create nodes
  comments.forEach((c) => {
    map[c._id] = { ...c, children: [] };
  });

  // 2. Link
  comments.forEach((c) => {
    if (c.replyTo && map[c.replyTo]) {
      map[c.replyTo].children.push(map[c._id]);
    } else {
      roots.push(map[c._id]);
    }
  });

  return roots;
}
