import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { PostTypes } from "@/types/post";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("jearn");

    const posts = await db
      .collection("posts")
      .find({
        parentId: null,
        postType: { $ne: PostTypes.COMMENT },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json(
      posts.map((p) => ({
        _id: p._id.toString(),
        title: p.title ?? "",
        createdAt: p.createdAt,
      }))
    );
  } catch (err) {
    console.error("❌ GET /api/mobile/posts:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
