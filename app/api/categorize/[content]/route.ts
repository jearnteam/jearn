import { NextResponse } from "next/server";
import { categorize } from "@/features/categorize/services/categorize";

export async function GET(
  req: Request,
  { params }: { params: { content: string } }
) {
  const { content } = params;
  const result = await categorize(content); // important: await here!
  return NextResponse.json(result);
}
