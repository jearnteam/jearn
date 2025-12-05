import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { categories } = await req.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    /* 1️⃣ Find category documents from names */
    const categoryDocs = await db
      .collection("categories")
      .find({ name: { $in: categories } })
      .project({ _id: 1, name: 1 })
      .toArray();

    if (categoryDocs.length === 0) {
      return NextResponse.json({ usage: {} });
    }

    /* Map names to ObjectId */
    const idMap = Object.fromEntries(
      categoryDocs.map((c) => [c._id.toString(), c.name])
    );

    const categoryIds = categoryDocs.map((c) => c._id);

    /* 2️⃣ Count usage inside posts */
    const results = await db
      .collection("posts")
      .aggregate([
        {
          $match: { categories: { $in: categoryIds } }
        },
        { $unwind: "$categories" },
        {
          $match: { categories: { $in: categoryIds } }
        },
        {
          $group: {
            _id: "$categories",
            count: { $sum: 1 }
          }
        }
      ])
      .toArray();

    /* 3️⃣ Convert ObjectId → category name */
    const usage: Record<string, number> = {};
    results.forEach((r) => {
      const name = idMap[r._id.toString()];
      if (name) usage[name] = r.count;
    });

    return NextResponse.json({ usage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
