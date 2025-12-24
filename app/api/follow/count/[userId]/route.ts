// app/api/follow/count/[userId]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const client = await clientPromise;
  const db = client.db();

  const followers = await db
    .collection("follow")
    .countDocuments({ followingId: userId });

  const following = await db
    .collection("follow")
    .countDocuments({ followerId: userId });

  return NextResponse.json({ followers, following });
}
