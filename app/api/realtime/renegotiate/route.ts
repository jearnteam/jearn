//@/api/realtime/renegotiate/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = "https://rtc.live.cloudflare.com/v1";

export async function POST(req: NextRequest) {
    try {
      const body = await req.json();
      const { sessionId, sessionDescription } = body;
  
      if (!sessionId || !sessionDescription?.sdp) {
        return NextResponse.json(
          { error: "Missing sessionId or sessionDescription.sdp" },
          { status: 400 }
        );
      }
  
      const res = await fetch(
        `${BASE}/apps/${process.env.SFU_ID}/sessions/${sessionId}/renegotiate`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SFU_TOKEN}`,
          },
          body: JSON.stringify({
            sessionDescription: {
              type: "answer",
              sdp: sessionDescription.sdp,
            },
          }),
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        console.error("SFU renegotiate error:", data);
        return NextResponse.json(
          { error: "Renegotiate failed", detail: data },
          { status: 500 }
        );
      }
  
      return NextResponse.json(data);
    } catch (err) {
      console.error("Renegotiate API error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }