// app/api/tags/[tag]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, Collection, WithId, Document } from "mongodb";

/* -------------------------------------------------------------
 * AUTHOR RESOLVER (SHARED LOGIC)
 * ----------------------------------------------------------- */
async function resolveAuthor(
  users: Collection,
  authorId?: string | null
): Promise<{
  name: string;
  uniqueId: string | null;
  avatarUpdatedAt: Date | null;
  email: string | null;
}> {
  if (!authorId) {
    return {
      name: "Anonymous",
      uniqueId: null,
      avatarUpdatedAt: null,
      email: null,
    };
  }

  let user: WithId<Document> | null = null;

  // ObjectId
  if (ObjectId.isValid(authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(authorId) },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1, email: 1 } }
    );
  }

  // provider_id fallback
  if (!user) {
    user = await users.findOne(
      { provider_id: authorId },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1, email: 1 } }
    );
  }

  return {
    name: (user?.name as string | undefined) ?? "Anonymous",
    uniqueId: (user?.uniqueId as string | undefined) ?? null,
    avatarUpdatedAt: (user?.avatarUpdatedAt as Date | undefined) ?? null,
    email: (user?.email as string | undefined) ?? null,
  };
}

/* -------------------------------------------------------------
 * CATEGORY ENRICHER
 * ----------------------------------------------------------- */
type EnrichedCategory = {
  id: string;
  name: string;
  jname: string;
  myname: string;
};

async function enrichCategories(
  catIds: unknown[],
  categoriesColl: Collection
): Promise<EnrichedCategory[]> {
  if (!Array.isArray(catIds) || catIds.length === 0) return [];

  const validIds = catIds
    .filter(
      (c): c is string => typeof c === "string" && ObjectId.isValid(c)
    )
    .map((c) => new ObjectId(c));

  if (!validIds.length) return [];

  const docs = await categoriesColl
    .find({ _id: { $in: validIds } })
    .project({ name: 1, jname: 1, myname: 1 })
    .toArray();

  return docs.map((c) => ({
    id: c._id.toString(),
    name: c.name ?? "",
    jname: c.jname ?? "",
    myname: c.myname ?? "",
  }));
}

/* ===============================================================
 * GET — posts by tag (MODERN, AVATAR-SAFE)
 * ============================================================= */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);

    if (!decodedTag) {
      return NextResponse.json(
        { ok: false, error: "Missing tag" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const postsColl = db.collection("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection("categories");

    /* ----------- Fetch top-level posts ----------- */
    const posts = await postsColl
      .find({ parentId: null, tags: decodedTag })
      .sort({ createdAt: -1 })
      .toArray();

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];

    const enrichedPosts = await Promise.all(
      posts.map(async (post: WithId<Document>) => {
        const author = await resolveAuthor(
          usersColl,
          post.authorId as string | null
        );

        const isAdmin =
          !!author.email && adminEmails.includes(author.email);

        const categories = await enrichCategories(
          Array.isArray(post.categories) ? post.categories : [],
          categoriesColl
        );

        return {
          _id: post._id.toString(),
          title: post.title,
          content: post.content,
          createdAt: post.createdAt,
          edited: post.edited ?? false,
          editedAt: post.editedAt ?? null,

          authorId: post.authorId,
          authorName: author.name,
          authorUniqueId: author.uniqueId,
          authorAvatarUpdatedAt: author.avatarUpdatedAt,

          categories,
          tags: post.tags ?? [],
          upvoteCount: post.upvoteCount ?? 0,
          commentCount: post.commentCount ?? 0,

          isAdmin,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      tag: decodedTag,
      posts: enrichedPosts,
    });
  } catch (err) {
    console.error("❌ GET /api/tags/[tag]:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
