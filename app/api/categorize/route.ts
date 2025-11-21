import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // 1) Run AI categorization (returns labels + score)
    const aiResult = await categorize(content);
    // aiResult = [{ label: "programming", score: 0.92 }, ...]

    // 2) MongoDB connect
    const client = await clientPromise;
    const db = client.db("jearn");
    const categoriesColl = db.collection("categories");

    // 3) Fetch all categories from DB once
    const allCategories = await categoriesColl.find().toArray();

    // 4) Map AI labels → category_id
    const enriched = aiResult
      .map((c: any) => {
        const match = allCategories.find((cat) => cat.name === c.label);

        if (!match) return null;

        return {
          id: match._id.toString(),
          label: match.name,
          jname: match.jname,
          score: c.score,
        };
      })
      .filter(Boolean);

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ Categorization API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
