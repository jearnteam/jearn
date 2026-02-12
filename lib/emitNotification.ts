// lib/emitNotification.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notify } from "@/lib/notificationHub";

export async function emitGroupedNotification({
  userId,
  type,
  postId,
  actorId,
}: {
  userId: string;
  type: "post_like" | "comment" | "mention" | "answer";
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
    },
    {
      $setOnInsert: {
        createdAt: new Date(),
      },
      $set: {
        updatedAt: new Date(),
        read: false,
      },
      $addToSet: {
        actorIds: actorObjId,
      },
      $inc: {
        count: 1,
      },
    },
    { upsert: true }
  );

  notify(userId);
}
