import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { GridFSBucket, ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    return new Response("Outdated image", { status: 503 });
    /*
    const { id } = params;

    if (!id || id === "undefined") {
      return new Response("Invalid ID", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const bucket = new GridFSBucket(db, { bucketName: "images" });

    const _id = new ObjectId(id);

    const file = await db.collection("images.files").findOne({ _id });

    if (!file) {
      return new Response("Not found", { status: 404 });
    }

    const stream = bucket.openDownloadStream(_id);

    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": file.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    */
  } catch (err) {
    console.error("🔥 GET image error:", err);
    return new Response("Server error", { status: 500 });
  }
}
