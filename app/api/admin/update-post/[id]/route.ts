// app/api/admin/update-post/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  try {
    // 🔒 Validate ObjectId early
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid post id" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;

    const client = await getMongoClient();
    const db = client.db("jearn");

    // 🧹 Accept everything, but never allow _id overwrite
    const updateData: Record<string, unknown> = { ...body };
    delete updateData["_id"];

    // 🧹 Remove undefined fields
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }

    const result = await db
      .collection("posts")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: "after" }
      );

    // 🔒 Handle Mongo returning null
    if (!result || !result.value) {
      return NextResponse.json(
        { ok: false, error: "Post not found" },
        { status: 404 }
      );
    }

    const post = result.value;

    return NextResponse.json({
      ok: true,
      post: {
        ...post,
        _id: post._id.toString(),
      },
    });
  } catch (err) {
    console.error("❌ /api/admin/update-post error:", err);
    return NextResponse.json(
      { ok: false, error: "Update failed" },
      { status: 500 }
    );
  }
}
