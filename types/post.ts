// /types/post.ts

import { ObjectId } from "mongodb";

export interface CategoryObject {
  id: string;
  name: string;
  jname: string;
  myname?: string;
}

/* -------------------------------------------------------------------------- */
/* POST TYPES                                                                  */
/* -------------------------------------------------------------------------- */

export const PostTypes = {
  POST: "Post",
  QUESTION: "Question",
  ANSWER: "Answer",
  POLL: "POLL",
  COMMENT: "Comment",
  VIDEO: "VIDEO",
} as const;

export type PostType = (typeof PostTypes)[keyof typeof PostTypes];

/* -------------------------------------------------------------------------- */
/* POLL                                                                        */
/* -------------------------------------------------------------------------- */

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface Poll {
  options: PollOption[];
  totalVotes: number;

  /**
   * server-owned: { [userId]: optionId }
   * This is what enables "change vote"
   */
  votes?: Record<string, string>;

  allowMultiple?: boolean;
  expiresAt?: string | null;

  // client-only (optional)
  votedOptionIds?: string[];
}

/* -------------------------------------------------------------------------- */
/* POST                                                                        */
/* -------------------------------------------------------------------------- */

export interface Post {
  txId: any;
  _id: string;

  postType: PostType;

  title?: string;
  content?: string;
  mediaRefs?: string[];

  poll?: Poll;

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
  authorUniqueId?: string;

  authorAvatar: string | null;
  authorAvatarUpdatedAt?: string | null;

  parentId: string | null;
  replyTo?: string | null;
  parentPost?: Post;

  upvoteCount: number;
  upvoters: string[];

  commentCount?: number;
  commentDisabled?: boolean;

  /** logged-in viewer (client only, injected) */
  viewerId?: string;

  _optimisticTx?: string;
  isAdmin?: boolean;

  edited?: boolean;
  editedAt?: string;
}

/* -------------------------------------------------------------------------- */
/* RAW DB POST                                                                 */
/* -------------------------------------------------------------------------- */

export type RawPost = {
  _id: ObjectId | string;
  postType?: PostType;
  title?: string;
  content?: string;
  parentId?: string;
  replyTo?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt?: Date;
  categories?: unknown[];
  tags?: string[];
  mediaRefs?: string[];
  poll?: Poll;
  video?: {
    url: string;
    thumbnailUrl?: string;
    duration?: number;
    aspectRatio?: number;
  };
};

/* -------------------------------------------------------------------------- */
/* UPVOTE                                                                      */
/* -------------------------------------------------------------------------- */

export type UpvoteResponse = {
  ok: boolean;
  action?: "added" | "removed";
  error?: string;
};
