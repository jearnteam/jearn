// /lib/sse.ts

type Client = { write: (msg: string) => void };
let clients: Client[] = [];

export function addClient(client: Client) {
  clients.push(client);
}

export function removeClient(client: Client) {
  clients = clients.filter((c) => c !== client);
}

export function broadcastSSE(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    try {
      c.write(payload);
    } catch (err) {
      console.warn("⚠️ SSE write failed:", err);
    }
  }
}

export function getClientCount() {
  return clients.length;
}
