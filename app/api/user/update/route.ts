// app/api/user/update/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Binary } from "mongodb";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    /** _id (ObjectId) */
    const user_id = form.get("user_id") as string | null;
    const name = (form.get("name") as string | null) ?? "";
    /** userId (@userId) */
    const userId = (form.get("userId") as string | null) ?? "";
    const bio = (form.get("bio") as string | null) ?? "";
    const file = form.get("picture") as File | null;

    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "Missing user_id" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    // -------------------------------------------------
    // 🔥 VALIDATE & CHECK UNIQUE USERID
    // -------------------------------------------------
    if (name.length < 4 || name.length > 32) {
      return NextResponse.json(
        { ok: false, error: "Name must be between 4 and 32 characters" },
        { status: 400 }
      );
    }

    let userIdUpdate: any = {};
    if (userId) {
      // 文字数制限チェック (3文字以上32文字以下)
      if (userId.length < 3 || userId.length > 32) {
        return NextResponse.json(
          { ok: false, error: "UserID must be between 3 and 32 characters" },
          { status: 400 }
        );
      }

      // 重複チェック (自分自身以外のユーザーで同じuserIdを持つものがいるか)
      const existingUser = await db.collection("users").findOne({
        userId: userId,
        _id: { $ne: new ObjectId(user_id) },
      });

      if (existingUser) {
        return NextResponse.json(
          { ok: false, error: "UserID is already taken" },
          { status: 400 }
        );
      }

      userIdUpdate.userId = userId;
    }

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
              background: { r: 0, g: 0, b: 0, alpha: 0 }, // keep alpha
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
      ...userIdUpdate,
      ...pictureUpdate,
    };

    const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(user_id) }, { $set: updateData });

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
