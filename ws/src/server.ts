import http from "http";
import { WebSocketServer, WebSocket } from "ws";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */

type WSClient = WebSocket & {
  userId?: string;
  rooms: Set<string>;
};

type WSMessage = {
  type: string;
  callId?: string;
  roomName?: string;
  targetUserId?: string;
  fromUserId?: string;
  mode?: "audio" | "video";
  roomId?: string;
  payload?: any;
  userId?: string;
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

const userSockets = new Map<string, Set<WSClient>>();
/* ---------------------------------------------
 * HELPERS
 * ------------------------------------------- */

function sendToUser(userId: string, payload: any) {
  const sockets = userSockets.get(userId);

  console.log("SEND TO USER:", userId);
  console.log("AVAILABLE USERS:", Array.from(userSockets.keys()));

  if (!sockets) {
    console.log("NO SOCKET FOUND FOR USER");
    return;
  }

  const json = JSON.stringify(payload);

  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(json);
    }
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
    console.log("WS CLIENT CONNECTED");
    const client = ws as WSClient;
    client.rooms = new Set();
    clients.add(client);

    let userId: string | undefined;

    ws.on("message", (raw) => {
      const text = raw.toString();
      console.log("WS RAW MESSAGE:", text);
      let data: WSMessage;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (data.type === "presence:init" && data.userId) {
        userId = String(data.userId);
        client.userId = String(userId);

        const count = onlineUsers.get(userId) ?? 0;
        onlineUsers.set(userId, count + 1);

        // track sockets
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(client);

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
      //calls
      if (data.type === "call:start") {
        console.log("CALL START RECEIVED:", data, "from:", client.userId);
      
        if (!data.targetUserId || !data.callId || !client.userId) return;
      
        sendToUser(String(data.targetUserId), {
          type: "call:incoming",
          callId: data.callId,
          fromUserId: client.userId,
          roomName: data.roomName,
          mode: data.mode || "audio",
        });
      
        return;
      }
      if (
        data.type === "call:accept" &&
        data.callId &&
        data.fromUserId &&
        data.roomName &&
        client.userId
      ) {
        sendToUser(data.fromUserId, {
          type: "call:accepted",
          callId: data.callId,
          roomName: data.roomName,
          by: client.userId,
        });

        sendToUser(client.userId, {
          type: "call:accepted",
          callId: data.callId,
          roomName: data.roomName,
          by: client.userId,
        });

        return;
      }
      if (data.type === "call:reject" && data.callId && data.fromUserId) {
        sendToUser(data.fromUserId, {
          type: "call:rejected",
          callId: data.callId,
        });

        return;
      }
      if (data.type === "call:end" && data.callId && data.targetUserId) {
        sendToUser(String(data.targetUserId), {
          type: "call:ended",
          callId: data.callId,
        });

        return;
      }
    });

    ws.on("close", () => {
      clients.delete(client);

      if (client.userId) {
        const sockets = userSockets.get(client.userId);

        sockets?.delete(client);

        if (sockets && sockets.size === 0) {
          userSockets.delete(client.userId);
        }
      }

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

const PORT = Number(process.env.WS_PORT || 3535);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`💬 WS listening on ${PORT} /chat`);
});
