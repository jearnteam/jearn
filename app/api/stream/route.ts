const connections = new Set<WritableStreamDefaultWriter>();

export async function GET() {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  connections.add(writer);

  // keep alive so the browser doesn't close the connection
  const keepAlive = setInterval(() => {
    writer.write(`: keep-alive\n\n`);
  }, 20000);

  const close = () => {
    clearInterval(keepAlive);
    connections.delete(writer);
    writer.close();
  };

  // clean up on client disconnect
  const signal = new AbortController().signal;
  signal.addEventListener("abort", close);

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export function broadcastSSE(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const writer of connections) {
    writer.write(message).catch(() => {
      connections.delete(writer);
    });
  }
}
