"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveAvatar } from "@/lib/avatar";
import { useChatSocket } from "@/features/chat/ChatSocketProvider";

interface Partner {
  uid: string;
  name: string;
  avatar?: string | null;
  avatarUpdatedAt?: string | null;
}

type ChatItem =
  | {
      type: "room";
      roomId: string;
      partner: Partner;
      lastMessage: {
        text: string;
        createdAt: string;
      };
    }
  | {
      type: "follow";
      partner: Partner;
    };

export default function ChatListClient({
  active,
  onOpenRoom,
}: {
  active: boolean;
  onOpenRoom: (roomId: string) => void;
}) {
  const {
    onlineUserIds,
    subscribeRoom,
    joinRoom,
    leaveRoom,
    clearRoomUnread,
    setActiveRoom,
    getRoomUnread,
  } = useChatSocket();
  const activeRoomRef = useRef<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ──────────────────────────────
     LOAD ROOMS + FOLLOWED USERS
  ────────────────────────────── */

  useEffect(() => {
    if (!active) return;

    async function loadAll() {
      setLoading(true);
      try {
        const [roomsRes, followRes] = await Promise.all([
          fetch("/api/chat/list"),
          fetch("/api/follow/me"),
        ]);

        const roomsData = await roomsRes.json();
        const followData = await followRes.json();

        const rooms = (roomsData.rooms ?? []).map((r: any) => ({
          ...r,
          type: "room" as const,
        }));

        const existingPartnerIds = new Set(
          rooms.map((r: any) => r.partner.uid)
        );

        const followUsers = (followData.users ?? [])
          .filter((u: any) => !existingPartnerIds.has(u.uid))
          .map((u: any) => ({
            type: "follow" as const,
            partner: u,
          }));

        setItems([...rooms, ...followUsers]);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [active]);

  /* ──────────────────────────────
     WEBSOCKET ROOM UPDATES
  ────────────────────────────── */
  const roomIds = useMemo(
    () =>
      items
        .filter((i) => i.type === "room")
        .map((i) => (i as Extract<ChatItem, { type: "room" }>).roomId),
    [items]
  );
  useEffect(() => {
    if (!roomIds.length) return;

    const unsubs = roomIds.map((roomId) =>
      subscribeRoom(roomId, (payload) => {
        const msg = payload as {
          text: string;
          createdAt: string;
        };

        setItems((prev) => {
          const idx = prev.findIndex(
            (x) => x.type === "room" && x.roomId === roomId
          );
          if (idx === -1) return prev;

          const room = prev[idx] as any;

          const updated = {
            ...room,
            lastMessage: {
              text: msg.text,
              createdAt: msg.createdAt,
            },
          };

          const next = [...prev];
          next.splice(idx, 1);

          return [updated, ...next];
        });
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [roomIds, subscribeRoom]);

  function formatChatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();

    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    const time = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (isSameDay) {
      return time; // 3:30
    }

    if (isYesterday) {
      return `Yesterday ${time}`; // Yesterday 3:30
    }

    const datePart = date.toLocaleDateString(); // 2/2/2025
    return `${datePart} ${time}`;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        Loading chats…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      {items.map((item) => {
        const partner = item.partner;

        const avatarSrc = resolveAvatar({
          avatar: partner.avatar,
          userId: partner.uid,
          avatarUpdatedAt: partner.avatarUpdatedAt,
        });

        const unread = item.type === "room" ? getRoomUnread(item.roomId) : 0;

        const hasUnread = unread > 0;

        const isOnline = onlineUserIds.has(partner.uid);

        return (
          <div className="relative mx-2">
            <button
              key={item.type === "room" ? item.roomId : `follow-${partner.uid}`}
              onClick={async () => {
                if (item.type === "room") {
                  await fetch("/api/chat/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomId: item.roomId }),
                  });
                  setActiveRoom(item.roomId);
                  onOpenRoom(item.roomId);
                } else {
                  const res = await fetch("/api/chat/room", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      targetUserId: partner.uid,
                    }),
                  });

                  const data = await res.json();
                  setActiveRoom(data.roomId);
                  onOpenRoom(data.roomId);
                }
              }}
              className={`
                w-full
                rounded-xl
                flex items-center gap-3
                px-4 py-3
                transition-colors duration-200
                ${
                  hasUnread
                    ? "bg-blue-50 dark:bg-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-800/50"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                }
              `}
            >
              <div className="relative shrink-0">
                <img
                  src={avatarSrc}
                  className="w-11 h-11 rounded-full object-cover"
                  alt={partner.name}
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-black" />
                )}
              </div>

              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <div
                    className={`truncate text-sm ${
                      hasUnread
                        ? "font-semibold text-black dark:text-white"
                        : "font-medium text-black dark:text-white"
                    }`}
                  >
                    {partner.name}
                  </div>

                  {item.type === "room" && (
                    <div
                      className="truncate text-sm mt-0.5 text-gray-500 dark:text-gray-400"
                      title={item.lastMessage.text}
                    >
                      {item.lastMessage.text}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end justify-center min-w-[52px] ml-2">
                  {item.type === "room" && (
                    <span
                      className={`text-xs ${
                        hasUnread
                          ? "text-blue-600 font-medium"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {formatChatTime(item.lastMessage.createdAt)}
                    </span>
                  )}

                  {hasUnread && (
                    <span className="mt-1 min-w-[20px] h-5 px-2 flex items-center justify-center text-[11px] font-semibold bg-blue-600 text-white rounded-full leading-none">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
            <div className="absolute bottom-0 left-4 right-4 h-px bg-neutral-200 dark:bg-neutral-800" />
          </div>
        );
      })}
    </div>
  );
}
