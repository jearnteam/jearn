// app/api/follow/status/[userId]/route.ts
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ following: false });
  }

  const client = await clientPromise;
  const db = client.db();

  const exists = await db.collection("follow").findOne({
    followerId: session.user.uid,
    followingId: userId,
  });

  return NextResponse.json({ following: !!exists });
}
