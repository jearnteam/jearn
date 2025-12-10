import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(_req: Request, { params }: { params: { uid: string } }) {
  try {
    const raw = params.uid?.trim();
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
            picture: 1,
          },
        }
      );
    } catch {
      // invalid ObjectId → not found
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        uid: user._id.toString(),
        name: user.name ?? "Unknown",
        userId: user.userId ?? null,
        bio: user.bio ?? "",
        picture: user.picture ? `/api/user/avatar/${user._id}` : null,
      },
    });
  } catch (err) {
    console.error("Error in /api/user/by-uid:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
