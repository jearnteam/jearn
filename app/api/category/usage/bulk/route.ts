import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type RequestBody = {
  categories?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!Array.isArray(body.categories)) {
      return NextResponse.json({ usage: {} });
    }

    const categoryNames: string[] = body.categories.filter(
      (c): c is string => typeof c === "string"
    );

    if (categoryNames.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    // 🔎 Step 1: Convert names → ObjectIds
    const categoryDocs = await db
      .collection("categories")
      .find({ name: { $in: categoryNames } })
      .toArray();

    if (categoryDocs.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const idMap = new Map<string, ObjectId>();
    categoryDocs.forEach((cat) => {
      idMap.set(cat.name, cat._id);
    });

    const ids = categoryDocs.map((cat) => cat._id);

    // 🔎 Step 2: Count posts referencing those category IDs
    const results = await db
      .collection("posts")
      .aggregate<{ _id: ObjectId; count: number }>([
        { $unwind: "$categories" },
        { $match: { categories: { $in: ids } } },
        {
          $group: {
            _id: "$categories",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // 🔄 Step 3: Convert ObjectId results back to category name keys
    const usage: Record<string, number> = {};

    results.forEach((r) => {
      const categoryName = categoryDocs.find((c) =>
        c._id.equals(r._id)
      )?.name;

      if (categoryName) {
        usage[categoryName] = r.count;
      }
    });

    return NextResponse.json({ usage });
  } catch (err) {
    console.error("❌ category usage error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
