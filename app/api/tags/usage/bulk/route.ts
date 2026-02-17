import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    let body: any = {};

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ usage: {} });
    }

    const tags = Array.isArray(body?.tags)
      ? body.tags.filter((t: unknown): t is string => typeof t === "string")
      : [];

    if (tags.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const results = await db.collection("posts").aggregate([
      { $match: { tags: { $in: tags } } },
      { $unwind: "$tags" },
      { $match: { tags: { $in: tags } } },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const usage: Record<string, number> = {};
    for (const r of results) {
      if (typeof r._id === "string") {
        usage[r._id] = r.count ?? 0;
      }
    }

    return NextResponse.json({ usage });
  } catch (err) {
    console.error("❌ tag usage error:", err);
    return NextResponse.json({ usage: {} }); // NEVER crash graph
  }
}
