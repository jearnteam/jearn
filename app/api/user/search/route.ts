import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    // allow 1-character search, block only when empty string
    if (q.length === 0) {
      return NextResponse.json({ ok: true, users: [] });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");

    let users = await db
      .collection("users")
      .find(
        { $or: [{ uniqueId: regex }, { name: regex }] },
        { projection: { _id: 1, uniqueId: 1, name: 1 } }
      )
      .limit(20)
      .toArray();

    // ranking
    users = users
      .map((u) => {
        const qLower = q.toLowerCase();
        const id = String(u.uniqueId || "").toLowerCase();
        const nm = String(u.name || "").toLowerCase();

        let score = 0;
        if (id.startsWith(qLower)) score = 100;
        else if (nm.startsWith(qLower)) score = 80;
        else if (id.includes(qLower)) score = 50;
        else if (nm.includes(qLower)) score = 30;

        return { ...u, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

    return NextResponse.json({
      ok: true,
      users: users.map((u) => ({
        _id: u._id.toString(),
        uniqueId: u.uniqueId ?? null,
        name: u.name,
        picture: `${CDN}/avatars/${u._id.toString()}.webp`,
      })),
    });
  } catch (e) {
    console.error("❌ search error:", e);
    return NextResponse.json({ ok: false, users: [] });
  }
}
