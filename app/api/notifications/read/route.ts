// app/api/notifications/read/route.ts
export const runtime = "nodejs";

import { getMongoClient } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export async function POST() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.uid;

    if (!ObjectId.isValid(userId)) {
      return new Response("Invalid userId", { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db("jearn");

    const userObjectId = new ObjectId(userId);

    const user = await db.collection("users").findOne(
      { _id: userObjectId },
      { projection: { lastSeenNotificationsAt: 1 } }
    );

    const lastSeen = user?.lastSeenNotificationsAt ?? new Date(0);

    const newCount = await db.collection("notifications").countDocuments({
      userId: userObjectId,
      createdAt: { $gt: lastSeen },
    });

    await db.collection("users").updateOne(
      { _id: userObjectId },
      { $set: { lastSeenNotificationsAt: new Date() } }
    );

    await db.collection("notifications").updateMany(
      { userId: userObjectId, read: false },
      { $set: { read: true } }
    );

    // 💥 IMPORTANT FIX
    await db.collection("notification_push_groups").deleteMany({
      userId: userObjectId,
    });

    return Response.json({
      ok: true,
      new: newCount,
    });
  } catch (err) {
    console.error("READ ERROR:", err);
    return new Response("Server error", { status: 500 });
  }
}