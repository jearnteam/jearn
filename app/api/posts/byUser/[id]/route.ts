import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(_req: Request, { params }: any) {
  const { id } = params;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    // Get all posts by this user
    const posts = await db
      .collection("posts")
      .find({ authorId: id })
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch user info (author name)
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1 } }
    );

    const authorName = user?.name ?? "Unknown User";

    // Attach authorName + avatar URL to each post
    const mappedPosts = posts.map((post: any) => ({
      ...post,
      authorName,
      authorAvatar: `/api/user/avatar/${id}`, // fast avatar route
    }));

    return NextResponse.json({ ok: true, posts: mappedPosts });
  } catch (err) {
    console.error("🔥 Error in /api/posts/byUser:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
