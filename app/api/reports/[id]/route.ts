// app/api/reports/[id]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

/* ---------------------------------------------------------
   PUT — Update report status
--------------------------------------------------------- */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  try {
    const { id } = await params; // ✅ FIXED

    const { status } = await req.json();

    if (!["pending", "reviewed", "ignored"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const reports = db.collection("reports");

    await reports.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    const updated = await reports.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true, report: updated });
  } catch (err) {
    console.error("❌ PUT /api/reports/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------------------------------------------------
   DELETE — Delete entire report group
--------------------------------------------------------- */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ FIXED

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const reports = db.collection("reports");

    const result = await reports.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /api/reports/[id] failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
