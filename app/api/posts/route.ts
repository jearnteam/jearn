// app/api/posts/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { PostTypes } from "@/types/post";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/*                         ENRICH POST WITH USER DATA                         */
/* -------------------------------------------------------------------------- */

type RawPost = WithId<Document> & {
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt?: Date;
  categories?: unknown[];
  tags?: string[];
};

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};

async function enrichPost(post: RawPost, usersColl: Collection) {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

  // 🔒 System posts
  if (post.authorId === "system") {
    return {
      ...post,
      _id: post._id.toString(),
      authorId: "system",
      authorName: "System",
      authorAvatar: `${CDN}/avatars/system.webp`,
    };
  }

  let user = null;

  // Try resolving user by ObjectId
  if (typeof post.authorId === "string" && ObjectId.isValid(post.authorId)) {
    user = await usersColl.findOne(
      { _id: new ObjectId(post.authorId) },
      { projection: { name: 1, avatarUpdatedAt: 1 } }
    );
  }

  // 🔑 DO NOT DESTROY EXISTING DATA
  const authorName = post.authorName ?? user?.name ?? "Unknown";
  const avatarId = user?._id?.toString() ?? post.authorId;

  const timestamp = user?.avatarUpdatedAt
    ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
    : "";

  const authorAvatar =
    post.authorAvatar ?? `${CDN}/avatars/${avatarId}.webp${timestamp}`;

  return {
    ...post,
    _id: post._id.toString(),
    authorId: post.authorId,
    authorName,
    authorAvatar,
  };
}

/* -------------------------------------------------------------------------- */
/*                        ENRICH CATEGORY OBJECTS (FULL)                      */
/* -------------------------------------------------------------------------- */

async function enrichCategories(
  catIds: unknown[],
  categoriesColl: Collection<CategoryDoc>
) {
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

  if (validIds.length === 0) return [];

  const docs = await categoriesColl
    .find({ _id: { $in: validIds } })
    .project({ name: 1, jname: 1, myname: 1 })
    .toArray();

  return docs.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    jname: c.jname,
    myname: c.myname ?? "",
  }));
}

/* -------------------------------------------------------------------------- */
/*                                  GET POSTS                                 */
/* -------------------------------------------------------------------------- */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 20);
    const cursor = searchParams.get("cursor");

    const client = await clientPromise;
    const db = client.db("jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const query: Record<string, unknown> = {
      $and: [
        { postType: { $ne: PostTypes.COMMENT } },
        {
          $or: [{ parentId: null }, { parentId: { $exists: false } }],
        },
      ],
    };

    if (cursor) {
      const [createdAt, id] = cursor.split("|");

      (query.$and as Record<string, unknown>[]).push({
        $or: [
          { createdAt: { $lt: new Date(createdAt) } },
          {
            createdAt: new Date(createdAt),
            _id: { $lt: new ObjectId(id) },
          },
        ],
      });
    }

    const docs = await posts
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray();

    // comment count map (page-scoped)
    const commentCounts = (await posts
      .aggregate([
        { $match: { parentId: { $in: docs.map((d) => d._id.toString()) } } },
        { $group: { _id: "$parentId", count: { $sum: 1 } } },
      ])
      .toArray()) as { _id: ObjectId; count: number }[];

    const countMap: Record<string, number> = {};
    commentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const enriched = await Promise.all(
      docs.map(async (p: RawPost) => {
        const categories = await enrichCategories(
          Array.isArray(p.categories) ? p.categories : [],
          categoriesColl
        );

        const post = await enrichPost(p, users);

        return {
          ...post,
          categories,
          tags: p.tags ?? [],
          commentCount: countMap[p._id.toString()] ?? 0,
        };
      })
    );

    const nextCursor =
      docs.length > 0
        ? `${docs[docs.length - 1].createdAt!.toISOString()}|${docs[
            docs.length - 1
          ]._id.toString()}`
        : null;

    return NextResponse.json({ items: enriched, nextCursor });
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
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
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

    if (
      [PostTypes.POST, PostTypes.QUESTION].includes(postType) &&
      !title?.trim()
    ) {
      return NextResponse.json(
        { error: "Title required for Post or Question" },
        { status: 400 }
      );
    }

    if (
      [PostTypes.POST, PostTypes.QUESTION].includes(postType) &&
      (!Array.isArray(categories) || categories.length === 0)
    ) {
      return NextResponse.json(
        { error: "At least one category required" },
        { status: 400 }
      );
    }

    if (Array.isArray(categories)) {
      for (const c of categories) {
        if (!ObjectId.isValid(c)) {
          return NextResponse.json(
            { error: "Invalid category id" },
            { status: 400 }
          );
        }
      }
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    let safeParentId = parentId;

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

    const doc = {
      postType,
      title,
      content,
      authorId,
      parentId: safeParentId,
      replyTo,
      createdAt: new Date(),
      upvoteCount: 0,
      upvoters: [],
      categories: categories.map((id: string) => new ObjectId(id)),
      tags,
    };

    const result = await posts.insertOne(doc);

    const enrichedNoCats = await enrichPost(
      { ...doc, _id: result.insertedId },
      users
    );

    const categoryData = await enrichCategories(doc.categories, categoriesColl);

    const finalPost = {
      ...enrichedNoCats,
      categories: categoryData,
      tags,
      commentCount: 0,
      edited: false,
    };

    broadcastSSE({
      type: safeParentId ? "new-comment" : "new-post",
      txId,
      postId: finalPost._id,
      post: finalPost,
    });

    return NextResponse.json({ ok: true, post: finalPost });
  } catch (err) {
    console.error("❌ POST /api/posts error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*                                EDIT POST                                   */
/* -------------------------------------------------------------------------- */

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
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
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) return new Response("Post not found", { status: 404 });

    if (existing.authorId !== session.user.uid)
      return new Response("Forbidden", { status: 403 });

    const updateFields: Record<string, unknown> = {};
    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;
    if (Array.isArray(categories))
      updateFields.categories = categories.map((c: string) => new ObjectId(c));
    if (Array.isArray(tags)) updateFields.tags = tags;

    updateFields.edited = true;
    updateFields.editedAt = new Date();

    await posts.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    const updated = await posts.findOne({ _id: new ObjectId(id) });
    if (!updated)
      return new Response("Post not found after update", { status: 404 });

    const enrichedPost = await enrichPost(updated as RawPost, users);
    const enrichedCategories = await enrichCategories(
      updated.categories ?? [],
      categoriesColl
    );

    const final = {
      ...enrichedPost,
      categories: enrichedCategories,
      tags: updated.tags ?? [],
      commentCount: updated.commentCount ?? 0,
    };

    broadcastSSE({
      type: existing.parentId ? "update-comment" : "update-post",
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
