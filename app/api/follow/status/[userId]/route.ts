// app/api/follow/status/[userId]/route.ts
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const follows = db.collection("follow");

  const existing = await follows.findOne({
    followerId: session.user.uid, // ✅ string
    followingId: userId, // ✅ string
  });

  return NextResponse.json({ following: !!existing });
}
