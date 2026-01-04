import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { emitGroupedNotification } from "@/lib/emitNotification";

type PostDoc = {
  _id: ObjectId;
  authorId: ObjectId | string;

  upvoters?: ObjectId[];
  upvoteCount?: number;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await getServerSession(authConfig);
  const userId = session?.user?.uid;

  if (!userId || !ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db("jearn");
  const posts = db.collection<PostDoc>("posts");

  const postId = new ObjectId(id);
  const actorId = new ObjectId(userId);

  /* ---------------- CHECK EXISTING ---------------- */
  const post = await posts.findOne(
    { _id: postId },
    { projection: { authorId: 1, upvoters: 1 } }
  );

  if (!post) {
    return NextResponse.json(
      { ok: false, error: "Post not found" },
      { status: 404 }
    );
  }

  const alreadyUpvoted = post.upvoters?.some((x: ObjectId) =>
    x.equals(actorId)
  );

  /* ---------------- TOGGLE ---------------- */
  if (alreadyUpvoted) {
    await posts.updateOne(
      { _id: postId },
      {
        $pull: { upvoters: actorId },
        $inc: { upvoteCount: -1 },
      }
    );
  } else {
    await posts.updateOne(
      { _id: postId },
      {
        $addToSet: { upvoters: actorId },
        $inc: { upvoteCount: 1 },
      }
    );

    // 🔔 GROUPED NOTIFICATION (only on add)
    if (post.authorId && post.authorId.toString() !== actorId.toString()) {
      emitGroupedNotification({
        userId: post.authorId.toString(),
        type: "post_like",
        postId: id,
        actorId: actorId.toString(),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    action: alreadyUpvoted ? "removed" : "added",
  });
}
