// app/api/posts/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { Poll, PostType, PostTypes, RawPost } from "@/types/post";
import { extractPostImageKeys } from "@/lib/media/media";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { categorize } from "@/features/categorize/services/categorize";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/*                         ENRICH POST WITH USER DATA                         */
/* -------------------------------------------------------------------------- */

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};

async function enrichPost(post: RawPost, usersColl: Collection) {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";
  const DEFAULT_AVATAR = "/default-avatar.png";

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

  if (typeof post.authorId === "string" && ObjectId.isValid(post.authorId)) {
    user = await usersColl.findOne(
      { _id: new ObjectId(post.authorId) },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1 } }
    );
  }

  const authorName = post.authorName ?? user?.name ?? "Unknown";
  const authorUniqueId = user?.uniqueId;
  const avatarId = user?._id?.toString() ?? post.authorId;

  const timestamp = user?.avatarUpdatedAt
    ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
    : "";

  const cdnAvatar = `${CDN}/avatars/${avatarId}.webp${timestamp}`;

  const authorAvatar =
    post.authorAvatar ?? (avatarId ? cdnAvatar : DEFAULT_AVATAR);

  return {
    ...post,
    _id: post._id.toString(),
    authorId: post.authorId,
    authorName,
    authorUniqueId,
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
    const session = await getServerSession(authConfig);
    const viewerId = session?.user?.uid ?? null;
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 20);
    const cursor = searchParams.get("cursor");
    const categoryId = searchParams.get("categoryId");

    const client = await clientPromise;
    const db = client.db("jearn");

    const posts = db.collection<RawPost>("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    // コメントを表示しない
    // でなければ、parentIdがある投稿を表示しない
    // しかし、回答は表示する
    const query: Record<string, unknown> = {
      $and: [
        { postType: { $ne: PostTypes.COMMENT } },
        {
          $or: [
            { parentId: null },
            { parentId: { $exists: false } },
            { postType: PostTypes.ANSWER },
          ],
        },
      ],
    };

    if (categoryId && ObjectId.isValid(categoryId)) {
      (query.$and as Record<string, unknown>[]).push({
        categories: new ObjectId(categoryId),
      });
    }

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

    // -------------------------------------------------------------
    // 🟢 FETCH PARENT POSTS FOR ANSWERS (Batch)
    // -------------------------------------------------------------
    const answerDocs = docs.filter(
      (d) => d.postType === PostTypes.ANSWER && d.parentId
    );

    const parentIds = [
      ...new Set(
        answerDocs
          .map((d) => {
            if (d.parentId != undefined && ObjectId.isValid(d.parentId))
              return new ObjectId(d.parentId);
            return null;
          })
          .filter((id): id is ObjectId => id !== null)
      ),
    ];

    // ✅ 変更: 単なるタイトル保持ではなく、全プロパティを持つオブジェクトマップへ
    const parentMap: Record<string, any> = {};

    if (parentIds.length > 0) {
      const parents = await posts.find({ _id: { $in: parentIds } }).toArray();

      // ✅ 変更: 親投稿も通常投稿と同様に enrich する
      // TODO: このロジックがN+1か検証
      await Promise.all(
        parents.map(async (p) => {
          const categories = await enrichCategories(
            Array.isArray(p.categories) ? p.categories : [],
            categoriesColl
          );
          const postData = await enrichPost(p as RawPost, users);

          parentMap[postData._id] = {
            ...postData,
            categories,
            tags: p.tags ?? [],
            commentCount: 0, // 親のコメント数はコンテキスト表示用には不要なため0として扱う（必要なら別途取得）
          };
        })
      );
    }

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

        const poll = p.poll
          ? {
              ...p.poll,

              votedOptionIds: viewerId
                ? Array.isArray(p.poll.votes?.[viewerId])
                  ? p.poll.votes[viewerId]
                  : typeof p.poll.votes?.[viewerId] === "string"
                  ? [p.poll.votes[viewerId]]
                  : []
                : [],
            }
          : undefined;

        return {
          ...post,
          poll, // 👈 THIS IS THE IMPORTANT LINE
          categories,
          tags: p.tags ?? [],
          mediaRefs: p.mediaRefs ?? [],
          commentCount: countMap[p._id.toString()] ?? 0,
          parentPost:
            p.postType === PostTypes.ANSWER && p.parentId
              ? parentMap[p.parentId.toString()]
              : undefined,
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
      poll,
      video,
    } = await req.json();

    if (!authorId) {
      return NextResponse.json({ error: "Missing authorId" }, { status: 400 });
    }
    if (authorId !== session.user.uid) {
      return NextResponse.json(
        { error: "Incorrect authorId" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------------------------ */
    /* VALIDATION                                                         */
    /* ------------------------------------------------------------------ */
    const safeContent = postType === PostTypes.VIDEO ? "" : content;
    const mediaRefs =
      postType === PostTypes.VIDEO ? [] : extractPostImageKeys(safeContent);
    if (
      postType !== PostTypes.VIDEO &&
      postType !== PostTypes.POLL &&
      !content?.trim()
    ) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    if (
      [
        PostTypes.POST,
        PostTypes.QUESTION,
        PostTypes.POLL,
        PostTypes.VIDEO,
        PostTypes.ANSWER,
      ].includes(postType) &&
      !title?.trim()
    ) {
      return NextResponse.json(
        { error: "Title / description required" },
        { status: 400 }
      );
    }

    if (
      [PostTypes.POST, PostTypes.QUESTION, PostTypes.VIDEO].includes(
        postType
      ) &&
      (!Array.isArray(categories) || categories.length === 0)
    ) {
      return NextResponse.json(
        { error: "At least one category required" },
        { status: 400 }
      );
    }

    if (postType === PostTypes.POLL) {
      if (!poll || !Array.isArray(poll.options) || poll.options.length < 2) {
        return NextResponse.json(
          { error: "Poll requires at least 2 options" },
          { status: 400 }
        );
      }

      for (const opt of poll.options) {
        if (!opt.text || opt.text.trim().length === 0) {
          return NextResponse.json(
            { error: "Poll option text required" },
            { status: 400 }
          );
        }
      }
    }

    if (postType === PostTypes.VIDEO) {
      if (!video?.url) {
        return NextResponse.json(
          { error: "Video URL required for video post" },
          { status: 400 }
        );
      }
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

    /* ------------------------------------------------------------------ */
    /* DB                                                                 */
    /* ------------------------------------------------------------------ */

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
      if (!target) {
        return NextResponse.json(
          { error: "Reply target not found" },
          { status: 404 }
        );
      }

      safeParentId = target.parentId || target._id.toString();
    }

    if (
      postType === PostTypes.ANSWER &&
      (await posts.countDocuments({
        _id: ObjectId.createFromHexString(safeParentId),
        authorId: { $exists: true },
      })) === 0
    ) {
      return NextResponse.json(
        { error: "Target question is closed" },
        { status: 403 }
      );
    }

    /* ------------------------------------------------------------------ */
    /* INSERT                                                             */
    /* ------------------------------------------------------------------ */

    type PostInsertDoc = {
      postType: PostType;
      title: string;
      content: string;
      authorId: string;
      parentId?: string | null;
      replyTo?: string | null;
      createdAt: Date;
      upvoteCount: number;
      upvoters: string[];
      categories: ObjectId[];
      tags: string[];
      isAdmin?: boolean;
      mediaRefs?: string[];
      poll?: Poll;
      video?: {
        url: string;
        thumbnailUrl?: string;
        duration?: number;
        aspectRatio?: number;
      };
    };

    const doc: PostInsertDoc = {
      postType,
      title,
      content: safeContent,
      authorId,
      parentId: safeParentId,
      replyTo,
      createdAt: new Date(),
      upvoteCount: 0,
      upvoters: [],
      categories: categories.map((id: string) => new ObjectId(id)),
      tags,
      isAdmin: session.user.role === "admin",
      mediaRefs,
    };

    // ✅ POLL metadata (ADD THIS)
    if (postType === PostTypes.POLL && poll) {
      doc.poll = {
        options: poll.options.map((o: any) => ({
          id: o.id,
          text: o.text,
          voteCount: 0,
        })),
        totalVotes: 0,

        // ✅ IMPORTANT
        votes: {},

        // ✅ NEW (persist settings)
        allowMultiple: !!poll.allowMultiple,
        expiresAt: poll.expiresAt ?? null,
      };
    }

    // ✅ VIDEO metadata
    if (postType === PostTypes.VIDEO && video) {
      doc.video = {
        url: video.url,
        ...(video.thumbnailUrl ? { thumbnailUrl: video.thumbnailUrl } : {}),
        ...(video.duration ? { duration: video.duration } : {}),
        ...(video.aspectRatio ? { aspectRatio: video.aspectRatio } : {}),
      };
    }

    const result = await posts.insertOne(doc);

    /* ---------------- AI Feedback Logging ---------------- */
    try {
      const ai = await categorize(doc.content);

      const meaningful = ai.predictions.filter(
        (c: { rawScore: number }) => c.rawScore > 0
      );

      await db.collection("ai_feedback").insertOne({
        postId: result.insertedId,
        aiPredictions: meaningful,
        userCategories: doc.categories,
        createdAt: new Date(),
      });

      console.log("🧠 Stored AI feedback (filtered)");
    } catch (e) {
      console.log("⚠ AI logging skipped:", e);
    }

    /* ------------------------------------------------------------------ */
    /* ENRICH                                                             */
    /* ------------------------------------------------------------------ */

    const enrichedNoCats = await enrichPost(
      { ...doc, _id: result.insertedId } as RawPost,
      users
    );

    const categoryData = await enrichCategories(doc.categories, categoriesColl);

    const finalPost = {
      ...enrichedNoCats,
      categories: categoryData,
      tags,
      commentCount: 0,
      edited: false,
      video: doc.video ?? undefined, // ✅ expose to client
    };

    /* ------------------------------------------------------------------ */
    /* SSE                                                                */
    /* ------------------------------------------------------------------ */

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
/* R2 CLIENT                                                                  */
/* -------------------------------------------------------------------------- */
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/* -------------------------------------------------------------------------- */
/*                                EDIT POST                                   */
/* -------------------------------------------------------------------------- */

export async function PUT(req: Request) {
  try {
    /* ------------------------------ AUTH ------------------------------ */
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    /* ------------------------------ BODY ------------------------------ */
    const {
      id,
      title,
      content,
      categories,
      tags,
      txId = null,
    } = await req.json();

    if (!id) {
      return new Response("Missing post id", { status: 400 });
    }

    /* ------------------------------ DB ------------------------------- */
    const client = await clientPromise;
    const db = client.db("jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return new Response("Post not found", { status: 404 });
    }
    const oldRefs: string[] = Array.isArray(existing.mediaRefs)
      ? existing.mediaRefs
      : [];

    if (existing.authorId !== session.user.uid) {
      return new Response("Forbidden", { status: 403 });
    }

    /* ------------------------- BUILD UPDATE --------------------------- */
    const updateFields: Record<string, unknown> = {};

    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) {
      updateFields.content = content;

      const newRefs = extractPostImageKeys(content);
      updateFields.mediaRefs = newRefs;

      const removedRefs = oldRefs.filter((k) => !newRefs.includes(k));

      for (const key of removedRefs) {
        try {
          if (!key.startsWith("posts/")) continue;

          await r2.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME!,
              Key: key,
            })
          );
        } catch (err) {
          console.error("❌ Failed to delete image:", key, err);
        }
      }
    }

    if (Array.isArray(categories)) {
      updateFields.categories = categories.map((c: string) => new ObjectId(c));
    }

    if (Array.isArray(tags)) {
      updateFields.tags = tags;
    }

    updateFields.edited = true;
    updateFields.editedAt = new Date();

    /* ---------------------------- UPDATE ------------------------------ */
    await posts.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    /* ------------------------- FETCH UPDATED -------------------------- */
    const updated = await posts.findOne({ _id: new ObjectId(id) });
    if (!updated) {
      return new Response("Post not found after update", { status: 404 });
    }

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

    /* ----------------------------- SSE ------------------------------- */
    broadcastSSE({
      type: existing.parentId ? "update-comment" : "update-post",
      txId,
      postId: final._id,
      post: final,
    });

    /* --------------------------- RESPONSE ----------------------------- */
    return NextResponse.json({ ok: true, post: final });
  } catch (err) {
    console.error("🔥 PUT /api/posts failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function deleteR2ByUrl(url?: string) {
  if (!url) return;

  try {
    const key = new URL(url).pathname.replace(/^\/+/, "");
    if (!key) return;

    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );

    console.log("🗑️ Deleted R2 object:", key);
  } catch (err) {
    console.error("❌ Failed to delete R2 object:", url, err);
  }
}

/* -------------------------------------------------------------------------- */
/*                                DELETE POST                                 */
/* -------------------------------------------------------------------------- */

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id, txId = null } = await req.json();

    if (!id || !ObjectId.isValid(id)) {
      return new Response("Invalid post id", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");

    const existing = await posts.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return new Response("Post not found", { status: 404 });
    }

    if (existing.authorId !== session.user.uid) {
      return new Response("Forbidden", { status: 403 });
    }

    const isQuestionDeletable = await (async (questionPost: RawPost) => {
      if (questionPost.postType !== PostTypes.QUESTION) {
        return true;
      }

      return (
        (await posts.countDocuments({
          parentId: questionPost._id.toString(),
        })) === 0
      );
    })(existing as RawPost);

    if (isQuestionDeletable) {
      /* ---------------- DELETE POST + COMMENTS MEDIA ---------------- */
      const toDelete = await posts
        .find({ $or: [{ _id: new ObjectId(id) }, { parentId: id }] })
        .toArray();

      for (const p of toDelete) {
        for (const key of p.mediaRefs ?? []) {
          try {
            if (!key.startsWith("posts/")) continue;

            await r2.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
              })
            );
          } catch (err) {
            console.error("❌ Failed to delete image:", key, err);
          }
        }
      }

      /* ---------------- DELETE VIDEO + THUMBNAIL ---------------- */
      if (existing.postType === PostTypes.VIDEO && existing.video) {
        await Promise.all([
          deleteR2ByUrl(existing.video.url),
          deleteR2ByUrl(existing.video.thumbnailUrl),
        ]);
      }

      /* ---------------- DELETE POSTS ---------------- */
      await posts.deleteMany({
        $or: [{ _id: new ObjectId(id) }, { parentId: id }],
      });

      /* ---------------- DELETE AI FEEDBACK ---------------- */
      try {
        await db.collection("ai_feedback").deleteMany({
          postId: new ObjectId(id),
        });
        console.log("🧠 Deleted AI feedback for post:", id);
      } catch (err) {
        console.error("❌ Failed to delete AI feedback:", err);
      }

      /* ---------------- SSE ---------------- */
      broadcastSSE({
        type: existing.parentId ? "delete-comment" : "delete-post",
        txId,
        postId: id,
      });
    } else {
      // Answerが存在するものは削除しない
      posts.updateOne(
        { _id: existing._id },
        {
          $set: { authorName: "Anonymous", isAdmin: false },
          $unset: { authorId: 1 },
        }
      );
      /* ---------------- SSE ---------------- */
      broadcastSSE({
        type: existing.parentId ? "delete-comment" : "delete-post",
        txId,
        postId: id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("🔥 DELETE /api/posts failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
