import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, user: null });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const user = await db.collection("users").findOne({
      email: session.user.email,
    });

    if (!user) {
      return NextResponse.json({ ok: false, user: null });
    }

    return NextResponse.json({
      ok: true,
      user: {
        _id: user._id.toString(),          // Mongo user ID
        uid: user.provider_id || null,     // Google provider ID
        name: user.name ?? "",
        bio: user.bio ?? "",
        theme: user.theme ?? "light",
        language: user.language ?? "en",
        hasPicture: !!user.picture,        // For avatar
      },
    });

  } catch (err) {
    console.error("current user error:", err);
    return NextResponse.json({ ok: false, user: null });
  }
}
