import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { GridFSBucket } from "mongodb";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "100mb", // Cloudflare max anyway
  },
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Read file into a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // MongoDB client
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    // GridFS bucket
    const bucket = new GridFSBucket(db, {
      bucketName: "images",
    });

    // Create upload stream
    const uploadStream = bucket.openUploadStream(file.name || "upload", {
      contentType: file.type || "application/octet-stream",
    });

    // Write the buffer to the stream
    uploadStream.end(buffer);

    // Wait until upload completes
    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);
    });

    // The file ID
    const fileId = uploadStream.id.toString();

    return NextResponse.json({
      ok: true,
      id: fileId, // send to frontend
    });
  } catch (err) {
    console.error("🔥 GridFS upload error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
