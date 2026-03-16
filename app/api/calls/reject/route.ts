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
  const callId = body?.callId;

  if (!callId || !ObjectId.isValid(callId)) {
    return NextResponse.json({ error: "Invalid callId" }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const callsCol = db.collection("call_sessions");

  await callsCol.updateOne(
    { _id: new ObjectId(callId) },
    {
      $set: {
        status: "rejected",
        endedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}