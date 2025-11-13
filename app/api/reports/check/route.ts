import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  const userId = searchParams.get("userId");

  if (!postId || !userId) {
    return NextResponse.json({ alreadyReported: false });
  }

  const client = await clientPromise;
  const db = client.db("jearn");
  const reports = db.collection("reports");

  const existing = await reports.findOne({ postId });

  if (!existing) {
    return NextResponse.json({ alreadyReported: false });
  }

  const reported = existing.reporters?.some((r: any) => r.userId === userId);

  return NextResponse.json({ alreadyReported: reported });
}
