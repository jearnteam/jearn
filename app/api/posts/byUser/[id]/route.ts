// app/api/posts/byUser/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, Collection, WithId, Document } from "mongodb";
import { buildFeedResponse } from "@/lib/post/buildFeedResponse";
import type { RawPost } from "@/types/post";

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};
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

    const postsColl = db.collection<RawPost>("posts");
    const usersColl = db.collection("users"); // fine as Document
    const categoriesColl = db.collection<CategoryDoc>("categories");

    /* -------- Resolve author once -------- */
    const author = await resolveAuthor(usersColl, authorId);

    /* -------- Admin logic -------- */
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];

    const isAdminUser = !!author.email && adminEmails.includes(author.email);

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

    const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;

    /* -------- Enrich posts -------- */

    const enrichedPosts = await buildFeedResponse(page, {
      usersColl,
      categoriesColl,
      viewerId: null,
      postsColl,
    });

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
