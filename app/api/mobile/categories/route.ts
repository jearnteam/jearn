import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("jearn");
    const cats = await db.collection("categories").find({}).toArray();
    return NextResponse.json(
      cats.map((c) => ({
        _id: c._id.toString(),
        label: c.label || c.name || "Unnamed",
      }))
    );
  } catch (err) {
    console.error("❌ GET /api/categories failed:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
