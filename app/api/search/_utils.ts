// app/api/search/_utils.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId, Collection } from "mongodb";
import { RawPost, PostTypes } from "@/types/post";

export type CategoryDoc = {
  _id: ObjectId;
  name?: string | null;
  jname?: string | null;
  myname?: string | null;
};

export function makeSafeRegex(q: string) {
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(safe, "i");
}

/* ====================== ENRICH POST ======================= */
export async function enrichPost(
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
    createdAt: post.createdAt,
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

/* ====================== SEARCH BY POST TYPE ======================= */
export async function searchByPostType(
  q: string,
  postType: string,
  cursor?: string,
  limit = 15
) {
  const client = await clientPromise;
  const db = client.db("jearn");

  const postsColl = db.collection<RawPost>("posts");
  const usersColl = db.collection("users");
  const categoriesColl = db.collection<CategoryDoc>("categories");

  const regex = makeSafeRegex(q);

  const query: any = {
    postType: { $eq: postType, $ne: PostTypes.COMMENT },
    $or: [
      { title: regex },
      { content: regex },
      { tags: { $elemMatch: { $regex: regex } } },
    ],
  };

  if (cursor && !isNaN(Date.parse(cursor))) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const rawPosts = await postsColl
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const posts = await Promise.all(
    rawPosts.map((p) => enrichPost(p, usersColl, categoriesColl))
  );

  return {
    posts,
    nextCursor:
      rawPosts.length > 0
        ? rawPosts[rawPosts.length - 1].createdAt?.toISOString()
        : null,
  };
}
