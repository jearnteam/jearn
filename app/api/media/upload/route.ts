// app/api/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import crypto from "crypto";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/* Cloudflare R2 client                                                        */
/* -------------------------------------------------------------------------- */
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

type UploadResponse = {
  ok: true;
  id: string;
  key: string;
  url: string;
  width?: number;
  height?: number;
};

/* -------------------------------------------------------------------------- */
/* POST /api/images/uploadImage                                                */
/* -------------------------------------------------------------------------- */
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
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    const file = fileEntry;

    // ✅ FIX: explicit ArrayBuffer cast
    const arrayBuffer = await file.arrayBuffer();

    // ✅ FORCE ArrayBuffer (no SharedArrayBuffer)
    const inputBuffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const mime = file.type;

    if (!mime || !mime.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Invalid file type" },
        { status: 400 }
      );
    }

    const isGIF = mime === "image/gif";
    const isSVG = mime === "image/svg+xml";
    const isHEIC = mime.includes("heic") || mime.includes("heif");

    let outputBuffer: Buffer = inputBuffer;
    let outputMime = mime;

    /* ------------------------ HEIC / HEIF ----------------------------- */
    if (isHEIC) {
      outputBuffer = await sharp(inputBuffer).jpeg({ quality: 90 }).toBuffer();
      outputMime = "image/jpeg";
    }

    /* --------------------- Resize / Optimize -------------------------- */
    if (!isGIF && !isSVG) {
      try {
        outputBuffer = await sharp(outputBuffer)
          .rotate()
          .resize(2000, 2000, { fit: "inside" })
          .toBuffer();
      } catch {
        // fallback to original buffer
      }
    }

    /* ------------------------ Extension ------------------------------- */
    const ext =
      outputMime === "image/jpeg"
        ? "jpg"
        : outputMime === "image/png"
        ? "png"
        : outputMime === "image/webp"
        ? "webp"
        : outputMime === "image/gif"
        ? "gif"
        : "bin";

    /* --------------------------- Key --------------------------------- */
    const id = crypto.randomUUID();
    const key = `posts/${id}.${ext}`;

    /* --------------------------- Upload ------------------------------- */
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: outputBuffer,
        ContentType: outputMime,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const CDN = process.env.R2_PUBLIC_URL!;
    const url = `${CDN}/${key}`;

    /* ------------------------- Metadata ------------------------------- */
    let width: number | undefined;
    let height: number | undefined;

    if (!isGIF && !isSVG) {
      try {
        const meta = await sharp(outputBuffer).metadata();
        width = meta.width;
        height = meta.height;
      } catch {
        // ignore metadata errors
      }
    }

    const response: UploadResponse = {
      ok: true,
      id,
      key,
      url,
      width,
      height,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("🔥 R2 upload error:", err);
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
