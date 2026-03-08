import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const follows = db.collection("follow");
  const users = db.collection("users");

  const match: any = {
    followerId: userId,
  };

  if (cursor && ObjectId.isValid(cursor)) {
    match._id = { $lt: new ObjectId(cursor) };
  }

  const followDocs = await follows
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

  const followingIds = pageDocs
    .filter((f) => ObjectId.isValid(f.followingId))
    .map((f) => new ObjectId(f.followingId));

  const followingUsers = await users
    .find({ _id: { $in: followingIds } })
    .project({ name: 1, avatar: 1 })
    .toArray();

  const userMap = new Map(
    followingUsers.map((u) => [
      u._id.toString(),
      {
        uid: u._id.toString(),
        name: u.name ?? "Unknown",
        avatar: u.avatar ?? null,
      },
    ])
  );

  return NextResponse.json({
    users: pageDocs
      .map((f) => userMap.get(f.followingId))
      .filter(Boolean),
    nextCursor: hasMore
      ? pageDocs[pageDocs.length - 1]._id.toString()
      : null,
    isLastPage: !hasMore,
  });
}