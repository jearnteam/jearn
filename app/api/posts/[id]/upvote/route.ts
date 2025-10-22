import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse"; // 👈 make sure this exists

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await req.json();
    const postId = params.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(postId);
    } catch {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const post = await posts.findOne({ _id: objectId });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const alreadyUpvoted = (post.upvoters || []).includes(userId);
    let action: "added" | "removed";

    if (alreadyUpvoted) {
      // ✅ Unupvote
      await posts.updateOne(
        { _id: objectId },
        {
          $pull: { upvoters: userId },
          $inc: { upvoteCount: -1 },
        }
      );
      action = "removed";
    } else {
      // ✅ Upvote
      await posts.updateOne(
        { _id: objectId },
        {
          $addToSet: { upvoters: userId },
          $inc: { upvoteCount: 1 },
        }
      );
      action = "added";
    }

    // 📡 Broadcast SSE to all clients
    broadcastSSE({
      type: "upvote",
      postId,
      userId,
      action,
    });

    return NextResponse.json({ ok: true, action });
  } catch (err) {
    console.error("❌ Upvote error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
