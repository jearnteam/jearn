import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // ✅ MUST pass authOptions
    const session = await getServerSession(authOptions);

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
        _id: user._id.toString(),
        uid: user.provider_id || null,
        name: user.name ?? "",
        bio: user.bio ?? "",
        theme: user.theme ?? "light",
        language: user.language ?? "en",
        hasPicture: !!user.picture,
      },
    });

  } catch (err) {
    console.error("current user error:", err);
    return NextResponse.json({ ok: false, user: null });
  }
}
