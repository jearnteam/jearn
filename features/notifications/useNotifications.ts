"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function useNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  const { t } = useTranslation();

  /* ---------------------------------------------
   * INITIAL LOAD (NO AUTO-READ)
   * ------------------------------------------- */
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/notifications");
      const data = await res.json();

      setItems(data);

      const unread = data.filter((n: any) => n.read === false);
      setUnreadCount(unread.length);
      setNewIds(new Set(unread.map((n: any) => String(n._id))));
    })();
  }, []);

  /* ---------------------------------------------
   * REALTIME SSE (SINGLE SOURCE OF TRUTH)
   * ------------------------------------------- */
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onmessage = async (e) => {
      const data = JSON.parse(e.data);

      // 🔔 update unread count
      if (typeof data.unreadDelta === "number") {
        setUnreadCount((c) => Math.max(0, c + data.unreadDelta));
      }

      // ✨ highlight as new
      if (data.notificationId) {
        setNewIds((prev) => new Set(prev).add(String(data.notificationId)));
      }

      // 🔄 safest: refetch list
      const res = await fetch("/api/notifications");
      const list = await res.json();
      setItems(list);
    };

    return () => es.close();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notification", (e) => {
      const data = JSON.parse((e as MessageEvent).data);

      console.log("📩 SSE received:", data);

      if (typeof data.unreadDelta === "number") {
        setUnreadCount((c) => Math.max(0, c + data.unreadDelta));
      }

      if (data.notificationId) {
        setNewIds((prev) => new Set(prev).add(data.notificationId));
      }
    });

    es.onerror = (e) => {
      console.error("❌ SSE error", e);
    };

    return () => es.close();
  }, []);

  /* ---------------------------------------------
   * CLEAR UNREAD (CALLED WHEN LEAVING PAGE)
   * ------------------------------------------- */
  async function clearUnread() {
    setUnreadCount(0);
    setNewIds(new Set());

    await fetch("/api/notifications/read", {
      method: "POST",
    });

    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return {
    items,
    newIds,
    unreadCount,
    clearUnread,
  };
}
