import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  // 事実：uid がログインユーザーID
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
  console.log("Connected to DB:", db.databaseName);

  const existing = await follows.findOne({
    followerId: session.user.uid,
    followingId: targetUserId,
  });

  // すでにフォロー → アンフォロー
  if (existing) {
    await follows.deleteOne({ _id: existing._id });
    return NextResponse.json({ ok: true, action: "unfollowed" });
  }

  // フォロー
  await follows.insertOne({
    followerId: session.user.uid,
    followingId: targetUserId,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, action: "followed" });
}
