// app/api/chat/messages/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

/* -------------------------------------------------
 * GET /api/chat/messages?roomId=xxx&cursor=xxx
 * ------------------------------------------------- */
export async function GET(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myUid = session.user.uid;

  const { searchParams } = new URL(req.url);
  const roomIdStr = searchParams.get("roomId");
  const cursor = searchParams.get("cursor");

  if (!roomIdStr || !ObjectId.isValid(roomIdStr)) {
    return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
  }

  const roomId = new ObjectId(roomIdStr);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const messagesCol = db.collection("chat_messages");

  const room = await roomsCol.findOne({
    _id: roomId,
    members: myUid,
  });

  if (!room) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const match: any = { roomId };
  if (cursor && ObjectId.isValid(cursor)) {
    match._id = { $lt: new ObjectId(cursor) };
  }

  // 🔥 IMPORTANT: DO NOT reverse
  const docs = await messagesCol
    .aggregate([
      { $match: match },
      { $sort: { _id: -1 } }, // newest → oldest
      { $limit: 30 },
      {
        $project: {
          _id: 1,
          senderId: 1,
          text: 1,
          createdAt: 1,
        },
      },
    ])
    .toArray();

  return NextResponse.json({
    messages: docs.map((m) => ({
      id: m._id.toString(),
      senderId: m.senderId,
      text: m.text,
      createdAt: m.createdAt,
    })),
    // 👇 cursor = OLDEST in this page
    nextCursor: docs.length > 0 ? docs[docs.length - 1]._id.toString() : null,
  });
}

/* -------------------------------------------------
 * POST /api/chat/messages
 * ------------------------------------------------- */
export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myUid = session.user.uid; // _id as string

  const body = await req.json().catch(() => null);
  const roomIdStr = body?.roomId;
  const text = body?.text;

  if (
    !roomIdStr ||
    !ObjectId.isValid(roomIdStr) ||
    typeof text !== "string" ||
    !text.trim()
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const roomId = new ObjectId(roomIdStr);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const messagesCol = db.collection("chat_messages");
  const usersCol = db.collection("users");

  /* ---------------------------------------------
   * 1️⃣ Check room membership
   * ------------------------------------------- */
  const room = await roomsCol.findOne({
    _id: roomId,
    members: myUid,
  });

  if (!room) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* ---------------------------------------------
   * 2️⃣ Insert message
   * ------------------------------------------- */
  const now = new Date();

  const doc = {
    roomId,
    senderId: myUid, // string _id
    text: text.trim(),
    createdAt: now,
    readBy: [myUid],
  };

  const result = await messagesCol.insertOne(doc);

  /* ---------------------------------------------
   * 3️⃣ Update room metadata
   * ------------------------------------------- */
  await roomsCol.updateOne({ _id: roomId }, { $set: { lastMessageAt: now } });

  /* ---------------------------------------------
   * 4️⃣ Attach sender info
   * ------------------------------------------- */
  const sender = await usersCol.findOne(
    { _id: new ObjectId(myUid) },
    { projection: { name: 1, avatar: 1 } }
  );

  return NextResponse.json({
    id: result.insertedId.toString(),
    senderId: myUid,
    senderName: sender?.name ?? "Unknown",
    senderAvatar: sender?.avatar ?? null,
    text: doc.text,
    createdAt: doc.createdAt,
  });
}
