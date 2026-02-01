// app/api/follow/me/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export async function GET() {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myUid = session.user.uid;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const follows = db.collection("follow");
  const users = db.collection("users");

  const followingLinks = await follows
    .find({ followerId: myUid })
    .toArray();

  const followingUids = followingLinks.map(
    (f) => f.followingId // ✅ this should already be uid
  );

  if (followingUids.length === 0) {
    return NextResponse.json([]);
  }

  const followingUsers = await users
    .find({ uid: { $in: followingUids } }) // ✅ lookup by uid
    .project({ uid: 1, name: 1, avatar: 1 })
    .toArray();

  return NextResponse.json(
    followingUsers.map((u) => ({
      uid: u._id,           // ✅ CORRECT
      name: u.name,
      avatar: u.avatar ?? null,
    }))
  );
}
