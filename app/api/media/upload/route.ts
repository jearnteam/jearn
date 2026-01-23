import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
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
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const fileEntry = form.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 },
      );
    }

    const file = fileEntry;
    const mime = file.type;

    if (!mime.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Invalid type" },
        { status: 400 },
      );
    }

    const isGIF = mime === "image/gif";
    const isSVG = mime === "image/svg+xml";
    const isHEIC = mime.includes("heic") || mime.includes("heif");

    // ✅ ALWAYS buffer the file first (important!)
    const inputBuffer: Buffer = Buffer.from(await file.arrayBuffer());

    let outputBuffer: Buffer;
    let outputMime = mime;

    // 🟢 GIF / SVG → upload as-is (no sharp)
    if (isGIF || isSVG) {
      outputBuffer = inputBuffer;
    } else {
      let processed = inputBuffer;

      if (isHEIC) {
        processed = await sharp(processed)
          .jpeg({ quality: 90 })
          .toBuffer();
        outputMime = "image/jpeg";
      }

      processed = await sharp(processed)
        .rotate()
        .resize(2000, 2000, { fit: "inside" })
        .toBuffer();

      outputBuffer = processed;
    }

    const ext =
      outputMime === "image/jpeg"
        ? "jpg"
        : outputMime === "image/png"
        ? "png"
        : outputMime === "image/webp"
        ? "webp"
        : outputMime === "image/gif"
        ? "gif"
        : outputMime === "image/svg+xml"
        ? "svg"
        : "bin";

    const id = crypto.randomUUID();
    const key = `posts/${id}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: outputBuffer, // ✅ always Buffer
        ContentType: outputMime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const CDN = process.env.R2_PUBLIC_URL!;
    return NextResponse.json({
      ok: true,
      id,
      key,
      url: `${CDN}/${key}`,
    });
  } catch (err) {
    console.error("🔥 Image upload error:", err);
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 },
    );
  }
}
