import { NextResponse, type NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("jearn");

    await db.collection("posts").deleteOne({
      _id: new ObjectId(params.id),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ /api/admin/delete-post error:", err);
    return NextResponse.json(
      { ok: false, error: "Delete failed" },
      { status: 500 }
    );
  }
}
