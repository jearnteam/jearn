// app/api/posts/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";

export const runtime = "nodejs";

/* ---------- Helper: Enrich post with user info ---------- */
async function enrichPost(post: any, usersColl: any) {
  let user = null;

  if (post.authorId && ObjectId.isValid(post.authorId)) {
    user = await usersColl.findOne(
      { _id: new ObjectId(post.authorId) },
      { projection: { name: 1, picture: 1 } }
    );
  }

  if (!user && post.authorId) {
    user = await usersColl.findOne(
      { provider_id: post.authorId },
      { projection: { name: 1, picture: 1 } }
    );
  }

  const avatarId = user?._id
    ? String(user._id)
    : ObjectId.isValid(post.authorId)
    ? post.authorId
    : null;

  return {
    ...post,
    _id: post._id?.toString?.() ?? post._id,
    authorName: user?.name ?? "Unknown",
    authorAvatar: avatarId
      ? `/api/user/avatar/${avatarId}?t=${Date.now()}`
      : "/default-avatar.png",
  };
}

/* ---------- GET: Fetch top-level posts ---------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");

    const query: any = { parentId: null };
    if (category) {
      query.categories = category;
    }

    const docs = await posts.find(query).sort({ createdAt: -1 }).toArray();

    // Count comments
    const commentCounts = await posts
      .aggregate([
        { $match: { parentId: { $ne: null } } },
        { $group: { _id: "$parentId", count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap: Record<string, number> = {};
    commentCounts.forEach((c: any) => {
      countMap[c._id] = c.count;
    });

    const enriched = await Promise.all(
      docs.map(async (p) => {
        const enrichedPost = await enrichPost(p, users);
        return {
          ...enrichedPost,
          commentCount: countMap[p._id.toString()] ?? 0,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ GET /api/posts error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------- POST: Create post/comment/reply ---------- */
export async function POST(req: Request) {
  try {
    const {
      title,
      content,
      authorId,
      parentId = null,
      replyTo = null,
      txId = null,
      categories = [],
    }: {
      title?: string;
      content: string;
      authorId: string;
      parentId?: string | null;
      replyTo?: string | null;
      txId?: string | null;
      categories?: string[];
    } = await req.json();

    // --- Basic validation ---
    if (!authorId)
      return NextResponse.json({ error: "Missing authorId" }, { status: 400 });
    if (!content?.trim())
      return NextResponse.json({ error: "Content required" }, { status: 400 });

    // ✅ Require title (and optionally categories) only for top-level post
    const isTopLevel = !parentId && !replyTo;
    if (isTopLevel && !title?.trim()) {
      return NextResponse.json(
        { error: "Title required for top-level post" },
        { status: 400 }
      );
    }

    if (isTopLevel && (!Array.isArray(categories) || categories.length === 0)) {
      return NextResponse.json(
        { error: "At least one category required" },
        { status: 400 }
      );
    }

    // --- MongoDB setup ---
    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");

    let safeParentId = parentId;

    // ✅ If replying to another comment/reply
    if (replyTo) {
      if (!ObjectId.isValid(replyTo)) {
        return NextResponse.json(
          { error: "Invalid replyTo id" },
          { status: 400 }
        );
      }

      const target = await posts.findOne({ _id: new ObjectId(replyTo) });
      if (!target)
        return NextResponse.json(
          { error: "Reply target not found" },
          { status: 404 }
        );

      // ✅ Always use the top-level post ID as parentId
      safeParentId = target.parentId || target._id.toString();
    }

    // --- Construct document ---
    const doc: any = {
      content,
      authorId,
      parentId: safeParentId,
      replyTo: replyTo || null,
      createdAt: new Date(),
      upvoteCount: 0,
      upvoters: [],
    };

    // ✅ Only top-level posts have title + categories
    if (isTopLevel) {
      doc.title = title;
      doc.categories = categories; // 👈 add categories here
    }

    // --- Insert + enrich ---
    const result = await posts.insertOne(doc);
    const enriched = await enrichPost(
      { ...doc, _id: result.insertedId },
      users
    );

    // --- SSE broadcasting ---
    const sseType = replyTo
      ? "new-reply"
      : safeParentId
      ? "new-comment"
      : "new-post";

    broadcastSSE({
      type: sseType,
      txId,
      postId: enriched._id,
      parentId: enriched.parentId,
      replyTo: enriched.replyTo,
      post: enriched,
    });

    if (safeParentId) {
      broadcastSSE({
        type: "update-comment-count",
        parentId: safeParentId,
        delta: +1,
      });
    }

    return NextResponse.json({ ok: true, post: enriched });
  } catch (err) {
    console.error("❌ POST /api/posts error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


/* ---------- PUT: Edit post/comment/reply ---------- */
export async function PUT(req: Request) {
  try {
    const { id, title, content, txId = null } = await req.json();
    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) return new Response("Post not found", { status: 404 });

    const updateFields: any = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;

    await posts.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    const updated = await posts.findOne({ _id: new ObjectId(id) });
    const enriched = await enrichPost(updated, users);

    const type = existing.replyTo
      ? "update-reply"
      : existing.parentId
      ? "update-comment"
      : "update-post";

    broadcastSSE({ type, txId, postId: enriched._id, post: enriched });

    return NextResponse.json({ ok: true, post: enriched });
  } catch (err) {
    console.error("🔥 PUT /api/posts failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/* ---------- DELETE: Cascade delete ---------- */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) return new Response("Deleted", { status: 200 });

    await posts.deleteOne({ _id: new ObjectId(id) });

    const children = await posts
      .find({ $or: [{ parentId: id }, { replyTo: id }] })
      .toArray();
    const childIds = children.map((c) => c._id.toString());

    await posts.deleteMany({ $or: [{ parentId: id }, { replyTo: id }] });

    const type = existing.replyTo
      ? "delete-reply"
      : existing.parentId
      ? "delete-comment"
      : "delete-post";

    broadcastSSE({
      type,
      id,
      parentId: existing.parentId,
      replyTo: existing.replyTo,
    });

    if (existing.parentId) {
      broadcastSSE({
        type: "update-comment-count",
        parentId: existing.parentId,
        delta: -1,
      });
    }

    if (childIds.length > 0) {
      broadcastSSE({ type: "delete-children", ids: childIds });
    }

    return new Response("Deleted", { status: 200 });
  } catch (err) {
    console.error("🔥 DELETE /api/posts failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
