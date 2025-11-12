import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { language } = await req.json();
  const supportedLanguages = ["en", "ja", "my"]; // English, Japanese, Burmese

  if (!supportedLanguages.includes(language)) {
    return NextResponse.json({ ok: false, error: "Invalid language" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  await db.collection("users").updateOne(
    { email: session.user.email },
    { $set: { language, updatedAt: new Date() } }
  );

  return NextResponse.json({ ok: true });
}
