import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/* --------------------------------------------- */
/*                 ENRICH CATEGORY               */
/* --------------------------------------------- */
async function enrichCategories(catIds: any[], categoriesColl: any) {
  if (!Array.isArray(catIds) || catIds.length === 0) return [];

  const validIds = catIds
    .map((c) => (ObjectId.isValid(c) ? new ObjectId(c) : null))
    .filter((x): x is ObjectId => x !== null);

  if (validIds.length === 0) return [];

  const docs = await categoriesColl
    .find({ _id: { $in: validIds } })
    .project({ name: 1, jname: 1, myname: 1 })
    .toArray();

  return docs.map((c: any) => ({
    id: c._id.toString(),
    name: c.name,
    jname: c.jname,
    myname: c.myname ?? "",
  }));
}

/* --------------------------------------------- */
/*             ENRICH POST WITH USER DATA        */
/* --------------------------------------------- */
async function enrichPost(post: any, usersColl: any) {
  const uid = post.authorId;

  let user = null;

  // Find by _id
  if (ObjectId.isValid(uid)) {
    user = await usersColl.findOne(
      { _id: new ObjectId(uid) },
      { projection: { name: 1, picture: 1, email: 1, admin: 1 } }
    );
  }

  // Find by provider_id fallback
  if (!user) {
    user = await usersColl.findOne(
      { provider_id: uid },
      { projection: { name: 1, picture: 1, email: 1, admin: 1 } }
    );
  }

  const avatarId = user?._id?.toString() ?? uid;

  // ⭐ ADMIN CHECK — SAME AS /api/posts
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
  const isAdminViaEmail = user?.email && adminEmails.includes(user.email.trim());
  const isAdminViaFlag = user?.admin === true;

  return {
    ...post,
    _id: post._id.toString(),

    authorId: avatarId,
    authorName: user?.name ?? "Unknown",
    authorAvatar: avatarId
      ? `/api/user/avatar/${avatarId}?t=${Date.now()}`
      : "/default-avatar.png",

    // ⭐ final admin flag
    isAdmin: isAdminViaFlag || isAdminViaEmail,
  };
}

/* --------------------------------------------- */
/*                    GET ROUTE                  */
/* --------------------------------------------- */
export async function GET(
  req: Request,
  { params }: { params: { tag: string } }
) {
  try {
    const tag = decodeURIComponent(params.tag);

    const client = await clientPromise;
    const db = client.db("jearn");

    const postsColl = db.collection("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection("categories");

    // Only top-level posts
    const posts = await postsColl
      .find({ parentId: null, tags: tag })
      .sort({ createdAt: -1 })
      .toArray();

    // ⭐ Enrich
    const enriched = await Promise.all(
      posts.map(async (p) => {
        const enrichedPost = await enrichPost(p, usersColl);
        const categoryData = await enrichCategories(
          p.categories ?? [],
          categoriesColl
        );

        return {
          ...enrichedPost,
          categories: categoryData,
          tags: p.tags ?? [],
          commentCount: p.commentCount ?? 0,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      tag,
      posts: enriched,
    });
  } catch (err) {
    console.error("❌ /api/tags/[tag] error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
