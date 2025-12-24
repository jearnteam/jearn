// app/api/posts/byUser/[id]/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/* ---------------------- AUTHOR RESOLVER ---------------------- */
async function resolveAuthor(users: any, authorId?: string | null) {
  if (!authorId) {
    return {
      name: "Anonymous",
      userId: null,
      avatarUpdatedAt: null,
      email: null,
    };
  }

  let user = null;

  if (ObjectId.isValid(authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(authorId) },
      { projection: { name: 1, userId: 1, avatarUpdatedAt: 1, email: 1 } }
    );
  }

  if (!user) {
    user = await users.findOne(
      { provider_id: authorId },
      { projection: { name: 1, userId: 1, avatarUpdatedAt: 1, email: 1 } }
    );
  }

  return {
    name: user?.name ?? "Anonymous",
    userId: user?.userId ?? null,
    avatarUpdatedAt: user?.avatarUpdatedAt ?? null,
    email: user?.email ?? null,
  };
}

/* ---------------------- CATEGORY ENRICHER ---------------------- */
async function enrichCategories(catIds: any[], categoriesColl: any) {
  if (!Array.isArray(catIds) || catIds.length === 0) return [];

  const validIds = catIds
    .filter((c) => ObjectId.isValid(c))
    .map((c) => new ObjectId(c));

  if (!validIds.length) return [];

  const docs = await categoriesColl
    .find({ _id: { $in: validIds } })
    .project({ name: 1, jname: 1, myname: 1 })
    .toArray();

  return docs.map((c: any) => ({
    id: String(c._id),
    name: c.name ?? "",
    jname: c.jname ?? "",
    myname: c.myname ?? "",
  }));
}

/* ===============================================================
   GET — posts by user (PAGINATED, 10 BY 10)
   =============================================================== */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authorId = params.id;

  if (!authorId) {
    return NextResponse.json(
      { ok: false, error: "Missing user ID" },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 10);
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
    const query: any = {
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
      page.map(async (post: any) => {
        const categories = await enrichCategories(
          Array.isArray(post.categories) ? post.categories : [],
          categoriesColl
        );

        return {
          _id: String(post._id),
          title: post.title,
          content: post.content,
          createdAt: post.createdAt,
          edited: post.edited ?? false,
          editedAt: post.editedAt ?? null,

          authorId,
          authorName: author.name,
          authorUserId: author.userId,
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
