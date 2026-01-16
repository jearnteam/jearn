// app/api/posts/videos/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";
import { PostTypes } from "@/types/post";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type RawPost = WithId<Document> & {
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt?: Date;
  categories?: unknown[];
  tags?: string[];
  video?: {
    url: string;
    thumbnailUrl?: string;
    duration?: number;
    aspectRatio?: number;
  };
};

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers (copied from /api/posts/route.ts)                                   */
/* -------------------------------------------------------------------------- */

async function enrichPost(post: RawPost, usersColl: Collection) {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";
  const DEFAULT_AVATAR = "/default-avatar.png";

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
      { projection: { name: 1, avatarUpdatedAt: 1 } }
    );
  }

  const authorName = post.authorName ?? user?.name ?? "Unknown";
  const avatarId = user?._id?.toString() ?? post.authorId;

  const timestamp = user?.avatarUpdatedAt
    ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
    : "";

  const authorAvatar =
    avatarId ? `${CDN}/avatars/${avatarId}.webp${timestamp}` : DEFAULT_AVATAR;

  return {
    ...post,
    _id: post._id.toString(),
    authorId: post.authorId,
    authorName,
    authorAvatar,
  };
}

async function enrichCategories(
  catIds: unknown[],
  categoriesColl: Collection<CategoryDoc>
) {
  if (!Array.isArray(catIds) || catIds.length === 0) return [];

  const validIds = catIds
    .map((c) =>
      c instanceof ObjectId
        ? c
        : typeof c === "string" && ObjectId.isValid(c)
        ? new ObjectId(c)
        : null
    )
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
/* GET VIDEOS                                                                 */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("jearn");

    const postsColl = db.collection("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    const docs = await postsColl
      .find({
        postType: PostTypes.VIDEO,
        "video.url": { $exists: true },
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .toArray();

    const enriched = await Promise.all(
      docs.map(async (p: RawPost) => {
        const post = await enrichPost(p, usersColl);
        const categories = await enrichCategories(
          Array.isArray(p.categories) ? p.categories : [],
          categoriesColl
        );

        return {
          ...post,
          categories,
          tags: p.tags ?? [],
          video: p.video,
        };
      })
    );

    return NextResponse.json({ items: enriched });
  } catch (err) {
    console.error("❌ GET /api/posts/videos error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
