import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          name: 1,
          userId: 1,
          bio: 1,
          avatarR2Key: 1, // optional: if you stored R2 key
          picture: 1, // backward compatibility
        },
      }
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // ⭐ AVATAR LOGIC (R2 CDN)
    // -------------------------------------------------------------------------
    let avatarUrl: string | null = null;

    if (user.avatarR2Key) {
      // If you store the R2 key directly in DB
      avatarUrl = `${process.env.R2_PUBLIC_URL}/${user.avatarR2Key}`;
    } else {
      // Fallback: predictable R2 path
      avatarUrl = `${process.env.R2_PUBLIC_URL}/avatars/${id}.webp`;
    }

    return NextResponse.json({
      ok: true,
      user: {
        uid: id,
        name: user.name ?? "Anonymous",
        userId: user.userId ?? null,
        bio: user.bio ?? "",
        picture: avatarUrl,
      },
    });
  } catch (err) {
    console.error("Error in /api/user/[id]:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
