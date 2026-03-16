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

  const { callId } = await req.json();

  if (!callId || !ObjectId.isValid(callId)) {
    return NextResponse.json({ error: "Invalid callId" }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const callsCol = db.collection("call_sessions");

  const call = await callsCol.findOne({
    _id: new ObjectId(callId),
  });

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  await callsCol.updateOne(
    { _id: call._id },
    {
      $set: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    }
  );

  return NextResponse.json({
    roomName: call.livekitRoom,
    mode: call.mode,
  });
}
