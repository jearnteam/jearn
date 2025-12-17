import { ObjectId } from "mongodb";

export type NotificationType =
  | "post_like"
  | "post_comment"
  | "mention"
  | "system";

export interface Notification {
  _id?: ObjectId;
  userId: ObjectId;        // receiver
  actorId: ObjectId;      // who did the action
  type: NotificationType;
  postId?: ObjectId;
  commentId?: ObjectId;
  message: string;
  read: boolean;
  createdAt: Date;
}
