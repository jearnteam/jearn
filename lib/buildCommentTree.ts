import { Post } from "@/types/post";

export interface CommentNode extends Post {
  children: CommentNode[];
}

export function buildCommentTree(comments: Post[]): CommentNode[] {
  // ガード節
  if (!Array.isArray(comments)) {
    return [];
  }

  const map: Record<string, CommentNode> = {};
  const roots: CommentNode[] = [];

  // 1. 全ノードをマップに登録 (IDを文字列化して正規化)
  for (const c of comments) {
    const id = String(c._id);
    map[id] = { ...c, _id: id, children: [] };
  }

  // 2. 親子関係を構築
  for (const c of comments) {
    const id = String(c._id);
    const node = map[id];
    
    // replyTo を文字列化して正規化 (null/undefined/空文字 は null扱い)
    const replyToId = c.replyTo ? String(c.replyTo) : null;

    // 親が存在し、かつ自分自身でない場合
    if (replyToId && map[replyToId] && replyToId !== id) {
      map[replyToId].children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}