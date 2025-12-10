import { NextResponse, type NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db("jearn");

    // 全てを受け入れる
    const updateData: any = body;
    delete updateData["_id"];
    /*const updateData: any = {
      title: body.title,
      content: body.content,
      categories: body.categories ?? [],
      updatedAt: new Date(),
    };*/

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const updated = await db.collection("posts").findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    return NextResponse.json({ ok: true, post: updated });
  } catch (err) {
    console.error("❌ /api/admin/update-post error:", err);
    return NextResponse.json(
      { ok: false, error: "Update failed" },
      { status: 500 }
    );
  }
}
