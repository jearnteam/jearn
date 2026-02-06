import { NextResponse, type NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("❌ /api/admin/delete-post error:", err);
    return NextResponse.json(
      { ok: false, error: "Delete failed" },
      { status: 500 }
    );
  }
}
