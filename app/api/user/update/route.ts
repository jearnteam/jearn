import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, Binary } from "mongodb";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("📥 API /api/user/update called");

  try {
    const formData = await req.formData();
    const userId = formData.get("userId") as string;
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const pictureFile = formData.get("picture") as File | null;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const update: any = { name, bio, updatedAt: new Date() };

    if (pictureFile) {
      const arrayBuffer = await pictureFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 512 })
        .jpeg({ quality: 80 })
        .toBuffer();

      update.picture = new Binary(optimizedBuffer);
      update.pictureMime = "image/jpeg";
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: update }
    );

    // ✅ Return cache-busted URL
    return NextResponse.json({
      ok: true,
      picture: `/api/user/avatar/${userId}?t=${Date.now()}`,
    });
  } catch (err) {
    console.error("❌ Update failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
