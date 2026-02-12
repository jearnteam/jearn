"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔒 Prevent overlapping fetche
  const fetchingRef = useRef(false);

  /* ---------------------------------------------
   * FETCH NOTIFICATIONS (ON DEMAND ONLY)
   * ------------------------------------------- */
  const fetchNotifications = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();

      setItems(data);
      setUnreadCount(data.filter((n: any) => n.read === false).length);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  /* ---------------------------------------------
   * SSE — TRIGGER FETCH ON EVENT
   * ------------------------------------------- */
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notification", () => {
      fetchNotifications();
    });

    return () => {
      es.close();
    };
  }, [fetchNotifications]);

  /* ---------------------------------------------
   * MARK ALL READ
   * ------------------------------------------- */
  const clearUnread = useCallback(async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
    });

    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return {
    items,
    unreadCount,
    fetchNotifications, // call ON TAB OPEN
    clearUnread,
  };
}
