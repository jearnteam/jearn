import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

const PAGE_SIZE = 30;

/* -------------------------------------------------
 * GET /api/chat/messages
 * ------------------------------------------------- */
export async function GET(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myUid = session.user.uid; // 🔥 STRING UID

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

  /* 1️⃣ Check room membership (🔥 STRING MATCH) */
  const room = await roomsCol.findOne({
    _id: roomId,
    members: myUid,
  });

  if (!room) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* 2️⃣ Build message query */
  const match: any = { roomId };

  if (cursor && ObjectId.isValid(cursor)) {
    match._id = { $lt: new ObjectId(cursor) };
  }

  /* 3️⃣ Fetch messages */
  const docs = await messagesCol
    .aggregate([
      { $match: match },
      { $sort: { _id: -1 } },
      { $limit: PAGE_SIZE + 1 },
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

  const hasMore = docs.length > PAGE_SIZE;
  const pageDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

  return NextResponse.json({
    messages: pageDocs.map((m) => ({
      id: m._id.toString(),
      senderId: m.senderId, // 🔥 STRING
      text: m.text,
      createdAt: m.createdAt,
    })),
    nextCursor: hasMore
      ? pageDocs[pageDocs.length - 1]._id.toString()
      : null,
    isLastPage: !hasMore,
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

  const myUid = session.user.uid; // 🔥 STRING UID

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

  /* 1️⃣ Check room membership (🔥 STRING MATCH) */
  const room = await roomsCol.findOne({
    _id: roomId,
    members: myUid,
  });

  if (!room) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* 2️⃣ Insert message */
  const now = new Date();

  const doc = {
    roomId,
    senderId: myUid, // 🔥 STRING
    text: text.trim(),
    createdAt: now,
    readBy: [myUid],
  };

  const result = await messagesCol.insertOne(doc);

  await roomsCol.updateOne(
    { _id: roomId },
    { $set: { lastMessageAt: now } }
  );

  return NextResponse.json({
    id: result.insertedId.toString(),
    senderId: myUid,
    text: doc.text,
    createdAt: doc.createdAt,
  });
}
