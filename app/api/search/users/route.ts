import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { makeSafeRegex } from "../_utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const client = await clientPromise;
  const db = client.db("jearn");
  const usersColl = db.collection("users");

  const regex = makeSafeRegex(q);

  const users = await usersColl
    .aggregate([
      {
        $match: {
          $or: [{ uniqueId: regex }, { name: regex }],
        },
      },
      {
        $addFields: {
          _priority: {
            $cond: [
              { $regexMatch: { input: "$uniqueId", regex } },
              0,
              1,
            ],
          },
        },
      },
      {
        $sort: {
          _priority: 1,
          name: 1,
        },
      },
      {
        $limit: 20,
      },
      {
        $project: {
          name: 1,
          uniqueId: 1,
          avatarUpdatedAt: 1,
          bio: 1,
        },
      },
    ])
    .toArray();

  return NextResponse.json({
    users: users.map((u: any) => ({
      _id: u._id.toString(),
      name: u.name ?? "Unknown",
      uniqueId: u.uniqueId ?? null,
      bio: u.bio ?? "",
      picture: `https://cdn.jearn.site/avatars/${u._id}.webp${
        u.avatarUpdatedAt ? `?t=${new Date(u.avatarUpdatedAt).getTime()}` : ""
      }`,
    })),
  });
}
