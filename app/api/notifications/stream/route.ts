import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { subscribe, unsubscribe } from "@/lib/notificationHub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.uid;

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  subscribe(userId, writer);

  // 🔥 ここ重要：awaitしない
  writer.write(encoder.encode("event: connected\ndata: {}\n\n"));
  writer.write(encoder.encode("retry: 3000\n\n"));

  // 🔥 heartbeat
  const ping = setInterval(() => {
    writer.write(encoder.encode(": ping\n\n")).catch(() => {});
  }, 20000);

  request.signal.addEventListener("abort", () => {
    clearInterval(ping);
    unsubscribe(userId, writer);
    try { writer.close(); } catch {}
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
