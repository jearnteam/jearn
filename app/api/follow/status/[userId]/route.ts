import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ following: false });
  }

  const client = await clientPromise;
  const db = client.db();

  const exists = await db.collection("follow").findOne({
    followerId: session.user.uid,
    followingId: params.userId,
  });

  return NextResponse.json({ following: !!exists });
}
