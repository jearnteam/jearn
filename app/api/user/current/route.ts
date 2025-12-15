// app/api/user/current/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, user: null });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const user = await db.collection("users").findOne({
      email: session.user.email,
    });

    if (!user) return NextResponse.json({ ok: false, user: null });

    const cdnBase = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");

    const avatarUrl =
      user.avatarUrl ??
      `${cdnBase}/avatars/${user._id.toString()}.webp`;

    return NextResponse.json({
      ok: true,
      user: {
        _id: user._id.toString(),
        name: user.name ?? "",
        userId: user.userId ?? "",
        bio: user.bio ?? "",
        email: user.email,
        theme: user.theme ?? "light",
        language: user.language ?? "en",
        isAdmin: false,
        avatarUrl,
        avatarUpdatedAt: user.avatarUpdatedAt ?? null,
      },
    });
  } catch (err) {
    console.error("current user error:", err);
    return NextResponse.json({ ok: false, user: null });
  }
}
