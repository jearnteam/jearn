import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";

export const runtime = "nodejs";

/* -------------------------------------------------------------
 * AUTHOR RESOLVER (STRICT, REUSABLE SHAPE)
 * ----------------------------------------------------------- */
async function resolveAuthor(
  users: Collection,
  authorId?: string | null
): Promise<{
  name: string;
  uniqueId: string | null;
  avatarUpdatedAt: Date | null;
}> {
  if (!authorId) {
    return { name: "Anonymous", uniqueId: null, avatarUpdatedAt: null };
  }

  let user: WithId<Document> | null = null;

  // 1️⃣ ObjectId
  if (ObjectId.isValid(authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(authorId) },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1 } } // ✅ avatarUpdatedAtを取得
    );
  }

  // 2️⃣ provider_id fallback
  if (!user) {
    user = await users.findOne(
      { provider_id: authorId },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1 } }
    );
  }

  return {
    name: (user?.name as string | undefined) ?? "Anonymous",
    uniqueId: (user?.uniqueId as string | undefined) ?? null,
    avatarUpdatedAt: (user?.avatarUpdatedAt as Date | undefined) ?? null, // ✅ 追加
  };
}

/* -------------------------------------------------------------
 * GET COMMENTS FOR POST
 * ----------------------------------------------------------- */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    if (!postId || !ObjectId.isValid(postId)) {
      return NextResponse.json([], { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");

    const docs = await posts
      .find({ parentId: postId })
      .sort({ createdAt: 1 })
      .toArray();

    const enriched = await Promise.all(
      docs.map(async (c: WithId<Document>) => {
        const author = await resolveAuthor(users, c.authorId as string | null);

        return {
          _id: c._id.toString(),
          parentId: c.parentId?.toString(),
          replyTo: c.replyTo?.toString() ?? null,

          postType: c.postType ?? "Comment", // 👈 important
          title: typeof c.title === "string" ? c.title : null, // 👈 add this
          content: c.content ?? "",

          upvoteCount: c.upvoteCount ?? 0,
          createdAt: c.createdAt ?? null,

          authorName: author.name,
          authorUniqueId: author.uniqueId,
          authorAvatarUpdatedAt: author.avatarUpdatedAt,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ GET /api/posts/[id]/comments:", err);
    return NextResponse.json([], { status: 500 });
  }
}
