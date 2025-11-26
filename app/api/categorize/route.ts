import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";
import clientPromise from "@/lib/mongodb";

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AI Timeout")), ms)
    ),
  ]);
}

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // Connect DB
    const client = await clientPromise;
    const db = client.db("jearn");
    const categoriesColl = db.collection("categories");

    // Fetch all categories once
    const allCategories = await categoriesColl
      .find()
      .project({
        _id: 1,
        name: 1,
        jname: 1,
        myname: 1,
      })
      .toArray();

    let aiResult: any[] = [];

    try {
      // AI must finish in 5 seconds
      aiResult = await withTimeout<any[]>(categorize(content), 5000);
    } catch (err) {
      console.warn("⚠️ AI slow or failed → FULL fallback category list");

      // 🔥 FULL fallback list (shuffled), not just 5
      const shuffled = [...allCategories].sort(() => Math.random() - 0.5);

      const fallback = shuffled.map((cat) => ({
        id: cat._id.toString(),
        label: cat.name,
        jname: cat.jname,
        myname: cat.myname,
        score: 0, // give each random score
      }));

      return NextResponse.json(fallback);
    }

    // ---------------------------
    // AI SUCCESS → map labels
    // ---------------------------

    const enriched = aiResult
      .map((c: any) => {
        const match = allCategories.find((cat) => cat.name === c.label);
        if (!match) return null;

        return {
          id: match._id.toString(),
          label: match.name,
          jname: match.jname,
          myname: match.myname,
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
