import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.uid || !ObjectId.isValid(session.user.uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const callId = body?.callId;

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

    const userId = new ObjectId(session.user.uid);

    // Only caller or callee can end the call
    const isCaller = call.callerId?.equals(userId);
    const isCallee = call.calleeId?.equals(userId);

    if (!isCaller && !isCallee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent ending twice
    if (call.endedAt) {
      return NextResponse.json({ ok: true, alreadyEnded: true });
    }

    const endedAt = new Date();

    let status = "ended";
    let duration = 0;

    // Missed call
    if (call.status === "ringing") {
      status = "missed";
    }

    // Normal ended call
    if (call.acceptedAt) {
      duration = Math.floor(
        (endedAt.getTime() - new Date(call.acceptedAt).getTime()) / 1000
      );
    }

    await callsCol.updateOne(
      { _id: call._id },
      {
        $set: {
          status,
          endedAt,
          duration,
        },
      }
    );

    return NextResponse.json({
      ok: true,
      status,
      duration,
    });
  } catch (err) {
    console.error("End call failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}