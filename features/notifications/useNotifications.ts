"use client";

import { useEffect, useState } from "react";

export function useNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function fetchNotifications() {
    const res = await fetch("/api/notifications");
    const data = await res.json();

    setItems(data);
    setUnreadCount(data.filter((n: any) => n.read === false).length);
  }

  /* 🔔 SSE — ONLY updates unread count */
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (typeof data.unreadDelta === "number") {
        setUnreadCount((c) => Math.max(0, c + data.unreadDelta));
      }
    };

    return () => es.close();
  }, []);

  async function clearUnread() {
    await fetch("/api/notifications/read", { method: "POST" });
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return {
    items,
    unreadCount,
    fetchNotifications, // ✅ IMPORTANT
    clearUnread,
  };
}
