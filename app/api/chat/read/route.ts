import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid || !ObjectId.isValid(session.user.uid)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await req.json();

  if (!ObjectId.isValid(roomId)) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const myObjectId = new ObjectId(session.user.uid);

  await db.collection("chat_messages").updateMany(
    {
      roomId: new ObjectId(roomId),
      senderId: { $ne: myObjectId },
      readBy: { $ne: myObjectId },
    },
    {
      $addToSet: { readBy: myObjectId },
    }
  );

  return NextResponse.json({ ok: true });
}