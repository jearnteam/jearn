//@/app/api/follow/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const follows = db.collection("follow");
  const users = db.collection("users");

  // フォロワーの userId 一覧
  const followerLinks = await follows
    .find({ followingId: params.userId })
    .toArray();

  const followerIds = followerLinks.map((f) => new ObjectId(f.followerId));

  // ユーザー情報取得
  const followerUsers = await users
    .find({ _id: { $in: followerIds } })
    .project({ name: 1, avatar: 1 })
    .toArray();

  return NextResponse.json(
    followerUsers.map((u) => ({
      uid: u._id.toString(),
      name: u.name,
      avatar: u.avatar,
    }))
  );
}
