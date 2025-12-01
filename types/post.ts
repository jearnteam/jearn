// /types/post.ts

export interface CategoryObject {
  id: string; // ObjectId as string
  name: string; // English category name ("programming")
  jname: string; // Japanese name ("プログラミング")
  myname?: string;
}

export interface Post {
  txId: any;
  _id: string;

  title?: string;
  content?: string;

  // ⭐ UPDATED: categories are now objects, not strings
  categories?: CategoryObject[];
  tags?: string[];

  createdAt?: string;

  authorId: string;
  authorName: string;
  authorUserId?: string;
  authorAvatar: string | null;

  parentId: string | null;
  replyTo?: string | null;

  upvoteCount: number;
  upvoters: string[];

  commentCount?: number;

  _optimisticTx?: string;
  isAdmin?: boolean;

  edited?: boolean;
  editedAt?: string;
}
