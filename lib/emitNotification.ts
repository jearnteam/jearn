// lib/emitNotification.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notifyUser } from "@/lib/sse";

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

  /* -------------------------------------------------- */
  /* ① ATOMIC UPSERT + UNIQUE ACTOR + COUNT UPDATE    */
  /* -------------------------------------------------- */
  await db.collection("notifications").updateOne(
    {
      userId: receiverId,
      type,
      postId: postObjId,
      read: false,
    },
    [
      {
        $set: {
          createdAt: {
            $ifNull: ["$createdAt", new Date()],
          },
          read: {
            $ifNull: ["$read", false],
          },
          actorIds: {
            $setUnion: [
              { $ifNull: ["$actorIds", []] },
              [actorObjId],
            ],
          },
        },
      },
      {
        $set: {
          count: { $size: "$actorIds" },
          updatedAt: new Date(),
        },
      },
    ],
    { upsert: true }
  );

  /* -------------------------------------------------- */
  /* ② FETCH UPDATED NOTIFICATION                      */
  /* -------------------------------------------------- */
  const notification = await db.collection("notifications").findOne({
    userId: receiverId,
    type,
    postId: postObjId,
    read: false,
  });

  if (!notification) return;

  /* -------------------------------------------------- */
  /* ③ FETCH ACTOR INFO                                */
  /* -------------------------------------------------- */
  const actor = await db.collection("users").findOne(
    { _id: actorObjId },
    { projection: { name: 1, avatarUrl: 1, image: 1 } }
  );

  /* -------------------------------------------------- */
  /* ④ BUILD SSE PAYLOAD                               */
  /* -------------------------------------------------- */
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

  /* -------------------------------------------------- */
  /* ⑤ EMIT SSE                                        */
  /* -------------------------------------------------- */
  notifyUser(userId, payload);
}
