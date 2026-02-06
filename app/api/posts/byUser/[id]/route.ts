// app/api/posts/byUser/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, Collection, WithId, Document } from "mongodb";


const CDN = process.env.R2_PUBLIC_URL;

function buildAuthorAvatar(
  authorId: string,
  avatarUpdatedAt?: Date | null
) {
  if (!authorId) {
    return `${CDN}/avatars/default.webp`;
  }

  const ts = avatarUpdatedAt
    ? `?t=${new Date(avatarUpdatedAt).getTime()}`
    : "";

  return `${CDN}/avatars/${authorId}.webp${ts}`;
}
/* -------------------------------------------------------------
 * AUTHOR RESOLVER
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

  if (ObjectId.isValid(authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(authorId) },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1, email: 1 } }
    );
  }

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
    .map((c) => {
      if (c instanceof ObjectId) return c;
      if (typeof c === "string" && ObjectId.isValid(c)) {
        return new ObjectId(c);
      }
      return null;
    })
    .filter((c): c is ObjectId => c !== null);

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
 * GET — posts by user (PAGINATED)
 * ============================================================= */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: authorId } = await params;

  if (!authorId) {
    return NextResponse.json(
      { ok: false, error: "Missing user ID" },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 20);
    const cursor = searchParams.get("cursor");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const postsColl = db.collection("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection("categories");

    /* -------- Resolve author once -------- */
    const author = await resolveAuthor(usersColl, authorId);

    /* -------- Admin logic -------- */
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];

    const isAdminUser =
      !!author.email && adminEmails.includes(author.email);

    /* -------- Build query -------- */
    const query: Record<string, unknown> = {
      authorId,
      parentId: null,
    };

    if (cursor && ObjectId.isValid(cursor)) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    /* -------- Fetch (limit + 1) -------- */
    const docs = await postsColl
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    const nextCursor = hasMore
      ? page[page.length - 1]._id.toString()
      : null;

    /* -------- Enrich posts -------- */
    const enrichedPosts = await Promise.all(
      page.map(async (post: WithId<Document>) => {
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

          authorId,
          authorName: author.name,
          authorUniqueId: author.uniqueId,
          authorAvatar: buildAuthorAvatar(authorId, author.avatarUpdatedAt),
          authorAvatarUpdatedAt: author.avatarUpdatedAt,

          categories,
          tags: post.tags ?? [],
          upvoteCount: post.upvoteCount ?? 0,
          commentCount: post.commentCount ?? 0,

          isAdmin: isAdminUser,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      posts: enrichedPosts,
      nextCursor,
    });
  } catch (err) {
    console.error("🔥 GET /api/posts/byUser/[id]:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
