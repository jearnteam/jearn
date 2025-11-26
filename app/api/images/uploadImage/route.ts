import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const imagesColl = db.collection("images");
    const id = new ObjectId();

    await imagesColl.insertOne({
      _id: id,
      data: bytes,
      type: file.type || "application/octet-stream",
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      id: id.toString(),
    });
  } catch (err) {
    console.error("🔥 Error in /api/uploadImage:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
