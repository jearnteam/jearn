// app/api/follow/count/[userId]/route.ts
import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const follows = db.collection("follow");

  const followers = await follows.countDocuments({
    followingId: userId,
  });

  const following = await follows.countDocuments({
    followerId: userId,
  });

  return NextResponse.json({ followers, following });
}
