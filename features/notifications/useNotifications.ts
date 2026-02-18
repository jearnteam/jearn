"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export type Notification = {
  _id: string;
  type: "post_like" | "comment" | "mention" | "system" | "follow" | "answer";
  postId?: string;
  lastActorName: string;
  lastActorAvatar?: string;
  postPreview?: string;
  count?: number;
  createdAt: string;
  updatedAt?: string;
  read?: boolean;
};

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false); // ← Loading 追加
  const sseRef = useRef<EventSource | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (items.length === 0) {
      setLoading(true);
    }
  
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data: Notification[] = await res.json();
      setItems(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } finally {
      setLoading(false);
    }
  }, [items.length]);
  

  // SSE 接続
  const initSSE = useCallback(() => {
    if (sseRef.current) return;

    const es = new EventSource("/api/notifications/stream");
    sseRef.current = es;

    es.addEventListener("notification", (e: MessageEvent) => {
      try {
        const data: Notification = JSON.parse(e.data);
        setItems(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);
      } catch {
        console.warn("⚠️ SSE parse error");
      }
    });

    es.addEventListener("connected", () => console.log("SSE connected"));

    es.onerror = () => {
      es.close();
      sseRef.current = null;
      setTimeout(initSSE, 3000); // 自動再接続
    };
  }, []);

  useEffect(() => {
    initSSE();
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [initSSE]);

  const clearUnread = useCallback(async () => {
    try {
      await fetch("/api/notifications/read", { method: "POST" });
      setUnreadCount(0);
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      console.error("Failed to mark notifications as read");
    }
  }, []);

  return { items, unreadCount, loading, fetchNotifications, clearUnread };
}
