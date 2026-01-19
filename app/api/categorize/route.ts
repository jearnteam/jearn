import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";
import clientPromise from "@/lib/mongodb";

/* Clean invisible chars */
function cleanInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u200B/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/\u2060/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* 🧠 Strip HTML tags for ML */
function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Timeout wrapper */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AI Timeout")), ms)
    ),
  ]);
}

type DbCategory = {
  _id: { toString(): string };
  name: string;
  jname?: string;
  myname?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const cleaned = cleanInput(body.content);
    const textOnly = stripHTML(cleaned);   // ✅ critical fix

    /* load DB categories for fallback only */
    const client = await clientPromise;
    const db = client.db("jearn");
    const allCategories = (await db.collection("categories")
      .find()
      .project({ _id: 1, name: 1, jname: 1, myname: 1 })
      .toArray()) as DbCategory[];

    try {
      const ai = await withTimeout(categorize(textOnly), 6000);
      return NextResponse.json(ai);
    } catch (err) {
      console.error("⚠️ AI failed:", err);

      const fallback = allCategories.map((c) => ({
        id: c._id.toString(),
        label: c.name,
        jname: c.jname,
        myname: c.myname,
        score: 0,
      }));

      return NextResponse.json(fallback);
    }
  } catch (err) {
    console.error("❌ Fatal categorize route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
