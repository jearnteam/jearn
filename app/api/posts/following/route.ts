// app/api/posts/following/route.ts
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";
import { PostTypes, RawPost } from "@/types/post";

export const runtime = "nodejs";

function normalizePostType(postType?: string) {
  return typeof postType === "string" ? postType.toUpperCase() : postType;
}

/* -------------------------------------------------------------------------- */
/*                               TYPES                                         */
/* -------------------------------------------------------------------------- */

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};

/* -------------------------------------------------------------------------- */
/*                         ENRICH POST WITH USER DATA                          */
/* -------------------------------------------------------------------------- */

type UserDoc = {
  _id: ObjectId;
  name?: string;
  uniqueId?: string;
  avatarUpdatedAt?: Date;
};

async function enrichPost(
  post: RawPost,
  usersColl: Collection<UserDoc>
) {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";
  const DEFAULT_AVATAR = "/default-avatar.png";

  // System post
  if (post.authorId === "system") {
    return {
      ...post,
      _id: post._id.toString(),
      authorId: "system",
      authorName: "System",
      authorUniqueId: null,
      authorAvatar: `${CDN}/avatars/system.webp`,
    };
  }

  let user: UserDoc | null = null;

  if (typeof post.authorId === "string" && ObjectId.isValid(post.authorId)) {
    user = await usersColl.findOne(
      { _id: new ObjectId(post.authorId) },
      {
        projection: {
          name: 1,
          uniqueId: 1,
          avatarUpdatedAt: 1,
        },
      }
    );
  }

  const authorName = post.authorName ?? user?.name ?? "Unknown";
  const avatarId = user?._id?.toString() ?? post.authorId;

  const timestamp = user?.avatarUpdatedAt
    ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
    : "";

  const cdnAvatar = avatarId
    ? `${CDN}/avatars/${avatarId}.webp${timestamp}`
    : DEFAULT_AVATAR;

  return {
    ...post,
    _id: post._id.toString(),
    authorId: post.authorId,
    authorName,
    authorUniqueId: user?.uniqueId ?? null,
    authorAvatar: cdnAvatar,
  };
}


/* -------------------------------------------------------------------------- */
/*                        ENRICH CATEGORY OBJECTS                              */
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
/*                                  GET                                       */
/* -------------------------------------------------------------------------- */

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    const userId = session.user.uid;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 20);
    const cursor = searchParams.get("cursor");

    const client = await clientPromise;
    const db = client.db("jearn");

    const postsColl = db.collection<RawPost>("posts");
    const usersColl = db.collection<UserDoc>("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    /* -------------------------------------------------
     * ① get following ids
     * ------------------------------------------------- */
    const follows = await db
      .collection("follow")
      .find({ followerId: session.user.uid })
      .toArray();

    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    /* -------------------------------------------------
     * ② query (same shape as home feed)
     * ------------------------------------------------- */
    const query: any = {
      authorId: { $in: followingIds },
      postType: { $in: ["Question", "Answer", "Post", "POLL"] },
    };

    if (cursor) {
      const [createdAt, id] = cursor.split("|");
      query.$and = [
        {
          $or: [
            { createdAt: { $lt: new Date(createdAt) } },
            {
              createdAt: new Date(createdAt),
              _id: { $lt: new ObjectId(id) },
            },
          ],
        },
      ];
    }

    /* -------------------------------------------------
     * ③ fetch posts
     * ------------------------------------------------- */
    const docs = await postsColl
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray();

    /* -------------------------------------------------
     * ④ comment counts
     * ------------------------------------------------- */
    const commentCounts = (await postsColl
      .aggregate([
        { $match: { parentId: { $in: docs.map((d) => d._id.toString()) } } },
        { $group: { _id: "$parentId", count: { $sum: 1 } } },
      ])
      .toArray()) as { _id: ObjectId; count: number }[];

    const countMap: Record<string, number> = {};
    commentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    /* -------------------------------------------------
     * ⑤ enrich (this fixes avatar + name)
     * ------------------------------------------------- */
    const enriched = await Promise.all(
      docs.map(async (p: RawPost) => {
        const post = await enrichPost(p, usersColl);

        let parentPost = null;
        let categories: any[] = [];

        // Answer の場合：親 Question を取得
        if (p.postType === PostTypes.ANSWER && p.parentId) {
          const q = await postsColl.findOne(
            { _id: new ObjectId(p.parentId) },
            { projection: { title: 1, categories: 1 } }
          );

          if (q) {
            parentPost = {
              _id: q._id.toString(),
              title: q.title,
            };

            //Question の categories を使う
            categories = await enrichCategories(
              Array.isArray(q.categories) ? q.categories : [],
              categoriesColl
            );
          }
        } else {
          //Question / 通常 Post
          categories = await enrichCategories(
            Array.isArray(p.categories) ? p.categories : [],
            categoriesColl
          );
        }

        return {
          ...post,

          title: p.title ?? "",
          content: p.content ?? "",
          postType: p.postType,
          parentId: p.parentId ?? null,

          parentPost,
          categories,

          tags: p.tags ?? [],
          commentCount: countMap[p._id.toString()] ?? 0,
        };
      })
    );

    /* -------------------------------------------------
     * ⑥ cursor
     * ------------------------------------------------- */
    const nextCursor =
      docs.length > 0
        ? `${docs[docs.length - 1].createdAt!.toISOString()}|${docs[
            docs.length - 1
          ]._id.toString()}`
        : null;

    return NextResponse.json({ items: enriched, nextCursor });
  } catch (err) {
    console.error("❌ GET /api/posts/following error:", err);

    return NextResponse.json(
      {
        items: [],
        nextCursor: null,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
