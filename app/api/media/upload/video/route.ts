import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/* R2 CLIENT                                                          */
/* ------------------------------------------------------------------ */
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/* ------------------------------------------------------------------ */
/* FFMPEG THUMBNAIL                                                    */
/* ------------------------------------------------------------------ */
async function extractThumbnail(videoPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-ss",
      "0.1",
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=1280:-1",
      outputPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

/* ------------------------------------------------------------------ */
/* POST                                                               */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  let tmpDir: string | null = null;

  try {
    /* ---------- auth ---------- */
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------- form ---------- */
    const form = await req.formData();
    const fileEntry = form.get("file");
    const thumbnailEntry = form.get("thumbnail");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Missing video file" }, { status: 400 });
    }

    if (!fileEntry.type.startsWith("video/")) {
      return NextResponse.json({ error: "Invalid video type" }, { status: 400 });
    }

    /* ---------- ids ---------- */
    const id = crypto.randomUUID();
    const ext = fileEntry.type.split("/")[1] || "mp4";

    const videoKey = `videos/${id}.${ext}`;
    const thumbKey = `videos/thumbs/${id}.jpg`;

    const CDN = process.env.R2_PUBLIC_URL!;

    /* ---------- temp dir ---------- */
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-"));
    const videoPath = path.join(tmpDir, `input.${ext}`);
    const thumbPath = path.join(tmpDir, "thumb.jpg");

    /* ---------- write video ---------- */
    await fs.writeFile(videoPath, Buffer.from(await fileEntry.arrayBuffer()));

    /* ---------- thumbnail ---------- */
    let thumbnailUrl: string;

    if (thumbnailEntry instanceof File) {
      // ✅ USER-PROVIDED THUMBNAIL
      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: thumbKey,
          Body: Buffer.from(await thumbnailEntry.arrayBuffer()),
          ContentType: thumbnailEntry.type,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      thumbnailUrl = `${CDN}/${thumbKey}`;
    } else {
      // 🎞️ AUTO THUMBNAIL (FFMPEG)
      await extractThumbnail(videoPath, thumbPath);

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: thumbKey,
          Body: await fs.readFile(thumbPath),
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      thumbnailUrl = `${CDN}/${thumbKey}`;
    }

    /* ---------- upload video ---------- */
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: videoKey,
        Body: await fs.readFile(videoPath),
        ContentType: fileEntry.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    /* ---------- cleanup ---------- */
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }

    /* ---------- response ---------- */
    return NextResponse.json({
      ok: true,
      url: `${CDN}/${videoKey}`,
      thumbnailUrl,
      duration: null,
      aspectRatio: null,
    });
  } catch (err) {
    console.error("🔥 Video upload error:", err);

    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }

    return NextResponse.json({ error: "Video upload failed" }, { status: 500 });
  }
}
