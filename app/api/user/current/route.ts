// app/api/user/current/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { MongoClient } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await safeSession();
    if (!session?.user?.email) return ok({ user: null });

    const user = await safeFetchUser(session.user.email);
    return ok({ user });
  } catch (err) {
    console.warn("⚠️ /api/user/current suppression:", err);
    return ok({ user: null }); // ✅ Never throw 503
  }
}

function ok(data: object) {
  return NextResponse.json({ ok: true, ...data });
}

async function safeSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

async function safeFetchUser(email: string) {
  try {
    const client = (await Promise.race([
      clientPromise,
      timeout(1500),
    ])) as MongoClient;

    const db = client.db(process.env.MONGODB_DB || "jearn");
    const user = await db.collection("users").findOne(
      { email },
      { projection: { password: 0 } }
    );
    if (!user) return null;

    return {
      uid: user._id.toString(),
      name: user.name,
      email: user.email,
      bio: user.bio,
      theme: user.theme ?? "system",
      language: user.language ?? "en",
      picture: user.picture ? `/api/user/avatar/${user._id}` : null,
    };
  } catch {
    return null; // ✅ swallow db errors too
  }
}

function timeout(ms: number) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("DB timeout")), ms)
  );
}
