"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { resolveAvatar } from "@/lib/avatar";

interface ChatRoomItem {
  type: "room" | "new";
  roomId?: string;
  partner: {
    uid: string;
    name: string;
    avatar?: string | null;
    avatarUpdatedAt?: string | null;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
  } | null;
  unreadCount?: number;
}

function formatTime(ts?: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatListClient({
  onOpenRoom,
}: {
  onOpenRoom: (roomId: string) => void;
}) {
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingUid, setCreatingUid] = useState<string | null>(null);

  /* ───────── LOAD CHAT LIST ───────── */
  useEffect(() => {
    fetch("/api/chat/list")
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms ?? []))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  /* ───────── START NEW CHAT ───────── */
  async function startChat(targetUid: string) {
    if (creatingUid) return;
    setCreatingUid(targetUid);

    try {
      const res = await fetch("/api/chat/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUid }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Failed to create room:", err);
        return;
      }

      const { roomId } = await res.json();

      console.log("🟢 redirecting to room:", roomId);

      // 🔥 Ensure room exists in list (insert if missing)
      setRooms((prev) => {
        const exists = prev.some(
          (r) => r.type === "room" && r.roomId === roomId
        );

        if (exists) return prev;

        const target = prev.find((r) => r.partner.uid === targetUid);

        if (!target) return prev;

        const newRoom: ChatRoomItem = {
          type: "room",
          roomId,
          partner: target.partner,
          lastMessage: null,
          unreadCount: 0,
        };

        return [newRoom, ...prev.filter((r) => r.partner.uid !== targetUid)];
      });

      // 🔥 Redirect must NOT depend on state update
      onOpenRoom(roomId);
    } finally {
      setCreatingUid(null);
    }
  }

  /* ───────── RENDER ───────── */
  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-lg font-semibold">Chats</h1>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading && (
          <div className="p-4 text-sm text-gray-500">Loading chats…</div>
        )}

        {!loading && rooms.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No conversations yet</div>
        )}

        {rooms.map((r) => {
          const isCreating = creatingUid === r.partner.uid;

          const avatarSrc = resolveAvatar({
            avatar: r.partner.avatar,
            userId: r.partner.uid,
            avatarUpdatedAt: r.partner.avatarUpdatedAt,
          });

          return (
            <button
              key={r.type === "room" ? r.roomId : r.partner.uid}
              onClick={() =>
                r.type === "room"
                  ? onOpenRoom(r.roomId!)
                  : startChat(r.partner.uid)
              }
              disabled={isCreating}
              className="
                w-full flex items-center gap-3
                px-4 py-3
                text-left
                hover:bg-neutral-100 dark:hover:bg-neutral-800
                disabled:opacity-60
              "
            >
              {/* AVATAR */}
              <img
                src={avatarSrc}
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
                className="
                  w-11 h-11 rounded-full
                  object-cover shrink-0
                  bg-neutral-300
                "
                alt={r.partner.name}
              />

              {/* CONTENT */}
              <div className="flex-1 min-w-0">
                {/* TOP ROW */}
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{r.partner.name}</div>

                  {r.type === "room" &&
                    r.unreadCount !== undefined &&
                    r.unreadCount > 0 && (
                      <div
                        className="
                          shrink-0
                          min-w-[20px]
                          px-1.5
                          h-5
                          flex items-center justify-center
                          rounded-full
                          bg-blue-600 text-white
                          text-xs font-medium
                        "
                      >
                        {r.unreadCount > 99 ? "99+" : r.unreadCount}
                      </div>
                    )}
                </div>

                {/* LAST MESSAGE + TIME */}
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      "flex-1 min-w-0 truncate text-sm",
                      r.lastMessage ? "text-gray-500" : "text-gray-400 italic"
                    )}
                  >
                    {isCreating
                      ? "Creating chat…"
                      : r.type === "room"
                      ? r.lastMessage?.text ?? "No messages yet"
                      : "Start chatting"}
                  </div>

                  {r.type === "room" && r.lastMessage && (
                    <div className="shrink-0 text-xs text-gray-400">
                      {formatTime(r.lastMessage.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
