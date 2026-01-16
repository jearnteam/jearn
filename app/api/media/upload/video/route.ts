// app/api/media/upload/video/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import crypto from "crypto";

export const runtime = "nodejs";

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
    /* ------------------------------ AUTH ------------------------------ */
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ------------------------------ FORM ------------------------------ */
    const form = await req.formData();
    const fileEntry = form.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "Missing video file" },
        { status: 400 }
      );
    }

    const file = fileEntry;

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Invalid video type" },
        { status: 400 }
      );
    }

    // ⚠️ For now: load into memory (OK for v1, limit size later)
    const buffer = Buffer.from(await file.arrayBuffer());

    const id = crypto.randomUUID();
    const ext = file.type.split("/")[1] || "mp4";
    const key = `videos/${id}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const CDN = process.env.R2_PUBLIC_URL!;
    const url = `${CDN}/${key}`;

    return NextResponse.json({
      ok: true,
      url,
      // placeholders for now
      duration: null,
      aspectRatio: null,
      thumbnailUrl: null,
    });
  } catch (err) {
    console.error("🔥 Video upload error:", err);
    return NextResponse.json(
      { error: "Video upload failed" },
      { status: 500 }
    );
  }
}
