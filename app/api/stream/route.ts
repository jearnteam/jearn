import { addSSEConnection, removeSSEConnection } from "@/lib/sse";

export async function GET() {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // ➕ Add connection
  addSSEConnection(writer);

  // Keep alive
  const keepAlive = setInterval(() => {
    writer.write(`: keep-alive\n\n`);
  }, 20000);

  const close = () => {
    clearInterval(keepAlive);
    removeSSEConnection(writer);
    writer.close();
  };

  // Close when client disconnects
  const controller = new AbortController();
  const signal = controller.signal;
  signal.addEventListener("abort", close);

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
