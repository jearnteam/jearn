import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

async function enrichCategories(catIds: any[], categoriesColl: any) {
  if (!Array.isArray(catIds) || catIds.length === 0) return [];

  const validIds = catIds
    .map((c) => (ObjectId.isValid(c) ? new ObjectId(c) : null))
    .filter((x): x is ObjectId => x !== null);

  if (validIds.length === 0) return [];

  const docs = await categoriesColl
    .find({ _id: { $in: validIds } })
    .project({ name: 1, jname: 1, myname: 1 })
    .toArray();

  return docs.map((c: any) => ({
    id: c._id.toString(),
    name: c.name,
    jname: c.jname,
    myname: c.myname ?? "",
  }));
}

export async function GET(_req: Request, { params }: any) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const postsColl = db.collection("posts");
    const usersColl = db.collection("users");
    const categoriesColl = db.collection("categories");

    // ⭐ Use email-based admin logic — SAME AS MAIN POSTS ROUTE
    const user = await usersColl.findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1, userId: 1, email: 1 } }
    );

    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const isAdminUser =
      user?.email && adminEmails.includes(user.email.trim());

    const authorName = user?.name ?? "Unknown User";
    const authorUserId = user?.userId;

    const posts = await postsColl
      .find({ authorId: id, parentId: null })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedPosts = await Promise.all(
      posts.map(async (post: any) => {
        const categoryData = await enrichCategories(
          Array.isArray(post.categories) ? post.categories : [],
          categoriesColl
        );

        return {
          _id: post._id.toString(),
          title: post.title,
          content: post.content,
          createdAt: post.createdAt,

          authorId: id,
          authorName,
          authorUserId,
          authorAvatar: `/api/user/avatar/${id}?t=${Date.now()}`,

          categories: categoryData,
          tags: post.tags ?? [],
          upvoteCount: post.upvoteCount ?? 0,
          commentCount: post.commentCount ?? 0,

          // ⭐ Consistent admin flag
          isAdmin: isAdminUser,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      posts: enrichedPosts,
    });
  } catch (err) {
    console.error("🔥 Error in /api/posts/byUser:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
