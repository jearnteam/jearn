// app/api/user/update/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Binary } from "mongodb";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const userId = form.get("userId") as string | null;
    const name = (form.get("name") as string | null) ?? "";
    const bio = (form.get("bio") as string | null) ?? "";
    const file = form.get("picture") as File | null;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    let pictureUpdate: any = {};

    // -------------------------------------------------
    // 🔥 PROCESS IMAGE (preserve PNG transparency)
    // -------------------------------------------------
    if (file && file.size > 0) {
      try {
        const inputBuffer = Buffer.from(await file.arrayBuffer());
        const mime = file.type;

        let processed: Buffer;
        let outputMime = mime; // keep original type unless JPEG

        const sharpImg = sharp(inputBuffer).trim();

        // Transparent PNG → KEEP PNG
        if (mime === "image/png") {
          processed = await sharpImg
            .resize(512, 512, {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 } // keep alpha
            })
            .png({ compressionLevel: 9 })
            .toBuffer();
        }

        // JPEG → process normally
        else {
          processed = await sharpImg
            .resize(512, 512, {
              fit: "cover",
              position: "center",
            })
            .jpeg({
              quality: 90,
              mozjpeg: true,
            })
            .toBuffer();

          outputMime = "image/jpeg";
        }

        pictureUpdate.picture = {
          data: new Binary(processed),
          contentType: outputMime,
          updatedAt: new Date(),
        };
      } catch (e) {
        console.error("🛑 sharp avatar error:", e);
      }
    }

    // -------------------------------------------------
    // 🔥 UPDATE USER
    // -------------------------------------------------
    const updateData: any = {
      name,
      bio,
      updatedAt: new Date(),
      ...pictureUpdate,
    };

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("🛑 /api/user/update unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
