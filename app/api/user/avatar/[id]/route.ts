import { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");
    const users = db.collection("users");

    let user = null;

    if (ObjectId.isValid(id)) {
      user = await users.findOne(
        { _id: new ObjectId(id) },
        { projection: { picture: 1, avatarUrl: 1 } }
      );
    }
    if (!user) {
      user = await users.findOne(
        { uid: id },
        { projection: { picture: 1, avatarUrl: 1 } }
      );
    }

    // Remote avatar (external provider URL)
    if (user?.avatarUrl) {
      const res = await fetch(user.avatarUrl);
      if (res.ok) {
        const blob = await res.arrayBuffer();
        return new Response(blob, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
            "Connection": "keep-alive",
          },
        });
      }
    }

    // Avatar stored in DB
    if (user?.picture) {
      const buffer = Buffer.isBuffer(user.picture)
        ? user.picture
        : Buffer.from(user.picture.buffer);

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
          "Connection": "keep-alive",
        },
      });
    }

    // Default avatar
    const filePath = path.join(process.cwd(), "public", "default-avatar.png");
    const fallback = await fs.readFile(filePath);

    return new Response(fallback, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.warn("⚠️ Avatar route error:", err);
    return new Response(null, { status: 204 }); // empty but no error
  }
}
