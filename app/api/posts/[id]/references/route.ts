import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection, WithId, Document } from "mongodb";

export const runtime = "nodejs";

/* -------------------------------------------------------------
 * GET REFERENCES FOR POST
 * ----------------------------------------------------------- */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json([], { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection<{
      _id: ObjectId;
      title?: string;
      postType?: string;
    }>("posts");

    const referencesColl = db.collection("post_references");

    const fromId = new ObjectId(id);

    /* --------------------------------------------------
     * 1️⃣ Find edges (from → to)
     * -------------------------------------------------- */
    const edges = await referencesColl
      .find({ from: fromId })
      .project({ to: 1 })
      .toArray();

    if (edges.length === 0) {
      return NextResponse.json([]);
    }

    const targetIds = edges.map((e) => e.to).filter(Boolean);

    /* --------------------------------------------------
     * 2️⃣ Fetch referenced posts
     * -------------------------------------------------- */
    const docs = await posts
      .find({ _id: { $in: targetIds } })
      .project({
        title: 1,
        postType: 1,
      })
      .toArray();

    /* --------------------------------------------------
     * 3️⃣ Shape minimal response for Graph
     * -------------------------------------------------- */
    const result = docs.map((p) => ({
      _id: p._id.toString(),
      title: p.title ?? "Untitled",
      postType: p.postType ?? "Post",
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ GET /api/posts/[id]/references:", err);
    return NextResponse.json([], { status: 500 });
  }
}
