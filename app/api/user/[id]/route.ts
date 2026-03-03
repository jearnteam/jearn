// app/api/user/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const users = db.collection("users");
    const follows = db.collection("follow");

    /* ---------------------------------------------------------------- */
    /* GET USER */
    /* ---------------------------------------------------------------- */
    const user = await users.findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          name: 1,
          uniqueId: 1,
          bio: 1,
          avatarR2Key: 1,
          picture: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    /* ---------------------------------------------------------------- */
    /* FOLLOW COUNTS (parallel) */
    /* ---------------------------------------------------------------- */
    const [followers, following] = await Promise.all([
      follows.countDocuments({ followingId: id }),
      follows.countDocuments({ followerId: id }),
    ]);

    /* ---------------------------------------------------------------- */
    /* AVATAR URL */
    /* ---------------------------------------------------------------- */
    let avatarUrl: string;

    if (user.avatarR2Key) {
      avatarUrl = `${process.env.R2_PUBLIC_URL}/${user.avatarR2Key}?t=${Date.now()}`;
    } else {
      avatarUrl = `${process.env.R2_PUBLIC_URL}/avatars/${id}.webp?t=${Date.now()}`;
    }

    /* ---------------------------------------------------------------- */
    /* RESPONSE */
    /* ---------------------------------------------------------------- */
    return NextResponse.json({
      ok: true,
      user: {
        uid: id,
        name: user.name ?? "Anonymous",
        uniqueId: user.uniqueId ?? null,
        bio: user.bio ?? "",
        picture: avatarUrl,
        followers,
        following,
      },
    });
  } catch (err) {
    console.error("❌ GET /api/user/[id]:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}