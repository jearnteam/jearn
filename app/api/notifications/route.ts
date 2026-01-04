import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db("jearn");

  const userId = new ObjectId(session.user.uid);

  const notifications = await db
    .collection("notifications")
    .aggregate([
      { $match: { userId } },

      // newest first
      { $sort: { updatedAt: -1 } },
      { $limit: 50 },

      // 🔹 get last actorId
      {
        $addFields: {
          lastActorId: { $arrayElemAt: ["$actorIds", -1] },
        },
      },

      // 🔹 join user (actor)
      {
        $lookup: {
          from: "users",
          localField: "lastActorId",
          foreignField: "_id",
          as: "actor",
        },
      },
      {
        $unwind: {
          path: "$actor",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 join post
      {
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "_id",
          as: "post",
        },
      },
      {
        $unwind: {
          path: "$post",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 FINAL SHAPE (THIS IS THE KEY)
      {
        $project: {
          _id: { $toString: "$_id" },
          type: 1,
          read: 1,
          count: 1,

          postId: { $toString: "$postId" },

          lastActorId: { $toString: "$lastActorId" },
          lastActorName: "$actor.name",
          lastActorAvatar: {
            $cond: [
              { $ifNull: ["$actor._id", false] },
              {
                $concat: [
                  "https://cdn.jearn.site/avatars/",
                  { $toString: "$actor._id" },
                  ".webp",
                  "?v=",
                  {
                    $toString: {
                      $toLong: "$actor.avatarUpdatedAt",
                    },
                  },
                ],
              },
              null,
            ],
          },

          postPreview: "$post.title",

          createdAt: 1,
          updatedAt: 1,
        },
      },
    ])
    .toArray();

  return Response.json(notifications);
}
