// app/api/notifications/stream/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { subscribe, unsubscribe } from "@/lib/notificationHub";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.uid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.uid;

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  subscribe(userId, writer);

  // 🔑 keep connection alive
  writer.write(encoder.encode("retry: 3000\n\n"));

  // ✅ CORRECT abort handling
  request.signal.addEventListener("abort", () => {
    unsubscribe(userId, writer);
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
