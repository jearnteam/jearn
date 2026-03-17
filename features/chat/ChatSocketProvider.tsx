"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type WSStatus = "connecting" | "open" | "closed";

type SignalCallback = (data: any) => void;

type ChatSocketContextValue = {
  status: WSStatus;
  onlineUserIds: Set<string>;
  currentUserId: string;

  totalUnread: number;
  clearRoomUnread: (roomId: string) => void;
  getRoomUnread: (roomId: string) => number;

  setActiveRoom: (roomId: string | null) => void;

  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendRoomMessage: (roomId: string, payload: any) => void;
  send: (payload: any) => void;

  subscribeRoom: (roomId: string, cb: (payload: any) => void) => () => void;
  subscribeSignal: (cb: SignalCallback) => () => void;
};

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";

  if (window.location.hostname === "localhost") {
    return `${protocol}://localhost:3535/chat`;
  }

  return `${protocol}://ws.jearn.site/chat`;
}

export function ChatSocketProvider({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: React.ReactNode;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const roomSubsRef = useRef<Map<string, Set<(payload: any) => void>>>(
    new Map()
  );
  const signalSubsRef = useRef<Set<SignalCallback>>(new Set());

  const [roomUnreadMap, setRoomUnreadMap] = useState<Map<string, number>>(
    new Map()
  );

  const totalUnread = useMemo(() => {
    let total = 0;
    for (const value of roomUnreadMap.values()) total += value;
    return total;
  }, [roomUnreadMap]);

  const [status, setStatus] = useState<WSStatus>("connecting");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const activeRoomRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  const [onlineUserIdsState, setOnlineUserIdsState] = useState<Set<string>>(
    new Set()
  );
  const pendingRef = useRef<any[]>([]);

  const sendRaw = useCallback((obj: any) => {
    const ws = wsRef.current;
    console.log("WS SEND:", obj);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log("WS NOT OPEN");
      return false;
    }

    ws.send(JSON.stringify(obj));
    return true;
  }, []);

  const joinRoom = useCallback(
    (roomId: string) => {
      if (!roomId) return;
      joinedRoomsRef.current.add(roomId);
      sendRaw({ type: "join", roomId });
    },
    [sendRaw]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      if (!roomId) return;
      joinedRoomsRef.current.delete(roomId);
      sendRaw({ type: "leave", roomId });
    },
    [sendRaw]
  );

  const send = useCallback(
    (payload: any) => {
      const ok = sendRaw(payload);
      if (!ok) pendingRef.current.push(payload);
    },
    [sendRaw]
  );

  const sendRoomMessage = useCallback(
    (roomId: string, payload: any) => {
      if (!roomId) return;
      const msg = { type: "chat:message", roomId, payload };
      const ok = sendRaw(msg);
      if (!ok) pendingRef.current.push(msg);
    },
    [sendRaw]
  );

  const subscribeRoom = useCallback(
    (roomId: string, cb: (payload: any) => void) => {
      if (!roomId) return () => {};

      let set = roomSubsRef.current.get(roomId);
      if (!set) {
        set = new Set();
        roomSubsRef.current.set(roomId, set);
      }
      set.add(cb);

      return () => {
        const s = roomSubsRef.current.get(roomId);
        if (!s) return;
        s.delete(cb);
        if (s.size === 0) roomSubsRef.current.delete(roomId);
      };
    },
    []
  );

  const subscribeSignal = useCallback((cb: SignalCallback) => {
    signalSubsRef.current.add(cb);
    return () => {
      signalSubsRef.current.delete(cb);
    };
  }, []);

  const clearRoomUnread = useCallback((roomId: string) => {
    setRoomUnreadMap((prev) => {
      const next = new Map(prev);
      next.set(roomId, 0);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    async function hydrateUnread() {
      try {
        const res = await fetch("/api/chat/list", { credentials: "include" });
        const data = await res.json();
        if (!data?.rooms) return;

        const next = new Map<string, number>();
        for (const room of data.rooms) {
          next.set(room.roomId, room.unreadCount ?? 0);
          joinedRoomsRef.current.add(room.roomId);
        }
        setRoomUnreadMap(next);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          for (const roomId of joinedRoomsRef.current) {
            wsRef.current.send(JSON.stringify({ type: "join", roomId }));
          }
        }
      } catch {}
    }

    hydrateUnread();
  }, [currentUserId]);

  const getRoomUnread = useCallback(
    (roomId: string) => {
      return roomUnreadMap.get(roomId) ?? 0;
    },
    [roomUnreadMap]
  );

  const setActiveRoom = useCallback((roomId: string | null) => {
    setActiveRoomId((prev) => {
      if (prev === roomId) return prev;
      return roomId;
    });

    activeRoomRef.current = roomId;

    if (roomId) {
      setRoomUnreadMap((prev) => {
        const current = prev.get(roomId) ?? 0;
        if (current === 0) return prev;

        const next = new Map(prev);
        next.set(roomId, 0);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    let closedManually = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      clearReconnect();
      if (closedManually) return;

      const attempt = reconnectAttemptRef.current++;
      const base =
        attempt === 0 ? 200 : Math.min(200 * Math.pow(1.6, attempt), 3000);
      const jitter = Math.floor(Math.random() * 150);
      const delay = base + jitter;

      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (closedManually) return;

      try {
        wsRef.current?.close();
      } catch {}

      wsRef.current = null;
      setStatus("connecting");

      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus("open");

        ws.send(
          JSON.stringify({ type: "presence:init", userId: currentUserId })
        );

        for (const roomId of joinedRoomsRef.current) {
          ws.send(JSON.stringify({ type: "join", roomId }));
        }

        const q = pendingRef.current;
        pendingRef.current = [];
        for (const item of q) {
          ws.send(JSON.stringify(item));
        }
      };

      ws.onmessage = (e) => {
        let data: any;
        try {
          data = JSON.parse(e.data);
        } catch {
          return;
        }

        console.log("WS RECV:", data);

        for (const cb of signalSubsRef.current) {
          cb(data);
        }

        if (data?.type === "presence:update") {
          setOnlineUserIdsState(new Set(data.onlineUserIds ?? []));
          return;
        }

        if (data?.type === "chat:message") {
          const roomId = data.roomId;
          const payload = data.payload;
          if (!roomId || !payload) return;

          const senderId = payload.senderId;
          const isActiveRoom = roomId === activeRoomRef.current;
          const isOwnMessage = senderId === currentUserId;

          if (!isActiveRoom && !isOwnMessage) {
            setRoomUnreadMap((prev) => {
              const next = new Map(prev);
              next.set(roomId, (next.get(roomId) ?? 0) + 1);
              return next;
            });
          }

          const subs = roomSubsRef.current.get(roomId);
          if (!subs) return;
          for (const cb of subs) cb(payload);
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        setStatus("closed");
        scheduleReconnect();
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    connect();

    return () => {
      closedManually = true;
      clearReconnect();
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
      setStatus("closed");
    };
  }, [currentUserId]);

  const value = useMemo<ChatSocketContextValue>(
    () => ({
      status,
      onlineUserIds: onlineUserIdsState,
      currentUserId,
      totalUnread,
      clearRoomUnread,
      getRoomUnread,
      setActiveRoom,
      joinRoom,
      leaveRoom,
      sendRoomMessage,
      send,
      subscribeRoom,
      subscribeSignal,
    }),
    [
      status,
      onlineUserIdsState,
      currentUserId,
      totalUnread,
      clearRoomUnread,
      getRoomUnread,
      joinRoom,
      leaveRoom,
      sendRoomMessage,
      send,
      subscribeRoom,
      subscribeSignal,
    ]
  );

  return (
    <ChatSocketContext.Provider value={value}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx)
    throw new Error("useChatSocket must be used inside ChatSocketProvider");
  return ctx;
}
