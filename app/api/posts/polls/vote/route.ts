import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId, optionId } = await req.json();
  if (!ObjectId.isValid(postId) || !optionId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const userId = session.user.uid;
  const postObjectId = new ObjectId(postId);

  const client = await clientPromise;
  const db = client.db("jearn");
  const posts = db.collection("posts");

  const post = await posts.findOne(
    { _id: postObjectId },
    { projection: { poll: 1 } }
  );

  if (!post?.poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const { allowMultiple, expiresAt, votes = {} } = post.poll;

  if (expiresAt && Date.now() > new Date(expiresAt).getTime()) {
    return NextResponse.json({ error: "Poll expired" }, { status: 403 });
  }

  /* ─────────────────────────────────────────────
   * NORMALIZE PREVIOUS VOTES
   * ───────────────────────────────────────────── */
  const prevVotes: string[] = Array.isArray(votes[userId])
    ? votes[userId]
    : typeof votes[userId] === "string"
    ? [votes[userId]]
    : [];

  const hasVotedThis = prevVotes.includes(optionId);

  /* ─────────────────────────────────────────────
   * MULTIPLE CHOICE
   * ───────────────────────────────────────────── */
  if (allowMultiple) {
    if (hasVotedThis) {
      // prevent double-unvote corruption
      if (prevVotes.length > 0) {
        const isLastVote = prevVotes.length === 1;

        await posts.updateOne(
          { _id: postObjectId },
          {
            $inc: {
              "poll.options.$[opt].voteCount": -1,
              ...(isLastVote ? { "poll.totalVotes": -1 } : {}),
            },
            $pull: {
              [`poll.votes.${userId}`]: optionId,
            },
          },
          { arrayFilters: [{ "opt.id": optionId }] }
        );
      }
    } else {
      const isFirstVote = prevVotes.length === 0;

      await posts.updateOne(
        { _id: postObjectId },
        {
          $inc: {
            "poll.options.$[opt].voteCount": 1,
            ...(isFirstVote ? { "poll.totalVotes": 1 } : {}),
          },
          $addToSet: {
            [`poll.votes.${userId}`]: optionId,
          },
        },
        { arrayFilters: [{ "opt.id": optionId }] }
      );
    }
  }

  /* ─────────────────────────────────────────────
   * SINGLE CHOICE
   * ───────────────────────────────────────────── */
  else {
    const prev = prevVotes[0];

    // unvote
    if (prev === optionId) {
      await posts.updateOne(
        { _id: postObjectId },
        {
          $inc: {
            "poll.options.$[opt].voteCount": -1,
            "poll.totalVotes": -1,
          },
          $unset: {
            [`poll.votes.${userId}`]: "",
          },
        },
        { arrayFilters: [{ "opt.id": optionId }] }
      );
    }

    // vote or switch
    else {
      const ops: any = {
        $inc: {
          "poll.options.$[new].voteCount": 1,
        },
        $set: {
          [`poll.votes.${userId}`]: optionId,
        },
      };

      if (prev) {
        ops.$inc["poll.options.$[old].voteCount"] = -1;
      } else {
        ops.$inc["poll.totalVotes"] = 1;
      }

      await posts.updateOne(
        { _id: postObjectId },
        ops,
        {
          arrayFilters: [
            { "new.id": optionId },
            ...(prev ? [{ "old.id": prev }] : []),
          ],
        }
      );
    }
  }

  /* ─────────────────────────────────────────────
   * ALWAYS RETURN FRESH STATE
   * ───────────────────────────────────────────── */
  const fresh = await posts.findOne(
    { _id: postObjectId },
    { projection: { poll: 1 } }
  );

  const rawVote = fresh?.poll?.votes?.[userId];
  const votedOptionIds = Array.isArray(rawVote)
    ? rawVote
    : typeof rawVote === "string"
    ? [rawVote]
    : [];

  return NextResponse.json({
    ok: true,
    poll: fresh?.poll,
    votedOptionIds,
  });
}
