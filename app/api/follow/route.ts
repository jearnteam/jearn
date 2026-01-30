import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { notify } from "@/lib/notificationHub";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { targetUserId } = await req.json();

  // 自分自身はフォロー不可
  if (session.user.uid === targetUserId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const follows = db.collection("follow");
  const notifications = db.collection("notifications");

  const followerId = new ObjectId(session.user.uid);
  const followedId = new ObjectId(targetUserId);

  const existing = await follows.findOne({
    followerId: session.user.uid,
    followingId: targetUserId,
  });

  // すでにフォロー → アンフォロー（通知は出さない）
  if (existing) {
    await follows.deleteOne({ _id: existing._id });
    return NextResponse.json({ ok: true, action: "unfollowed" });
  }

  // -----------------------
  // フォロー
  // -----------------------
  await follows.insertOne({
    followerId: session.user.uid,
    followingId: targetUserId,
    createdAt: new Date(),
  });

  // -----------------------
  // 通知保存（follow）
  // -----------------------
  await notifications.updateOne(
    {
      userId: followedId,
      type: "follow",
    },
    {
      $addToSet: { actorIds: followerId },
      $set: {
        read: false,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  // -----------------------
  // SSE 通知発火
  // -----------------------
  notify(targetUserId);

  return NextResponse.json({ ok: true, action: "followed" });
}
