// app/api/reports/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ---------------------------------------------------------
   GET — Fetch ALL reports
--------------------------------------------------------- */
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("jearn");
    const reports = db.collection("reports");

    const docs = await reports.find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(docs);
  } catch (err) {
    console.error("❌ GET /api/reports error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------------------------------------------------
   POST — Create / Merge Report
   - one report per post
   - reporters[] array
   - prevent duplicate report from same user
--------------------------------------------------------- */
/* ---------- POST: Create or append a report ---------- */
export async function POST(req: Request) {
  try {
    const { postId, reporterId, reason } = await req.json();

    if (!postId || !reporterId || !reason)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("jearn");
    const reports = db.collection("reports");

    // 🔍 Check if report exists for that post
    const existing = await reports.findOne({ postId });

    if (!existing) {
      // FIRST report for this post
      const doc = {
        postId,
        status: "pending",
        reporters: [
          {
            userId: reporterId,
            reason: reason.trim(),
            date: new Date(),
          },
        ],
        createdAt: new Date(),
      };

      const result = await reports.insertOne(doc);

      return NextResponse.json({
        ok: true,
        report: { ...doc, _id: result.insertedId.toString() },
      });
    }

    // 🔥 If this user already reported → reject with 409
    if (existing.reporters.some((r: any) => r.userId === reporterId)) {
      return NextResponse.json(
        { error: "Already reported by this user" },
        { status: 409 }
      );
    }

    // Otherwise → push as a new reporter
    await reports.updateOne(
      { _id: existing._id },
      {
        $push: {
          reporters: {
            userId: reporterId,
            reason: reason.trim(),
            date: new Date(),
          },
        } as any,
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ POST /api/reports error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
