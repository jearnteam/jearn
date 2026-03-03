// app/(app)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import AppNavigationBridge from "@/components/navigation/AppNavigationBridge";
import { UploadProvider } from "@/components/upload/UploadContext";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";
import { ChatSocketProvider } from "@/features/chat/ChatSocketProvider";
import { SSEProvider } from "@/features/sse/SSEProvider";

export default function AppLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.uid) {
          setCurrentUserId(data.uid);
        }
      })
      .catch(() => setCurrentUserId(null));
  }, []);

  // Prevent rendering until we know user
  if (!currentUserId) {
    return null; // or loading spinner
  }

  return (
    <SSEProvider>
      <ChatSocketProvider currentUserId={currentUserId}>
        <NotificationProvider>
          <Navbar />
          <AppNavigationBridge />
          <UploadProvider>
            {children}
            {overlay}
          </UploadProvider>
        </NotificationProvider>
      </ChatSocketProvider>
    </SSEProvider>
  );
}