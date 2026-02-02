import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  /* 1️⃣ AUTH */
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ObjectId.isValid(session.user.uid)) {
    return NextResponse.json(
      { error: "Invalid session user" },
      { status: 401 }
    );
  }

  const myId = new ObjectId(session.user.uid);

  /* 2️⃣ BODY */
  const body = await req.json().catch(() => null);
  const targetUid =
    body && typeof body.targetUserId === "string"
      ? body.targetUserId
      : null;

  if (!targetUid || targetUid === session.user.uid) {
    return NextResponse.json(
      { error: "Invalid target user" },
      { status: 400 }
    );
  }

  if (!ObjectId.isValid(targetUid)) {
    return NextResponse.json(
      { error: "Invalid target user" },
      { status: 400 }
    );
  }

  const targetId = new ObjectId(targetUid);

  /* 3️⃣ DB */
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const usersCol = db.collection("users");

  /* 4️⃣ VERIFY TARGET USER EXISTS */
  const exists = await usersCol.findOne(
    { _id: targetId },
    { projection: { _id: 1 } }
  );

  if (!exists) {
    return NextResponse.json(
      { error: "Invalid target user" },
      { status: 400 }
    );
  }

  /* 5️⃣ NORMALIZE MEMBERS */
  const members = [myId, targetId].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  /* 6️⃣ ATOMIC UPSERT (Mongo v6 SAFE) */
  const now = new Date();

  const result = await roomsCol.findOneAndUpdate(
    { type: "direct", members },
    {
      $setOnInsert: {
        type: "direct",
        members,
        createdAt: now,
        lastMessageAt: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      includeResultMetadata: true, // 🔥 REQUIRED
    }
  );

  if (!result.value) {
    return NextResponse.json(
      { error: "Failed to create chat room" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    roomId: result.value._id.toString(),
    created: Boolean(result.lastErrorObject?.upserted),
  });
}
