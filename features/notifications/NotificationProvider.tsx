"use client";

import { createContext, useContext, useEffect } from "react";
import { useNotifications } from "./useNotifications";

const NotificationContext = createContext<ReturnType<
  typeof useNotifications
> | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useNotifications();

  // 🔥 ここ追加（自動更新）
  useEffect(() => {
    // 初回取得
    value.fetchNotifications();

    const interval = setInterval(() => {
      value.fetchNotifications();
    }, 5000); // 5秒ごと

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotificationContext must be used inside NotificationProvider"
    );
  }
  return ctx;
}
