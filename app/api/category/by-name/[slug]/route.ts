// app/api/category/by-name/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const client = await clientPromise;
    const db = client.db("jearn");

    const category = await db.collection("categories").findOne({
      name: decodeURIComponent(slug),
    });

    if (!category) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: category._id.toString(),
      name: category.name,
      jname: category.jname,
      myname: category.myname,
    });
  } catch (err) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
