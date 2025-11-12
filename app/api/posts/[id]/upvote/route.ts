// app/api/posts/[id]/upvote/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, txId } = await req.json();
    const postId = params.id;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const posts = db.collection("posts");

    const _id = new ObjectId(postId);
    const post = await posts.findOne({ _id });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const already =
      Array.isArray(post.upvoters) && post.upvoters.includes(userId);
    const action: "added" | "removed" = already ? "removed" : "added";

    await posts.updateOne(
      { _id },
      already
        ? { $pull: { upvoters: userId }, $inc: { upvoteCount: -1 } }
        : { $addToSet: { upvoters: userId }, $inc: { upvoteCount: 1 } }
    );

    const updated = await posts.findOne({ _id });

    /* --------------------------------------------------------
       ✅ Broadcast SSE to all connected clients
       Includes both legacy "upvote" and new contextual types
    --------------------------------------------------------- */
    const payload = {
      postId,
      userId,
      action,
      txId: txId ?? null,
      parentId: updated?.parentId ?? null,
      replyTo: updated?.replyTo ?? null,
    };

    // legacy (for current useComments)
    broadcastSSE({ type: "upvote", ...payload });

    // new contextual event (optional future use)
    const type = updated?.replyTo
      ? "upvote-reply"
      : updated?.parentId
      ? "upvote-comment"
      : "upvote-post";

    broadcastSSE({ type, ...payload });

    return NextResponse.json({ ok: true, action, txId: txId ?? null });
  } catch (err) {
    console.error("❌ Upvote error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}