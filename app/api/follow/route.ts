// app/api/follow/route.ts
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";
import { notify } from "@/lib/notificationHub";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { targetUserId } = await req.json();

  if (!ObjectId.isValid(targetUserId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (session.user.uid === targetUserId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");
  const follows = db.collection("follow");

  const followerId = session.user.uid;   // ✅ string
  const followingId = targetUserId;      // ✅ string

  const existing = await follows.findOne({
    followerId,
    followingId,
  });

  if (existing) {
    await follows.deleteOne({ _id: existing._id });
    return NextResponse.json({ ok: true, action: "unfollowed" });
  }

  await follows.insertOne({
    followerId,
    followingId,
    createdAt: new Date(),
  });

  notify(targetUserId);

  return NextResponse.json({ ok: true, action: "followed" });
}
