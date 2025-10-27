import { addSSEConnection, removeSSEConnection } from "@/lib/sse";

export async function GET(req: Request) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // add connection
  addSSEConnection(writer);

  // flush initial
  writer.write(`: connected\n\n`);

  // keep alive every 20s
  const keepAlive = setInterval(() => {
    writer.write(`: ping\n\n`).catch(() => {
      clearInterval(keepAlive);
      removeSSEConnection(writer);
    });
  }, 20000);

  req.signal.addEventListener("abort", () => {
    clearInterval(keepAlive);
    removeSSEConnection(writer);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
