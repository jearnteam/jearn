// lib/emitNotification.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function emitGroupedNotification({
  userId,
  type,
  postId,
  actorId,
}: {
  userId: string;
  type: "post_like" | "comment" | "mention";
  postId: string;
  actorId: string;
}) {
  const client = await clientPromise;
  const db = client.db("jearn");

  const receiverId = new ObjectId(userId);
  const actorObjId = new ObjectId(actorId);
  const postObjId = new ObjectId(postId);

  await db.collection("notifications").updateOne(
    {
      userId: receiverId,
      type,
      postId: postObjId,
      read: false, // 🔥 GROUP ONLY UNREAD
    },
    {
      $setOnInsert: {
        createdAt: new Date(),
      },
      $addToSet: {
        actorIds: actorObjId, // dedupe automatically
      },
      $inc: {
        count: 1,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    {
      upsert: true, // 🔥 create if not exists
    }
  );
}
