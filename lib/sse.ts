// lib/sse.ts
const connections = new Set<WritableStreamDefaultWriter>();

export function addSSEConnection(writer: WritableStreamDefaultWriter) {
  connections.add(writer);
}

export function removeSSEConnection(writer: WritableStreamDefaultWriter) {
  connections.delete(writer);
}

export function broadcastSSE(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const writer of connections) {
    writer.write(message).catch(() => {
      connections.delete(writer);
    });
  }
}
