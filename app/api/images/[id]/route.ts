import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, GridFSBucket } from "mongodb";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: any) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return new NextResponse("Invalid image ID", { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const bucket = new GridFSBucket(db, { bucketName: "images" });

    const objectId = new ObjectId(id);

    // We need to fetch metadata for contentType
    const fileDoc = await db.collection("images.files").findOne({ _id: objectId });
    if (!fileDoc) {
      return new NextResponse("Not found", { status: 404 });
    }

    const stream = bucket.openDownloadStream(objectId);

    return new Response(stream as any, {
      headers: {
        "Content-Type": fileDoc.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("🔥 Error in /api/image/[id]:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
