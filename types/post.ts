// /types/post.ts

export interface CategoryObject {
  id: string;          // ObjectId as string
  name: string;        // English ("programming")
  jname: string;       // Japanese ("プログラミング")
  myname?: string;
}

export type PostType = "Post" | "Question" | "Answer" | "Comment";

export interface Post {
  txId: any;
  _id: string;

  postType?: PostType;

  title?: string;
  content?: string;

  categories?: CategoryObject[];
  tags?: string[];

  createdAt?: string;

  authorId: string;
  authorName: string;
  authorUserId?: string;

  // 🔥 EXISTING FIELD (avatar URL)
  authorAvatar: string | null;

  // 🔥 NEW FIELD (critical for cache busting)
  authorAvatarUpdatedAt?: string | null;

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
