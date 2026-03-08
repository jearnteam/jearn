import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const categoryIds = Array.isArray(body?.categoryIds)
      ? body.categoryIds
          .filter((id: unknown): id is string => typeof id === "string")
          .map((id: string) => new ObjectId(id))
      : [];

    if (categoryIds.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const client = await getMongoClient();
    const db = client.db("jearn");

    const results = await db
      .collection("posts")
      .aggregate([
        { $unwind: "$categories" },
        { $match: { categories: { $in: categoryIds } } },
        {
          $group: {
            _id: "$categories",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const usage: Record<string, number> = {};

    for (const r of results) {
      usage[r._id.toString()] = r.count ?? 0;
    }

    return NextResponse.json({ usage });
  } catch (err) {
    console.error("❌ category usage error:", err);
    return NextResponse.json({ usage: {} });
  }
}
