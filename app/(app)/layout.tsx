// app/(app)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import AppNavigationBridge from "@/components/navigation/AppNavigationBridge";
import { UploadProvider } from "@/components/upload/UploadContext";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";
import { ChatSocketProvider } from "@/features/chat/ChatSocketProvider";
import { SSEProvider } from "@/features/sse/SSEProvider";
import { CallProvider } from "@/features/call/CallProvider";
import CallRoot from "@/components/call/CallRoot";
import ImageViewer from "@/components/image/ImageViewer";
import SWRegister from "@/components/sw/SWRegister";
import PwaInstallBanner from "@/components/PwaInstallBanner";

export default function AppLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  const [me, setMe] = useState<{
    uid: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.uid) {
          setMe({
            uid: data.uid,
            name: data.name ?? "User",
          });
        }
      })
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const preventDoubleTapZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", preventDoubleTapZoom, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchstart", preventDoubleTapZoom);
    };
  }, []);

  // Prevent rendering until we know user
  if (!me) return null;

  return (
    <SSEProvider>
      <ChatSocketProvider currentUserId={me.uid} currentUserName={me.name}>
        <CallProvider>
          <SWRegister />
          <NotificationProvider>
            <Navbar />
            <PwaInstallBanner />
            <AppNavigationBridge />
            <UploadProvider>
              <ImageViewer />
              {children}
              {overlay}
              <CallRoot />
            </UploadProvider>
          </NotificationProvider>
        </CallProvider>
      </ChatSocketProvider>
    </SSEProvider>
  );
}
