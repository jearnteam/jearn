// app/api/posts/[id]/upvote/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { emitNotification } from "@/lib/notificationHub";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { userId, txId } = await req.json();
    const postId = await params.id;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (userId !== session.user.uid) {
      return NextResponse.json({ error: "Incorrect userId" }, { status: 400 });
    }
    if (!ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const posts = db.collection("posts");
    const notifications = db.collection("notifications");

    const _id = new ObjectId(postId);
    const post = await posts.findOne({ _id });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const already =
      Array.isArray(post.upvoters) && post.upvoters.includes(userId);

    const action: "added" | "removed" = already ? "removed" : "added";

    /* --------------------------------------------------------
       APPLY UPVOTE UPDATE
    --------------------------------------------------------- */
    await posts.updateOne(
      { _id },
      already
        ? { $pull: { upvoters: userId }, $inc: { upvoteCount: -1 } }
        : { $addToSet: { upvoters: userId }, $inc: { upvoteCount: 1 } }
    );

    const updated = await posts.findOne({ _id });

    const actorName = session.user.name ?? "Someone";
    const actorAvatar = `${process.env.R2_PUBLIC_URL}/avatars/${userId}.webp`;

    const preview = (post.title ?? "").slice(0, 80).replace(/\n/g, " ");

    /* --------------------------------------------------------
   🔔 GROUPED LIKE NOTIFICATION
    --------------------------------------------------------- */
    if (action === "added") {
      const postOwnerUid = post.authorId;

      if (postOwnerUid && postOwnerUid !== userId) {
        const groupKey = `post_like:${postId}`;
        const actorObjId = new ObjectId(userId);
        const ownerObjId = new ObjectId(postOwnerUid);
        const now = new Date();

        // Only group while unread; if read=true exists, upsert will create a new unread doc
        const result = await notifications.updateOne(
          { userId: ownerObjId, groupKey, read: false },
          [
            {
              $set: {
                userId: { $ifNull: ["$userId", ownerObjId] },
                type: { $ifNull: ["$type", "post_like"] },
                postId: { $ifNull: ["$postId", _id] },
                groupKey: { $ifNull: ["$groupKey", groupKey] },
                read: { $ifNull: ["$read", false] },
                createdAt: { $ifNull: ["$createdAt", now] },
                actors: { $ifNull: ["$actors", []] },
                count: { $ifNull: ["$count", 0] },
              },
            },
            {
              $set: {
                // if actor already exists, keep actors + count
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

        // If it inserted a brand-new unread notification doc, unread count +1
        const unreadDelta = result.upsertedId ? 1 : 0;

        emitNotification(postOwnerUid, {
          type: "post_like",
          postId,
          actorId: userId,
          unreadDelta,
        });
      }
    }

    /* --------------------------------------------------------
       🔊 EXISTING POST / GRAPH SSE (UNCHANGED)
    --------------------------------------------------------- */
    const payload = {
      postId,
      userId,
      action,
      txId: txId ?? null,
      parentId: updated?.parentId ?? null,
      replyTo: updated?.replyTo ?? null,
    };

    broadcastSSE({ type: "upvote", ...payload });

    const type = updated?.replyTo
      ? "upvote-reply"
      : updated?.parentId
      ? "upvote-comment"
      : "upvote-post";

    broadcastSSE({ type, ...payload });

    /* --------------------------------------------------------
       ✅ RETURN UPDATED OBJECT (FOR GRAPHVIEW)
    --------------------------------------------------------- */
    return NextResponse.json({
      ok: true,
      action,
      txId: txId ?? null,
      comment: {
        _id: updated!._id.toString(),
        content: updated!.content ?? "",
        authorName: updated!.authorName ?? "",
        createdAt: updated!.createdAt ?? "",
        upvoteCount: updated!.upvoteCount ?? 0,
        upvoters: updated!.upvoters ?? [],
      },
    });
  } catch (err) {
    console.error("❌ Upvote error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
