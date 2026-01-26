import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";
import { PostTypes } from "@/types/post";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
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

/* -------------------------------------------------------------------------- */
/* HELPERS                                   */
/* -------------------------------------------------------------------------- */

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
      { projection: { name: 1, avatarUpdatedAt: 1 } }
    );
  }

  const authorName = post.authorName ?? user?.name ?? "Unknown";
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
    authorAvatar,
  };
}

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
/* GET HANDLER                                */
/* -------------------------------------------------------------------------- */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");
    const categoriesColl = db.collection<CategoryDoc>("categories");

    // 対象の質問に対する回答を取得
    // postType: ANSWER かつ parentId: id
    const answerDocs = await posts
      .find({
        parentId: id,
        postType: PostTypes.ANSWER,
      })
      .sort({ createdAt: 1 }) // 古い順（時系列）あるいは、upvote順などが考えられますが一旦時系列
      .toArray();

    // 回答データの整形 (Enrich)
    const enrichedAnswers = await Promise.all(
      answerDocs.map(async (p) => {
        const categories = await enrichCategories(
          Array.isArray(p.categories) ? p.categories : [],
          categoriesColl
        );
        const postData = await enrichPost(p as RawPost, users);

        return {
          ...postData,
          categories,
          tags: p.tags ?? [],
          commentCount: 0, // 必要であれば別途取得
        };
      })
    );

    return NextResponse.json(enrichedAnswers);
  } catch (err) {
    console.error("❌ GET /api/posts/[id]/answers error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
