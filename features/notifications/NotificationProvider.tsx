// features/notifications/NotificationProvider.tsx
"use client";

import { createContext, useContext } from "react";
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
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationContext must be used inside NotificationProvider");
  }
  return ctx;
}
