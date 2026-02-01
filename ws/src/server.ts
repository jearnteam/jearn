import http from "http";
import { WebSocketServer, WebSocket } from "ws";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */

type WSClient = WebSocket & {
  rooms: Set<string>;
};

/* ---------------------------------------------
 * HTTP SERVER (KEEP THIS)
 * ------------------------------------------- */

const server = http.createServer((req, res) => {
  console.log("HTTP:", req.method, req.url);
  res.writeHead(200);
  res.end("OK");
});

/* ---------------------------------------------
 * WS SERVER (UPGRADE MODE)
 * ------------------------------------------- */

const wss = new WebSocketServer({ noServer: true });
const clients = new Set<WSClient>();

/* ---------------------------------------------
 * UPGRADE HANDLER (KEEP STRUCTURE)
 * ------------------------------------------- */

server.on("upgrade", (req, socket, head) => {
  console.log("UPGRADE:", req.url);

  if (req.url !== "/chat") {
    console.log("REJECTED PATH");
    socket.destroy();
    return;
  }

  console.log("UPGRADE OK");

  wss.handleUpgrade(req, socket, head, (ws) => {
    console.log("WS CONNECTED");

    const client = ws as WSClient;
    client.rooms = new Set();
    clients.add(client);

    /* ---------------- MESSAGE ---------------- */

    ws.on("message", (raw) => {
      let data: any;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      /* JOIN ROOM */
      if (data.type === "join" && data.roomId) {
        client.rooms.add(data.roomId);
        console.log("JOIN ROOM:", data.roomId);
        return;
      }

      /* CHAT MESSAGE SIGNAL */
      if (
        data.type === "chat:message" &&
        data.roomId &&
        data.payload
      ) {
        for (const c of clients) {
          if (
            c !== client &&
            c.readyState === WebSocket.OPEN &&
            c.rooms.has(data.roomId)
          ) {
            c.send(
              JSON.stringify({
                type: "chat:message",
                payload: data.payload,
              })
            );
          }
        }
      }
    });

    /* ---------------- CLOSE ---------------- */

    ws.on("close", () => {
      clients.delete(client);
      console.log("WS DISCONNECTED");
    });
  });
});

/* ---------------------------------------------
 * LISTEN
 * ------------------------------------------- */

server.listen(3535, "0.0.0.0", () => {
  console.log("💬 Chat WS listening on 3535 /chat");
});
