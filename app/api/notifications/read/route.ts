export const runtime = "nodejs";

import clientPromise from "@/lib/mongodb";
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
      console.error("Invalid ObjectId:", userId);
      return new Response("Invalid userId", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    await db.collection("notifications").updateMany(
      { userId: new ObjectId(userId), read: false },
      { $set: { read: true } }
    );

    return Response.json({ ok: true });

  } catch (err) {
    console.error("READ ERROR:", err);
    return new Response("Server error", { status: 500 });
  }
}
