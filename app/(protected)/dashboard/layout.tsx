"use client";

import Navbar from "@/components/Navbar";
import AppNavigationBridge from "@/components/navigation/AppNavigationBridge";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";
import React from "react";

export default function DashboardLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <Navbar />
      <AppNavigationBridge />
      {children}
      {overlay}
    </NotificationProvider>
  );
}
