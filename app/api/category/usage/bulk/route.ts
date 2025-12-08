import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { categoryIds } = await req.json();

    // Expect ObjectId strings
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const ids = categoryIds.map((id) => new ObjectId(id));

    const client = await clientPromise;
    const db = client.db("jearn");

    // Count matching categories inside posts
    const results = await db
      .collection("posts")
      .aggregate([
        { $match: { categories: { $in: ids } } },
        { $unwind: "$categories" },
        { $match: { categories: { $in: ids } } },
        {
          $group: {
            _id: "$categories",
            count: { $sum: 1 }
          }
        }
      ])
      .toArray();

    // Build usage object EXACTLY as page expects
    const usage: Record<string, number> = {};
    results.forEach((r) => {
      usage[r._id.toString()] = r.count;
    });

    return NextResponse.json({ usage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
