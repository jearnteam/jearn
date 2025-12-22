// app/api/posts/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PostTypes } from "@/types/post";
import { emitNotification } from "@/lib/notificationHub";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/*                         ENRICH POST WITH USER DATA                         */
/* -------------------------------------------------------------------------- */
async function enrichPost(post: any, usersColl: any) {
  let user = null;

  // 1) If authorId is a valid ObjectId → lookup by _id
  if (ObjectId.isValid(post.authorId)) {
    user = await usersColl.findOne(
      { _id: new ObjectId(post.authorId) },
      { projection: { name: 1, userId: 1, email: 1, avatarUpdatedAt: 1 } }
    );
  }

  // 2) Fallback: lookup by provider_id (old users)
  if (!user) {
    user = await usersColl.findOne(
      { provider_id: post.authorId },
      { projection: { name: 1, userId: 1, email: 1, avatarUpdatedAt: 1 } }
    );
  }

  // 3) If STILL not found → anonymous placeholder
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

  const avatarId = user?._id?.toString() ?? post.authorId;
  const timestamp = user?.avatarUpdatedAt
    ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
    : "";

  return {
    ...post,
    _id: post._id.toString(),
    authorId: user?._id?.toString() ?? post.authorId,
    authorName: user?.name ?? "Unknown",
    authorUserId: user?.userId ?? "",
    authorAvatarUpdatedAt: user?.avatarUpdatedAt ?? null,
    authorAvatar: `${CDN}/avatars/${avatarId}.webp${timestamp}`,
  };
}

/* -------------------------------------------------------------------------- */
/*                        ENRICH CATEGORY OBJECTS (FULL)                      */
/* -------------------------------------------------------------------------- */
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
    myname: c.myname ?? "", // ensure field always exists
  }));
}

/* -------------------------------------------------------------------------- */
/*                                  GET POSTS                                 */
/* -------------------------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection("categories");

    const query: any = { parentId: null };

    if (category && ObjectId.isValid(category)) {
      query.categories = new ObjectId(category);
    }

    const docs = await posts.find(query).sort({ createdAt: -1 }).toArray();

    // comment count map
    const commentCounts = await posts
      .aggregate([
        { $match: { parentId: { $ne: null } } },
        { $group: { _id: "$parentId", count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap: Record<string, number> = {};
    commentCounts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    const enriched = await Promise.all(
      docs.map(async (p) => {
        const categoryData = await enrichCategories(
          Array.isArray(p.categories) ? p.categories : [],
          categoriesColl
        );

        const enrichedPost = await enrichPost(p, users);

        return {
          ...enrichedPost,
          categories: categoryData,
          commentCount: countMap[p._id.toString()] ?? 0,
          tags: p.tags ?? [],
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ GET /api/posts error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*                              CREATE POST / COMMENT                          */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      postType = PostTypes.POST,
      title,
      content,
      authorId,
      parentId = null,
      replyTo = null,
      txId = null,
      categories = [],
      tags = [],
    } = await req.json();

    if (!authorId)
      return NextResponse.json({ error: "Missing authorId" }, { status: 400 });
    if (authorId !== session.user.uid)
      return NextResponse.json(
        { error: "Incorrect authorId" },
        { status: 400 }
      );

    if (!content?.trim())
      return NextResponse.json({ error: "Content required" }, { status: 400 });

    // Title exist check
    if (
      [PostTypes.POST, PostTypes.QUESTION].includes(postType) &&
      !title?.trim()
    ) {
      return NextResponse.json(
        { error: "Title required for Post or Question" },
        { status: 400 }
      );
    }

    // Category count check
    if (
      [PostTypes.POST, PostTypes.QUESTION].includes(postType) &&
      (!Array.isArray(categories) || categories.length === 0)
    ) {
      return NextResponse.json(
        { error: "At least one category required" },
        { status: 400 }
      );
    }

    // Comment, Answer
    if (parentId && ![PostTypes.COMMENT, PostTypes.ANSWER].includes(postType)) {
      return NextResponse.json(
        { error: "parentId exists only for Comment or Answer" },
        { status: 400 }
      );
    }

    // reply
    if (replyTo && postType !== PostTypes.COMMENT) {
      return NextResponse.json(
        { error: "replyTo exists only for Comment" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection("categories");

    let safeParentId = parentId;

    // reply logic (Reply Comment)
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

      safeParentId = target.parentId || target._id.toString();
    }

    const doc: any = {
      postType: postType,
      content,
      authorId,
      parentId: safeParentId,
      replyTo: replyTo || null,
      createdAt: new Date(),
      upvoteCount: 0,
      upvoters: [],
    };

    if ([PostTypes.POST, PostTypes.QUESTION].includes(postType)) {
      doc.title = title;
      doc.categories = categories.map((id: string) => new ObjectId(id));
    }

    doc.tags = tags;

    const result = await posts.insertOne(doc);

    const enrichedNoCats = await enrichPost(
      { ...doc, _id: result.insertedId },
      users
    );

    let categoryData = [];
    if (
      [PostTypes.POST, PostTypes.QUESTION].includes(postType) &&
      Array.isArray(doc.categories)
    ) {
      categoryData = await enrichCategories(doc.categories, categoriesColl);
    }

    const finalPost = {
      ...enrichedNoCats,
      categories: categoryData,
      tags: doc.tags ?? [],
      commentCount: 0,
      edited: false,
    };

    /* ----------------------------------------------------------
     * 🔔 MENTION NOTIFICATIONS (CREATE-ONCE)
     * -------------------------------------------------------- */

    const mentionedUserIds = extractMentionUserIds(content);

    console.log("MENTION CONTENT HTML:", content);
    console.log("MENTION IDS EXTRACTED:", mentionedUserIds);
    const usersColl = db.collection("users");
    const notifications = db.collection("notifications");
    const now = new Date();

    for (const uid of mentionedUserIds) {
      if (uid === session.user.uid) continue;

      const or: any[] = [{ userId: uid }, { provider_id: uid }];

      if (ObjectId.isValid(uid)) {
        or.push({ _id: new ObjectId(uid) });
      }

      const user = await usersColl.findOne({ $or: or });

      if (!user?._id) continue;

      const exists = await notifications.findOne({
        userId: user._id,
        type: "mention",
        postId: result.insertedId,
      });
      console.log("MENTIONS RAW:", extractMentionUserIds(content));
      console.log("MENTIONS OR QUERY:", or);
      console.log("MENTION USER:", user?._id?.toString());

      if (exists) continue; // ✅ create-once

      await notifications.insertOne({
        userId: user._id,
        type: "mention",
        postId: result.insertedId,
        groupKey: `mention:${result.insertedId}`,
        read: false,
        createdAt: now,

        count: 1,
        actors: [new ObjectId(session.user.uid)],
        lastActorId: new ObjectId(session.user.uid),
        lastActorName: session.user.name ?? "Someone",
        lastActorAvatar: `${process.env.R2_PUBLIC_URL}/avatars/${session.user.uid}.webp`,
        postPreview: (title ?? content).slice(0, 80).replace(/\n/g, " "),
      });

      emitNotification(user._id.toString(), {
        type: "mention",
        postId: result.insertedId.toString(),
        unreadDelta: 1,
      });
    }

    const sseType = replyTo
      ? "new-reply"
      : safeParentId
      ? "new-comment"
      : "new-post";

    broadcastSSE({
      type: sseType,
      txId,
      postId: finalPost._id,
      parentId: finalPost.parentId,
      replyTo: finalPost.replyTo,
      post: finalPost,
    });

    if (safeParentId) {
      broadcastSSE({
        type: "update-comment-count",
        parentId: safeParentId,
        delta: +1,
      });
    }

    return NextResponse.json({ ok: true, post: finalPost });
  } catch (err) {
    console.error("❌ POST /api/posts error FULL:", err);
    console.error("❌ POST /api/posts error STRING:", String(err));
    console.error(
      "❌ POST /api/posts error STACK:",
      err instanceof Error ? err.stack : err
    );

    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*                                EDIT POST                                   */
/* -------------------------------------------------------------------------- */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      id,
      title,
      content,
      categories,
      tags,
      txId = null,
    } = await req.json();

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection("categories");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) return new Response("Post not found", { status: 404 });

    if (existing.authorId !== session.user.uid)
      return new Response("Forbidden", { status: 403 });

    const updateFields: any = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;

    // ✅ Only update if arrays provided (so comments/replies can still just update content)
    if (Array.isArray(categories)) {
      updateFields.categories = categories.map((c: string) => new ObjectId(c));
    }

    if (Array.isArray(tags)) {
      updateFields.tags = tags;
    }

    updateFields.edited = true;
    updateFields.editedAt = new Date();

    await posts.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    const updated = await posts.findOne({ _id: new ObjectId(id) });
    if (!updated)
      return new Response("Post not found after update", { status: 404 });

    const enrichedPost = await enrichPost(updated, users);
    const enrichedCategories = await enrichCategories(
      Array.isArray(updated.categories) ? updated.categories : [],
      categoriesColl
    );

    const final = {
      ...enrichedPost,
      categories: enrichedCategories,
      tags: updated.tags ?? [],
    };

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
    console.error("🔥 PUT /api/posts failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*                                DELETE POST                                 */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await req.json();

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) return new Response("Deleted", { status: 200 });

    if (existing.authorId !== session.user.uid)
      return new Response("Forbidden", { status: 403 });

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

function extractMentionUserIds(html: string): string[] {
  const regex = /data-uid="([^"]+)"/g;
  const ids = new Set<string>();

  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }

  return Array.from(ids);
}
