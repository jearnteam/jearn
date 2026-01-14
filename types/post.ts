// /types/post.ts

export interface CategoryObject {
  id: string;          // ObjectId as string
  name: string;        // English ("programming")
  jname: string;       // Japanese ("プログラミング")
  myname?: string;
}

/** Object */
export const PostTypes = {
  POST: "Post",
  QUESTION: "Question",
  ANSWER: "Answer",
  COMMENT: "Comment",
  VIDEO: "VIDEO",
} as const;
/** Union */
export type PostType = typeof PostTypes[keyof typeof PostTypes];

export type UpvoteResponse = {
  ok: boolean;
  action?: "added" | "removed";
  error?: string;
};

export interface Post {
  txId: any;
  _id: string;

  postType: PostType;

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
  parentPost?: Post;

  upvoteCount: number;
  upvoters: string[];

  commentCount?: number;

  _optimisticTx?: string;
  isAdmin?: boolean;

  edited?: boolean;
  editedAt?: string;
}
