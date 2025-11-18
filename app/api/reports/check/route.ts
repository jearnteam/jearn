import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const userId = searchParams.get("userId");

    if (!postId || !userId) {
      return NextResponse.json(
        { alreadyReported: false, error: "Missing params" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const reports = db.collection("reports");

    const existing = await reports.findOne({
      postId: new ObjectId(postId),
    });

    // No report for this post yet?
    if (!existing) return NextResponse.json({ alreadyReported: false });

    const reporters = Array.isArray(existing.reporters)
      ? existing.reporters
      : [];

    const reported = reporters.some((r) => r.userId === userId);

    return NextResponse.json({ alreadyReported: reported });
  } catch (err) {
    console.error("❌ /api/reports/check failed:", err);
    return NextResponse.json(
      { alreadyReported: false, error: "Server error" },
      { status: 500 }
    );
  }
}
