import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { emitGroupedNotification } from "@/lib/emitNotification";
import { broadcastSSE } from "@/lib/sse";
import { randomUUID } from "crypto";

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

  /* -------------------------------------------------- */
  /* FIND POST                                          */
  /* -------------------------------------------------- */
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

  const alreadyUpvoted =
    post.upvoters?.some((x: ObjectId) => x.equals(actorId)) ?? false;

  const txId = randomUUID();

  /* -------------------------------------------------- */
  /* TOGGLE LOGIC                                       */
  /* -------------------------------------------------- */

  if (alreadyUpvoted) {
    await posts.updateOne(
      { _id: postId },
      {
        $pull: { upvoters: actorId },
        $inc: { upvoteCount: -1 },
      }
    );

    // 🔥 Broadcast SSE (REMOVE)
    broadcastSSE({
      type: "upvote",
      txId,
      postId: id,
      userId: actorId.toString(),
      action: "removed",
    });

  } else {
    await posts.updateOne(
      { _id: postId },
      {
        $addToSet: { upvoters: actorId },
        $inc: { upvoteCount: 1 },
      }
    );

    // 🔥 Broadcast SSE (ADD)
    broadcastSSE({
      type: "upvote",
      txId,
      postId: id,
      userId: actorId.toString(),
      action: "added",
    });

    // 🔔 Notify author (not self)
    if (
      post.authorId &&
      post.authorId.toString() !== actorId.toString()
    ) {
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
    txId,
  });
}
