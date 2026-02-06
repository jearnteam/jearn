// app/api/posts/[id]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb"; // WithId, Document 追加
import { broadcastSSE } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { PostTypes, RawPost } from "@/types/post";
import { deleteMediaUrls } from "@/lib/media/deleteMedia";

export const runtime = "nodejs";

type EnrichedCategory = {
  id: string;
  name: string;
  jname: string;
  myname: string;
};

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};

/* ---------------------- AUTHOR RESOLVER ---------------------- */
async function resolveAuthor(
  users: Collection,
  authorId?: string | null
): Promise<{
  name: string;
  userId: string | null;
  avatarUpdatedAt: Date | null;
}> {
  if (!authorId) {
    return {
      name: "Anonymous",
      userId: null,
      avatarUpdatedAt: null,
    };
  }

  let user = null;

  if (ObjectId.isValid(authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(authorId) },
      { projection: { name: 1, userId: 1, avatarUpdatedAt: 1 } }
    );
  }

  if (!user) {
    user = await users.findOne(
      { provider_id: authorId },
      { projection: { name: 1, userId: 1, avatarUpdatedAt: 1 } }
    );
  }

  return {
    name: user?.name ?? "Anonymous",
    userId: user?.userId ?? null,
    avatarUpdatedAt: user?.avatarUpdatedAt ?? null,
  };
}

/* ---------------------- CATEGORY RESOLVER ---------------------- */
// ✅ 追加: カテゴリー解決用ヘルパー
async function resolveCategories(
  categoriesColl: Collection<CategoryDoc>,
  categoryIds?: unknown[]
): Promise<EnrichedCategory[]> {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];

  const validIds = categoryIds
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
    name: c.name ?? "",
    jname: c.jname ?? "",
    myname: c.myname ?? "",
  }));
}

/* ---------------------- POST ENRICHER ---------------------- */
// ✅ 追加: 親投稿なども含めて共通で使えるエンリッチ関数
async function enrichSinglePost(
  post: RawPost,
  users: Collection,
  categoriesColl: Collection<CategoryDoc>
) {
  const author = await resolveAuthor(users, post.authorId);
  const categories = await resolveCategories(categoriesColl, post.categories);

  return {
    ...post,
    _id: post._id.toString(),
    authorName: author.name,
    authorUserId: author.userId,
    authorAvatarUpdatedAt: author.avatarUpdatedAt,
    categories,
    tags: post.tags ?? [],
    mediaRefs: post.mediaRefs ?? [],
  };
}

/* ===============================================================
   GET — return enriched post
   =============================================================== */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(null, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const post = await posts.findOne({ _id: new ObjectId(id) });
    if (!post) return NextResponse.json(null, { status: 404 });

    // ✅ メイン投稿のエンリッチ
    const enrichedPost = await enrichSinglePost(
      post as RawPost,
      users,
      categoriesColl
    );

    const commentCount = await posts.countDocuments({ parentId: id });

    // ✅ PARENT POST RESOLUTION (for Answers)
    let parentPost = undefined;
    if (
      post.postType === PostTypes.ANSWER &&
      post.parentId &&
      ObjectId.isValid(post.parentId)
    ) {
      const parent = await posts.findOne({ _id: new ObjectId(post.parentId) });
      if (parent) {
        // ✅ 親投稿も同様にエンリッチ (カテゴリー含む)
        parentPost = await enrichSinglePost(
          parent as RawPost,
          users,
          categoriesColl
        );
      }
    }

    return NextResponse.json({
      ...enrichedPost,
      commentCount,
      parentPost,
    });
  } catch (err) {
    console.error("❌ GET /api/posts/[id]:", err);
    return NextResponse.json(null, { status: 500 });
  }
}

/* ===============================================================
   PUT — update post (title, content, categories, tags, SSE)
   =============================================================== */
// PUT メソッドは変更なし（前回提供したコードが動作している前提）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    /* -------------------- BODY -------------------- */
    const {
      title,
      content,
      categories,
      tags,
      removedImages = [],
      txId = null,
    } = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.authorId !== session.user.uid) {
      return new Response("Forbidden", { status: 403 });
    }

    /* ---------------- UPDATE ---------------- */
    const updateFields: Record<string, unknown> = {};

    if (title !== undefined && existing.postType !== PostTypes.QUESTION) {
      updateFields.title = title;
    }
    if (content !== undefined) updateFields.content = content;

    if (Array.isArray(categories)) {
      updateFields.categories = categories
        .filter(
          (cid): cid is string =>
            typeof cid === "string" && ObjectId.isValid(cid)
        )
        .map((cid) => new ObjectId(cid));
    }

    if (Array.isArray(tags)) {
      updateFields.tags = tags;
    }

    updateFields.edited = true;
    updateFields.editedAt = new Date();

    await posts.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    /* ---------------- DELETE REMOVED MEDIA ---------------- */
    if (Array.isArray(removedImages) && removedImages.length > 0) {
      try {
        await deleteMediaUrls(removedImages);
      } catch (err) {
        console.error("⚠️ Media cleanup failed:", err);
      }
    }

    /* ---------------- ENRICH ---------------- */
    const updated = await posts.findOne({ _id: new ObjectId(id) });

    // ✅ PUT側も共通化した関数を利用してエンリッチ
    const enrichedPost = await enrichSinglePost(
      updated as RawPost,
      users,
      categoriesColl
    );

    // コメント数取得 (既存コード踏襲)
    const commentCount = await posts.countDocuments({ parentId: id });

    const final = {
      ...enrichedPost,
      commentCount,
    };

    /* ---------------- SSE ---------------- */
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
