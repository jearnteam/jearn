import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const follows = db.collection("follow");
  const users = db.collection("users");

  // 自分がフォローしている userId 一覧
  const followingLinks = await follows.find({ followerId: userId }).toArray();

  if (followingLinks.length === 0) {
    return NextResponse.json([]);
  }

  const followingIds = followingLinks.map((f) => new ObjectId(f.followingId));

  // ユーザー情報取得
  const followingUsers = await users
    .find({ _id: { $in: followingIds } })
    .project({ name: 1, avatar: 1 })
    .toArray();

  return NextResponse.json(
    followingUsers.map((u) => ({
      uid: u._id.toString(),
      name: u.name,
      avatar: u.avatar,
    }))
  );
}
