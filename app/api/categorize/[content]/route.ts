import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";

/**
 * GETメソッドでのリクエストを受けとり、
 * 与えられた文字列をcategoriesコレクションで定義されたカテゴリーでカテゴライズする
 * @param req
 * @param content カテゴライズ対象の文章
 * @returns [{"label": string, "score": number}] or {error: string}
 */
export async function GET(
  req: Request,
  { params }: { params: { content: string } }
) {
  const { content } = params;
  const result = await categorize(content);
  return NextResponse.json(result);
}
