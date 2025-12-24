// app/api/images/uploadImage/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    // Convert file to real Node.js Buffer
    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab as ArrayBuffer);
    const input = buffer as unknown as Buffer;

    const mime = file.type; // image/png, image/jpeg, image/gif, etc.
    const originalExt = mime.split("/")[1]; // png, jpeg, gif, webp

    let outputBuffer = input;
    let outputMime = mime;

    const isGIF = mime === "image/gif";
    const isSVG = mime === "image/svg+xml";

    /* ---------------------------------------------------------
     * 🔵 Resize/optimize all images EXCEPT GIF + SVG
     * --------------------------------------------------------- */
    if (!isGIF && !isSVG) {
      try {
        outputBuffer = await sharp(input)
          .rotate()
          .resize(2000, 2000, { fit: "inside" })
          .toBuffer();
      } catch (err) {
        outputBuffer = input; // fallback to original
      }
    }

    /* ---------------------------------------------------------
     * 🔵 HEIC/HEIF → convert to JPEG (required)
     * --------------------------------------------------------- */
    if (mime.includes("heic") || mime.includes("heif")) {
      outputBuffer = await sharp(input).jpeg({ quality: 90 }).toBuffer();
      outputMime = "image/jpeg";
    }

    /* ---------------------------------------------------------
     * 🔵 Determine correct extension
     * --------------------------------------------------------- */
    const ext =
      outputMime === "image/jpeg"
        ? "jpg"
        : outputMime === "image/png"
        ? "png"
        : outputMime === "image/webp"
        ? "webp"
        : outputMime === "image/gif"
        ? "gif"
        : originalExt || "png";

    const id = crypto.randomUUID();
    const key = `posts/${id}.${ext}`;

    /* ---------------------------------------------------------
     * 🔵 Upload to R2
     * --------------------------------------------------------- */
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: outputBuffer,
        ContentType: outputMime,
      })
    );

    const CDN = process.env.R2_PUBLIC_URL!;
    const url = `${CDN}/${key}`;

    /* ---------------------------------------------------------
     * 🔵 Get metadata (width/height)
     * --------------------------------------------------------- */
    let meta: any = {};

    if (!isGIF && !isSVG) {
      try {
        const m = await sharp(outputBuffer as unknown as Buffer).metadata();
        meta = { width: m.width, height: m.height };
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      id,
      ext,
      url,
      ...meta,
    });
  } catch (err) {
    console.error("R2 upload error:", err);
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
