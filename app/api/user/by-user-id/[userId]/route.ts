import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  try {
    const raw = params.userId?.trim();
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    let user = null;

    // 1) lookup by username
    user = await db.collection("users").findOne(
      { userId: raw },
      {
        projection: {
          _id: 1,
          name: 1,
          userId: 1,
          bio: 1,
          avatarUrl: 1,
          avatarUpdatedAt: 1,
        },
      }
    );

    // 2) fallback to ObjectId lookup
    if (!user) {
      try {
        user = await db.collection("users").findOne(
          { _id: new ObjectId(raw) },
          {
            projection: {
              _id: 1,
              name: 1,
              userId: 1,
              bio: 1,
              avatarUrl: 1,
              avatarUpdatedAt: 1,
            },
          }
        );
      } catch {}
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";
    const avatarUrl = user.avatarUrl ?? `${CDN}/avatars/${user._id}.webp`;
    const updatedAt = user.avatarUpdatedAt ?? null;

    return NextResponse.json({
      ok: true,
      user: {
        uid: user._id.toString(),
        name: user.name ?? "Unknown User",
        userId: user.userId ?? null,
        bio: user.bio ?? "",
        picture: avatarUrl,
        avatarUpdatedAt: updatedAt, // 🔥 very important
      },
    });
  } catch (err) {
    console.error("Error in /api/user/by-user-id:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
