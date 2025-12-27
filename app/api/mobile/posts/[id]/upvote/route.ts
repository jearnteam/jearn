// app/api/posts/[id]/upvote/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { emitNotification } from "@/lib/notificationHub";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    /* --------------------------------------------------------
       AUTH
    --------------------------------------------------------- */
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const body: { userId?: string; txId?: string | null } = await req.json();
    const { userId, txId } = body;

    if (!userId || userId !== session.user.uid) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    /* --------------------------------------------------------
       SETUP
    --------------------------------------------------------- */
    const postId = new ObjectId(id);
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

    if (!result || !result.value) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updated = result.value;

    const upvoters = Array.isArray(updated.upvoters)
      ? (updated.upvoters as ObjectId[])
      : [];

    const action: "added" | "removed" = upvoters.some((oid) =>
      oid.equals(actorObjId)
    )
      ? "added"
      : "removed";

    /* --------------------------------------------------------
       🔔 GROUPED LIKE NOTIFICATION
    --------------------------------------------------------- */
    if (action === "added") {
      const postOwnerUid = updated.authorId;

      if (
        typeof postOwnerUid === "string" &&
        ObjectId.isValid(postOwnerUid) &&
        postOwnerUid !== userId
      ) {
        const ownerObjId = new ObjectId(postOwnerUid);
        const groupKey = `post_like:${postId.toString()}`;
        const now = new Date();

        const actorName = session.user.name ?? "Someone";
        const actorAvatar = `${process.env.R2_PUBLIC_URL}/avatars/${userId}.webp`;
        const preview = (updated.title ?? "").slice(0, 80).replace(/\n/g, " ");

        const pipeline = [
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
        ];

        const notifResult = await notifications.updateOne(
          { userId: ownerObjId, groupKey, read: false },
          pipeline as unknown as object[],
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
      parentId: typeof updated.parentId === "string" ? updated.parentId : null,
      replyTo: typeof updated.replyTo === "string" ? updated.replyTo : null,
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
        upvoters: upvoters.map((oid) => oid.toString()),
      },
    });
  } catch (err) {
    console.error("❌ Upvote error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
