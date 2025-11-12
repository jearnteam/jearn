// app/api/stream/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addClient, removeClient } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const write = (msg: string) => controller.enqueue(enc.encode(msg));
      const client = { write };

      addClient(client);

      write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      const ping = setInterval(() => {
        write(
          `data: ${JSON.stringify({ type: "ping", t: Date.now() })}\n\n`
        );
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        removeClient(client);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
