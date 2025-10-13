import { addSSEConnection, removeSSEConnection } from "@/lib/sse";

export async function GET(req: Request) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Add the connection
  addSSEConnection(writer);

  // Send initial event (flush headers)
  writer.write(`: connected\n\n`);

  // Keep alive to prevent timeouts
  const keepAlive = setInterval(() => {
    writer.write(`: keep-alive\n\n`).catch(() => {
      clearInterval(keepAlive);
      removeSSEConnection(writer);
    });
  }, 20000);

  // Handle client disconnect
  const signal = req.signal;
  signal.addEventListener("abort", () => {
    clearInterval(keepAlive);
    removeSSEConnection(writer);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*", // or your domain
    },
  });
}
