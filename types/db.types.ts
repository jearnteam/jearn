/* ここに定義するのは、将来的な理想形のスキーマです。 */
import type { Binary, Document, ObjectId } from "mongodb";

/** relationships種別 */
export type RelationshipsType =
  | "post" // posts
  | "question" // posts
  | "answer" // posts
  | "comment" // posts
  | "user" // users
  | "tag" // tags
  | "category"; // categories

/** relationship内のスキーマ */
export interface RelationshipsDoc extends Document {
  type: RelationshipsType;
  to: ObjectId;
  time?: Date;
}

/** 投稿種別 */
export type PostType = "post" | "question" | "answer" | "comment";

/** postsコレクション内のスキーマ */
export interface PostDoc extends Document {
  _id: ObjectId;
  postType: PostType;
  isDeleted: boolean;
  /** 匿名として投稿されているか */
  isAnonymous: boolean;
  title?: string;
  content: string;
  createdAt: Date;
  authorId: string;
  authorName?: string;
  /** そのユーザーのアバターへのAPIのURL */
  authorAvatar?: string;
  upvoteCount: number;
  upvoters: string[];
  upvote: Int32Array; // TODO: 未使用？
  /** 閲覧数 */
  views: number;
  relationships: Array<RelationshipsDoc>;
}

/** usersコレクション内のスキーマ */
export interface UserDoc extends Document {
  _id: ObjectId;
  provider: string;
  providerId: string;
  email: string;
  name: string;
  picture?: Binary;
  pictureMime?: string;
  bio?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  relationships: Array<RelationshipsDoc>;
}

/** categoriesコレクション内のスキーマ */
export interface CategoryDoc extends Document {
  _id: ObjectId;
  name: string;
  jname?: string;
  description?: string;
  relationships: Array<RelationshipsDoc>;
}

/** tagsコレクション内のスキーマ */
export interface TagDoc extends Document {
  _id: ObjectId;
  name: string;
  relationships: Array<RelationshipsDoc>;
}

/** カテゴリー追加リクエストのステータス */
export type RequestStatus = "pending" | "approved" | "rejected";

/** categoryRequests内のスキーマ */
export interface CategoryRequestDoc extends Document {
  _id: ObjectId;
  requesterId: ObjectId;
  parentCategoryId?: ObjectId;
  name: string;
  reason?: string;
  requestedTime: Date;
  status: RequestStatus;
}

/** 通報ステータス */
export type ReportStatus = "pending" | "deleted" | "ignored";

/** reportsコレクション内のスキーマ */
export interface ReportDoc extends Document {
  _id: ObjectId;
  postId: ObjectId;
  reporterId: ObjectId;
  reportType: string;
  reason?: string;
  reportTime: Date;
  status: ReportStatus;
}
