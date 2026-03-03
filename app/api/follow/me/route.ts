import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

const PAGE_SIZE = 15;

export async function GET(req: Request) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const myUid = session.user.uid; // string

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const followsCol = db.collection("follow");
  const usersCol = db.collection("users");

  /* 1️⃣ Match */
  const match: any = { followerId: myUid };

  if (cursor && ObjectId.isValid(cursor)) {
    match._id = { $lt: new ObjectId(cursor) };
  }

  /* 2️⃣ Fetch follow docs */
  const followDocs = await followsCol
    .find(match)
    .sort({ _id: -1 })
    .limit(PAGE_SIZE + 1)
    .toArray();

  const hasMore = followDocs.length > PAGE_SIZE;
  const pageDocs = hasMore
    ? followDocs.slice(0, PAGE_SIZE)
    : followDocs;

  if (!pageDocs.length) {
    return NextResponse.json({
      users: [],
      nextCursor: null,
      isLastPage: true,
    });
  }

  /* 3️⃣ Get followed ObjectIds */
  const followedIds = pageDocs
    .map((f) => f.followingId)
    .filter((id: string) => ObjectId.isValid(id))
    .map((id: string) => new ObjectId(id));

  const userDocs = await usersCol
    .find(
      { _id: { $in: followedIds } },
      {
        projection: {
          name: 1,
          avatar: 1,
          avatarUpdatedAt: 1,
        },
      }
    )
    .toArray();

  /* 4️⃣ Normalize EXACTLY like chat list route */
  const userMap = new Map(
    userDocs.map((u) => [
      u._id.toString(),
      {
        uid: u._id.toString(),
        name: u.name ?? "Unknown",
        avatar:
          typeof u.avatar === "string" && u.avatar.length > 0
            ? u.avatar
            : null,
        avatarUpdatedAt:
          u.avatarUpdatedAt instanceof Date
            ? u.avatarUpdatedAt.toISOString()
            : u.avatarUpdatedAt ?? null,
      },
    ])
  );

  /* 5️⃣ Preserve order */
  const usersResult = pageDocs
    .map((f) => userMap.get(f.followingId))
    .filter(Boolean);

  return NextResponse.json({
    users: usersResult,
    nextCursor: hasMore
      ? pageDocs[pageDocs.length - 1]._id.toString()
      : null,
    isLastPage: !hasMore,
  });
}