import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!ObjectId.isValid(params.id)) {
      return new Response("Invalid ID", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(params.id) });

    if (!user || !user.picture) {
      return new Response("Not found", { status: 404 });
    }

    const buffer = Buffer.from(user.picture.buffer);
    const mimeType = user.pictureMime || "image/jpeg";
    const etag = `"${user.updatedAt?.getTime() || buffer.length}"`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etag,
      },
    });
  } catch (error) {
    console.error("Avatar GET error:", error);
    return new Response("Server error", { status: 500 });
  }
}
