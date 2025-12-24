import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: { userId: string } }
) {
  const client = await clientPromise;
  const db = client.db();

  const followers = await db
    .collection("follow")
    .countDocuments({ followingId: params.userId });

  const following = await db
    .collection("follow")
    .countDocuments({ followerId: params.userId });

  return NextResponse.json({ followers, following });
}
