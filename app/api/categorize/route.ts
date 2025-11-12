// app/api/categorize/route.ts
import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";

/**
 * POSTメソッドでのリクエストを受けとり、
 * 与えられた文章をAIでカテゴライズする
 * @body { content: string }
 * @returns [{"label": string, "score": number}] or {error: string}
 */
export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const result = await categorize(content);
    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ Categorization API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
