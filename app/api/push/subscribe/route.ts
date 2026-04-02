// app/api/push/subscribe/route.ts
export const runtime = "nodejs";

import { getMongoClient } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.uid;

    if (!ObjectId.isValid(userId)) {
      return new Response("Invalid userId", { status: 400 });
    }

    const body = await req.json();
    const subscription = body?.subscription ?? body;

    if (!subscription?.endpoint) {
      return new Response("Invalid subscription", { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db("jearn");

    const userObjectId = new ObjectId(userId);

    await db.collection("push_subscriptions").updateOne(
      {
        userId: userObjectId,
        endpoint: subscription.endpoint,
      },
      {
        $set: {
          userId: userObjectId,
          endpoint: subscription.endpoint,
          subscription,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("PUSH SUBSCRIBE ERROR:", err);
    return new Response("Server error", { status: 500 });
  }
}