import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { addClient, removeClient } from "@/lib/sse";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig);
  const userId = session?.user?.uid ?? null;

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      const write = (msg: string) => {
        controller.enqueue(enc.encode(msg));
      };

      const client = {
        write,
        userId, // ✅ attach user id for notifications
      };

      addClient(client);

      // connection confirmation
      write(`event: connected\ndata: {}\n\n`);

      // keep alive ping
      const ping = setInterval(() => {
        write(`event: ping\ndata: {}\n\n`);
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        removeClient(client);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
