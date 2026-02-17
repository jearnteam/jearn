import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { authConfig } from "@/features/auth/auth";
import { getServerSession } from "next-auth";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({}, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const postId = new ObjectId(id);

    /* =========================================================
       1️⃣ COMMENT COUNT
    ========================================================= */
    const commentCount = await db.collection("posts").countDocuments({
      parentId: id,
    });

    /* =========================================================
       2️⃣ LIMITED COMMENTS (reuse your logic simplified)
    ========================================================= */
    const commentDocs = await db
      .collection("posts")
      .find({ parentId: id })
      .toArray();

    // Only root comments
    const rootComments = commentDocs.filter((c) => !c.replyTo);

    const topRoots = [...rootComments]
      .sort((a, b) => (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0))
      .slice(0, 10);

    const recentRoots = [...rootComments]
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      )
      .slice(0, 10);

    const rootMap = new Map<string, any>();
    [...topRoots, ...recentRoots].forEach((c) =>
      rootMap.set(c._id.toString(), c)
    );

    const childrenMap = new Map<string, any[]>();

    commentDocs.forEach((c) => {
      if (!c.replyTo) return;
      const key = c.replyTo.toString();
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(c);
    });

    const finalMap = new Map<string, any>();

    function collectChildren(parentId: string, depth: number) {
      if (depth > 5) return;
      const children = childrenMap.get(parentId) ?? [];
      children.forEach((child) => {
        const id = child._id.toString();
        if (!finalMap.has(id)) {
          finalMap.set(id, child);
          collectChildren(id, depth + 1);
        }
      });
    }

    rootMap.forEach((root) => {
      const id = root._id.toString();
      finalMap.set(id, root);
      collectChildren(id, 1);
    });

    const limitedComments = Array.from(finalMap.values()).map((c) => ({
      _id: c._id.toString(),
      replyTo: c.replyTo?.toString() ?? null,
      content: c.content ?? "",
      title: c.title ?? null,
      postType: c.postType ?? "Comment",
      upvoteCount: c.upvoteCount ?? 0,
      createdAt: c.createdAt ?? null,
      authorName: c.authorName ?? "Anonymous",
    }));

    /* =========================================================
       3️⃣ REFERENCES
    ========================================================= */
    const edges = await db
      .collection("post_references")
      .find({ from: postId })
      .project({ to: 1 })
      .toArray();

    const targetIds = edges.map((e) => e.to);

    const references = targetIds.length
      ? await db
          .collection("posts")
          .find({ _id: { $in: targetIds } })
          .project({ title: 1, postType: 1 })
          .toArray()
      : [];

    const refResult = references.map((p) => ({
      _id: p._id.toString(),
      title: p.title ?? "Untitled",
      postType: p.postType ?? "Post",
    }));

    /* =========================================================
       4️⃣ TAG USAGE
    ========================================================= */
    const post = await db
      .collection("posts")
      .findOne({ _id: postId }, { projection: { tags: 1, categories: 1 } });

    const tags = post?.tags ?? [];
    const categories = post?.categories ?? [];

    const tagUsageResults = tags.length
      ? await db
          .collection("posts")
          .aggregate([
            { $match: { tags: { $in: tags } } },
            { $unwind: "$tags" },
            { $match: { tags: { $in: tags } } },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
          ])
          .toArray()
      : [];

    const tagUsage: Record<string, number> = {};
    tagUsageResults.forEach((r) => {
      if (typeof r._id === "string") {
        tagUsage[r._id] = r.count ?? 0;
      }
    });

    /* =========================================================
       5️⃣ CATEGORY USAGE
    ========================================================= */
    const categoryUsageResults = categories.length
      ? await db
          .collection("posts")
          .aggregate([
            { $unwind: "$categories" },
            { $match: { categories: { $in: categories } } },
            { $group: { _id: "$categories", count: { $sum: 1 } } },
          ])
          .toArray()
      : [];

    const categoryUsage: Record<string, number> = {};
    categoryUsageResults.forEach((r) => {
      categoryUsage[r._id.toString()] = r.count ?? 0;
    });

    /* =========================================================
       FINAL RESPONSE
    ========================================================= */

    return NextResponse.json({
      comments: limitedComments,
      commentCount,
      references: refResult,
      usage: {
        tags: tagUsage,
        categories: categoryUsage,
      },
    });
  } catch (err) {
    console.error("❌ graph route error:", err);
    return NextResponse.json({}, { status: 500 });
  }
}
