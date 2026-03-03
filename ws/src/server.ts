import http from "http";
import { WebSocketServer, WebSocket } from "ws";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */

type WSClient = WebSocket & {
  userId?: string;
  rooms: Set<string>;
};

/* ---------------------------------------------
 * HTTP SERVER
 * ------------------------------------------- */

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});

/* ---------------------------------------------
 * WS SERVER
 * ------------------------------------------- */

const wss = new WebSocketServer({ noServer: true });

const clients = new Set<WSClient>();

// 🔥 Track presence with connection count (multi-tab safe)
const onlineUsers = new Map<string, number>();

/* ---------------------------------------------
 * HELPERS
 * ------------------------------------------- */

function broadcast(data: any) {
  const json = JSON.stringify(data);

  for (const c of clients) {
    if (c.readyState === WebSocket.OPEN) {
      c.send(json);
    }
  }
}

function sendOnlineList(ws: WebSocket) {
  ws.send(
    JSON.stringify({
      type: "presence:list",
      users: Array.from(onlineUsers.keys()),
    })
  );
}

function handleUserOnline(userId: string) {
  const count = onlineUsers.get(userId) ?? 0;
  onlineUsers.set(userId, count + 1);

  // Only broadcast if first connection
  if (count === 0) {
    broadcast({
      type: "presence:online",
      userId,
    });
  }
}

function broadcastPresence() {
  const payload = JSON.stringify({
    type: "presence:update",
    onlineUserIds: Array.from(onlineUsers.keys()),
  });

  for (const c of clients) {
    if (c.readyState === WebSocket.OPEN) {
      c.send(payload);
    }
  }
}

/* ---------------------------------------------
 * UPGRADE HANDLER
 * ------------------------------------------- */

server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/chat") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    const client = ws as WSClient;
    client.rooms = new Set();
    clients.add(client);

    let userId: string | undefined;

    ws.on("message", (raw) => {
      let data: any;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (data.type === "presence:init" && data.userId) {
        userId = String(data.userId);
        const count = onlineUsers.get(userId) ?? 0;
        onlineUsers.set(userId, count + 1);
        broadcastPresence();
        return;
      }

      if (data.type === "join" && data.roomId) {
        client.rooms.add(String(data.roomId));
        console.log("JOIN:", data.roomId);
        return;
      }

      if (data.type === "leave" && data.roomId) {
        client.rooms.delete(String(data.roomId));
        return;
      }
      if (data.type === "chat:message" && data.roomId && data.payload) {
        const roomId = String(data.roomId);

        console.log("ROOM MEMBERS:");
        for (const c of clients) {
          console.log("Client rooms:", c.rooms);
        }

        for (const c of clients) {
          if (c.readyState === WebSocket.OPEN && c.rooms.has(roomId)) {
            console.log("SENDING TO CLIENT IN ROOM:", roomId);
            c.send(
              JSON.stringify({
                type: "chat:message",
                roomId,
                payload: data.payload,
              })
            );
          }
        }

        return;
      }
    });

    ws.on("close", () => {
      clients.delete(client);

      if (userId) {
        const count = onlineUsers.get(userId) ?? 0;

        if (count <= 1) {
          onlineUsers.delete(userId);
        } else {
          onlineUsers.set(userId, count - 1);
        }

        broadcastPresence();
      }
    });
  });
});

/* ---------------------------------------------
 * LISTEN
 * ------------------------------------------- */

server.listen(3535, "0.0.0.0", () => {
  console.log("💬 WS listening on 3535 /chat");
});
