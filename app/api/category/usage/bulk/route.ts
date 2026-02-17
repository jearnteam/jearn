import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    let body: any = {};

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ usage: {} });
    }

    const categoryNames = Array.isArray(body?.categories)
      ? body.categories.filter((c: unknown): c is string => typeof c === "string")
      : [];

    if (categoryNames.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const categoryDocs = await db
      .collection("categories")
      .find({ name: { $in: categoryNames } })
      .project({ _id: 1, name: 1 })
      .toArray();

    if (categoryDocs.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const ids = categoryDocs.map((c) => c._id);

    const results = await db.collection("posts").aggregate([
      { $unwind: "$categories" },
      { $match: { categories: { $in: ids } } },
      {
        $group: {
          _id: "$categories",
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const idToName = new Map(
      categoryDocs.map((c) => [c._id.toString(), c.name])
    );

    const usage: Record<string, number> = {};

    for (const r of results) {
      const name = idToName.get(r._id.toString());
      if (name) {
        usage[name] = r.count ?? 0;
      }
    }

    return NextResponse.json({ usage });
  } catch (err) {
    console.error("❌ category usage error:", err);
    return NextResponse.json({ usage: {} });
  }
}
