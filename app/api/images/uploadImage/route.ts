// app/api/images/uploadImage/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import crypto from "crypto";

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

type ImageMeta = {
  width?: number;
  height?: number;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const form = await req.formData();
    const fileEntry = form.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    const file = fileEntry;

    /* ---------------------------------------------------------
     * Convert to Node.js Buffer (SAFE)
     * ------------------------------------------------------- */
    const buffer = Buffer.from(await file.arrayBuffer());

    const mime = file.type; // image/png, image/jpeg, image/gif, image/webp, image/svg+xml
    const originalExt = mime.split("/")[1] || "png";

    let outputBuffer: Buffer = buffer;
    let outputMime: string = mime;

    const isGIF = mime === "image/gif";
    const isSVG = mime === "image/svg+xml";

    /* ---------------------------------------------------------
     * Resize/optimize all images EXCEPT GIF + SVG
     * ------------------------------------------------------- */
    if (!isGIF && !isSVG) {
      try {
        outputBuffer = await sharp(buffer)
          .rotate()
          .resize(2000, 2000, { fit: "inside" })
          .toBuffer();
      } catch {
        outputBuffer = buffer; // fallback
      }
    }

    /* ---------------------------------------------------------
     * HEIC / HEIF → JPEG
     * ------------------------------------------------------- */
    if (mime.includes("heic") || mime.includes("heif")) {
      outputBuffer = await sharp(buffer)
        .jpeg({ quality: 90 })
        .toBuffer();
      outputMime = "image/jpeg";
    }

    /* ---------------------------------------------------------
     * Determine correct extension
     * ------------------------------------------------------- */
    const ext =
      outputMime === "image/jpeg"
        ? "jpg"
        : outputMime === "image/png"
        ? "png"
        : outputMime === "image/webp"
        ? "webp"
        : outputMime === "image/gif"
        ? "gif"
        : originalExt;

    const id = crypto.randomUUID();
    const key = `posts/${id}.${ext}`;

    /* ---------------------------------------------------------
     * Upload to R2
     * ------------------------------------------------------- */
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
     * Metadata (width / height)
     * ------------------------------------------------------- */
    let meta: ImageMeta = {};

    if (!isGIF && !isSVG) {
      try {
        const m = await sharp(outputBuffer).metadata();
        meta = {
          width: m.width,
          height: m.height,
        };
      } catch {
        // ignore
      }
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
