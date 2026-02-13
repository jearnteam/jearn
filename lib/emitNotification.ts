// lib/emitNotification.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notifyWithData } from "@/lib/notificationHub";
import { avatarUrl } from "./avatarUrl";

export async function emitGroupedNotification({
  userId,
  type,
  postId,
  actorId,
}: {
  userId: string;
  type: "post_like" | "comment" | "mention" | "answer" | "comment";
  postId: string;
  actorId: string;
}) {
  const client = await clientPromise;
  const db = client.db("jearn");

  const receiverId = new ObjectId(userId);
  const actorObjId = new ObjectId(actorId);
  const postObjId = new ObjectId(postId);

  // ① DB更新
  await db.collection("notifications").updateOne(
    {
      userId: receiverId,
      type,
      postId: postObjId,
      read: false,
    },
    {
      $setOnInsert: {
        createdAt: new Date(),
      },
      $addToSet: {
        actorIds: actorObjId,
      },
      $inc: {
        count: 1,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  // ② 最新通知を取得
  const notification = await db.collection("notifications").findOne({
    userId: receiverId,
    type,
    postId: postObjId,
    read: false,
  });

  if (!notification) return;

  // ③ actor情報取得（表示用）
  const actor = await db.collection("users").findOne(
    { _id: actorObjId },
    { projection: { name: 1, avatarUrl: 1, image: 1 } }
  );

  // ④ フロント用payload作成
  const payload = {
    _id: notification._id.toString(),
    type: notification.type,
    postId: notification.postId?.toString(),
    lastActorName: actor?.name ?? "Someone",
    lastActorAvatar: actor?.avatarUrl ?? actor?.image ?? null,
    count: notification.count ?? 1,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    read: notification.read,
  };

  // ⑤ SSEで即時送信
  notifyWithData(userId, payload);
}
