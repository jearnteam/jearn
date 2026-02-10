// app/api/search/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection } from "mongodb";
import { PostTypes, RawPost } from "@/types/post";

export const runtime = "nodejs";

type CategoryDoc = {
  _id: ObjectId;
  name?: string | null;
  jname?: string | null;
  myname?: string | null;
};

/* ====================== ENRICH POST ======================= */

async function enrichPost(
  post: RawPost,
  usersColl: Collection,
  categoriesColl: Collection<CategoryDoc>
) {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

  let user: any = null;
  if (
    post.authorId &&
    typeof post.authorId === "string" &&
    ObjectId.isValid(post.authorId)
  ) {
    user = await usersColl.findOne(
      { _id: new ObjectId(post.authorId) },
      { projection: { name: 1, avatarUpdatedAt: 1, uniqueId: 1 } }
    );
  }

  const avatarTs = user?.avatarUpdatedAt
    ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
    : "";

  const authorName = post.authorName ?? user?.name ?? "Anonymous";
  const authorUniqueId = user?.uniqueId;

  const authorAvatar = user
    ? `${CDN}/avatars/${post.authorId}.webp${avatarTs}`
    : `${CDN}/avatars/default.webp`;

  const categoryIds = Array.isArray(post.categories)
    ? post.categories
        .map((c) =>
          typeof c === "string" && ObjectId.isValid(c)
            ? new ObjectId(c)
            : c instanceof ObjectId
            ? c
            : null
        )
        .filter((c): c is ObjectId => c !== null)
    : [];

  const categories =
    categoryIds.length > 0
      ? await categoriesColl
          .find({ _id: { $in: categoryIds } })
          .project({ name: 1, jname: 1, myname: 1 })
          .toArray()
      : [];

  return {
    ...post,
    _id: post._id.toString(),
    createdAt: post.createdAt, // ✅ keep for client + debug
    authorName,
    authorUniqueId,
    authorAvatar,
    categories: categories.map((c) => ({
      id: c._id.toString(),
      name: c.name ?? "",
      jname: c.jname ?? "",
      myname: c.myname ?? "",
    })),
    tags: post.tags ?? [],
    mediaRefs: post.mediaRefs ?? [],
    commentCount: 0,
  };
}
function dbg(label: string, data?: any) {
  console.log(`🧪 [SEARCH] ${label}`, data ?? "");
}

export async function GET(req: NextRequest) {
  dbg("REQUEST START");

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const cursor = searchParams.get("cursor");

    dbg("PARAMS", { q, cursor });

    if (q.length < 2) {
      dbg("QUERY TOO SHORT");
      return NextResponse.json({
        users: [],
        categories: [],
        posts: [],
        nextCursor: null,
      });
    }

    dbg("CONNECT MONGO");
    const client = await clientPromise;
    const db = client.db("jearn");

    const postsColl = db.collection<RawPost>("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    dbg("BUILD REGEX");
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");

    /* ================= USERS ================= */
    let users: any[] = [];
    let categories: any[] = [];

    if (!cursor) {
      dbg("FETCH USERS");

      const rawUsers = await usersColl
        .find(
          { $or: [{ uniqueId: regex }, { name: regex }] },
          { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1, bio: 1 } }
        )
        .limit(5)
        .toArray();

      dbg("USERS FOUND", rawUsers.length);

      const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

      users = rawUsers.map((u: any) => ({
        _id: u._id.toString(),
        uniqueId: u.uniqueId ?? null,
        name: u.name ?? "Unknown",
        bio: u.bio ?? "",
        picture: `${CDN}/avatars/${u._id}.webp${
          u.avatarUpdatedAt ? `?t=${new Date(u.avatarUpdatedAt).getTime()}` : ""
        }`,
      }));

      dbg("FETCH CATEGORIES");

      const startsRegex = new RegExp("^" + safe, "i");

      const rawCategories = await categoriesColl
        .aggregate([
          {
            $match: {
              $or: [{ name: regex }, { jname: regex }, { myname: regex }],
            },
          },
          {
            $addFields: {
              _priority: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $regexMatch: {
                          input: { $toString: { $ifNull: ["$name", ""] } },
                          regex: startsRegex,
                        },
                      },
                      then: 0,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $toString: { $ifNull: ["$jname", ""] } },
                          regex: startsRegex,
                        },
                      },
                      then: 1,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $toString: { $ifNull: ["$myname", ""] } },
                          regex: startsRegex,
                        },
                      },
                      then: 1,
                    },
                    {
                      case: {
                        $regexMatch: {
                          input: { $toString: { $ifNull: ["$name", ""] } },
                          regex,
                        },
                      },
                      then: 2,
                    },
                  ],
                  default: 3,
                },
              },
            },
          },
          { $sort: { _priority: 1, name: 1 } },
          { $limit: 5 },
          {
            $project: {
              name: 1,
              jname: 1,
              myname: 1,
            },
          },
        ])
        .toArray();

      dbg("CATEGORIES FOUND", rawCategories.length);

      categories = rawCategories.map((c: any) => ({
        id: c._id.toString(),
        name: c.name ?? "",
        jname: c.jname ?? "",
        myname: c.myname ?? "",
      }));
    }

    /* ================= POSTS ================= */
    dbg("BUILD POST QUERY");

    const query: any = {
      postType: { $ne: PostTypes.COMMENT },
      $or: [
        { title: regex },
        { content: regex },
        { tags: { $elemMatch: { $regex: regex } } },
      ],
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    if (cursor) {
      dbg("APPLY CURSOR");
      query.createdAt.$lt = new Date(cursor);
    }

    dbg("FETCH POSTS", query);

    const rawPosts = await postsColl
      .find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    dbg("POSTS FOUND", rawPosts.length);

    const posts = await Promise.all(
      rawPosts.map(async (p, i) => {
        dbg(`ENRICH POST ${i}`, p._id.toString());
        return enrichPost(p, usersColl, categoriesColl);
      })
    );

    dbg("SUCCESS");

    return NextResponse.json({
      users,
      categories,
      posts,
      nextCursor:
        rawPosts.length > 0
          ? rawPosts[rawPosts.length - 1].createdAt!.toISOString()
          : null,
    });
  } catch (err: any) {
    console.error("🔥 SEARCH HARD FAIL", {
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        error: "search_failed",
        message: err?.message ?? "unknown",
      },
      { status: 500 }
    );
  }
}
