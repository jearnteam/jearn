import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("jearn");

    const postsColl = db.collection("posts");

    const results = await postsColl
      .aggregate([
        { $unwind: "$categories" },
        { $group: { _id: "$categories", count: { $sum: 1 } } },
      ])
      .toArray();

    // Convert to nicer object
    const usage: Record<string, number> = {};
    results.forEach((item) => {
      usage[item._id] = item.count;
    });

    return NextResponse.json({ ok: true, usage });
  } catch (err) {
    console.error("❌ /api/categories/usage error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
