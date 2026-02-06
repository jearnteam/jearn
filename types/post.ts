// /types/post.ts

import { ObjectId } from "mongodb";

export interface CategoryObject {
  id: string;          // ObjectId as string
  name: string;        // English ("programming")
  jname: string;       // Japanese ("プログラミング")
  myname?: string;
}

/** 投稿種別 Object */
export const PostTypes = {
  POST: "Post",
  QUESTION: "Question",
  ANSWER: "Answer",
  COMMENT: "Comment",
  VIDEO: "VIDEO",
} as const;

/** 投稿種別 Union */
export type PostType = typeof PostTypes[keyof typeof PostTypes];

export type UpvoteResponse = {
  ok: boolean;
  action?: "added" | "removed";
  error?: string;
};

/**
 * 投稿
 */
export interface Post {
  txId: any;
  _id: string;

  postType: PostType;

  title?: string;
  content?: string;
  mediaRefs?: string[];
  video?: {
    url: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
    aspectRatio?: number | null;
  };

  categories?: CategoryObject[];
  tags?: string[];

  createdAt?: string;

  authorId?: string;
  authorName?: string;
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

export type RawPost = {
  _id: ObjectId | string;
  postType?: PostType;
  title?: string;
  content?: string;
  parentId?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt?: Date;
  categories?: unknown[];
  tags?: string[];
  mediaRefs?: string[];
  video?: {
    url: string;
    thumbnailUrl?: string;
    duration?: number;
    aspectRatio?: number;
  };
};