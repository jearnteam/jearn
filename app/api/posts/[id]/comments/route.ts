// app/api/posts/[id]/comments/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

// reuse same author resolver inline
async function resolveAuthor(users: any, authorId?: string | null) {
  if (!authorId) return { name: "Anonymous", avatar: null, avatarId: null };
  let user = null;
  if (ObjectId.isValid(authorId)) {
    user = await users.findOne({ _id: new ObjectId(authorId) }, { projection: { name: 1, userId: 1 } });
  }
  if (!user) {
    user = await users.findOne({ provider_id: authorId }, { projection: { name: 1, userId: 1 } });
  }
  // const avatarId = user?._id ? String(user._id) : (ObjectId.isValid(authorId) ? authorId : null);
  // const avatar = avatarId ? `/api/user/avatar/${avatarId}?t=${Date.now()}` : null;
  return { name: user?.name ?? "Anonymous", userId: user?.userId, /*avatar, avatarId*/ };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");

    const docs = await posts.find({ parentId: params.id }).sort({ createdAt: 1 }).toArray();
    const enriched = await Promise.all(
      docs.map(async (c: any) => {
        const a = await resolveAuthor(users, c.authorId);
        return {
          ...c,
          _id: c._id.toString(),
          authorName: a.name,
          authorUserId: a.userId,
          authorAvatar: a.avatar,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ GET /api/posts/[id]/comments:", err);
    return NextResponse.json([], { status: 500 });
  }
}
