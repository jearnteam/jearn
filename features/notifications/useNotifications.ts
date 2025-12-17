"use client";

import { useEffect, useState } from "react";

export function useNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  /* ---------------------------------------------
   * INITIAL LOAD
   * ------------------------------------------- */
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/notifications");
      const data = await res.json();

      setItems(data);

      // collect unread ones
      const unread = data.filter((n: any) => n.read === false);
      setUnreadCount(unread.length);
      setNewIds(new Set(unread.map((n: any) => String(n._id))));

      // mark as read immediately
      if (unread.length > 0) {
        await fetch("/api/notifications/read", { method: "POST" });

        // update local state (but keep newIds for highlight)
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    })();
  }, []);

  /* ---------------------------------------------
   * REALTIME SSE
   * ------------------------------------------- */
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notification", async (e) => {
      const payload = JSON.parse((e as MessageEvent).data);

      // simplest + safest: refetch
      const res = await fetch("/api/notifications");
      const data = await res.json();

      setItems(data);

      // unread count only changes if backend says so
      if (payload.unreadDelta) {
        setUnreadCount((c) => c + payload.unreadDelta);
      }
    });

    return () => es.close();
  }, []);

  function clearUnread() {
    setUnreadCount(0);
    setNewIds(new Set());
  }

  /* ---------------------------------------------
   * RETURN API
   * ------------------------------------------- */
  return {
    items,
    newIds,
    unreadCount,
    clearUnread,
  };
}
