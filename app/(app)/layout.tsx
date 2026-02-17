"use client";

import Navbar from "@/components/Navbar";
import AppNavigationBridge from "@/components/navigation/AppNavigationBridge";
import { UploadProvider } from "@/components/upload/UploadContext";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";

export default function AppLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <Navbar />
      <AppNavigationBridge />
      <UploadProvider>
        {children}
      </UploadProvider>
      {overlay}
    </NotificationProvider>
  );
}
