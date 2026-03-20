import http from "http";
import { WebSocketServer, WebSocket } from "ws";

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
  fromUserName?: string;
  mode?: "audio" | "video";
  roomId?: string;
  payload?: any;
  userId?: string;
  sessionId?: string;
  tracks?: {
    trackName: string;
    kind?: "audio" | "video";
    userId?: string;
  }[];
};

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});

const wss = new WebSocketServer({ noServer: true });

const clients = new Set<WSClient>();
const onlineUsers = new Map<string, number>();
const userSockets = new Map<string, Set<WSClient>>();

const activeCalls = new Map<string, { participants: Set<string> }>();

function sendToUser(userId: string, payload: any) {
  const sockets = userSockets.get(userId);

  console.log("SEND TO USER:", userId);
  console.log("AVAILABLE USERS:", Array.from(userSockets.keys()));

  if (!sockets || sockets.size === 0) {
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
        data = JSON.parse(text);
      } catch {
        return;
      }

      if (data.type === "presence:init" && data.userId) {
        userId = String(data.userId);
        client.userId = userId;

        const count = onlineUsers.get(userId) ?? 0;
        onlineUsers.set(userId, count + 1);

        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(client);

        broadcastPresence();
        return;
      }

      if (data.type === "join" && data.roomId) {
        client.rooms.add(String(data.roomId));
        return;
      }

      if (data.type === "leave" && data.roomId) {
        client.rooms.delete(String(data.roomId));
        return;
      }

      if (data.type === "chat:message" && data.roomId && data.payload) {
        const roomId = String(data.roomId);

        for (const c of clients) {
          if (c.readyState === WebSocket.OPEN && c.rooms.has(roomId)) {
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

      if (data.type === "call:start") {
        if (!data.targetUserId || !data.callId) return;

        const fromUserId = client.userId ?? data.fromUserId ?? "unknown";

        activeCalls.set(data.callId, {
          participants: new Set([fromUserId, String(data.targetUserId)]),
        });

        sendToUser(String(data.targetUserId), {
          type: "call:start",
          callId: data.callId,
          fromUserId,
          fromUserName: data.fromUserName,
          roomName: data.roomName,
          mode: data.mode || "audio",
        });

        return;
      }

      if (
        data.type === "call:accept" &&
        data.callId &&
        data.targetUserId &&
        client.userId
      ) {
        sendToUser(String(data.targetUserId), {
          type: "call:accept",
          callId: data.callId,
          fromUserId: client.userId,
        });
        return;
      }

      if (
        data.type === "call:reject" &&
        data.callId &&
        data.targetUserId &&
        client.userId
      ) {
        sendToUser(String(data.targetUserId), {
          type: "call:reject",
          callId: data.callId,
          fromUserId: client.userId,
        });
        return;
      }

      if (data.type === "call:end" && data.callId && data.targetUserId) {
        sendToUser(String(data.targetUserId), {
          type: "call:end",
          callId: data.callId,
        });

        activeCalls.delete(data.callId);

        return;
      }

      if (
        data.type === "call:sfu-ready" &&
        data.targetUserId &&
        data.sessionId &&
        data.tracks
      ) {
        sendToUser(String(data.targetUserId), {
          type: "call:sfu-ready",
          fromUserId: client.userId,
          sessionId: data.sessionId,
          tracks: data.tracks,
        });

        return;
      }
    });

    ws.on("close", () => {
      clients.delete(client);

      // ================= CALL CLEANUP =================
      if (client.userId) {
        for (const [callId, call] of activeCalls.entries()) {
          if (call.participants.has(client.userId)) {
            console.log(
              "USER DISCONNECTED DURING CALL:",
              client.userId,
              callId
            );

            // notify other participants
            for (const userId of call.participants) {
              if (userId !== client.userId) {
                sendToUser(userId, {
                  type: "call:end",
                  callId,
                });
              }
            }

            activeCalls.delete(callId);
          }
        }
      }

      // ================= EXISTING CLEANUP =================
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

const PORT = Number(process.env.WS_PORT || 3535);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`💬 WS listening on ${PORT} /chat`);
});
