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

    const { id } = await req.json();

    if (!ObjectId.isValid(id)) {
      return new Response("Invalid notification id", { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db("jearn");

    await db.collection("notifications").updateOne(
        { _id: new ObjectId(id) },
        { $set: { uiRead: true } } // ONLY UI
      );

    return Response.json({ ok: true });

  } catch (err) {
    console.error("READ ONE ERROR:", err);
    return new Response("Server error", { status: 500 });
  }
}