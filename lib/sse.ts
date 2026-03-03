/* ============================================================
   GLOBAL SSE STATE (App Router Safe Singleton)
   ============================================================ */

export type SSEClient = {
  write: (msg: string) => void;
  userId?: string | null; // 🔥 NEW
};

type GlobalSSEState = {
  clients: SSEClient[];
};

const globalForSSE = globalThis as unknown as {
  __SSE_STATE__?: GlobalSSEState;
};

if (!globalForSSE.__SSE_STATE__) {
  globalForSSE.__SSE_STATE__ = {
    clients: [],
  };
}

const clients = globalForSSE.__SSE_STATE__.clients;

/* ============================================================
     CLIENT MANAGEMENT
     ============================================================ */

export function addClient(client: SSEClient) {
  clients.push(client);
  console.log("🟢 SSE client connected. Total:", clients.length);
}

export function removeClient(client: SSEClient) {
  const index = clients.indexOf(client);
  if (index !== -1) {
    clients.splice(index, 1);
  }
  console.log("🔴 SSE client removed. Total:", clients.length);
}

export function getClientCount() {
  return clients.length;
}

/* ============================================================
     GLOBAL BROADCAST (POSTS, UPVOTES, ETC)
     ============================================================ */

export function broadcastSSE(data: any) {
  if (!clients.length) return;

  let json: string;

  try {
    json = JSON.stringify(data);
  } catch {
    return;
  }

  // 🔥 IMPORTANT: default event (no event: line)
  const payload = `data: ${json}\n\n`;

  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      removeClient(client);
    }
  }
}

/* ============================================================
     USER-SCOPED NOTIFICATION
     ============================================================ */

export function notifyUser(userId: string, data: any) {
  if (!clients.length) return;

  const payload = `event: notification\ndata: ${JSON.stringify(data)}\n\n`;

  let delivered = 0;

  for (const client of clients) {
    if (client.userId === userId) {
      try {
        client.write(payload);
        delivered++;
      } catch {
        removeClient(client);
      }
    }
  }

  console.log(`🔔 Notification delivered to ${delivered} client(s)`);
}
