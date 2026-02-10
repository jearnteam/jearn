import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { PostTypes, RawPost } from "@/types/post";
import { makeSafeRegex, enrichPost } from "../_utils";
import type { CategoryDoc } from "../_utils"; // 👈 optional if exported

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const cursor = searchParams.get("cursor");

  if (!q || q.length < 2) {
    return NextResponse.json({ posts: [], nextCursor: null });
  }

  const client = await clientPromise;
  const db = client.db("jearn");

  const postsColl = db.collection<RawPost>("posts");
  const usersColl = db.collection("users");
  const categoriesColl = db.collection<CategoryDoc>("categories"); // ✅ FIX

  const regex = makeSafeRegex(q);

  const query: any = {
    postType: { $ne: PostTypes.COMMENT },
    tags: { $elemMatch: { $regex: regex } },
  };

  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const rawPosts = await postsColl
    .find(query)
    .sort({ createdAt: -1 })
    .limit(15)
    .toArray();

  const posts = await Promise.all(
    rawPosts.map((p) => enrichPost(p, usersColl, categoriesColl))
  );

  return NextResponse.json({
    posts,
    nextCursor:
      rawPosts.length > 0
        ? rawPosts[rawPosts.length - 1].createdAt?.toISOString()
        : null,
  });
}
