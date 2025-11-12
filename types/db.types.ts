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
  /** 関連種別 */
  type: RelationshipsType;
  /** 関連先ID */
  to: ObjectId;
  /** 関連時の日時 */
  time?: Date;
}

/** 投稿種別 */
export type PostType = "post" | "question" | "answer" | "comment";

/** postsコレクション内のスキーマ */
export interface PostDoc extends Document {
  _id: ObjectId;
  /** 投稿種別 */
  postType: PostType;
  /** 削除された投稿か */
  isDeleted: boolean;
  /** 匿名として投稿されているか */
  isAnonymous: boolean;
  /** 投稿のタイトル。`"answer" | "comment"`の場合存在しない */
  title?: string;
  /** 投稿本文 */
  content: string;
  /** 投稿日時 */
  createdAt: Date;
  /** 投稿者のID。匿名であっても定義する */
  authorId: string;
  /** 投稿者名。匿名ならばanonymous */
  authorName?: string;
  /** そのユーザーのアバターへのAPIのURL */
  authorAvatar?: string;
  /** 高評価の合計 */
  upvoteCount: number;
  /** 高評価したユーザーのID */
  upvoters: ObjectId[];
  upvote: Int32Array; // TODO: 未使用？
  /** 閲覧数 */
  views: number;
  relationships: Array<RelationshipsDoc>;
}

/** usersコレクション内のスキーマ */
export interface UserDoc extends Document {
  _id: ObjectId;
  /** 認証者 */
  provider: string;
  /** 認証時ID */
  providerId: string;
  /** ユーザーのメールアドレス */
  email: string;
  /** ユーザー名 */
  name: string;
  /** アバター画像データ */
  picture?: Binary;
  /** アバター画像のMIME Type */
  pictureMime?: string;
  /** 自己紹介文 */
  bio?: string;
  emailVerified?: boolean;
  /** 登録日時 */
  createdAt: Date;
  /** 変更日時 */
  updatedAt?: Date;
  relationships: Array<RelationshipsDoc>;
}

/** categoriesコレクション内のスキーマ */
export interface CategoryDoc extends Document {
  _id: ObjectId;
  /** カテゴリーの英語名 */
  name: string;
  /** カテゴリーの日本語名 */
  jname?: string;
  /** カテゴリーの英語説明文 */
  description?: string;
  /** カテゴリーの日本語説明文 */
  jdescription?: string;
  relationships: Array<RelationshipsDoc>;
}

/** tagsコレクション内のスキーマ */
export interface TagDoc extends Document {
  _id: ObjectId;
  /** タグの文字列 */
  name: string;
  relationships: Array<RelationshipsDoc>;
}

/** カテゴリー追加リクエストのステータス */
export type RequestStatus = "pending" | "approved" | "rejected";

/** categoryRequests内のスキーマ */
export interface CategoryRequestDoc extends Document {
  _id: ObjectId;
  /** リクエスト者のID */
  requesterId: ObjectId;
  /** 親とするカテゴリーのID */
  parentCategoryId?: ObjectId;
  /** カテゴリーの英語名 */
  name: string;
  /** カテゴリーの日本語名 */
  jname?: string;
  /** リクエスト理由 */
  reason?: string;
  /** リクエストした時間 */
  requestedTime: Date;
  /** リクエストの状態 */
  status: RequestStatus;
}

/** 通報ステータス */
export type ReportStatus = "pending" | "deleted" | "ignored";

/** reportsコレクション内のスキーマ */
export interface ReportDoc extends Document {
  _id: ObjectId;
  /** 通報対象の投稿のID */
  postId: ObjectId;
  /** 通報者のID */
  reporterId: ObjectId;
  /** 通報種別 */
  reportType: string;
  /** 通報理由 */
  reason?: string;
  /** 通報した時間 */
  reportTime: Date;
  /** 通報の状態 */
  status: ReportStatus;
}
