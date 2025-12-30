// app/api/posts/[id]/upvote/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";
import { emitNotification } from "@/lib/notificationHub";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

type Body = {
  userId?: string;
  txId?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let postIdStr = "";

  try {
    /* --------------------------------------------------
     * PARAMS
     * -------------------------------------------------- */
    const { id } = await params;
    postIdStr = id;

    console.log("🔥 UPVOTE ROUTE HIT", postIdStr);

    if (!ObjectId.isValid(postIdStr)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    /* --------------------------------------------------
     * AUTH
     * -------------------------------------------------- */
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* --------------------------------------------------
     * BODY
     * -------------------------------------------------- */
    let body: Body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {}

    const { userId, txId } = body;

    if (!userId || userId !== session.user.uid) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    /* --------------------------------------------------
     * DB
     * -------------------------------------------------- */
    const client = await clientPromise;
    const db = client.db("jearn");
    const posts = db.collection("posts");
    const notifications = db.collection("notifications");

    const postId = new ObjectId(postIdStr);
    const actorObjId = new ObjectId(userId);

    /* --------------------------------------------------
     * UPVOTE TOGGLE
     * -------------------------------------------------- */
    const result = await posts.findOneAndUpdate(
      { _id: postId },
      [
        { $set: { upvoters: { $ifNull: ["$upvoters", []] }, upvoteCount: { $ifNull: ["$upvoteCount", 0] } } },
        { $set: { _already: { $in: [actorObjId, "$upvoters"] } } },
        {
          $set: {
            upvoters: {
              $cond: [
                "$_already",
                { $setDifference: ["$upvoters", [actorObjId]] },
                { $concatArrays: ["$upvoters", [actorObjId]] },
              ],
            },
            upvoteCount: {
              $cond: [
                "$_already",
                { $max: [{ $subtract: ["$upvoteCount", 1] }, 0] },
                { $add: ["$upvoteCount", 1] },
              ],
            },
          },
        },
        { $unset: "_already" },
      ],
      { returnDocument: "after" }
    );

    if (!result?.value) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updated = result.value;
    const action: "added" | "removed" = updated.upvoters?.some((id: ObjectId) =>
      id.equals(actorObjId)
    )
      ? "added"
      : "removed";

    /* --------------------------------------------------
     * 🔔 NOTIFICATION (ATOMIC, CORRECT)
     * -------------------------------------------------- */
    if (action === "added") {
      const authorRaw = updated.authorId;

      if (typeof authorRaw === "string" && ObjectId.isValid(authorRaw)) {
        const ownerObjId = new ObjectId(authorRaw);

        if (!ownerObjId.equals(actorObjId)) {
          const groupKey = `post_like:${postIdStr}`;
          const now = new Date();

          const actorName = session.user.name ?? "Someone";
          const actorAvatar = `${process.env.R2_PUBLIC_URL}/avatars/${userId}.webp`;
          const preview = (updated.title ?? "").slice(0, 80);

          const notifResult = await notifications.updateOne(
            { userId: ownerObjId, groupKey },
            [
              {
                $set: {
                  userId: ownerObjId,
                  type: "post_like",
                  postId,
                  groupKey,
                  createdAt: { $ifNull: ["$createdAt", now] },
                  actors: { $ifNull: ["$actors", []] },
                  count: { $ifNull: ["$count", 0] },
                  wasRead: "$read",
                },
              },
              { $set: { _already: { $in: [actorObjId, "$actors"] } } },
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
                  read: false,
                  lastActorId: actorObjId,
                  lastActorName: actorName,
                  lastActorAvatar: actorAvatar,
                  postPreview: preview,
                  updatedAt: now,
                },
              },
              { $unset: ["_already"] },
            ],
            { upsert: true }
          );

          emitNotification(ownerObjId.toString(), {
            type: "post_like",
            postId: postIdStr,
            actorId: userId,
            unreadDelta: notifResult.upsertedId ? 1 : 1,
          });
        }
      }
    }

    /* --------------------------------------------------
     * 🔊 SSE
     * -------------------------------------------------- */
    broadcastSSE({
      type: "upvote",
      postId: postIdStr,
      userId,
      action,
      txId: txId ?? null,
    });

    return NextResponse.json({
      ok: true,
      action,
      txId: txId ?? null,
      post: {
        _id: postIdStr,
        upvoteCount: updated.upvoteCount,
        upvoters: updated.upvoters?.map(String) ?? [],
      },
    });
  } catch (err) {
    console.error("❌ UPVOTE ROUTE ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
