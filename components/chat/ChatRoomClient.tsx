"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { resolveAvatar } from "@/lib/avatar";

/* ───────────────── TYPES ───────────────── */

interface Props {
  roomId: string;
  onClose: () => void;
}

interface MeResponse {
  uid: string;
  name: string;
}

interface Partner {
  uid: string;
  name: string;
  avatar?: string | null;
  avatarUpdatedAt?: string | null;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

interface MessagesResponse {
  messages: Message[]; // newest → oldest
  nextCursor: string | null;
}

type Anchor = {
  id: string;
  top: number;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "wss://ws.jearn.site/chat";

/* ───────────────── HELPERS ───────────────── */

function sameMinute(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours() &&
    da.getMinutes() === db.getMinutes()
  );
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ───────────────── COMPONENT ───────────────── */

export default function ChatRoomClient({ roomId, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]); // oldest → newest
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const sendingRef = useRef(false);

  const didInitialScrollRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const pendingRestoreRef = useRef(false);

  const anchorRef = useRef<Anchor | null>(null);

  /* ───────── LOAD ME ───────── */
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  /* ───────── LOAD ROOM INFO ───────── */
  useEffect(() => {
    fetch(`/api/chat/room/${roomId}`)
      .then((r) => r.json())
      .then((d) => setPartner(d.partner))
      .catch(() => setPartner(null));
  }, [roomId]);

  /* ───────── INITIAL LOAD ───────── */
  useEffect(() => {
    let cancelled = false;

    didInitialScrollRef.current = false;
    hasMoreRef.current = true;

    async function loadInitial() {
      const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
      const data: MessagesResponse = await res.json();
      if (cancelled) return;

      setMessages((data.messages ?? []).slice().reverse());
      setCursor(data.nextCursor);
      hasMoreRef.current = Boolean(data.nextCursor);
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  /* ───────── SCROLL MANAGEMENT ───────── */
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !messages.length) return;

    // first mount → bottom
    if (!didInitialScrollRef.current) {
      el.scrollTop = el.scrollHeight;
      didInitialScrollRef.current = true;
      return;
    }

    // restore anchor after prepend
    if (pendingRestoreRef.current) {
      restoreAnchor();
      pendingRestoreRef.current = false;
    }
  }, [messages]);

  function copyText(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  /* ───────── ANCHOR UTILS ───────── */
  function captureAnchor() {
    const container = listRef.current;
    if (!container) return;

    const containerTop = container.getBoundingClientRect().top;
    const nodes = container.querySelectorAll<HTMLElement>("[data-msg-id]");

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.bottom > containerTop) {
        anchorRef.current = {
          id: node.dataset.msgId!,
          top: rect.top,
        };
        return;
      }
    }
  }

  function restoreAnchor() {
    const container = listRef.current;
    const anchor = anchorRef.current;
    if (!container || !anchor) return;

    const node = container.querySelector<HTMLElement>(
      `[data-msg-id="${anchor.id}"]`
    );
    if (!node) return;

    const newTop = node.getBoundingClientRect().top;
    container.scrollTop += newTop - anchor.top;
    anchorRef.current = null;
  }

  /* ───────── LOAD OLDER ───────── */
  async function loadOlder() {
    if (!cursor || loadingMoreRef.current || !hasMoreRef.current) return;

    captureAnchor();
    pendingRestoreRef.current = true;
    loadingMoreRef.current = true;

    try {
      const res = await fetch(
        `/api/chat/messages?roomId=${roomId}&cursor=${cursor}`
      );
      const data: MessagesResponse = await res.json();

      if (!data.messages?.length) {
        hasMoreRef.current = false;
        return;
      }

      setMessages((prev) => [...data.messages.slice().reverse(), ...prev]);
      setCursor(data.nextCursor);
      hasMoreRef.current = Boolean(data.nextCursor);
    } finally {
      loadingMoreRef.current = false;
    }
  }

  /* ───────── WEBSOCKET ───────── */
  useEffect(() => {
    if (!me) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data?.type !== "chat:message") return;

      setMessages((prev) =>
        prev.some((m) => m.id === data.payload.id)
          ? prev
          : [...prev, data.payload]
      );

      if (isNearBottomRef.current) {
        requestAnimationFrame(() => {
          const el = listRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomId, me]);

  /* ───────── SEND ───────── */
  async function send() {
    if (!input.trim() || sendingRef.current || !me) return;

    sendingRef.current = true;
    const text = input.trim();
    setInput("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, text }),
      });
      if (!res.ok) return;

      const msg: Message = await res.json();
      setMessages((prev) => [...prev, msg]);

      wsRef.current?.send(
        JSON.stringify({
          type: "chat:message",
          roomId,
          payload: msg,
        })
      );

      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } finally {
      sendingRef.current = false;
    }
  }

  if (!me || !partner) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Loading chat…
      </div>
    );
  }

  const avatarSrc = resolveAvatar({
    avatar: partner.avatar,
    userId: partner.uid,
    avatarUpdatedAt: partner.avatarUpdatedAt,
  });

  /* ───────── RENDER ───────── */
  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      {/* TOP BAR */}
      <div className="h-14 flex items-center gap-3 px-4 border-b shrink-0">
        <button onClick={onClose} className="p-1 rounded-full">
          <ArrowLeft size={18} />
        </button>
        <img
          src={avatarSrc}
          className="w-9 h-9 rounded-full object-cover"
          alt={partner.name}
        />
        <div className="flex-1 truncate">{partner.name}</div>
      </div>

      {/* MESSAGE LIST */}
      <div
        ref={listRef}
        className="flex-1 px-2 py-3 space-y-2 no-scrollbar"
        style={{
          overflowY: loadingMoreRef.current ? "hidden" : "auto",
          overflowAnchor: "none",
          overscrollBehavior: "contain",
        }}
        onScroll={(e) => {
          if (loadingMoreRef.current) return;
          setActiveMsgId(null);
          const el = e.currentTarget;
          isNearBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;

          if (el.scrollTop < 40) loadOlder();
        }}
      >
        {loadingMoreRef.current && (
          <div className="h-6 text-center text-xs text-gray-400">Loading…</div>
        )}

        {messages.map((m, i) => {
          const next = messages[i + 1];
          const isMe = m.senderId === me.uid;
          const isActive = activeMsgId === m.id;

          const showTime =
            !next ||
            next.senderId !== m.senderId ||
            !sameMinute(m.createdAt, next.createdAt);

          return (
            <div
              key={m.id}
              data-msg-id={m.id}
              className={clsx(
                "relative flex w-full px-12 rounded-lg transition-colors",
                isMe ? "justify-end" : "justify-start",
                isActive && "bg-black/5 dark:bg-white/5"
              )}
              onPointerDown={() => {
                const timer = window.setTimeout(() => {
                  setActiveMsgId(m.id);
                }, 450);

                const clear = () => {
                  clearTimeout(timer);
                  window.removeEventListener("pointerup", clear);
                  window.removeEventListener("pointercancel", clear);
                };

                window.addEventListener("pointerup", clear);
                window.addEventListener("pointercancel", clear);
              }}
              onMouseEnter={() => setActiveMsgId(m.id)}
              onMouseLeave={() => setActiveMsgId(null)}
            >
              {/* ACTION (inside row, never clipped) */}
              {isActive && (
                <div
                  className={clsx(
                    "absolute top-1/2 -translate-y-1/2 z-20",
                    isMe ? "left-2" : "right-2"
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyText(m.text);
                      setActiveMsgId(null);
                    }}
                    className="
              px-2 py-1
              rounded-md
              text-xs
              bg-black/80 text-white
              hover:bg-black
              active:scale-95
              transition
              select-none
            "
                  >
                    Copy
                  </button>
                </div>
              )}

              {/* MESSAGE */}
              <div className="max-w-[75%] relative z-10">
                <div
                  className={clsx(
                    "px-3 py-2 rounded-2xl text-sm break-words",
                    isMe
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-neutral-200 dark:bg-neutral-800 rounded-bl-sm",
                    isActive && "select-none"
                  )}
                >
                  {m.text}
                </div>

                {showTime && (
                  <div
                    className={clsx(
                      "mt-1 text-[10px] text-gray-400",
                      isMe ? "text-right" : "text-left"
                    )}
                  >
                    {formatTime(m.createdAt)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* INPUT */}
      <div className="border-t px-2 py-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1 border rounded-full px-4 py-2 text-sm"
            placeholder="Message…"
          />
          <button
            onClick={send}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
