//@/app/api/admin/all-posts/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("jearn");

    const posts = await db
      .collection("posts")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(posts);
  } catch (err) {
    console.error("❌ /api/admin/all-posts error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
