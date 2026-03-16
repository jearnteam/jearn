import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid || !ObjectId.isValid(session.user.uid)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const roomId = body?.roomId;
  const mode = body?.mode === "video" ? "video" : "audio";

  if (!roomId || !ObjectId.isValid(roomId)) {
    return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const callsCol = db.collection("call_sessions");

  const room = await roomsCol.findOne({
    _id: new ObjectId(roomId),
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const callerId = new ObjectId(session.user.uid);

  const callee = room.members.find(
    (m: ObjectId) => !m.equals(callerId)
  );

  if (!callee) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }

  const livekitRoom = `call_${new ObjectId().toString()}`;

  const insert = await callsCol.insertOne({
    roomId: room._id,
    callerId,
    calleeId: callee,
    mode,
    status: "ringing",
    livekitRoom,
    createdAt: new Date(),
  });

  return NextResponse.json({
    callId: insert.insertedId.toString(),
    calleeId: callee.toString(),
    roomName: livekitRoom,
  });
}