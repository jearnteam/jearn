import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";

export const runtime = "nodejs";

/* -------------------------------------------------------------
 * AUTHOR RESOLVER
 * ----------------------------------------------------------- */
async function resolveAuthor(
  users: Collection,
  authorId?: string | null
): Promise<{
  name: string;
  uniqueId: string | null;
  avatarUpdatedAt: Date | null;
}> {
  if (!authorId) {
    return { name: "Anonymous", uniqueId: null, avatarUpdatedAt: null };
  }

  let user: WithId<Document> | null = null;

  if (ObjectId.isValid(authorId)) {
    user = await users.findOne(
      { _id: new ObjectId(authorId) },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1 } }
    );
  }

  if (!user) {
    user = await users.findOne(
      { provider_id: authorId },
      { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1 } }
    );
  }

  return {
    name: (user?.name as string | undefined) ?? "Anonymous",
    uniqueId: (user?.uniqueId as string | undefined) ?? null,
    avatarUpdatedAt: (user?.avatarUpdatedAt as Date | undefined) ?? null,
  };
}

/* -------------------------------------------------------------
 * GET COMMENTS FOR GRAPH (LIMITED)
 * ----------------------------------------------------------- */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    if (!postId || !ObjectId.isValid(postId)) {
      return NextResponse.json([], { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const posts = db.collection("posts");
    const users = db.collection("users");

    /* ---------------------------------------------------------
     * 1️⃣ Fetch ALL comments for that post
     * ------------------------------------------------------- */
    const docs = await posts.find({ parentId: postId }).toArray();

    if (!docs.length) {
      return NextResponse.json([]);
    }

    /* ---------------------------------------------------------
     * 2️⃣ Root comments only (direct children of post)
     * ------------------------------------------------------- */
    const rootComments = docs.filter(
      (c) => !c.replyTo // 👈 only real root comments
    );

    /* ---------------------------------------------------------
     * 3️⃣ Top 10 roots by upvotes
     * ------------------------------------------------------- */
    const topRoots = [...rootComments]
      .sort((a, b) => (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0))
      .slice(0, 10);

    /* ---------------------------------------------------------
     * 4️⃣ Recent 10 roots
     * ------------------------------------------------------- */
    const recentRoots = [...rootComments]
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      )
      .slice(0, 10);

    /* ---------------------------------------------------------
     * 5️⃣ Merge without duplicates
     * ------------------------------------------------------- */
    const selectedRootMap = new Map<string, WithId<Document>>();

    [...topRoots, ...recentRoots].forEach((c) => {
      selectedRootMap.set(c._id.toString(), c);
    });

    const selectedRoots = Array.from(selectedRootMap.values());

    /* ---------------------------------------------------------
     * 6️⃣ Build children lookup map (FAST)
     * ------------------------------------------------------- */
    const childrenMap = new Map<string, WithId<Document>[]>();

    docs.forEach((c) => {
      if (!c.replyTo) return; // skip root comments

      const key = c.replyTo.toString();

      if (!childrenMap.has(key)) {
        childrenMap.set(key, []);
      }

      childrenMap.get(key)!.push(c);
    });

    /* ---------------------------------------------------------
     * 7️⃣ Recursively collect children (depth ≤ 5)
     * ------------------------------------------------------- */
    const finalMap = new Map<string, WithId<Document>>();

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

    selectedRoots.forEach((root) => {
      const id = root._id.toString();
      finalMap.set(id, root);
      collectChildren(id, 1);
    });

    const limitedComments = Array.from(finalMap.values());

    /* ---------------------------------------------------------
     * 8️⃣ Enrich authors
     * ------------------------------------------------------- */
    const enriched = await Promise.all(
      limitedComments.map(async (c) => {
        const author = await resolveAuthor(users, c.authorId as string | null);

        return {
          _id: c._id.toString(),
          parentId: c.parentId?.toString(),
          replyTo: c.replyTo?.toString() ?? null,

          postType: c.postType ?? "Comment",
          title: typeof c.title === "string" ? c.title : null,
          content: c.content ?? "",

          upvoteCount: c.upvoteCount ?? 0,
          createdAt: c.createdAt ?? null,

          authorName: author.name,
          authorUniqueId: author.uniqueId,
          authorAvatarUpdatedAt: author.avatarUpdatedAt,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ GET /api/posts/[id]/comments:", err);
    return NextResponse.json([], { status: 500 });
  }
}
