import clientPromise from "@/lib/mongodb";
import { ObjectId, Binary } from "mongodb";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

const FALLBACK_BUFFER = new Uint8Array(
  readFileSync(path.join(process.cwd(), "public/default-avatar.png"))
);

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await context.params; // ← FIXED

    if (userId === "system") return serveDefault();
    if (!ObjectId.isValid(userId)) return serveDefault();

    const client = await clientPromise;
    const db = client.db("jearn");

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) }, { projection: { picture: 1 } });

    if (!user?.picture) return serveDefault();

    const pic = user.picture;
    const contentType = pic.contentType || "image/png";

    let buffer: Buffer | null = null;

    if (pic.data instanceof Binary) buffer = pic.data.buffer;
    else if (Buffer.isBuffer(pic.data)) buffer = pic.data;
    else if (pic._bsontype === "Binary") buffer = pic.buffer;
    else if (pic.data instanceof Uint8Array) buffer = Buffer.from(pic.data);

    if (!buffer) return serveDefault();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Avatar route error:", err);
    return serveDefault();
  }
}

function serveDefault() {
  return new NextResponse(FALLBACK_BUFFER, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
