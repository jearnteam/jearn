import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await getMongoClient();
    const db = client.db("jearn");

    const postsColl = db.collection("posts");

    const results = await postsColl
      .aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
      ])
      .toArray();

    const usage: Record<string, number> = {};
    results.forEach((item) => {
      usage[item._id] = item.count;
    });

    return NextResponse.json({ ok: true, usage });
  } catch (err) {
    console.error("❌ /api/tags/usage error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
