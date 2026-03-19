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

  /* ================= SAFE MEMBER EXTRACTION ================= */

  const callerId = new ObjectId(session.user.uid);

  // normalize members → string[]
  const members: string[] = (room.members || []).map((m: any) =>
    typeof m === "string" ? m : m.toString()
  );

  const callerIdStr = callerId.toString();

  /* 🔥 CRITICAL CHECK */
  if (!members.includes(callerIdStr)) {
    return NextResponse.json(
      { error: "User not in this room" },
      { status: 403 }
    );
  }

  /* ================= FIND CALLEE ================= */

  const otherMembers = members.filter((id) => id !== callerIdStr);

  if (otherMembers.length === 0) {
    return NextResponse.json(
      { error: "No callee found (self room?)" },
      { status: 400 }
    );
  }

  if (otherMembers.length > 1) {
    console.warn("⚠️ Group room call detected. Using first member as callee.");
  }

  const calleeIdStr = otherMembers[0];
  const calleeId = new ObjectId(calleeIdStr);

  /* 🔥 FINAL SAFETY (prevents your exact bug) */
  if (calleeIdStr === callerIdStr) {
    return NextResponse.json(
      { error: "Callee equals caller (BUG PREVENTED)" },
      { status: 500 }
    );
  }

  /* ================= CREATE CALL ================= */

  const roomName = `call_${new ObjectId().toString()}`;

  const insert = await callsCol.insertOne({
    roomId: room._id,
    callerId,
    calleeId,
    mode,
    status: "ringing",
    roomName, // renamed from livekitRoom (more generic)
    createdAt: new Date(),
  });

  /* ================= DEBUG LOG ================= */

  console.log("📞 CALL CREATED:", {
    callId: insert.insertedId.toString(),
    callerId: callerIdStr,
    calleeId: calleeIdStr,
    members,
  });

  /* ================= RESPONSE ================= */

  return NextResponse.json({
    callId: insert.insertedId.toString(),
    calleeId: calleeIdStr,
    roomName,
  });
}