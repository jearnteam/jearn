// /lib/sse.ts

export type SSEClient = {
  write: (msg: string) => void;
};

let clients: SSEClient[] = [];

/* ---------------------------------------------
 * CLIENT MANAGEMENT
 * ------------------------------------------- */
export function addClient(client: SSEClient) {
  clients.push(client);
}

export function removeClient(client: SSEClient) {
  clients = clients.filter((c) => c !== client);
}

export function getClientCount() {
  return clients.length;
}

/* ---------------------------------------------
 * SSE PAYLOAD
 * ------------------------------------------- */
export type SSEPayload =
  | {
      type: string;
      [key: string]: unknown;
    }
  | unknown;

/* ---------------------------------------------
 * BROADCAST
 * ------------------------------------------- */
export function broadcastSSE(data: SSEPayload) {
  let json: string;

  try {
    json = JSON.stringify(data);
  } catch (err) {
    console.error("❌ SSE payload is not serializable:", data);
    return;
  }

  const payload = `data: ${json}\n\n`;

  for (const client of clients) {
    try {
      client.write(payload);
    } catch (err) {
      console.warn("⚠️ SSE write failed, removing client:", err);
      removeClient(client);
    }
  }
}
