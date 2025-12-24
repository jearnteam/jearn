// app/api/user/update/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

/* -------------------------------------------------
 * Cloudflare R2 client
 * ------------------------------------------------ */
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const form = await req.formData();

    const user_id_raw = form.get("user_id");
    const name_raw = form.get("name");
    const userId_raw = form.get("userId");
    const bio_raw = form.get("bio");
    const file = form.get("picture");

    if (typeof user_id_raw !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing user_id" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(user_id_raw)) {
      return NextResponse.json(
        { ok: false, error: "Invalid user_id" },
        { status: 400 }
      );
    }

    if (user_id_raw !== session.user.uid) {
      return NextResponse.json(
        { ok: false, error: "Incorrect user_id" },
        { status: 400 }
      );
    }

    const user_id = user_id_raw;
    const name = typeof name_raw === "string" ? name_raw : "";
    const userId = typeof userId_raw === "string" ? userId_raw : "";
    const bio = typeof bio_raw === "string" ? bio_raw : "";

    const client = await clientPromise;
    const db = client.db("jearn");

    /* -------------------------------------------------
     * Name & UserID validation
     * ------------------------------------------------ */
    if (name.length < 4 || name.length > 32) {
      return NextResponse.json(
        { ok: false, error: "Name must be 4–32 characters" },
        { status: 400 }
      );
    }

    const userIdUpdate: Record<string, unknown> = {};

    if (userId) {
      if (userId.length < 3 || userId.length > 32) {
        return NextResponse.json(
          { ok: false, error: "UserID must be 3–32 characters" },
          { status: 400 }
        );
      }

      const exists = await db.collection("users").findOne({
        userId,
        _id: { $ne: new ObjectId(user_id) },
      });

      if (exists) {
        return NextResponse.json(
          { ok: false, error: "UserID already taken" },
          { status: 400 }
        );
      }

      userIdUpdate.userId = userId;
    }

    /* -------------------------------------------------
     * Avatar upload → ALWAYS convert to WEBP
     * ------------------------------------------------ */
    const pictureUpdate: Record<string, unknown> = {};

    if (file instanceof File && file.size > 0) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());

        const processed = await sharp(buffer, { animated: true })
          .resize(256, 256, {
            fit: "cover",
            position: "center",
          })
          .webp({
            quality: 80,
            effort: 4,
            loop: 0,
          })
          .toBuffer();

        const avatarKey = `avatars/${user_id}.webp`;

        await r2.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: avatarKey,
            Body: processed,
            ContentType: "image/webp",
          })
        );

        const cdnBase = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");
        pictureUpdate.avatarUrl = `${cdnBase}/${avatarKey}`;
        pictureUpdate.avatarUpdatedAt = new Date();
      } catch (err) {
        console.error("Avatar upload error:", err);
      }
    }

    /* -------------------------------------------------
     * Update DB
     * ------------------------------------------------ */
    const updateData = {
      name,
      bio,
      updatedAt: new Date(),
      ...userIdUpdate,
      ...pictureUpdate,
    };

    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(user_id) },
        { $set: updateData }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("update error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
