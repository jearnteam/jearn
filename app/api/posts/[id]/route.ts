// app/api/posts/[id]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

// reuse same author resolver inline
async function resolveAuthor(users: any, authorId?: string | null) {
  if (!authorId) return { name: "Anonymous", avatar: null, avatarId: null };
  let user = null;
  if (ObjectId.isValid(authorId)) {
    user = await users.findOne({ _id: new ObjectId(authorId) }, { projection: { name: 1 } });
  }
  if (!user) {
    user = await users.findOne({ provider_id: authorId }, { projection: { name: 1 } });
  }
  const avatarId = user?._id ? String(user._id) : (ObjectId.isValid(authorId) ? authorId : null);
  const avatar = avatarId ? `/api/user/avatar/${avatarId}?t=${Date.now()}` : null;
  return { name: user?.name ?? "Anonymous", avatar, avatarId };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id || !ObjectId.isValid(id)) return NextResponse.json(null, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");

    const post = await posts.findOne({ _id: new ObjectId(id) });
    if (!post) return NextResponse.json(null, { status: 404 });

    const a = await resolveAuthor(users, post.authorId);

    // ✅ Count comments and replies belonging to this post
    const commentCount = await posts.countDocuments({ parentId: id });

    const enriched = {
      ...post,
      _id: id,
      authorName: a.name,
      authorAvatar: a.avatar,
      commentCount, // ✅ send to client
    };

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ GET /api/posts/[id]:", err);
    return NextResponse.json(null, { status: 500 });
  }
}
