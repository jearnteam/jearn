import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(_req: Request, { params }: any) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return new NextResponse("Invalid image ID", { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const imagesColl = db.collection("images");

    const img = await imagesColl.findOne({ _id: new ObjectId(id) });
    if (!img) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(img.data.buffer, {
      headers: {
        "Content-Type": img.type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("🔥 Error in /api/image/[id]:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
