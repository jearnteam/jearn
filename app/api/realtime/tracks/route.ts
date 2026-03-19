//@/api/realtime/tracks/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = "https://rtc.live.cloudflare.com/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, sessionDescription, tracks } = body;

    if (!sessionId || !tracks) {
      return NextResponse.json(
        { error: "Missing sessionId or tracks" },
        { status: 400 }
      );
    }

    const payload = sessionDescription
      ? { sessionDescription, tracks } // publish local tracks
      : { tracks };                    // request remote tracks

    console.log("TRACKS PAYLOAD:", payload);

    const res = await fetch(
      `${BASE}/apps/${process.env.SFU_ID}/sessions/${sessionId}/tracks/new`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SFU_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await res.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Non-JSON response from SFU:", text);
      return NextResponse.json(
        { error: "SFU returned non-JSON", raw: text },
        { status: 500 }
      );
    }

    if (!res.ok) {
      console.error("SFU tracks error:", data);
      return NextResponse.json(
        { error: "SFU tracks failed", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Tracks API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}