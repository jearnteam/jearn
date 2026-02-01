import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.WS_PORT) || 3535;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws: WebSocket) => {
  console.log("WS connected");

  ws.on("message", (msg: Buffer) => {
    ws.send(`echo: ${msg.toString()}`);
  });
});
