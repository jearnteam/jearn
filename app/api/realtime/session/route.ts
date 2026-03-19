//@/api/realtime/session/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = "https://rtc.live.cloudflare.com/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(
      `${BASE}/apps/${process.env.SFU_ID}/sessions/new`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SFU_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("SFU session error:", data);
      return NextResponse.json(
        { error: "SFU session failed", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Session API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}