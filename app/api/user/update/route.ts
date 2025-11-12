import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get("userId") as string;
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const picture = formData.get("picture") as File | null;

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const users = db.collection("users");

    const updateData: any = {
      name,
      bio,
      updatedAt: new Date(),
    };

    // ✅ Save picture to DB if uploaded
    if (picture) {
      const buffer = Buffer.from(await picture.arrayBuffer());
      updateData.picture = buffer;
    }

    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (!result.matchedCount) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Update error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
