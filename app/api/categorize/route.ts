import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";
import clientPromise from "@/lib/mongodb";

/* -------------------------------------------------------------------------- */
/*                         Remove invisible Unicode chars                      */
/* -------------------------------------------------------------------------- */
function cleanInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u200B/g, "") // ZWSP
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\u2060/g, "") // Word joiner
    .replace(/\s+/g, " ")
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
/*                                   Types                                     */
/* -------------------------------------------------------------------------- */
type DbCategory = {
  _id: { toString(): string };
  name: string;
  jname?: string;
  myname?: string;
};

type AiCategory = {
  label?: unknown;
  score?: unknown;
};

type EnrichedCategory = {
  id: string;
  label: string;
  jname?: string;
  myname?: string;
  score: number;
};

/* -------------------------------------------------------------------------- */
/*                                   ROUTE                                     */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("content" in body) ||
      typeof (body as { content?: unknown }).content !== "string"
    ) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const content = cleanInput(
      (body as { content: string }).content
    );

    /* ---------------------------- DB Load ---------------------------------- */
    const client = await clientPromise;
    const db = client.db("jearn");
    const categoriesColl = db.collection("categories");

    const allCategories = (await categoriesColl
      .find()
      .project({
        _id: 1,
        name: 1,
        jname: 1,
        myname: 1,
      })
      .toArray()) as DbCategory[];

    /* -------- Map DB categories by lowercase name -------- */
    const mapByName = new Map<string, DbCategory>();
    for (const cat of allCategories) {
      mapByName.set(cat.name.toLowerCase(), cat);
    }

    let aiResult: unknown[] = [];

    /* ----------------------- Run AI Categorizer ---------------------------- */
    try {
      const result = await withTimeout(categorize(content), 6000);

      if (!Array.isArray(result)) {
        throw new Error("Invalid AI format");
      }

      aiResult = result;
    } catch (err) {
      console.error("⚠️ AI failed, timeout, or bad JSON:", err);

      const fallback: EnrichedCategory[] = allCategories.map((cat) => ({
        id: cat._id.toString(),
        label: cat.name,
        jname: cat.jname,
        myname: cat.myname,
        score: 0,
      }));

      return NextResponse.json(fallback);
    }

    /* ---------------- Map AI result → DB categories ------------------------ */
    const enriched: EnrichedCategory[] = aiResult
      .map((c): EnrichedCategory | null => {
        if (!c || typeof c !== "object") return null;

        const { label, score } = c as AiCategory;

        if (typeof label !== "string") return null;

        const key = label.trim().toLowerCase();
        const match = mapByName.get(key);
        if (!match) return null;

        return {
          id: match._id.toString(),
          label: match.name,
          jname: match.jname,
          myname: match.myname,
          score: typeof score === "number" ? score : 0,
        };
      })
      .filter((c): c is EnrichedCategory => c !== null);

    /* ---------------- AI returned nothing usable → fallback ---------------- */
    if (enriched.length === 0) {
      const fallback: EnrichedCategory[] = allCategories.map((cat) => ({
        id: cat._id.toString(),
        label: cat.name,
        jname: cat.jname,
        myname: cat.myname,
        score: 0,
      }));

      return NextResponse.json(fallback);
    }

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ Categorization API fatal error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
