// app/api/posts/[id]/upvote/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { emitNotification } from "@/lib/notificationHub";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    /* --------------------------------------------------------
       AUTH
    --------------------------------------------------------- */
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { userId, txId } = await req.json();

    if (!userId || userId !== session.user.uid) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    /* --------------------------------------------------------
       SETUP
    --------------------------------------------------------- */
    const postId = new ObjectId(params.id);
    const actorObjId = new ObjectId(userId);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const posts = db.collection("posts");
    const notifications = db.collection("notifications");

    /* --------------------------------------------------------
       ATOMIC UPSERT (RACE SAFE)
    --------------------------------------------------------- */
    const result = await posts.findOneAndUpdate(
      { _id: postId },
      [
        {
          $set: {
            upvoters: { $ifNull: ["$upvoters", []] },
            upvoteCount: { $ifNull: ["$upvoteCount", 0] },
          },
        },
        {
          $set: {
            _alreadyUpvoted: { $in: [actorObjId, "$upvoters"] },
          },
        },
        {
          $set: {
            upvoters: {
              $cond: [
                "$_alreadyUpvoted",
                { $setDifference: ["$upvoters", [actorObjId]] },
                { $concatArrays: ["$upvoters", [actorObjId]] },
              ],
            },
            upvoteCount: {
              $cond: [
                "$_alreadyUpvoted",
                { $max: [{ $subtract: ["$upvoteCount", 1] }, 0] },
                { $add: ["$upvoteCount", 1] },
              ],
            },
          },
        },
        { $unset: "_alreadyUpvoted" },
      ],
      { returnDocument: "after" }
    );

    /* --------------------------------------------------------
   TS SAFETY (this is what fixes the error)
    --------------------------------------------------------- */
    if (!result || !result.value) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updated = result.value;

    if (!updated) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const action: "added" | "removed" = updated.upvoters.some((id: ObjectId) =>
      id.equals(actorObjId)
    )
      ? "added"
      : "removed";

    /* --------------------------------------------------------
       🔔 GROUPED LIKE NOTIFICATION
    --------------------------------------------------------- */
    if (action === "added") {
      const postOwnerUid = updated.authorId;

      if (postOwnerUid && postOwnerUid !== userId) {
        const ownerObjId = new ObjectId(postOwnerUid);
        const groupKey = `post_like:${postId.toString()}`;
        const now = new Date();

        const actorName = session.user.name ?? "Someone";
        const actorAvatar = `${process.env.R2_PUBLIC_URL}/avatars/${userId}.webp`;
        const preview = (updated.title ?? "").slice(0, 80).replace(/\n/g, " ");

        const notifResult = await notifications.updateOne(
          { userId: ownerObjId, groupKey, read: false },
          [
            {
              $set: {
                userId: { $ifNull: ["$userId", ownerObjId] },
                type: { $ifNull: ["$type", "post_like"] },
                postId: { $ifNull: ["$postId", postId] },
                groupKey: { $ifNull: ["$groupKey", groupKey] },
                read: { $ifNull: ["$read", false] },
                createdAt: { $ifNull: ["$createdAt", now] },
                actors: { $ifNull: ["$actors", []] },
                count: { $ifNull: ["$count", 0] },
              },
            },
            {
              $set: {
                _already: { $in: [actorObjId, "$actors"] },
              },
            },
            {
              $set: {
                actors: {
                  $cond: [
                    "$_already",
                    "$actors",
                    { $concatArrays: ["$actors", [actorObjId]] },
                  ],
                },
                count: {
                  $cond: ["$_already", "$count", { $add: ["$count", 1] }],
                },
                lastActorId: actorObjId,
                lastActorName: actorName,
                lastActorAvatar: actorAvatar,
                postPreview: preview,
                updatedAt: now,
              },
            },
            { $unset: "_already" },
          ] as any,
          { upsert: true }
        );

        emitNotification(postOwnerUid, {
          type: "post_like",
          postId: postId.toString(),
          actorId: userId,
          unreadDelta: notifResult.upsertedId ? 1 : 0,
        });
      }
    }

    /* --------------------------------------------------------
       🔊 SSE
    --------------------------------------------------------- */
    const payload = {
      postId: postId.toString(),
      userId,
      action,
      txId: txId ?? null,
      parentId: updated.parentId ?? null,
      replyTo: updated.replyTo ?? null,
    };

    broadcastSSE({ type: "upvote", ...payload });

    broadcastSSE({
      type: updated.replyTo
        ? "upvote-reply"
        : updated.parentId
        ? "upvote-comment"
        : "upvote-post",
      ...payload,
    });

    /* --------------------------------------------------------
       ✅ RESPONSE
    --------------------------------------------------------- */
    return NextResponse.json({
      ok: true,
      action,
      txId: txId ?? null,
      post: {
        _id: updated._id.toString(),
        upvoteCount: updated.upvoteCount,
        upvoters: updated.upvoters.map((id: ObjectId) => id.toString()),
      },
    });
  } catch (err) {
    console.error("❌ Upvote error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
