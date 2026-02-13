"use client";
import { useEffect, useState, useCallback } from "react";

export function useNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data);
    setUnreadCount(data.filter((n: any) => !n.read).length);
  }, []);

  // SSE 接続
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notification", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setItems(prev => [data, ...prev]);    // 新着通知を先頭に追加
      setUnreadCount(prev => prev + 1);     // 未読カウント更新
      console.log(data);
    });

    es.addEventListener("connected", () => {
      console.log("SSE connected");
    });

    es.onerror = () => {
      // ブラウザ自動再接続
    };

    return () => es.close();
  }, []);

  const clearUnread = useCallback(async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    setUnreadCount(0);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return { items, unreadCount, fetchNotifications, clearUnread };
}
