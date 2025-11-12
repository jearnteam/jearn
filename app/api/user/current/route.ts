// app/api/user/current/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await safeSession();
    if (!session?.user?.email) {
      console.warn("⚠️ No session or email");
      return ok({ user: null });
    }

    const user = await safeFetchUser(session.user.email);
    return ok({ user });
  } catch (err) {
    console.error("🔥 /api/user/current crashed hard:", err);
    // 👇 Explicitly send 200 OK with null user, never 503
    return NextResponse.json(
      { ok: false, user: null, error: String(err) },
      { status: 200 }
    );
  }
}

function ok(data: object) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

async function safeSession() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) console.warn("⚠️ getServerSession returned null");
    return session;
  } catch (err) {
    console.error("❌ getServerSession failed:", err);
    return null;
  }
}

async function safeFetchUser(email: string) {
  try {
    const client = (await Promise.race([
      clientPromise,
      timeout(1000), // 🕐 fail fast
    ])) as MongoClient;

    const db = client.db(process.env.MONGODB_DB || "jearn");
    const user = await db
      .collection("users")
      .findOne({ email }, { projection: { password: 0 } });

    if (!user) {
      console.warn("⚠️ No DB user found for", email);
      return null;
    }

    return {
      uid: user._id.toString(),
      name: user.name,
      email: user.email,
      bio: user.bio,
      theme: user.theme ?? "system",
      language: user.language ?? "en",
      picture: user.picture ? `/api/user/avatar/${user._id}` : null,
    };
  } catch (err) {
    console.error("❌ safeFetchUser DB error:", err);
    return null;
  }
}

function timeout(ms: number) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("DB timeout")), ms)
  );
}
