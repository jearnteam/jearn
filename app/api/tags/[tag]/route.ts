import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/* ---------------------- AUTHOR RESOLVER (SHARED LOGIC) ---------------------- */
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
   GET — posts by tag (MODERN, AVATAR-SAFE)
   =============================================================== */
export async function GET(
  _req: Request,
  { params }: { params: { tag: string } }
) {
  try {
    const tag = decodeURIComponent(params.tag);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const postsColl = db.collection("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection("categories");

    /* ----------- Fetch top-level posts ----------- */
    const posts = await postsColl
      .find({ parentId: null, tags: tag })
      .sort({ createdAt: -1 })
      .toArray();

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];

    const enrichedPosts = await Promise.all(
      posts.map(async (post: any) => {
        const author = await resolveAuthor(usersColl, post.authorId);

        const isAdmin =
          !!author.email && adminEmails.includes(author.email);

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

          authorId: post.authorId,
          authorName: author.name,
          authorUserId: author.userId,
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
      tag,
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
