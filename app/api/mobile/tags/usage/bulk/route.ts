import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { tags } = await req.json();

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const results = await db.collection("posts").aggregate([
      { $match: { tags: { $in: tags } } },
      { $unwind: "$tags" },
      { $match: { tags: { $in: tags } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } }
    ]).toArray();

    const usage: Record<string, number> = {};
    results.forEach(r => usage[r._id] = r.count);

    return NextResponse.json({ usage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
