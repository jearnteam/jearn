// app/api/posts/[id]/route.ts
import { getMongoClient } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb"; // WithId, Document 追加
import { broadcastSSE } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { PostTypes, RawPost } from "@/types/post";
import { deleteMediaUrls } from "@/lib/media/deleteMedia";
import { resolveAuthor } from "@/lib/post/resolveAuthor";
import { extractPostImageKeys } from "@/lib/media/media";
import { extractPlainText } from "@/lib/post/extractPlainText";

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
    authorUniqueId: author.uniqueId,
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
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const post = await posts.findOne({ _id: new ObjectId(id) });
    if (!post) return NextResponse.json(null, { status: 404 });

    // 🔥 Inject votedOptionIds for current user
    const session = await getServerSession(authConfig);
    const userId = session?.user?.uid;

    if (post.poll && userId) {
      const rawVote = post.poll.votes?.[userId];

      const votedOptionIds = Array.isArray(rawVote)
        ? rawVote
        : typeof rawVote === "string"
        ? [rawVote]
        : [];

      post.poll = {
        ...post.poll,
        votedOptionIds,
      };
    }

    // ✅ メイン投稿のエンリッチ
    const enrichedPost = await enrichSinglePost(
      post as RawPost,
      users,
      categoriesColl
    );

    const commentCount = await posts.countDocuments({ parentId: id });

    // ✅ PARENT POST RESOLUTION (for Answers)
    let parentPost: Awaited<ReturnType<typeof enrichSinglePost>> | undefined;
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

    const {
      title,
      content,
      categories,
      tags,
      mentionedUserIds = [],
      references = [],
      poll,
      video,
      removedImages = [],
      txId = null,
      commentDisabled,
    } = await req.json();

    const clientPromise = await getMongoClient();
    const db = clientPromise.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");
    const referencesColl = db.collection("post_references");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.authorId !== session.user.uid) {
      return new Response("Forbidden", { status: 403 });
    }

    const updateFields: Record<string, unknown> = {};

    /* ---------------- BASIC FIELDS ---------------- */

    if (title !== undefined && existing.postType !== PostTypes.QUESTION) {
      updateFields.title = title;
    }

    if (content !== undefined) {
      updateFields.content = content;
      updateFields.plainContent = extractPlainText(content);
      updateFields.mediaRefs = extractPostImageKeys(content);
    }

    if (commentDisabled !== undefined) {
      updateFields.commentDisabled = commentDisabled;
    }

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

    if (Array.isArray(mentionedUserIds)) {
      updateFields.mentionedUserIds = mentionedUserIds
        .filter(
          (id): id is string => typeof id === "string" && ObjectId.isValid(id)
        )
        .map((id) => new ObjectId(id));
    }

    /* ==========================================================
         🔥 POLL EDIT (SAFE + VOTE PRESERVATION)
         ========================================================== */

    if (existing.postType === PostTypes.POLL && poll) {
      const existingVotes = existing.poll?.votes ?? {};

      // Build new options list while preserving voteCount
      const newOptions = poll.options.map((o: any) => {
        const oldOption = existing.poll?.options?.find(
          (x: any) => x.id === o.id
        );

        return {
          id: o.id,
          text: o.text,
          voteCount: oldOption?.voteCount ?? 0,
        };
      });

      // Recalculate totalVotes safely
      const totalVotes = newOptions.reduce(
        (sum: number, opt: any) => sum + (opt.voteCount ?? 0),
        0
      );

      updateFields.poll = {
        options: newOptions,
        totalVotes,
        votes: existingVotes, // 🔒 DO NOT ERASE
        allowMultiple: !!poll.allowMultiple,
        expiresAt: poll.expiresAt ?? null,
      };
    }

    /* ---------------- VIDEO EDIT ---------------- */

    if (existing.postType === PostTypes.VIDEO && video) {
      updateFields.video = video;
    }

    updateFields.edited = true;
    updateFields.editedAt = new Date();

    console.log("UPDATE FIELDS:", updateFields);

    const result = await posts.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    console.log("UPDATE RESULT:", result);

    const after = await posts.findOne({ _id: new ObjectId(id) });
    console.log("AFTER UPDATE:", after);

    /* ---------------- SYNC REFERENCES ---------------- */

    if (Array.isArray(references)) {
      const safeRefs = references
        .filter(
          (r): r is string => typeof r === "string" && ObjectId.isValid(r)
        )
        .map((r) => new ObjectId(r));

      await referencesColl.deleteMany({ from: new ObjectId(id) });

      if (safeRefs.length > 0) {
        await referencesColl.insertMany(
          safeRefs.map((to) => ({
            from: new ObjectId(id),
            to,
            createdAt: new Date(),
          }))
        );
      }
    }

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

    const enrichedPost = await enrichSinglePost(
      updated as RawPost,
      users,
      categoriesColl
    );

    const commentCount = await posts.countDocuments({
      parentId: id,
    });

    const final = {
      ...enrichedPost,
      commentCount,
    };

    /* ---------------- SSE ---------------- */

    const type = "update-post";

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
