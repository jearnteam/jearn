import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";
import clientPromise from "@/lib/mongodb";

/* -------------------------------------------------------------------------- */
/*                         Remove invisible Unicode chars                     */
/* -------------------------------------------------------------------------- */
function cleanInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u200B/g, "")       // ZWSP
    .replace(/\uFEFF/g, "")       // BOM
    .replace(/\u2060/g, "")       // Word joiner
    .replace(/\s+/g, " ")         // collapse whitespace
    .trim();
}

/* -------------------------------------------------------------------------- */
/*                                   Timeout                                   */
/* -------------------------------------------------------------------------- */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AI Timeout")), ms)
    ),
  ]);
}

/* -------------------------------------------------------------------------- */
/*                                   ROUTE                                     */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    let { content } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // ⭐ Clean input to avoid breaking AI
    content = cleanInput(content);

    // ---------------------------- DB Load ----------------------------------
    const client = await clientPromise;
    const db = client.db("jearn");
    const categoriesColl = db.collection("categories");

    const allCategories = await categoriesColl
      .find()
      .project({
        _id: 1,
        name: 1,
        jname: 1,
        myname: 1,
      })
      .toArray();

    // Map DB categories → lookup by lowercase
    const mapByName = new Map<string, any>();
    for (const cat of allCategories) {
      mapByName.set(cat.name.toLowerCase(), cat);
    }

    let aiResult: any[] = [];

    /* ---------------------------------------------------------------------- */
    /*                          Run AI Categorizer                             */
    /* ---------------------------------------------------------------------- */
    try {
      aiResult = await withTimeout<any[]>(categorize(content), 6000);

      if (!Array.isArray(aiResult)) {
        console.warn("⚠️ AI returned non-array:", aiResult);
        throw new Error("Invalid AI format");
      }
    } catch (err) {
      console.error("⚠️ AI failed, timeout, or bad JSON:", err);
      console.log("⚠️ Falling back to full category list with random scores");

      // FULL fallback list (shuffled)
      const shuffled = [...allCategories].sort(() => Math.random() - 0.5);

      const fallback = shuffled.map((cat) => ({
        id: cat._id.toString(),
        label: cat.name,
        jname: cat.jname,
        myname: cat.myname,
        score: 0,
      }));

      return NextResponse.json(fallback);
    }

    /* ---------------------------------------------------------------------- */
    /*                 VALIDATE & MAP AI RESULT TO DATABASE IDs               */
    /* ---------------------------------------------------------------------- */

    let enriched = aiResult
      .map((c) => {
        if (!c || typeof c !== "object") return null;

        const rawLabel = String(c.label || "").trim();
        if (!rawLabel) return null;

        const key = rawLabel.toLowerCase();
        const match = mapByName.get(key);

        if (!match) {
          console.warn("⚠️ AI output label not found in DB:", rawLabel);
          return null;
        }

        return {
          id: match._id.toString(),
          label: match.name,
          jname: match.jname,
          myname: match.myname,
          score: Number(c.score) || 0,
        };
      })
      .filter(Boolean);

    // ⭐ If AI returned unknown labels → fallback
    if (enriched.length === 0) {
      console.warn("⚠️ AI returned no valid categories → fallback to DB");

      enriched = allCategories.map((cat) => ({
        id: cat._id.toString(),
        label: cat.name,
        jname: cat.jname,
        myname: cat.myname,
        score: 0,
      }));
    }

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ Categorization API fatal error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
