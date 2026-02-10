// app/api/search/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchByPostType } from "../_utils";
import { PostTypes } from "@/types/post";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const cursor = searchParams.get("cursor") ?? undefined;

  if (q.length < 2) {
    return NextResponse.json({ posts: [], nextCursor: null });
  }

  return NextResponse.json(await searchByPostType(q, PostTypes.QUESTION, cursor));
}
