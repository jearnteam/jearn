// /types/post.ts

export interface Post {
  txId: any;
  _id: string;
  title?: string;
  content?: string;
  categories?: string[];
  createdAt?: string;
  authorId: string; // ✅ required
  authorName: string; // ✅ add this
  authorAvatar: string | null; // ✅ add this
  parentId: string | null;
  replyTo?: string | null;
  upvoteCount: number;
  upvoters: string[];
  commentCount?: number;
  _optimisticTx?: string;
}