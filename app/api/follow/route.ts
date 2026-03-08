// app/api/follow/route.ts
import { getMongoClient } from "@/lib/mongodb";
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
  const client = await getMongoClient();
  const db = client.db("jearn");

  const follows = db.collection("follow");
  const notifications = db.collection("notifications");

  const followerId = session.user.uid;
  const followingId = targetUserId;

  const existing = await follows.findOne({
    followerId,
    followingId,
  });

  // unfollow
  if (existing) {
    await follows.deleteOne({ _id: existing._id });
    return NextResponse.json({ ok: true, action: "unfollowed" });
  }

  // follow
  await follows.insertOne({
    followerId,
    followingId,
    createdAt: new Date(),
  });

  // 🔔 通知を作成（← これが今まで無かった）
  await notifications.insertOne({
    userId: new ObjectId(followingId),   // 通知を受け取る人
    type: "follow",
    actorIds: [new ObjectId(followerId)],
    count: 1,
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 🔔 SSE 通知
  notify(followingId);

  return NextResponse.json({ ok: true, action: "followed" });
}
