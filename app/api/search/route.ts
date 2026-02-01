// app/api/search/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";
import { PostTypes } from "@/types/post";

export const runtime = "nodejs";

/* ========================== TYPES ========================== */

type RawPost = WithId<Document> & {
  postType?: string;
  title?: string;
  content?: string;
  authorId?: string;
  createdAt?: Date;
  categories?: unknown[];
  tags?: string[];
  mediaRefs?: string[];
  parentId?: string | null;
};

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};

type SearchUser = {
  _id: string;
  userId: string | null;
  name: string;
  picture: string;
  bio?: string;
};

type SearchCategory = {
  id: string;
  name: string;
  jname: string;
  myname: string;
};

/* ====================== ENRICH POST ======================= */

async function enrichPost(
  post: RawPost,
  users: Collection,
  categoriesColl: Collection<CategoryDoc>
) {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

  let user = null;
  if (post.authorId && ObjectId.isValid(post.authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(post.authorId) },
      { projection: { name: 1, userId: 1, avatarUpdatedAt: 1, bio: 1 } }
    );
  }

  const avatarTs = user?.avatarUpdatedAt
    ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
    : "";

  const catIds = Array.isArray(post.categories)
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

  const cats =
    catIds.length > 0
      ? await categoriesColl
          .find({ _id: { $in: catIds } })
          .project({ name: 1, jname: 1, myname: 1 })
          .toArray()
      : [];

  return {
    ...post,
    _id: post._id.toString(),
    authorName: user?.name ?? "Anonymous",
    authorAvatar: user
      ? `${CDN}/avatars/${user._id.toString()}.webp${avatarTs}`
      : `${CDN}/avatars/default.webp`,
    categories: cats.map((c) => ({
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

/* ==========================================================
   GET /api/search?q=xxx
   ========================================================== */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [], categories: [], posts: [] });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const postsColl = db.collection("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");

    const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

    /* ================= USERS ================= */

    const rawUsers = await usersColl
      .find(
        { $or: [{ userId: regex }, { name: regex }] },
        { projection: { name: 1, userId: 1, avatarUpdatedAt: 1 } }
      )
      .limit(5)
      .toArray();

    const users: SearchUser[] = rawUsers.map((u) => ({
      _id: u._id.toString(),
      userId: u.userId ?? null,
      name: u.name ?? "Unknown",
      bio: u.bio ?? "",
      picture: `${CDN}/avatars/${u._id.toString()}.webp${
        u.avatarUpdatedAt ? `?t=${new Date(u.avatarUpdatedAt).getTime()}` : ""
      }`,
    }));

    /* ================= CATEGORIES ================= */

    const rawCategories = await categoriesColl
      .find(
        { $or: [{ name: regex }, { jname: regex }, { myname: regex }] },
        { projection: { name: 1, jname: 1, myname: 1 } }
      )
      .limit(5)
      .toArray();

    const categories: SearchCategory[] = rawCategories.map((c) => ({
      id: c._id.toString(),
      name: c.name ?? "",
      jname: c.jname ?? "",
      myname: c.myname ?? "",
    }));

    /* ================= POSTS ================= */

    const rawPosts = (await postsColl
      .find({
        $and: [
          { postType: { $ne: PostTypes.COMMENT } },
          {
            $or: [{ title: regex }, { content: regex }],
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()) as RawPost[];

    const posts = await Promise.all(
      rawPosts.map((p) => enrichPost(p, usersColl, categoriesColl))
    );

    return NextResponse.json({ users, categories, posts });
  } catch (err) {
    console.error("❌ GET /api/search error:", err);
    return NextResponse.json(
      { users: [], categories: [], posts: [] },
      { status: 500 }
    );
  }
}
