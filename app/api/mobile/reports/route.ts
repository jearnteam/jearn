// app/api/reports/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId, WithId, Document } from "mongodb";

export const runtime = "nodejs";

/* ---------------------------------------------------------
 * Types
 * ------------------------------------------------------- */
type ReporterEntry = {
  userId: string;
  reason: string;
  date: Date;
};

type ReportDoc = {
  postId: string;
  status: "pending" | "resolved" | "rejected";
  reporters: ReporterEntry[];
  createdAt: Date;
};

/* ---------------------------------------------------------
 * GET — Fetch ALL reports
 * ------------------------------------------------------- */
export async function GET() {
  // TODO: add auth (admin)
  try {
    const client = await clientPromise;
    const db = client.db("jearn");
    const reports = db.collection<ReportDoc>("reports");

    const docs = await reports.find({}).sort({ createdAt: -1 }).toArray();

    // Normalize _id for client safety
    const normalized = docs.map((d: WithId<ReportDoc>) => ({
      ...d,
      _id: d._id.toString(),
    }));

    return NextResponse.json(normalized);
  } catch (err) {
    console.error("❌ GET /api/reports error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------------------------------------------------
 * POST — Create / Merge Report
 * ------------------------------------------------------- */
type CreateReportBody = {
  postId: string;
  reporterId: string;
  reason: string;
};

function isCreateReportBody(body: unknown): body is CreateReportBody {
  if (!body || typeof body !== "object") return false;

  const b = body as Record<string, unknown>;

  return (
    typeof b.postId === "string" &&
    typeof b.reporterId === "string" &&
    typeof b.reason === "string"
  );
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isCreateReportBody(body)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { postId, reporterId, reason } = body;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return NextResponse.json({ error: "Reason required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const reports = db.collection<ReportDoc>("reports");

    const existing = await reports.findOne({ postId });

    if (!existing) {
      const doc: ReportDoc = {
        postId,
        status: "pending",
        reporters: [
          {
            userId: reporterId,
            reason: trimmedReason,
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

    if (existing.reporters.some((r) => r.userId === reporterId)) {
      return NextResponse.json(
        { error: "Already reported by this user" },
        { status: 409 }
      );
    }

    await reports.updateOne(
      { _id: existing._id },
      {
        $push: {
          reporters: {
            userId: reporterId,
            reason: trimmedReason,
            date: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ POST /api/reports error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
