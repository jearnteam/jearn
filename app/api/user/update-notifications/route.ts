//@/api/user/update-notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/features/auth/auth";
import { getMongoClient } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { enabled } = await req.json();

  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Invalid value" },
      { status: 400 }
    );
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  await db.collection("users").updateOne(
    { email: session.user.uid }, // 👈 same as your language logic
    {
      $set: {
        notificationsEnabled: enabled,
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}