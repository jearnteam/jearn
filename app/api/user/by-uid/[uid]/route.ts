import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(_req: Request, { params }: { params: { uid: string } }) {
  try {
    const raw = await params.uid?.trim();
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Missing uid" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    let user = null;
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
        name: user.name ?? "Unknown",
        userId: user.userId ?? null,
        bio: user.bio ?? "",
        picture: avatarUrl,
        avatarUpdatedAt: updatedAt, // 🔥 critical
      },
    });
  } catch (err) {
    console.error("Error in /api/user/by-uid:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
