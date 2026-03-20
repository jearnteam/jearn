"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, Send } from "lucide-react";
import { avatarUrl } from "@/lib/avatarUrl";
import { useChatSocket } from "@/features/chat/ChatSocketProvider";
import DirectCallButton from "@/components/call/DirectCallButton";
import Avatar from "../Avatar";

/* ───────────────── TYPES ───────────────── */

interface Props {
  roomId: string;
  onClose: () => void;
}

interface MeResponse {
  uid: string;
  name: string;
}

export interface Partner {
  uid: string;
  name: string;
  bio?: string;
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
  isLastPage: boolean;
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

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function ChatInfoBlock({ partner }: { partner: Partner }) {
  const avatarSrc = avatarUrl(partner.uid ?? "", partner.avatarUpdatedAt);

  return (
    <div className="flex flex-col items-center py-8 text-center text-gray-500">
      <Avatar id={partner.uid} size={36} url={avatarSrc} />

      <div className="font-medium text-gray-800 dark:text-gray-200">
        {partner.name}
      </div>
      {partner.bio && (
        <div className="text-sm text-gray-400">{partner.bio.slice(0, 8)}</div>
      )}
    </div>
  );
}

/* ───────────────── COMPONENT ───────────────── */

export default function ChatRoomClient({ roomId, onClose }: Props) {
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { joinRoom, leaveRoom, subscribeRoom, sendRoomMessage, status } =
    useChatSocket();
  const [hasAnyMessages, setHasAnyMessages] = useState<boolean | null>(null);
  const [reachedBeginning, setReachedBeginning] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showOlderLoading, setShowOlderLoading] = useState(false);

  const [input, setInput] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomMsgRef = useRef<HTMLDivElement | null>(null);

  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const sendingRef = useRef(false);

  const didInitialScrollRef = useRef(false);
  const pendingRestoreRef = useRef(false);
  const anchorRef = useRef<Anchor | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const MAX_TEXTAREA_HEIGHT = 120; // px (~5–6 lines)

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Reset height so shrink works
    el.style.height = "auto";

    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;

    // Enable scroll only when max reached
    el.style.overflowY =
      el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  /* ───────── LOAD ME ───────── */

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  /* ───────── INITIAL LOAD ───────── */

  useEffect(() => {
    let cancelled = false;

    didInitialScrollRef.current = false;
    hasMoreRef.current = true;

    setMessages([]);
    setCursor(null);
    setInitialLoaded(false);
    setHasAnyMessages(null); // 🔑 reset authoritative state
    setReachedBeginning(false);

    (async () => {
      try {
        const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
        const data: MessagesResponse = await res.json();
        if (cancelled) return;

        const msgs = (data.messages ?? [])
          .slice()
          .reverse()
          .map(normalizeMessage);

        setMessages(msgs);
        setCursor(data.nextCursor);
        hasMoreRef.current = Boolean(data.nextCursor);

        setHasAnyMessages(msgs.length > 0);
        setReachedBeginning(data.isLastPage); // 🔥 IMPORTANT
      } finally {
        if (!cancelled) setInitialLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  /* ───────── LOAD ROOM INFO ───────── */

  useEffect(() => {
    let cancelled = false;

    setPartner(null); // reset on room switch

    fetch(`/api/chat/room/${roomId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPartner(d.partner);
      })
      .catch(() => {
        if (!cancelled) setPartner(null);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    fetch("/api/chat/room/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
  }, [roomId]);

  const { setActiveRoom } = useChatSocket();

  useEffect(() => {
    setActiveRoom(roomId);
    return () => setActiveRoom(null);
  }, [roomId, setActiveRoom]);

  /* ───────── SCROLL MANAGEMENT ───────── */

  useLayoutEffect(() => {
    if (!initialLoaded) return;
    if (!messages.length) return; // 🔥 wait until messages exist
    if (didInitialScrollRef.current) return;

    const el = listRef.current;
    if (!el) return;

    // force bottom
    el.scrollTop = el.scrollHeight;

    // double frame (mobile safe)
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;

      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        didInitialScrollRef.current = true;
      });
    });
  }, [initialLoaded, messages.length]);

  /* ───────── ANCHOR UTILS ───────── */

  function scrollToBottom() {
    const el = listRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }

  /* ───────── LOAD OLDER ───────── */

  async function loadOlder() {
    if (!cursor || loadingMoreRef.current || !hasMoreRef.current) return;

    const el = listRef.current;
    if (!el) return;

    loadingMoreRef.current = true;
    setShowOlderLoading(true);

    // 🔥 1. Capture current scroll position
    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    try {
      const res = await fetch(
        `/api/chat/messages?roomId=${roomId}&cursor=${cursor}`
      );
      const data: MessagesResponse = await res.json();

      const older = data.messages.slice().reverse().map(normalizeMessage);

      // 🔥 2. Insert older messages
      setMessages((prev) => [...older, ...prev]);

      setCursor(data.nextCursor);
      hasMoreRef.current = Boolean(data.nextCursor);

      if (data.isLastPage) {
        setReachedBeginning(true);
      }

      // 🔥 3. Wait for DOM update then restore position
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        const heightDiff = newScrollHeight - prevScrollHeight;

        el.scrollTop = prevScrollTop + heightDiff;
      });
    } finally {
      loadingMoreRef.current = false;
      setShowOlderLoading(false);
    }
  }

  /* ───────── WEBSOCKET ───────── */

  useEffect(() => {
    if (!roomId) return;

    const unsub = subscribeRoom(roomId, (payload) => {
      const msg = payload as Message;

      const el = listRef.current;
      const nearBottom =
        !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 400;

      setMessages((prev) =>
        prev.some((m) => m.id === msg.id)
          ? prev
          : [...prev, normalizeMessage(msg)]
      );

      if (nearBottom) {
        requestAnimationFrame(() => {
          scrollToBottom();
          requestAnimationFrame(() => scrollToBottom());
        });
      } else {
        setUnreadCount((c) => c + 1);
      }
    });

    return () => {
      unsub();
    };
  }, [roomId, subscribeRoom]);

  /* ───────── SEND ───────── */

  async function send() {
    if (sendingRef.current || !me) return;

    const text = input.replace(/[ \t]+$/g, "");
    if (!text) return;

    sendingRef.current = true;
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

      sendRoomMessage(roomId, msg);

      requestAnimationFrame(() => scrollToBottom());
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

  function normalizeMessage(m: Message): Message {
    return {
      ...m,
      text: m.text.trim(),
    };
  }

  const avatarSrc = avatarUrl(partner.uid ?? "", partner.avatarUpdatedAt);
  /* ───────── RENDER ───────── */

  return (
    <div className="flex flex-col h-full relative">
      {/* TOP BAR */}
      <div className="h-14 flex items-center px-4 border-b shrink-0">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onClose}>
            <ArrowLeft size={18} />
          </button>

          <Avatar id={partner.uid} size={36} url={avatarSrc} />

          <div className="truncate">{partner.name}</div>
        </div>

        {/* RIGHT SIDE */}
        <DirectCallButton roomId={roomId} partner={partner} />
      </div>

      {/* LOADING OLDER */}
      {showOlderLoading && (
        <div className="absolute top-14 inset-x-0 flex justify-center z-20">
          <div className="px-3 py-1 rounded-full text-xs bg-black/70 text-white">
            Loading messages…
          </div>
        </div>
      )}

      {/* MESSAGE LIST */}
      <div
        ref={listRef}
        className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden py-3 space-y-2 no-scrollbar"
        onScroll={(e) => {
          if (loadingMoreRef.current) return;

          pendingRestoreRef.current = false;
          anchorRef.current = null;

          const el = e.currentTarget;
          if (el.scrollTop < 40) loadOlder();

          const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (nearBottom) setUnreadCount(0);
        }}
      >
        {/* CENTERED CHAT COLUMN */}
        <div className="mx-auto w-full max-w-[720px] py-3 space-y-1 flex flex-col flex-1">
          {/* BEGINNING OF CHAT (API CONFIRMED) */}
          {initialLoaded &&
            partner &&
            (messages.length === 0 || reachedBeginning) && (
              <ChatInfoBlock partner={partner} />
            )}
          {messages.map((m, i) => {
            const next = messages[i + 1];
            const isMe = m.senderId === me.uid;
            const isLast = i === messages.length - 1;

            const showTime =
              !next ||
              next.senderId !== m.senderId ||
              !sameMinute(m.createdAt, next.createdAt);

            return (
              <div
                key={m.id}
                ref={isLast ? bottomMsgRef : null}
                data-msg-id={m.id}
                className={clsx(
                  "relative flex max-w-full px-2 overflow-hidden transition-colors",
                  isMe ? "justify-end" : "justify-start",
                  activeMsgId === m.id &&
                    "bg-black/5 dark:bg-white/5 rounded-lg"
                )}
                onMouseEnter={() => setActiveMsgId(m.id)}
                onMouseLeave={() => setActiveMsgId(null)}
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
              >
                <div className="max-w-[75%] relative">
                  {/* COPY BUTTON */}
                  {activeMsgId === m.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(m.text);
                        setActiveMsgId(null);
                      }}
                      className={clsx(
                        "absolute top-1/2 -translate-y-1/2 z-20",
                        isMe ? "-left-14" : "-right-14",
                        "px-2 py-1 rounded-md text-xs",
                        "bg-black/80 text-white hover:bg-black"
                      )}
                    >
                      Copy
                    </button>
                  )}

                  <div
                    className={clsx(
                      "px-3 py-2 rounded-[7px] text-sm",
                      "whitespace-pre-wrap break-words",
                      "ring-1 ring-black/5 dark:ring-white/10",
                      isMe
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
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
      </div>

      {/* UNREAD */}
      {unreadCount > 0 && (
        <button
          onClick={() => {
            scrollToBottom();
            setUnreadCount(0);
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full"
        >
          {unreadCount} new message{unreadCount > 1 ? "s" : ""} ↓
        </button>
      )}

      {/* INPUT */}
      <div className="shrink-0 bg-white dark:bg-black mb-2 lg:mb-0">
        <div className="mx-auto max-w-[720px] border-t">
          <div className="px-3 py-3 flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isMobile) {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }
              }}
              rows={1}
              className="
          flex-1 resize-none
          border rounded-2xl px-4 py-2
          text-base sm:text-sm
          leading-5
          focus:outline-none
          overflow-hidden
          no-scrollbar
        "
              placeholder="Message…"
            />

            <button
              onClick={send}
              disabled={!input.trim()}
              className="
          shrink-0
          h-10 w-10
          flex items-center justify-center
          rounded-full
          bg-blue-600 text-white
          disabled:opacity-40
          disabled:cursor-not-allowed
          active:scale-95
          transition
        "
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
