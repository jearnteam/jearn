// app/api/notifications/stream/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { subscribe, unsubscribe } from "@/lib/notificationHub";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.uid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.uid; // STRING UID

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  subscribe(userId, writer);

  writer.write("retry: 3000\n\n");

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
