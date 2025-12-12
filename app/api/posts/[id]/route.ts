// app/api/posts/[id]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export const runtime = "nodejs";

/* ---------------------- AUTHOR RESOLVER ---------------------- */
async function resolveAuthor(users: any, authorId?: string | null) {
  if (!authorId)
    return { name: "Anonymous", userId: null, avatar: null, avatarId: null };

  let user = null;

  if (ObjectId.isValid(authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(authorId) },
      { projection: { name: 1, userId: 1 } }
    );
  }

  if (!user) {
    user = await users.findOne(
      { provider_id: authorId },
      { projection: { name: 1, userId: 1 } }
    );
  }

  const avatarId = user?._id ? String(user._id) : null;
  const avatar = avatarId
    ? `/api/user/avatar/${avatarId}?t=${Date.now()}`
    : null;

  return {
    name: user?.name ?? "Anonymous",
    userId: user?.userId ?? null,
    avatar,
    avatarId,
  };
}

/* ===============================================================
   GET — return enriched post
   =============================================================== */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || !ObjectId.isValid(id))
      return NextResponse.json(null, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categories = db.collection("categories");

    const post = await posts.findOne({ _id: new ObjectId(id) });
    if (!post) return NextResponse.json(null, { status: 404 });

    const author = await resolveAuthor(users, post.authorId);

    let populatedCategories: any[] = [];

    if (Array.isArray(post.categories)) {
      const catIds = post.categories
        .filter((cid) => ObjectId.isValid(cid))
        .map((cid) => new ObjectId(cid));

      const cats = await categories
        .find({ _id: { $in: catIds } })
        .project({ name: 1, jname: 1, myname: 1 })
        .toArray();

      populatedCategories = cats.map((c) => ({
        id: String(c._id),
        name: c.name ?? "",
        jname: c.jname ?? "",
        myname: c.myname ?? "",
      }));
    }

    const commentCount = await posts.countDocuments({ parentId: id });

    return NextResponse.json({
      ...post,
      _id: id,
      authorName: author.name,
      authorUserId: author.userId,
      authorAvatar: author.avatar,
      commentCount,
      categories: populatedCategories,
    });
  } catch (err) {
    console.error("❌ GET /api/posts/[id]:", err);
    return NextResponse.json(null, { status: 500 });
  }
}

/* ===============================================================
   PUT — update post (title, content, categories, tags, SSE)
   =============================================================== */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const id = params.id;
    if (!id || !ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { title, content, categories, tags, txId = null } = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection("categories");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    if (existing.authorId !== session.user.uid)
      return new Response("Forbidden", { status: 403 });

    const updateFields: any = {};

    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;

    if (Array.isArray(categories)) {
      updateFields.categories = categories.map((cid) => new ObjectId(cid));
    }

    if (Array.isArray(tags)) {
      updateFields.tags = tags;
    }

    updateFields.edited = true;
    updateFields.editedAt = new Date();

    await posts.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    const updated = await posts.findOne({ _id: new ObjectId(id) });

    /* ----------- Enrich author ----------- */
    const author = await resolveAuthor(users, updated?.authorId);

    /* ----------- Enrich categories ----------- */
    let enrichedCategories: any[] = [];

    if (Array.isArray(updated?.categories)) {
      const catDocs = await categoriesColl
        .find({
          _id: { $in: updated.categories.map((cid: any) => new ObjectId(cid)) },
        })
        .toArray();

      enrichedCategories = catDocs.map((c) => ({
        id: String(c._id),
        name: c.name ?? "",
        jname: c.jname ?? "",
        myname: c.myname ?? "",
      }));
    }

    const final = {
      ...updated,
      _id: String(updated?._id),
      authorName: author.name,
      authorUserId: author.userId,
      authorAvatar: author.avatar,
      categories: enrichedCategories,
      tags: updated?.tags ?? [],
    };

    /* ----------- choose SSE type ----------- */
    const type = existing.replyTo
      ? "update-reply"
      : existing.parentId
      ? "update-comment"
      : "update-post";

    broadcastSSE({
      type,
      txId,
      postId: final._id,
      post: final,
    });

    return NextResponse.json({ ok: true, post: final });
  } catch (err) {
    console.error("🔥 PUT /api/posts/[id] error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
