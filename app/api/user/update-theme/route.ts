import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { theme } = await req.json();
  if (!["light", "dark", "system"].includes(theme)) {
    return NextResponse.json({ ok: false, error: "Invalid theme" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  await db.collection("users").updateOne(
    { email: session.user.email },
    { $set: { theme, updatedAt: new Date() } }
  );

  return NextResponse.json({ ok: true });
}
