import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ count: 0 }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const count = await db.collection("posts").countDocuments({
      parentId: id,
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("❌ comment count error:", err);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
