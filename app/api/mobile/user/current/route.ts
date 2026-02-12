import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.uid) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("users").findOne({
    _id: new ObjectId(token.uid as string),
  });

  if (!user) {
    return NextResponse.json({ ok: false, user: null }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      _id: user._id.toString(),
      name: user.name ?? "",
      email: user.email ?? "",
      uniqueId: user.uniqueId ?? "",
      bio: user.bio ?? "",
      avatarUrl:
        user.avatarUrl ??
        `${process.env.R2_PUBLIC_URL}/avatars/${user._id}.webp`,
    },
  });
}
