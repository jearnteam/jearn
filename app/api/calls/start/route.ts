import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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

    const myId = new ObjectId(session.user.uid);
    const roomObjectId = new ObjectId(roomId);

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const roomsCol = db.collection("chat_rooms");
    const callsCol = db.collection("call_sessions");

    const room = await roomsCol.findOne({
      _id: roomObjectId,
      members: myId,
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const calleeId = room.members.find((m: ObjectId) => !m.equals(myId));

    if (!calleeId) {
      return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    }

    const callId = new ObjectId();
    const livekitRoom = `call_${callId.toString()}`;

    await callsCol.insertOne({
      _id: callId,
      roomId: roomObjectId,
      callerId: myId,
      calleeId,

      mode,
      status: "ringing",

      livekitRoom,

      createdAt: new Date(),
      acceptedAt: null,
      endedAt: null,
    });

    return NextResponse.json({
      callId: callId.toString(),
      roomName: livekitRoom,
      calleeId: calleeId.toString(),
    });

  } catch {
    return NextResponse.json(
      { error: "Unhandled error" },
      { status: 500 }
    );
  }
}